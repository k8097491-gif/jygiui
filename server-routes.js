import { Router } from "express";
import { z } from "zod";
import { my, pg } from "./server-stores.js";
import { authenticate, attachSession, clearSession, createRequester, revokeSession, verifyPassword } from "./server-auth.js";
import { safeUser, ROLES, STATUSES, assertRole } from "./server-domain.js";
import { listTickets, getTicket, createTicket, updateTicket, deleteTicket, addComment, transitionTicket, assignTicket, rateTicket, getCategories, getArticles, getNotifications, markNotification } from "./server-tickets.js";
import { loadAnalytics } from "./server-analytics-client.js";

const router=Router();
const authLimiterSchema=z.object({
  email:z.email().max(254),
  password:z.string().min(1).max(128)
});
const newAccountSchema=z.object({
  name:z.string().trim().min(2).max(100),
  email:z.email().max(254),
  password:z.string().min(12).max(128)
});
const ticketSchema=z.object({
  title:z.string().trim().min(5).max(120),
  description:z.string().trim().min(15).max(1200),
  category:z.string().trim().min(2).max(120),
  impact:z.enum(["One person","Several people","Teaching activity"]),
  urgency:z.enum(["Low","Normal","Urgent"]),
  requesterId:z.string().uuid().optional()
});
const commentSchema=z.object({ body:z.string().trim().min(2).max(800), visibility:z.enum(["public","internal"]).default("public") });
const transitionSchema=z.object({ status:z.enum(STATUSES), reason:z.string().max(400).optional(), resolution:z.string().max(1000).optional() });
const assignSchema=z.object({ assigneeId:z.string().uuid(), group:z.string().trim().min(2).max(120), reason:z.string().trim().min(3).max(400) });
const ratingSchema=z.object({ score:z.number().int().min(1).max(5), comment:z.string().trim().max(280).optional() });
const profileSchema=z.object({ name:z.string().trim().min(2).max(100), email:z.email().max(254) });
const userSchema=z.object({ name:z.string().trim().min(2).max(100), email:z.email().max(254), role:z.enum(ROLES), team:z.string().trim().max(120).optional(), active:z.boolean() });
const categorySchema=z.object({ name:z.string().trim().min(2).max(120), group:z.string().trim().min(2).max(120) });
function input(schema,body) {
  const parsed=schema.safeParse(body);
  if(!parsed.success) throw Object.assign(new Error(parsed.error.issues.map(function(i){return i.message}).join(" ")),{status:422,code:"VALIDATION_ERROR",details:parsed.error.issues.map(function(i){return {field:i.path.join("."),message:i.message}})});
  return parsed.data;
}
function asyncRoute(handler) { return function(req,res,next){Promise.resolve(handler(req,res,next)).catch(next);}; }
function sessionAccount(user) { return { id:user.id,name:user.name,email:user.email,role:user.role }; }
function validDemoRole(role) {
  const emails={requester:"maya@campus.test",specialist:"samira@campus.test",dispatcher:"dana@campus.test",manager:"morgan@campus.test",admin:"avery@campus.test"};
  return emails[role];
}
router.post("/auth/register",asyncRoute(async function(req,res){
  const data=input(newAccountSchema,req.body);
  const user=await createRequester(data);
  await attachSession(res,user.id);
  res.status(201).json({user:sessionAccount(user)});
}));
router.post("/auth/login",asyncRoute(async function(req,res){
  const data=input(authLimiterSchema,req.body);
  const user=await verifyPassword(data.email,data.password);
  if(!user) return res.status(401).json({error:{code:"INVALID_CREDENTIALS",message:"Email or password did not match."}});
  await attachSession(res,user.id);
  res.json({user:sessionAccount(user)});
}));
router.get("/config",function(req,res){res.json({demoAvailable:process.env.DEMO_MODE==="true"});});
router.post("/auth/demo",asyncRoute(async function(req,res){
  if(process.env.DEMO_MODE!=="true") return res.status(404).json({error:{code:"DEMO_DISABLED",message:"Demo sign-in is disabled."}});
  const role=ROLES.includes(req.body.role)?req.body.role:"requester";
  const email=validDemoRole(role);
  const [users]=await my.execute("SELECT id FROM users WHERE email=? AND active=TRUE",[email]);
  if(!users[0]) return res.status(503).json({error:{code:"DEMO_NOT_SEEDED",message:"The demo account is not available. Check the server setup."}});
  if(req.cookies&&req.cookies.campus_session) await revokeSession(req.cookies.campus_session);
  await attachSession(res,users[0].id);
  const [rows]=await my.execute("SELECT id,name,email,role FROM users WHERE id=?",[users[0].id]);
  res.json({user:sessionAccount(rows[0])});
}));
router.post("/auth/logout",authenticate,asyncRoute(async function(req,res){
  await revokeSession(req.sessionToken);
  clearSession(res);
  res.status(204).end();
}));
router.get("/me",authenticate,function(req,res){res.json({user:req.user});});
router.put("/profile",authenticate,asyncRoute(async function(req,res){
  const data=input(profileSchema,req.body);
  const email=data.email.toLowerCase().trim();
  try {
    await my.execute("UPDATE users SET name=?,email=? WHERE id=?",[data.name,email,req.user.id]);
  } catch(error) {
    if(error.code==="ER_DUP_ENTRY") throw Object.assign(new Error("That email address is already in use."),{status:409,code:"EMAIL_EXISTS"});
    throw error;
  }
  const [rows]=await my.execute("SELECT id,name,email,role FROM users WHERE id=?",[req.user.id]);
  res.json({user:sessionAccount(rows[0])});
}));
router.get("/users",authenticate,asyncRoute(async function(req,res){
  assertRole(req.user,["admin"]);
  const [rows]=await my.execute("SELECT id,name,email,role,team,active,created_at FROM users ORDER BY created_at DESC LIMIT 250");
  res.json({items:rows.map(safeUser)});
}));
router.get("/specialists",authenticate,asyncRoute(async function(req,res){
  assertRole(req.user,["specialist","dispatcher","manager","admin"]);
  const [rows]=await my.execute("SELECT id,name,email,team FROM users WHERE role='specialist' AND active=TRUE ORDER BY name");
  res.json({items:rows});
}));
router.get("/requesters",authenticate,asyncRoute(async function(req,res){
  assertRole(req.user,["dispatcher","manager","admin"]);
  const [rows]=await my.execute("SELECT id,name,email FROM users WHERE role='requester' AND active=TRUE ORDER BY name LIMIT 250");
  res.json({items:rows});
}));
router.put("/users/:id",authenticate,asyncRoute(async function(req,res){
  assertRole(req.user,["admin"]);
  const data=input(userSchema,req.body);
  if(req.params.id===req.user.id&&!data.active) throw Object.assign(new Error("You cannot disable the account you are currently using."),{status:409,code:"SELF_DISABLE"});
  if(data.role==="specialist"&&!data.team?.trim()) throw Object.assign(new Error("Add the support group for this specialist."),{status:422,code:"TEAM_REQUIRED"});
  try {
    const [result]=await my.execute("UPDATE users SET name=?,email=?,role=?,team=?,active=? WHERE id=?",[data.name,data.email.toLowerCase(),data.role,data.role==="specialist"?data.team.trim():null,data.active,req.params.id]);
    if(!result.affectedRows) return res.status(404).json({error:{code:"NOT_FOUND",message:"User not found."}});
  } catch(error) {
    if(error.code==="ER_DUP_ENTRY") throw Object.assign(new Error("That email address is already in use."),{status:409,code:"EMAIL_EXISTS"});
    throw error;
  }
  if(!data.active) await my.execute("DELETE FROM user_sessions WHERE user_id=?",[req.params.id]);
  const [rows]=await my.execute("SELECT id,name,email,role,team,active,created_at FROM users WHERE id=?",[req.params.id]);
  res.json({user:safeUser(rows[0])});
}));
router.delete("/users/:id",authenticate,asyncRoute(async function(req,res){
  assertRole(req.user,["admin"]);
  if(req.params.id===req.user.id) throw Object.assign(new Error("You cannot deactivate the account you are currently using."),{status:409,code:"SELF_DISABLE"});
  const [result]=await my.execute("UPDATE users SET active=FALSE WHERE id=?",[req.params.id]);
  if(!result.affectedRows) return res.status(404).json({error:{code:"NOT_FOUND",message:"User not found."}});
  await my.execute("DELETE FROM user_sessions WHERE user_id=?",[req.params.id]);
  res.status(204).end();
}));
router.get("/tickets",authenticate,asyncRoute(async function(req,res){
  const filters={query:String(req.query.query||"").slice(0,100),status:req.query.status,category:req.query.category,priority:req.query.priority,limit:req.query.limit};
  res.json({items:await listTickets(req.user,filters)});
}));
router.post("/tickets",authenticate,asyncRoute(async function(req,res){
  const data=input(ticketSchema,req.body);
  if(data.requesterId) {
    assertRole(req.user,["dispatcher","manager","admin"]);
    const [rows]=await my.execute("SELECT id FROM users WHERE id=? AND active=TRUE",[data.requesterId]);
    if(!rows[0]) throw Object.assign(new Error("Choose an active requester."),{status:422,code:"INVALID_REQUESTER"});
  }
  const ticket=await createTicket(req.user,data);
  res.status(201).json({ticket});
}));
router.get("/tickets/:id",authenticate,asyncRoute(async function(req,res){res.json({ticket:await getTicket(req.user,req.params.id)});}));
router.put("/tickets/:id",authenticate,asyncRoute(async function(req,res){
  const data=input(ticketSchema,req.body);
  res.json({ticket:await updateTicket(req.user,req.params.id,data)});
}));
router.patch("/tickets/:id",authenticate,asyncRoute(async function(req,res){
  const existing=await getTicket(req.user,req.params.id);
  const data=input(ticketSchema,{title:existing.title,description:existing.description,category:existing.category,impact:existing.impact,urgency:existing.urgency,...req.body});
  res.json({ticket:await updateTicket(req.user,req.params.id,data)});
}));
router.delete("/tickets/:id",authenticate,asyncRoute(async function(req,res){
  await deleteTicket(req.user,req.params.id); res.status(204).end();
}));
router.post("/tickets/:id/comments",authenticate,asyncRoute(async function(req,res){
  res.status(201).json({comment:await addComment(req.user,req.params.id,input(commentSchema,req.body))});
}));
router.post("/tickets/:id/transitions",authenticate,asyncRoute(async function(req,res){
  res.json({ticket:await transitionTicket(req.user,req.params.id,input(transitionSchema,req.body))});
}));
router.patch("/tickets/:id/assignment",authenticate,asyncRoute(async function(req,res){
  res.json({ticket:await assignTicket(req.user,req.params.id,input(assignSchema,req.body))});
}));
router.post("/tickets/:id/rating",authenticate,asyncRoute(async function(req,res){
  res.json({ticket:await rateTicket(req.user,req.params.id,input(ratingSchema,req.body))});
}));
router.get("/categories",authenticate,asyncRoute(async function(req,res){res.json({items:await getCategories()});}));
router.post("/categories",authenticate,asyncRoute(async function(req,res){
  assertRole(req.user,["admin"]);const data=input(categorySchema,req.body);
  try { await pg.query("INSERT INTO service_categories (name,group_name) VALUES ($1,$2)",[data.name,data.group]); }
  catch(error) { if(error.code==="23505") throw Object.assign(new Error("A category with that name already exists."),{status:409,code:"CATEGORY_EXISTS"}); throw error; }
  res.status(201).json({category:{name:data.name,group:data.group,active:true}});
}));
router.put("/categories/:name",authenticate,asyncRoute(async function(req,res){
  assertRole(req.user,["admin"]);const data=input(categorySchema,req.body);
  let result;
  try { result=await pg.query("UPDATE service_categories SET name=$2,group_name=$3 WHERE name=$1 RETURNING name,group_name,active",[req.params.name,data.name,data.group]); }
  catch(error) { if(error.code==="23505") throw Object.assign(new Error("A category with that name already exists."),{status:409,code:"CATEGORY_EXISTS"}); throw error; }
  if(!result.rowCount) return res.status(404).json({error:{code:"NOT_FOUND",message:"Category not found."}});
  res.json({category:{name:result.rows[0].name,group:result.rows[0].group_name,active:result.rows[0].active}});
}));
router.delete("/categories/:name",authenticate,asyncRoute(async function(req,res){
  assertRole(req.user,["admin"]);
  const result=await pg.query("UPDATE service_categories SET active=FALSE WHERE name=$1 RETURNING name",[req.params.name]);
  if(!result.rowCount) return res.status(404).json({error:{code:"NOT_FOUND",message:"Category not found."}});
  res.status(204).end();
}));
router.get("/knowledge",authenticate,asyncRoute(async function(req,res){res.json({items:await getArticles()});}));
router.get("/notifications",authenticate,asyncRoute(async function(req,res){
  const items=await getNotifications(req.user);
  res.json({items,unread:items.filter(function(item){return !item.readat}).length});
}));
router.patch("/notifications/read-all",authenticate,asyncRoute(async function(req,res){
  await pg.query("UPDATE notifications SET read_at=now() WHERE user_id=$1 AND read_at IS NULL",[req.user.id]);
  res.json({updated:true});
}));
router.patch("/notifications/:id",authenticate,asyncRoute(async function(req,res){
  const success=await markNotification(req.user,req.params.id);
  if(!success) return res.status(404).json({error:{code:"NOT_FOUND",message:"Notification not found."}});
  res.json({updated:true});
}));
router.get("/analytics",authenticate,asyncRoute(async function(req,res){res.json(await loadAnalytics(req.user));}));
export { router, input, ticketSchema };
