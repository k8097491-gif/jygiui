import { randomUUID } from "node:crypto";
import { pg, my } from "./server-stores.js";
import { assertRole, assertTicketAccess, assertTransition, dueDate, priorityFor, safeTicket } from "./server-domain.js";
import { queueActivity, updates, activityForTicket, deleteActivityForTicket } from "./server-activity.js";

async function transaction(task) {
  const client = await pg.connect();
  try {
    await client.query("BEGIN");
    const result = await task(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
function publicTicket(row) { return safeTicket(row); }
function emitTicket(type, ticket) { updates.emit("ticket", { type, ticketId:ticket.id, status:ticket.status, updatedAt:ticket.updatedAt }); }
export async function listTickets(user, filters = {}) {
  const clauses = ["t.deleted_at IS NULL"];
  const values = [];
  if (user.role === "requester") { values.push(user.id); clauses.push("t.requester_id=$" + values.length); }
  if (user.role === "specialist") { values.push(user.id); clauses.push("t.assignee_id=$" + values.length); }
  if (filters.status) { values.push(filters.status); clauses.push("t.status=$" + values.length); }
  if (filters.category) { values.push(filters.category); clauses.push("t.category=$" + values.length); }
  if (filters.priority) { values.push(filters.priority); clauses.push("t.priority=$" + values.length); }
  if (filters.query) {
    values.push("%" + filters.query.trim().slice(0,100) + "%");
    const n = values.length;
    clauses.push("(t.title ILIKE $" + n + " OR t.description ILIKE $" + n + " OR t.id::text ILIKE $" + n + ")");
  }
  const limit = Math.max(1,Math.min(100,Number(filters.limit) || 40));
  const result = await pg.query(
    "SELECT t.* FROM tickets t WHERE " + clauses.join(" AND ") + " ORDER BY CASE WHEN t.status IN ('Closed','Resolved') THEN 1 ELSE 0 END, t.due_at ASC LIMIT " + limit,
    values
  );
  return result.rows.map(publicTicket);
}
export async function getTicket(user, id) {
  const result = await pg.query("SELECT * FROM tickets WHERE id=$1 AND deleted_at IS NULL", [id]);
  const row = result.rows[0];
  assertTicketAccess(user,row);
  const commentQuery = user.role === "requester"
    ? await pg.query("SELECT id,author_id,body,visibility,created_at FROM comments WHERE ticket_id=$1 AND visibility='public' ORDER BY created_at", [id])
    : await pg.query("SELECT id,author_id,body,visibility,created_at FROM comments WHERE ticket_id=$1 ORDER BY created_at", [id]);
  const activity=await activityForTicket(id);
  const visibleActivity=user.role==="requester"?activity.filter(function(item){return item.type!=="ticket.comment"||item.payload.visibility!=="internal";}):activity;
  const accountIds=Array.from(new Set([row.requester_id,row.assignee_id,...commentQuery.rows.map(function(item){return item.author_id;}),...visibleActivity.map(function(item){return item.actorId;})].filter(Boolean)));
  const names=new Map();
  if(accountIds.length){
    const [people]=await my.execute("SELECT id,name FROM users WHERE id IN ("+accountIds.map(function(){return "?";}).join(",")+")",accountIds);
    people.forEach(function(person){names.set(person.id,person.name);});
  }
  const comments=commentQuery.rows.map(function(item){return {...item,author_name:names.get(item.author_id)||"Support team"};});
  const namedActivity=visibleActivity.map(function(item){return {...item,actorName:names.get(item.actorId)||"Support team"};});
  return { ...publicTicket(row), requesterName:names.get(row.requester_id)||"Requester", assigneeName:names.get(row.assignee_id)||null, comments, activity:namedActivity };
}
async function chooseAssignee(categoryName) {
  const category = await pg.query("SELECT group_name FROM service_categories WHERE name=$1 AND active=TRUE", [categoryName]);
  if (!category.rows[0]) throw Object.assign(new Error("Choose an active support category."), { status:422, code:"UNKNOWN_CATEGORY" });
  const team = category.rows[0].group_name;
  const [people] = await my.execute("SELECT id FROM users WHERE role='specialist' AND active=TRUE AND team=? ORDER BY name", [team]);
  let selected = null, selectedCount = Infinity;
  for (const person of people) {
    const count = await pg.query("SELECT count(*)::int AS load FROM tickets WHERE assignee_id=$1 AND status NOT IN ('Closed','Resolved') AND deleted_at IS NULL", [person.id]);
    if (count.rows[0].load < selectedCount) { selected = person.id; selectedCount = count.rows[0].load; }
  }
  return { team, assignee:selected };
}
export async function createTicket(user,input) {
  assertRole(user,["requester","dispatcher","manager","admin"]);
  const id = randomUUID();
  const eventId = randomUUID();
  const priority = priorityFor(input.impact,input.urgency);
  const routing = await chooseAssignee(input.category);
  const status = routing.assignee ? "Assigned" : "New";
  const dueAt = dueDate(priority);
  const requesterId = user.role === "requester" ? user.id : input.requesterId;
  if (!requesterId) throw Object.assign(new Error("Select a requester for this ticket."), { status:422, code:"REQUESTER_REQUIRED" });
  const ticket = await transaction(async function (client) {
    const created = await client.query(
      "INSERT INTO tickets (id,requester_id,title,description,category,impact,urgency,priority,status,group_name,assignee_id,due_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *",
      [id,requesterId,input.title.trim(),input.description.trim(),input.category,input.impact,input.urgency,priority,status,routing.team,routing.assignee,dueAt]
    );
    await queueActivity(client,{ id:eventId,ticketId:id,actorId:user.id,type:"ticket.created",payload:{ title:input.title.trim(), status, category:input.category }, at:new Date() });
    await client.query(
      "INSERT INTO notifications (id,user_id,ticket_id,kind,title,body) VALUES ($1,$2,$3,'ticket.created',$4,$5)",
      [randomUUID(),requesterId,id,"Request received",input.title.trim()]
    );
    if (routing.assignee) {
      await client.query(
        "INSERT INTO notifications (id,user_id,ticket_id,kind,title,body) VALUES ($1,$2,$3,'ticket.assigned',$4,$5)",
        [randomUUID(),routing.assignee,id,"Request assigned",input.title.trim()]
      );
    }
    return created.rows[0];
  });
  const result=publicTicket(ticket); emitTicket("created",result); return result;
}
export async function updateTicket(user,id,input) {
  const prior=await pg.query("SELECT * FROM tickets WHERE id=$1 AND deleted_at IS NULL",[id]);
  const ticket=prior.rows[0]; assertTicketAccess(user,ticket);
  if (user.role==="requester" && ticket.status!=="New") throw Object.assign(new Error("Only a new request can be edited."),{status:409,code:"TICKET_LOCKED"});
  assertRole(user,["requester","specialist","dispatcher","manager","admin"]);
  const nextPriority=priorityFor(input.impact,input.urgency);
  const dueAt=dueDate(nextPriority);
  const saved=await transaction(async function(client){
    const result=await client.query("UPDATE tickets SET title=$2,description=$3,category=$4,impact=$5,urgency=$6,priority=$7,due_at=$8,updated_at=now(),version=version+1 WHERE id=$1 AND deleted_at IS NULL RETURNING *",
      [id,input.title.trim(),input.description.trim(),input.category,input.impact,input.urgency,nextPriority,dueAt]);
    await queueActivity(client,{id:randomUUID(),ticketId:id,actorId:user.id,type:"ticket.updated",payload:{title:input.title.trim(),category:input.category}});
    return result.rows[0];
  });
  const result=publicTicket(saved);emitTicket("updated",result);return result;
}
export async function deleteTicket(user,id) {
  const found=await pg.query("SELECT * FROM tickets WHERE id=$1 AND deleted_at IS NULL",[id]);
  const ticket=found.rows[0];assertTicketAccess(user,ticket);
  if(user.role!=="requester"||ticket.status!=="New") throw Object.assign(new Error("Only your unassigned new request can be deleted."),{status:409,code:"TICKET_CANNOT_DELETE"});
  await transaction(async function(client){await client.query("DELETE FROM tickets WHERE id=$1",[id]);});
  await deleteActivityForTicket(id);
  emitTicket("deleted",{id,status:"Deleted"});
}
export async function addComment(user,id,input) {
  const found=await pg.query("SELECT * FROM tickets WHERE id=$1 AND deleted_at IS NULL",[id]);
  const ticket=found.rows[0];assertTicketAccess(user,ticket);
  if(ticket.status==="Closed") throw Object.assign(new Error("A closed request cannot receive another update."),{status:409,code:"TICKET_CLOSED"});
  if(input.visibility==="internal") assertRole(user,["specialist","dispatcher","manager","admin"]);
  const comment={id:randomUUID(),ticketId:id,authorId:user.id,body:input.body.trim(),visibility:input.visibility||"public",at:new Date()};
  await transaction(async function(client){
    await client.query("INSERT INTO comments (id,ticket_id,author_id,body,visibility) VALUES ($1,$2,$3,$4,$5)",[comment.id,id,user.id,comment.body,comment.visibility]);
    await client.query("UPDATE tickets SET updated_at=now(),version=version+1 WHERE id=$1",[id]);
    await queueActivity(client,{id:randomUUID(),ticketId:id,actorId:user.id,type:"ticket.comment",payload:{visibility:comment.visibility,body:comment.body},at:comment.at});
  });
  emitTicket("commented",{id,status:ticket.status,updatedAt:comment.at});
  return comment;
}
export async function transitionTicket(user,id,input) {
  const current=await pg.query("SELECT * FROM tickets WHERE id=$1 AND deleted_at IS NULL",[id]);
  const ticket=current.rows[0];assertTicketAccess(user,ticket);
  const support=["specialist","dispatcher","manager","admin"].includes(user.role);
  if(support) assertRole(user,["specialist","dispatcher","manager","admin"]);
  else {
    assertRole(user,["requester"]);
    if(ticket.status!=="Resolved"||!["Closed","Reopened"].includes(input.status)) throw Object.assign(new Error("You can confirm or reopen a resolved request."),{status:403,code:"FORBIDDEN"});
  }
  assertTransition(ticket.status,input.status);
  if(input.status==="Resolved"&&!input.resolution?.trim()) throw Object.assign(new Error("Add a clear resolution before marking this request resolved."),{status:422,code:"RESOLUTION_REQUIRED"});
  if(!input.reason?.trim()&&!["Closed","Resolved"].includes(input.status)) throw Object.assign(new Error("Add a short reason so the ticket history stays useful."),{status:422,code:"REASON_REQUIRED"});
  const saved=await transaction(async function(client){
    const locked=await client.query("SELECT * FROM tickets WHERE id=$1 FOR UPDATE",[id]);
    if(locked.rows[0].status!==ticket.status) throw Object.assign(new Error("This request changed while you were viewing it. Refresh and try again."),{status:409,code:"STALE_TICKET"});
    const resolution=input.status==="Resolved"?input.resolution.trim():ticket.resolution;
    const closedAt=input.status==="Closed"?new Date():ticket.closed_at;
    const result=await client.query("UPDATE tickets SET status=$2,resolution=$3,closed_at=$4,updated_at=now(),version=version+1 WHERE id=$1 RETURNING *",[id,input.status,resolution,closedAt]);
    await queueActivity(client,{id:randomUUID(),ticketId:id,actorId:user.id,type:"ticket.status",payload:{from:ticket.status,to:input.status,reason:input.reason?.trim()||"",resolution:resolution||null}});
    if(ticket.requester_id!==user.id) await client.query(
      "INSERT INTO notifications (id,user_id,ticket_id,kind,title,body) VALUES ($1,$2,$3,'ticket.status',$4,$5)",
      [randomUUID(),ticket.requester_id,id,"Request updated",input.status+" · "+ticket.title]
    );
    return result.rows[0];
  });
  const result=publicTicket(saved);emitTicket("status",result);return result;
}
export async function assignTicket(user,id,input) {
  assertRole(user,["dispatcher","manager","admin"]);
  const [personRows]=await my.execute("SELECT id,team,role,active FROM users WHERE id=?",[input.assigneeId]);
  const person=personRows[0];
  if(!person||!person.active||person.role!=="specialist") throw Object.assign(new Error("Choose an active support specialist."),{status:422,code:"INVALID_ASSIGNEE"});
  const saved=await transaction(async function(client){
    const found=await client.query("SELECT * FROM tickets WHERE id=$1 AND deleted_at IS NULL FOR UPDATE",[id]);
    if(!found.rows[0]) throw Object.assign(new Error("Request not found."),{status:404,code:"NOT_FOUND"});
    const old=found.rows[0];
    const result=await client.query("UPDATE tickets SET assignee_id=$2,group_name=$3,status=CASE WHEN status='New' THEN 'Assigned' ELSE status END,updated_at=now(),version=version+1 WHERE id=$1 RETURNING *",[id,person.id,input.group.trim()]);
    await queueActivity(client,{id:randomUUID(),ticketId:id,actorId:user.id,type:"ticket.assigned",payload:{previousAssignee:old.assignee_id,assigneeId:person.id,group:input.group.trim(),reason:input.reason.trim()}});
    await client.query("INSERT INTO notifications (id,user_id,ticket_id,kind,title,body) VALUES ($1,$2,$3,'ticket.assigned','Request assigned',$4)",[randomUUID(),person.id,id,old.title]);
    return result.rows[0];
  });
  const result=publicTicket(saved);emitTicket("assigned",result);return result;
}
export async function rateTicket(user,id,input) {
  assertRole(user,["requester"]);
  const result=await pg.query("UPDATE tickets SET rating=$3,rating_comment=$4,updated_at=now(),version=version+1 WHERE id=$1 AND requester_id=$2 AND status='Closed' AND rating IS NULL RETURNING *",[id,user.id,input.score,input.comment||null]);
  if(!result.rows[0]) throw Object.assign(new Error("Feedback is available once after a request is closed."),{status:409,code:"RATING_UNAVAILABLE"});
  const saved=publicTicket(result.rows[0]);emitTicket("rated",saved);return saved;
}
export async function getCategories() {
  const result=await pg.query("SELECT name,group_name,active FROM service_categories WHERE active=TRUE ORDER BY name");
  return result.rows.map(function(row){return {name:row.name,group:row.group_name,active:row.active};});
}
export async function getArticles() {
  const result=await pg.query("SELECT slug,title,category,summary,steps,updated_at FROM knowledge_articles WHERE published=TRUE ORDER BY category,title");
  return result.rows;
}
export async function getNotifications(user) {
  const result=await pg.query("SELECT id,ticket_id,kind,title,body,read_at,created_at FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50",[user.id]);
  return result.rows.map(function(row){return {id:row.id,ticketId:row.ticket_id,kind:row.kind,title:row.title,body:row.body,readAt:row.read_at,createdAt:row.created_at};});
}
export async function markNotification(user,id) {
  const result=await pg.query("UPDATE notifications SET read_at=COALESCE(read_at,now()) WHERE id=$1 AND user_id=$2 RETURNING id",[id,user.id]);
  return result.rowCount>0;
}
