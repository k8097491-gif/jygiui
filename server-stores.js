import pgModule from "pg";
import mysql from "mysql2/promise";
import { MongoClient } from "mongodb";

const { Pool } = pgModule;
export const pg = new Pool({ connectionString: process.env.POSTGRES_URL, max: 15, idleTimeoutMillis: 30000 });
pg.on("error", function (error) { console.error("PostgreSQL idle pool error", error); });

const mysqlUrl = new URL(process.env.MYSQL_URL);
export const my = mysql.createPool({
  host: mysqlUrl.hostname,
  port: Number(mysqlUrl.port || 3306),
  user: decodeURIComponent(mysqlUrl.username),
  password: decodeURIComponent(mysqlUrl.password),
  database: mysqlUrl.pathname.replace(/^\//, ""),
  waitForConnections: true,
  connectionLimit: 12,
  queueLimit: 0
});
export const mongoClient = new MongoClient(process.env.MONGO_URL, { maxPoolSize: 20, serverSelectionTimeoutMS: 5000 });
export const mongo = function () { return mongoClient.db(process.env.MONGO_DATABASE || "campus_activity"); };
export async function connectStores() {
  await Promise.all([pg.query("SELECT 1"), my.query("SELECT 1")]);
  await mongoClient.connect();
  await mongo().command({ ping: 1 });
  await mongo().collection("ticket_activity").createIndex({ ticketId: 1, occurredAt: 1 });
}
export async function closeStores() {
  await Promise.allSettled([pg.end(), my.end(), mongoClient.close()]);
}
