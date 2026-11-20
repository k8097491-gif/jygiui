import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { pg, my } from "./server-stores.js";

const categories = [
  ["Accounts and access", "Identity services"],
  ["Classroom technology", "Learning spaces"],
  ["Endpoint services", "Workstations"],
  ["Network services", "Campus network"],
  ["Software support", "Academic software"]
];
const articles = [
  { slug:"campus-wifi", title:"Reconnect to campus Wi-Fi", category:"Network services", summary:"Restore a stable connection and collect the details support needs.", steps:["Turn Wi-Fi off for ten seconds, then turn it on again.","Forget the saved campus network and reconnect with your current university account.","If the sign-in page does not appear, open a familiar university webpage.","If the connection still drops, send support the building and device type."] },
  { slug:"password-reset", title:"Restore access after a password change", category:"Accounts and access", summary:"Refresh old sessions safely after your password changes.", steps:["Sign out of the affected university service completely.","Check that the device is using the new password and the correct account name.","Wait a few minutes before retrying if the account was just updated.","Contact support if the account remains locked. Never send your password in a ticket."] },
  { slug:"classroom-display", title:"Troubleshoot a classroom display", category:"Classroom technology", summary:"Run quick checks before or during a class.", steps:["Confirm the display is powered on and the expected input is selected.","Reconnect the cable at both ends if it is safe to access.","Try a second presentation device if one is available.","Include the room and class start time when requesting help."] },
  { slug:"software-license", title:"Check a teaching software license", category:"Software support", summary:"Capture useful information when a lab application cannot find a license.", steps:["Confirm the computer is connected to the campus network.","Close and reopen the application once.","Check whether the issue affects one computer or the whole lab.","Include the application name, room, and exact error text."] }
];
export async function seedCatalog() {
  for (const [name, group] of categories) {
    await pg.query("INSERT INTO service_categories (name,group_name) VALUES ($1,$2) ON CONFLICT (name) DO NOTHING", [name,group]);
  }
  for (const article of articles) {
    await pg.query(
      "INSERT INTO knowledge_articles (slug,title,category,summary,steps) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (slug) DO NOTHING",
      [article.slug,article.title,article.category,article.summary,JSON.stringify(article.steps)]
    );
  }
}
export async function seedDemo() {
  if (process.env.DEMO_MODE !== "true") return;
  const password = process.env.DEMO_PASSWORD;
  if (!password || password.length < 12) throw new Error("DEMO_PASSWORD must be at least 12 characters when DEMO_MODE is enabled.");
  const people = [
    ["requester", "Maya Chen", "maya@campus.test", null],
    ["specialist", "Samira Okafor", "samira@campus.test", "Campus network"],
    ["specialist", "Noah Williams", "noah@campus.test", "Academic software"],
    ["dispatcher", "Dana Patel", "dana@campus.test", null],
    ["manager", "Morgan Reyes", "morgan@campus.test", null],
    ["admin", "Avery Kim", "avery@campus.test", null]
  ];
  const ids = {};
  const passwordHash = await bcrypt.hash(password, 12);
  for (const [role,name,email,team] of people) {
    const id = randomUUID();
    await my.execute(
      "INSERT INTO users (id,name,email,password_hash,role,team) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),password_hash=VALUES(password_hash),role=VALUES(role),team=VALUES(team),active=TRUE",
      [id,name,email,passwordHash,role,team]
    );
    const [rows] = await my.execute("SELECT id FROM users WHERE email=?", [email]);
    ids[email] = rows[0].id;
  }
  const count = await pg.query("SELECT count(*)::int AS count FROM tickets WHERE deleted_at IS NULL");
  if (count.rows[0].count > 0) return;
  const examples = [
    { title:"Wi-Fi drops in the Engineering building", description:"The connection drops every few minutes on the second floor and affects several students.", category:"Network services", impact:"Several people", urgency:"Urgent", priority:"Critical", status:"In progress", assignee:ids["samira@campus.test"], group:"Campus network", requester:ids["maya@campus.test"], age:2, due:2 },
    { title:"Teaching license unavailable in the design lab", description:"The design application reports that no teaching license is available on two lab computers.", category:"Software support", impact:"Teaching activity", urgency:"Normal", priority:"Critical", status:"Assigned", assignee:ids["noah@campus.test"], group:"Academic software", requester:ids["maya@campus.test"], age:4, due:4 },
    { title:"Classroom display has no signal", description:"The lecture room display is not receiving a signal before a scheduled class.", category:"Classroom technology", impact:"Teaching activity", urgency:"Urgent", priority:"Critical", status:"Waiting", assignee:ids["samira@campus.test"], group:"Learning spaces", requester:ids["maya@campus.test"], age:7, due:-1 },
    { title:"Account remains locked after password reset", description:"The new password works on the portal but the library service still rejects it.", category:"Accounts and access", impact:"One person", urgency:"Normal", priority:"Normal", status:"New", assignee:null, group:"Identity services", requester:ids["maya@campus.test"], age:1, due:23 },
    { title:"Lab workstation restarts during class", description:"A workstation in room B214 restarted twice during a class exercise.", category:"Endpoint services", impact:"Teaching activity", urgency:"Urgent", priority:"Critical", status:"Closed", assignee:ids["noah@campus.test"], group:"Workstations", requester:ids["maya@campus.test"], age:28, due:3, resolution:"Updated the workstation driver and verified a full class session.", rating:5, ratingComment:"The fix was clear and quick." }
  ];
  for (const item of examples) {
    const id = randomUUID();
    const createdAt = new Date(Date.now() - item.age * 3600000);
    const dueAt = new Date(Date.now() + item.due * 3600000);
    const closedAt = item.status === "Closed" ? new Date() : null;
    await pg.query(
      "INSERT INTO tickets (id,requester_id,title,description,category,impact,urgency,priority,status,group_name,assignee_id,due_at,resolution,rating,rating_comment,created_at,updated_at,closed_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,now(),$17)",
      [id,item.requester,item.title,item.description,item.category,item.impact,item.urgency,item.priority,item.status,item.group,item.assignee,dueAt,item.resolution || null,item.rating || null,item.ratingComment || null,createdAt,closedAt]
    );
    await pg.query(
      "INSERT INTO event_outbox (id,aggregate_id,actor_id,event_type,payload,occurred_at) VALUES ($1,$2,$3,'ticket.created',$4::jsonb,$5)",
      [randomUUID(),id,item.requester,JSON.stringify({ title:item.title, status:item.status, category:item.category, fictional:true }),createdAt]
    );
  }
  await pg.query(
    "INSERT INTO notifications (id,user_id,ticket_id,kind,title,body) SELECT $1,$2,id,'ticket.update','Your support workspace is ready','Explore the sample request queue and try a demo role.' FROM tickets WHERE title=$3 LIMIT 1",
    [randomUUID(),ids["maya@campus.test"],examples[0].title]
  );
}
