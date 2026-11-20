import test from "node:test";
import assert from "node:assert/strict";
import { connectStores,closeStores,pg,my,mongo } from "./server-stores.js";
import { migrate } from "./server-migrations.js";
import { seedCatalog } from "./server-seed.js";

test("all configured databases connect and migrations can be applied",async function(t){
  await connectStores();
  t.after(async function(){await closeStores();});
  await migrate();
  await seedCatalog();
  const p=await pg.query("SELECT count(*)::int AS count FROM service_categories");
  const [m]=await my.query("SELECT count(*) AS count FROM users");
  const ping=await mongo().command({ping:1});
  assert.ok(p.rows[0].count>=4);
  assert.ok(m[0].count>=0);
  assert.equal(ping.ok,1);
});
