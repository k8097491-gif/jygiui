import test from "node:test";
import assert from "node:assert/strict";
import { priorityFor,dueDate,canReadTicket,assertTransition,TRANSITIONS } from "./server-domain.js";

test("priority matrix reflects impact and urgency",function(){
  assert.equal(priorityFor("One person","Low"),"Low");
  assert.equal(priorityFor("Several people","Normal"),"High");
  assert.equal(priorityFor("Teaching activity","Urgent"),"Critical");
});
test("invalid priority inputs fail with a validation status",function(){
  assert.throws(function(){priorityFor("Campus","Low");},function(error){return error.status===422;});
});
test("response target is derived from the priority",function(){
  const start=new Date("2026-01-01T00:00:00Z");
  assert.equal(dueDate("High",start).toISOString(),"2026-01-01T08:00:00.000Z");
});
test("ticket visibility follows role ownership",function(){
  const ticket={requester_id:"student",assignee_id:"agent"};
  assert.equal(canReadTicket({id:"student",role:"requester"},ticket),true);
  assert.equal(canReadTicket({id:"other",role:"requester"},ticket),false);
  assert.equal(canReadTicket({id:"agent",role:"specialist"},ticket),true);
  assert.equal(canReadTicket({id:"other",role:"specialist"},ticket),false);
  assert.equal(canReadTicket({id:"manager",role:"manager"},ticket),true);
});
test("lifecycle permits only the declared status transitions",function(){
  for(const [status,nexts] of Object.entries(TRANSITIONS)) for(const next of nexts) assert.doesNotThrow(function(){assertTransition(status,next);});
  assert.throws(function(){assertTransition("Closed","In progress");},function(error){return error.status===409;});
});
