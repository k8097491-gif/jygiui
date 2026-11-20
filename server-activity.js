import { pg, mongo } from "./server-stores.js";
import { EventEmitter } from "node:events";

export const updates = new EventEmitter();
updates.setMaxListeners(0);
export async function queueActivity(client, event) {
  await client.query(
    "INSERT INTO event_outbox (id,aggregate_id,actor_id,event_type,payload,occurred_at) VALUES ($1,$2,$3,$4,$5::jsonb,$6)",
    [event.id,event.ticketId,event.actorId,event.type,JSON.stringify(event.payload || {}),event.at || new Date()]
  );
}
export async function publishActivityBatch() {
  const pending = await pg.query(
    "SELECT id,aggregate_id,actor_id,event_type,payload,occurred_at FROM event_outbox WHERE published_at IS NULL ORDER BY occurred_at LIMIT 50"
  );
  for (const row of pending.rows) {
    try {
      await mongo().collection("ticket_activity").updateOne(
        { _id: row.id },
        { $setOnInsert: { eventId:row.id, ticketId:row.aggregate_id, actorId:row.actor_id, type:row.event_type, payload:row.payload, occurredAt:row.occurred_at } },
        { upsert:true }
      );
      await pg.query("UPDATE event_outbox SET published_at=now(),attempts=attempts+1,last_error=NULL WHERE id=$1 AND published_at IS NULL", [row.id]);
      updates.emit("activity",{ticketId:row.aggregate_id});
    } catch (error) {
      await pg.query("UPDATE event_outbox SET attempts=attempts+1,last_error=$2 WHERE id=$1 AND published_at IS NULL", [row.id,String(error.message).slice(0,480)]);
    }
  }
}
export async function activityForTicket(ticketId, limit = 100) {
  return mongo().collection("ticket_activity").find({ ticketId }).sort({ occurredAt:1 }).limit(limit).toArray();
}
export async function deleteActivityForTicket(ticketId) {
  await mongo().collection("ticket_activity").deleteMany({ ticketId });
}
