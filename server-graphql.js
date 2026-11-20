import { buildSchema } from "graphql";
import { createHandler } from "graphql-http/lib/use/express";
import { listTickets, getTicket, createTicket, transitionTicket } from "./server-tickets.js";
import { loadAnalytics } from "./server-analytics-client.js";

const schema=buildSchema(`
  type User { id: ID!, name: String!, email: String!, role: String! }
  type Comment { id: ID!, authorId: String!, body: String!, visibility: String!, createdAt: String! }
  type Activity { eventId: ID!, type: String!, actorId: String!, occurredAt: String! }
  type Ticket {
    id: ID!, requesterId: String!, assigneeId: String, title: String!, description: String!,
    category: String!, impact: String!, urgency: String!, priority: String!, status: String!,
    group: String!, dueAt: String!, resolution: String, rating: Int, ratingComment: String,
    createdAt: String!, updatedAt: String!, version: Int!, comments: [Comment!]
  }
  type CategoryCount { name: String!, count: Int! }
  type Analytics { total: Int!, open: Int!, overdue: Int!, averageRating: Float, byCategory: [CategoryCount!]! }
  input NewTicketInput { title: String!, description: String!, category: String!, impact: String!, urgency: String!, requesterId: String }
  type Query {
    me: User!
    tickets(query: String, status: String, category: String, priority: String): [Ticket!]!
    ticket(id: ID!): Ticket
    analytics: Analytics!
  }
  type Mutation {
    createTicket(input: NewTicketInput!): Ticket!
    transitionTicket(id: ID!, status: String!, reason: String, resolution: String): Ticket!
  }
`);
function requireUser(context) {
  if (!context.user) throw Object.assign(new Error("Sign in to use the API."), { status:401 });
  return context.user;
}
function iso(value) { return value instanceof Date ? value.toISOString() : value; }
function ticketView(ticket) {
  if (!ticket) return ticket;
  return {
    ...ticket,
    dueAt:iso(ticket.dueAt),
    createdAt:iso(ticket.createdAt),
    updatedAt:iso(ticket.updatedAt),
    comments:ticket.comments?.map(function(comment){
      return {id:comment.id,authorId:comment.authorId||comment.author_id,body:comment.body,visibility:comment.visibility,createdAt:iso(comment.createdAt||comment.created_at)};
    })??null
  };
}
const rootValue={
  me: function (_,__,context) { return requireUser(context); },
  tickets: async function (_,args,context) { return (await listTickets(requireUser(context),args)).map(ticketView); },
  ticket: async function (_,args,context) { return ticketView(await getTicket(requireUser(context),args.id)); },
  analytics: function (_,__,context) { return loadAnalytics(requireUser(context)); },
  createTicket: async function (_,args,context) { return ticketView(await createTicket(requireUser(context),args.input)); },
  transitionTicket: async function (_,args,context) { return ticketView(await transitionTicket(requireUser(context),args.id,args)); }
};
export function graphqlHandler(resolveUser) {
  return createHandler({
    schema,
    rootValue,
    context: async function (request) {
      return { user:await resolveUser(request.raw) };
    }
  });
}
