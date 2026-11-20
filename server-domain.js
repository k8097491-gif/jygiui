export const ROLES = ["requester", "specialist", "dispatcher", "manager", "admin"];
export const STATUSES = ["New", "Assigned", "In progress", "Waiting", "Escalated", "Resolved", "Closed", "Reopened"];
export const PRIORITIES = ["Low", "Normal", "High", "Critical"];
const priorityMatrix = {
  "One person": { Low: "Low", Normal: "Normal", Urgent: "High" },
  "Several people": { Low: "Normal", Normal: "High", Urgent: "Critical" },
  "Teaching activity": { Low: "High", Normal: "Critical", Urgent: "Critical" }
};
export const RESPONSE_HOURS = { Critical: 4, High: 8, Normal: 24, Low: 72 };
export const TRANSITIONS = {
  New: ["Assigned"],
  Assigned: ["In progress", "Waiting", "Escalated"],
  "In progress": ["Waiting", "Escalated", "Resolved"],
  Waiting: ["In progress", "Escalated"],
  Escalated: ["Assigned", "In progress", "Resolved"],
  Resolved: ["Closed", "Reopened"],
  Reopened: ["In progress", "Waiting", "Escalated"],
  Closed: []
};
export function priorityFor(impact, urgency) {
  const result = priorityMatrix[impact] && priorityMatrix[impact][urgency];
  if (!result) throw Object.assign(new Error("Choose an available impact and urgency."), { status: 422, code: "INVALID_PRIORITY_INPUT" });
  return result;
}
export function dueDate(priority, from = new Date()) {
  const hours = RESPONSE_HOURS[priority];
  if (!hours) throw Object.assign(new Error("Choose an available priority."), { status: 422, code: "INVALID_PRIORITY" });
  return new Date(from.getTime() + hours * 3600000);
}
export function canReadTicket(user, ticket) {
  if (!user || !ticket) return false;
  if (["dispatcher", "manager", "admin"].includes(user.role)) return true;
  if (user.role === "requester") return ticket.requester_id === user.id;
  if (user.role === "specialist") return ticket.assignee_id === user.id;
  return false;
}
export function assertRole(user, roles) {
  if (!user || !roles.includes(user.role)) throw Object.assign(new Error("Your account cannot perform this action."), { status: 403, code: "FORBIDDEN" });
}
export function assertTicketAccess(user, ticket) {
  if (!canReadTicket(user, ticket)) throw Object.assign(new Error("This request is not available to your account."), { status: 404, code: "NOT_FOUND" });
}
export function assertTransition(status, next) {
  if (!TRANSITIONS[status] || !TRANSITIONS[status].includes(next)) throw Object.assign(new Error("That status change is not allowed. Refresh the request and choose a valid next step."), { status: 409, code: "INVALID_TRANSITION" });
}
export function safeUser(row) {
  if (!row) return null;
  return { id: row.id, name: row.name, email: row.email, role: row.role, team: row.team || null, active: Boolean(row.active), createdAt: row.created_at };
}
export function safeTicket(row) {
  if (!row) return null;
  return {
    id: row.id, requesterId: row.requester_id, assigneeId: row.assignee_id, title: row.title,
    description: row.description, category: row.category, impact: row.impact, urgency: row.urgency,
    priority: row.priority, status: row.status, group: row.group_name, dueAt: row.due_at,
    resolution: row.resolution, rating: row.rating, ratingComment: row.rating_comment,
    createdAt: row.created_at, updatedAt: row.updated_at, closedAt: row.closed_at, version: row.version
  };
}
