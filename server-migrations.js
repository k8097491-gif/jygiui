import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pg, my } from "./server-stores.js";

function splitSql(contents) {
  return contents.split(";").map(function (part) { return part.trim(); }).filter(Boolean);
}
export async function migrate() {
  await pg.query("CREATE TABLE IF NOT EXISTS schema_migrations (version VARCHAR(80) PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())");
  await my.query("CREATE TABLE IF NOT EXISTS schema_migrations (version VARCHAR(80) PRIMARY KEY, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)");
  const plan = [
    { version: "pg-001-core", file: resolve(process.cwd(), "postgres-migration.sql"), engine: pg, transactional: true },
    { version: "mysql-001-identity", file: resolve(process.cwd(), "mysql-migration.sql"), engine: my, transactional: false }
  ];
  for (const item of plan) {
    const found = item.engine === pg
      ? await pg.query("SELECT 1 FROM schema_migrations WHERE version = $1", [item.version])
      : await my.execute("SELECT 1 FROM schema_migrations WHERE version = ?", [item.version]);
    const rows = item.engine === pg ? found.rows : found[0];
    if (rows.length) continue;
    const statements = splitSql(await readFile(item.file, "utf8"));
    if (item.transactional) {
      const client = await pg.connect();
      try {
        await client.query("BEGIN");
        for (const statement of statements) await client.query(statement);
        await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [item.version]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } else {
      for (const statement of statements) await my.query(statement);
      await my.execute("INSERT INTO schema_migrations (version) VALUES (?)", [item.version]);
    }
  }
}
