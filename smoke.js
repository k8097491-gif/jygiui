import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const origin=process.env.SMOKE_ORIGIN||"http://127.0.0.1:3000";
let cookie="";
async function request(path,options={}){
  const headers={"Content-Type":"application/json",...(options.headers||{})};
  if(cookie) headers.Cookie=cookie;
  const response=await fetch(origin+path,{...options,headers,body:options.body===undefined?undefined:JSON.stringify(options.body)});
  const setCookie=response.headers.get("set-cookie");
  if(setCookie) cookie=setCookie.split(";")[0];
  return response;
}
async function main(){
  const health=await fetch(origin+"/health");
  assert.equal(health.status,200,"all databases and the analytics service must be healthy");
  const email="smoke-"+randomUUID()+"@campus.test";
  const registration=await request("/api/auth/register",{method:"POST",body:{name:"Smoke Requester",email,password:"Smoke-Test-Password-2026"}});
  assert.equal(registration.status,201);
  const created=await request("/api/tickets",{method:"POST",body:{
    title:"Access request from API smoke test",
    description:"A test account cannot open an internal campus service after a password update.",
    category:"Accounts and access",
    impact:"One person",
    urgency:"Normal"
  }});
  assert.equal(created.status,201);
  const ticket=(await created.json()).ticket;
  const list=await request("/api/tickets?query=Access%20request");
  assert.equal(list.status,200);
  assert.ok((await list.json()).items.some(function(item){return item.id===ticket.id;}));
  const loaded=await request("/api/tickets/"+ticket.id);
  assert.equal(loaded.status,200);
  const edited=await request("/api/tickets/"+ticket.id,{method:"PATCH",body:{title:"Updated access request from smoke test"}});
  assert.equal(edited.status,200);
  const comment=await request("/api/tickets/"+ticket.id+"/comments",{method:"POST",body:{body:"This comment was created by the integration smoke test.",visibility:"public"}});
  assert.equal(comment.status,201);
  const graph=await request("/graphql",{method:"POST",body:{query:"{ me { email role } tickets(query: \"Updated access request\") { id title } }"}});
  assert.equal(graph.status,200);
  const graphBody=await graph.json();
  assert.equal(graphBody.data.me.email,email);
  assert.ok(graphBody.data.tickets.some(function(item){return item.id===ticket.id;}));
  const analytics=await request("/api/analytics");
  assert.equal(analytics.status,200);
  assert.ok(Number.isInteger((await analytics.json()).open));
  const profile=await request("/api/profile",{method:"PUT",body:{name:"Smoke Requester Updated",email}});
  assert.equal(profile.status,200);
  const removed=await request("/api/tickets/"+ticket.id,{method:"DELETE"});
  assert.equal(removed.status,204);
  const logout=await request("/api/auth/logout",{method:"POST"});
  assert.equal(logout.status,204);
  console.log("API smoke passed: register, sign-in cookie, ticket CRUD, comments, GraphQL, Python analytics, profile, logout.");
}
main().catch(function(error){console.error(error);process.exitCode=1;});
