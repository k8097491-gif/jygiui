import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import pino from "pino";
import pinoHttp from "pino-http";
import { rateLimit } from "express-rate-limit";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { connectStores, closeStores, pg, my, mongo } from "./server-stores.js";
import { migrate } from "./server-migrations.js";
import { seedCatalog, seedDemo } from "./server-seed.js";
import { authenticate, resolveUser } from "./server-auth.js";
import { graphqlHandler } from "./server-graphql.js";
import { router } from "./server-routes.js";
import { updates, publishActivityBatch } from "./server-activity.js";
import { canReadTicket } from "./server-domain.js";

const logger=pino({level:process.env.LOG_LEVEL||"info",redact:{paths:["req.headers.cookie","req.headers.authorization"],censor:"[redacted]"}});
const app=express();
app.disable("x-powered-by");
app.use(helmet({crossOriginEmbedderPolicy:false,contentSecurityPolicy:{directives:{styleSrc:["'self'","'unsafe-inline'"],imgSrc:["'self'","data:"],fontSrc:["'self'"],scriptSrc:["'self'"]}}}));
app.use(pinoHttp({logger}));
app.use(express.json({limit:"1mb"}));
app.use(cookieParser());
app.get("/health",async function(req,res){
  try {
    const results=await Promise.all([
      pg.query("SELECT 1"),
      my.query("SELECT 1"),
      mongo().command({ping:1}),
      fetch(new URL("/health",process.env.ANALYTICS_URL),{signal:AbortSignal.timeout(3000)})
    ]);
    const analyticsOk=results[3].ok;
    const checks={postgres:!!results[0],mysql:!!results[1],mongodb:!!results[2].ok,analytics:analyticsOk};
    res.status(Object.values(checks).every(Boolean)?200:503).json({status:Object.values(checks).every(Boolean)?"ok":"degraded",checks});
  } catch {
    res.status(503).json({status:"degraded",error:"One or more services are unavailable."});
  }
});
app.get("/health/live",function(req,res){res.json({status:"alive"});});
const apiLimiter=rateLimit({windowMs:15*60*1000,limit:240,standardHeaders:"draft-8",legacyHeaders:false,message:{error:{code:"RATE_LIMITED",message:"Too many requests. Wait a moment and try again."}}});
const authLimiter=rateLimit({windowMs:15*60*1000,limit:12,standardHeaders:"draft-8",legacyHeaders:false,message:{error:{code:"RATE_LIMITED",message:"Too many sign-in attempts. Wait a few minutes and try again."}}});
app.use("/api",apiLimiter);
app.use("/api/auth",authLimiter);
app.use("/api",router);
app.use("/graphql",apiLimiter);
app.all("/graphql",graphqlHandler(resolveUser));
app.get("/events",authenticate,function(req,res){
  res.status(200);
  res.set({"Content-Type":"text/event-stream","Cache-Control":"no-cache, no-transform","Connection":"keep-alive","X-Accel-Buffering":"no"});
  res.flushHeaders();
  res.write("event: ready\ndata: {}\n\n");
  let active=true;
  const heartbeat=setInterval(function(){if(active)res.write(": keep-alive\n\n");},25000);
  const onChange=async function(event){
    if(!active)return;
    try{
      const result=await pg.query("SELECT * FROM tickets WHERE id=$1 AND deleted_at IS NULL",[event.ticketId]);
      if(result.rows[0]&&canReadTicket(req.user,result.rows[0])) res.write("event: ticket.changed\ndata: "+JSON.stringify({type:event.type,ticketId:event.ticketId})+"\n\n");
    }catch{ /* A disconnected client or transient database error can wait for the next event. */ }
  };
  updates.on("ticket",onChange);
  updates.on("activity",onChange);
  req.on("close",function(){active=false;clearInterval(heartbeat);updates.off("ticket",onChange);updates.off("activity",onChange);});
});
app.get("/api/openapi.json",function(req,res){
  res.sendFile(fileURLToPath(new URL("./openapi.json",import.meta.url)));
});
const builtClient=resolve(process.cwd(),"dist");
if(existsSync(builtClient)) {
  app.use(express.static(builtClient,{index:false,immutable:true,maxAge:"1h"}));
  app.use(function(req,res,next){
    if(req.method==="GET"&&!req.path.startsWith("/api")&&req.path!=="/graphql"&&req.path!=="/events") return res.sendFile(resolve(builtClient,"index.html"));
    next();
  });
}
app.use("/api",function(req,res){res.status(404).json({error:{code:"NOT_FOUND",message:"API route not found."}});});
app.use(function(error,req,res,next){
  if(res.headersSent)return next(error);
  const status=error.status||((error.name==="TokenExpiredError"||error.name==="JsonWebTokenError")?401:500);
  const code=error.code||"INTERNAL_ERROR";
  if(status>=500) logger.error({err:error,requestId:req.id},"request failed");
  const message=status>=500?"The service could not complete this request. Try again.":error.message;
  res.status(status).json({error:{code,message,details:error.details,requestId:req.id}});
});
async function start() {
  if(!process.env.JWT_SECRET||process.env.JWT_SECRET.length<32) throw new Error("JWT_SECRET must contain at least 32 characters.");
  await connectStores();
  await migrate();
  await seedCatalog();
  await seedDemo();
  const publishing=setInterval(function(){publishActivityBatch().catch(function(error){logger.error({err:error},"activity outbox failed");});},2000);
  publishing.unref();
  await publishActivityBatch();
  const port=Number(process.env.PORT||3000);
  const server=app.listen(port,"0.0.0.0",function(){logger.info({port},"Campus Helpdesk API listening");});
  async function shutdown(signal) {
    logger.info({signal},"shutting down");
    clearInterval(publishing);
    server.close(async function(){await closeStores();process.exit(0);});
    setTimeout(function(){process.exit(1);},10000).unref();
  }
  process.on("SIGTERM",function(){shutdown("SIGTERM");});
  process.on("SIGINT",function(){shutdown("SIGINT");});
}
start().catch(function(error){logger.fatal({err:error},"startup failed");closeStores().finally(function(){process.exit(1);});});
