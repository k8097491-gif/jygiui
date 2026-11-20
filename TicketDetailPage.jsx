import { useEffect,useState } from "react";
import { useMutation,useQuery,useQueryClient } from "@tanstack/react-query";
import { ArrowLeft,CalendarClock,Check,Edit3,MessageSquare,MoreHorizontal,Send,ShieldAlert,UserRound } from "lucide-react";
import { Link,useNavigate,useParams } from "react-router-dom";
import { api } from "./api.js";
import { useAuth } from "./state.jsx";
import { useToast } from "./ToastProvider.jsx";
import StatusBadge from "./StatusBadge.jsx";
import TicketFormPage from "./TicketFormPage.jsx";
import { Button,EmptyState,ErrorState,Field,PageHeading,SelectField,Skeleton } from "./ui.jsx";

const stages=["New","Assigned","In progress","Resolved","Closed"];
const transitions={New:["Assigned"],Assigned:["In progress","Waiting","Escalated"],"In progress":["Waiting","Escalated","Resolved"],Waiting:["In progress","Escalated"],Escalated:["Assigned","In progress","Resolved"],Resolved:["Closed","Reopened"],Reopened:["In progress","Waiting","Escalated"],Closed:[]};
function dateLabel(value){return new Intl.DateTimeFormat(undefined,{dateStyle:"medium",timeStyle:"short"}).format(new Date(value));}
function ActivityTitle({event}) {
 const data=event.payload||{};
 if(event.type==="ticket.created")return "Request submitted";
 if(event.type==="ticket.updated")return "Request details updated";
 if(event.type==="ticket.assigned")return "Request assigned";
 if(event.type==="ticket.status")return "Status changed"+(data.from?" · "+data.from+" → "+data.to:"");
 if(event.type==="ticket.comment")return data.visibility==="internal"?"Internal work note":"Support update added";
 return event.type;
}
function RequestHistory({ticket,user}){
 const activity=(ticket.activity||[]).filter(function(event){return event.type!=="ticket.comment";});
 return <section className="border border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-ink-deep sm:p-7"><h2 className="text-lg font-semibold text-ink dark:text-white">Request history</h2>{activity.length===0?<p className="mt-4 text-sm text-muted dark:text-white/50">No service updates have been recorded yet.</p>:<ol className="mt-5 grid gap-0">{activity.map(function(event,index){return <li key={event.eventId||event._id||index} className="relative grid grid-cols-[1.5rem_minmax(0,1fr)] gap-3 pb-5 last:pb-0"><span className="relative grid size-6 place-items-center border border-ink/15 bg-white text-ink dark:border-white/15 dark:bg-ink-deep dark:text-signal">{index===0?<Check size={13}/>:<span className="size-1.5 bg-current"/>}{index<activity.length-1?<span className="absolute left-1/2 top-6 h-full w-px -translate-x-1/2 bg-ink/10 dark:bg-white/10"/>:null}</span><div><div className="flex flex-wrap items-baseline justify-between gap-2"><strong className="text-sm font-semibold text-ink dark:text-white"><ActivityTitle event={event}/></strong><span className="text-[11px] text-muted dark:text-white/45">{event.actorName}</span><time className="text-[11px] text-muted dark:text-white/40">{dateLabel(event.occurredAt)}</time></div>{event.payload?.reason?<p className="mt-1 text-sm leading-6 text-muted dark:text-white/55">{event.payload.reason}</p>:null}{event.payload?.resolution?<p className="mt-1 text-sm leading-6 text-muted dark:text-white/55">{event.payload.resolution}</p>:null}</div></li>;})}</ol>}<p className="mt-5 border-t border-ink/10 pt-4 text-xs text-muted dark:border-white/10 dark:text-white/40">Activity journal is stored in MongoDB and delivered through a retryable PostgreSQL outbox.</p></section>;
}
function Conversation({ticket,user,onChanged}){
 const [body,setBody]=useState("");
 const [visibility,setVisibility]=useState("public");
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 const canUseInternal=["specialist","dispatcher","manager","admin"].includes(user.role);
 async function submit(event){
  event.preventDefault();setError("");setBusy(true);
  try{await api("/api/tickets/"+ticket.id+"/comments",{method:"POST",body:{body,visibility:canUseInternal?visibility:"public"}});setBody("");await onChanged();}
  catch(err){setError(err.message);}
  finally{setBusy(false);}
 }
 return <section className="border border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-ink-deep sm:p-7"><div className="flex items-center gap-2"><MessageSquare size={17} className="text-muted dark:text-white/50"/><h2 className="text-lg font-semibold text-ink dark:text-white">Conversation</h2></div>{ticket.comments.length===0?<p className="mt-4 text-sm text-muted dark:text-white/50">No messages have been added yet.</p>:<ul className="mt-5 grid gap-3">{ticket.comments.map(function(comment){return <li key={comment.id} className="border border-ink/10 p-4 dark:border-white/10"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-ink dark:text-white">{comment.author_id===user.id?"You":"Support team"}</strong><span className="text-[10px] font-semibold uppercase tracking-[.12em] text-muted dark:text-white/40">{comment.visibility==="internal"?"Internal note":"Visible update"} · {dateLabel(comment.created_at)}</span></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-soft dark:text-white/70">{comment.body}</p></li>;})}</ul>}
  {ticket.status!=="Closed"?<form className="mt-5 grid gap-3 border-t border-ink/10 pt-5 dark:border-white/10" onSubmit={submit}>{error?<p className="text-sm text-alert" role="alert">{error}</p>:null}{canUseInternal?<SelectField label="Visibility" name="visibility" value={visibility} onChange={event=>setVisibility(event.target.value)}><option value="public">Visible to requester</option><option value="internal">Support staff only</option></SelectField>:null}<Field label={user.role==="requester"?"Message to support":"Add an update"} name="body" as="textarea" required minLength={2} maxLength={800} hint="Never include a password or recovery code." placeholder="Share a question, finding, or next step…" value={body} onChange={event=>setBody(event.target.value)}/><div className="flex justify-end"><Button type="submit" variant="dark" loading={busy}>Send update<Send size={14}/></Button></div></form>:null}
 </section>;
}
export default function TicketDetailPage(){
 const {id}=useParams();
 const {user}=useAuth();
 const {show}=useToast();
 const navigate=useNavigate();
 const queryClient=useQueryClient();
 const [editing,setEditing]=useState(false);
 const [reason,setReason]=useState("");
 const [nextStatus,setNextStatus]=useState("");
 const [resolution,setResolution]=useState("");
 const [comment,setComment]=useState("");
 const [score,setScore]=useState(5);
 const [assignment,setAssignment]=useState({assigneeId:"",group:"",reason:"Reassigned by service desk."});
 const [actionError,setActionError]=useState("");
 const detail=useQuery({queryKey:["ticket",id],queryFn:async function(){return api("/api/tickets/"+id);}});
 const specialists=useQuery({queryKey:["specialists"],queryFn:async function(){return api("/api/specialists");},enabled:["dispatcher","manager","admin"].includes(user.role)});
 const categories=useQuery({queryKey:["categories"],queryFn:async function(){return api("/api/categories");}});
 const support=["specialist","dispatcher","manager","admin"].includes(user.role);
 const ticket=detail.data?.ticket;
 useEffect(function(){if(ticket)setAssignment({assigneeId:ticket.assigneeId||"",group:ticket.group||"",reason:"Reassigned by service desk."});},[ticket?.id,ticket?.assigneeId,ticket?.group]);
 async function refresh(){
  await Promise.all([queryClient.invalidateQueries({queryKey:["ticket",id]}),queryClient.invalidateQueries({queryKey:["tickets"]}),queryClient.invalidateQueries({queryKey:["analytics"]}),queryClient.invalidateQueries({queryKey:["notifications"]})]);
 }
 async function changeStatus(status,reasonOverride){
  setActionError("");
  try{await api("/api/tickets/"+id+"/transitions",{method:"POST",body:{status,reason:reasonOverride===undefined?reason:reasonOverride,resolution}});setReason("");setResolution("");await refresh();show("Request status updated.");}
  catch(error){setActionError(error.message);}
 }
 async function assign(event){
  event.preventDefault();setActionError("");
  try{await api("/api/tickets/"+id+"/assignment",{method:"PATCH",body:assignment});await refresh();show("Request assignment saved.");}
  catch(error){setActionError(error.message);}
 }
 async function rate(event){
  event.preventDefault();setActionError("");
  try{await api("/api/tickets/"+id+"/rating",{method:"POST",body:{score:Number(score),comment}});await refresh();show("Thank you. Your feedback was recorded.");}
  catch(error){setActionError(error.message);}
 }
 async function deleteRequest(){
  if(!window.confirm("Delete this new request? Its comments and activity will also be removed."))return;
  try{await api("/api/tickets/"+id,{method:"DELETE"});await refresh();show("New request deleted.");navigate("/app/tickets");}
  catch(error){setActionError(error.message);}
 }
 if(detail.isLoading)return <div className="mx-auto max-w-5xl" aria-busy="true" aria-label="Loading request"><Skeleton className="mb-5 h-9"/><Skeleton className="h-52"/><Skeleton className="mt-4 h-72"/></div>;
 if(detail.isError)return <ErrorState title="Request could not load" message={detail.error.message} onRetry={()=>detail.refetch()}/>;
 if(!ticket)return <EmptyState title="Request not found" description="It may have been deleted, or your account may not have access." action={<Link to="/app/tickets" className="inline-flex min-h-11 items-center border border-ink/20 bg-white px-4 text-sm font-semibold text-ink dark:border-white/20 dark:bg-ink-deep dark:text-white">Back to requests</Link>}/>;
 if(editing)return <TicketFormPage ticket={ticket}/>;
 const nextStatuses=support?(transitions[ticket.status]||[]):(ticket.status==="Resolved"?["Closed","Reopened"]:[]);
 const activeStage=Math.max(0,stages.indexOf(ticket.status));
 const dueDate=new Date(ticket.dueAt);
 const isOverdue=dueDate<new Date()&&!["Closed","Resolved"].includes(ticket.status);
 return <div className="mx-auto max-w-6xl">
  <Link to="/app/tickets" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink dark:text-white/55 dark:hover:text-white"><ArrowLeft size={16}/>Back to requests</Link>
  <PageHeading title={ticket.title} description={ticket.description} action={<div className="flex flex-wrap items-center gap-2"><StatusBadge status={ticket.status}/>{user.role==="requester"&&ticket.status==="New"?<Button variant="outline" size="sm" onClick={()=>setEditing(true)}><Edit3 size={14}/>Edit</Button>:null}{user.role==="requester"&&ticket.status==="New"?<Button variant="danger" size="sm" onClick={deleteRequest}>Delete</Button>:null}</div>}/>
  {actionError?<p className="mb-4 border border-alert/20 bg-alert/5 px-4 py-3 text-sm text-alert" role="alert">{actionError}</p>:null}
  <section className="grid gap-4 border border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-ink-deep sm:p-7" aria-label="Request summary">
   <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.12em] text-muted dark:text-white/45"><span>{ticket.id}</span><span>·</span><span>{ticket.category}</span><span>·</span><span>{ticket.priority} priority</span></div><span className={"inline-flex items-center gap-2 text-xs font-semibold "+(isOverdue?"text-alert":"text-muted dark:text-white/50")}><CalendarClock size={15}/>{isOverdue?"Past service target":"Target "+dateLabel(ticket.dueAt)}</span></div>
   <div className="grid grid-cols-5 gap-1" aria-label={"Current stage: "+ticket.status}>{stages.map(function(stage,index){const currentIndex=ticket.status==="Waiting"||ticket.status==="Escalated"||ticket.status==="Reopened"?2:activeStage;const completed=index<currentIndex;const current=index===currentIndex;return <div key={stage}><div className={"h-1 "+(completed||current?"bg-signal":"bg-ink/10 dark:bg-white/10")}/><span className={"mt-2 block text-[9px] font-semibold sm:text-[11px] "+(current?"text-ink dark:text-signal":"text-muted/60 dark:text-white/35")}>{stage}</span></div>;})}</div>
   <div className="grid gap-3 border-t border-ink/10 pt-4 text-sm dark:border-white/10 sm:grid-cols-3"><p><span className="block text-xs text-muted dark:text-white/45">Requester</span><strong className="mt-1 block font-semibold text-ink dark:text-white">{ticket.requesterName||ticket.requesterId}</strong></p><p><span className="block text-xs text-muted dark:text-white/45">Assigned group</span><strong className="mt-1 block font-semibold text-ink dark:text-white">{ticket.group||"Unassigned"}</strong></p><p><span className="block text-xs text-muted dark:text-white/45">Support specialist</span><strong className="mt-1 block font-semibold text-ink dark:text-white">{ticket.assigneeName||"Not assigned"}</strong></p></div>
  </section>
  <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
   <div className="grid content-start gap-4">
    <RequestHistory ticket={ticket} user={user}/>
    <Conversation ticket={ticket} user={user} onChanged={refresh}/>
   </div>
   <aside className="grid content-start gap-4">
    {support&&["dispatcher","manager","admin"].includes(user.role)?<form className="border border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-ink-deep sm:p-6" onSubmit={assign}><h2 className="flex items-center gap-2 text-base font-semibold"><UserRound size={17}/>Ownership</h2><p className="mt-1 text-xs leading-5 text-muted dark:text-white/45">The selected specialist and group become part of the ticket record.</p>{specialists.isLoading?<Skeleton className="mt-4 h-12"/>:specialists.isError?<p className="mt-3 text-sm text-alert">Specialist list could not load.</p>:<div className="mt-4 grid gap-3"><SelectField label="Support specialist" name="assigneeId" required value={assignment.assigneeId} onChange={event=>setAssignment({...assignment,assigneeId:event.target.value})}><option value="">Choose a specialist</option>{specialists.data.items.map(function(person){return <option value={person.id} key={person.id}>{person.name} · {person.team||"No group"}</option>;})}</SelectField><SelectField label="Support group" name="group" required value={assignment.group} onChange={event=>setAssignment({...assignment,group:event.target.value})}><option value="">Choose a group</option>{categories.data?.items.map(function(item){return <option value={item.group} key={item.name}>{item.group}</option>;})}</SelectField><Field label="Reason" name="assignmentReason" required minLength={3} maxLength={400} value={assignment.reason} onChange={event=>setAssignment({...assignment,reason:event.target.value})}/><Button type="submit" variant="outline"><UserRound size={14}/>Save assignment</Button></div>}</form>:null}
    {support&&nextStatuses.length>0?<form className="border border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-ink-deep sm:p-6" onSubmit={function(event){event.preventDefault();changeStatus(event.currentTarget.elements.status.value);}}><h2 className="flex items-center gap-2 text-base font-semibold"><MoreHorizontal size={17}/>Update status</h2><div className="mt-4 grid gap-3"><SelectField label="Next status" name="status" value={nextStatus||nextStatuses[0]||""} onChange={event=>setNextStatus(event.target.value)}>{nextStatuses.map(function(status){return <option key={status} value={status}>{status}</option>;})}</SelectField>{(nextStatus||nextStatuses[0])==="Resolved"?<Field label="Resolution and cause" name="resolution" as="textarea" minLength={8} maxLength={1000} required value={resolution} onChange={event=>setResolution(event.target.value)} placeholder="Describe what caused the issue and how it was resolved."/>:null}{![("Resolved"),("Closed")].includes(nextStatus||nextStatuses[0])?<Field label="Reason for this change" name="reason" as="textarea" minLength={3} maxLength={400} required value={reason} onChange={event=>setReason(event.target.value)} placeholder="Explain the handoff or next step."/>:null}<Button type="submit" variant="dark">Save status<Check size={14}/></Button></div></form>:null}
    {!support&&ticket.status==="Resolved"?<div className="border border-signal/60 bg-signal-wash p-5 dark:border-signal/25 dark:bg-signal/10"><h2 className="text-base font-semibold text-ink dark:text-white">Does the fix work for you?</h2><p className="mt-2 text-sm leading-6 text-ink-soft dark:text-white/65">{ticket.resolution||"Support marked this request as resolved."}</p><div className="mt-4 flex flex-wrap gap-2"><Button variant="signal" onClick={()=>changeStatus("Closed")}>Confirm and close<Check size={15}/></Button><Button variant="outline" onClick={()=>changeStatus("Reopened","Requester confirmed the issue is still happening.")}>It is still happening</Button></div></div>:null}
    {ticket.status==="Closed"&&user.role==="requester"&&!ticket.rating?<form className="border border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-ink-deep sm:p-6" onSubmit={rate}><h2 className="text-base font-semibold">Rate the support</h2><p className="mt-1 text-xs text-muted dark:text-white/45">One rating per closed request.</p><fieldset className="mt-4"><legend className="text-xs font-semibold">How was the result?</legend><div className="mt-2 flex gap-2">{[1,2,3,4,5].map(function(value){return <label key={value} className={"grid size-10 cursor-pointer place-items-center border text-sm font-semibold "+(score===value?"border-ink bg-signal text-ink":"border-ink/15 dark:border-white/15")}><input className="sr-only" type="radio" name="score" value={value} checked={score===value} onChange={()=>setScore(value)}/><span aria-hidden="true">{value}</span><span className="sr-only">{value} out of 5</span></label>;})}</div></fieldset><label className="mt-4 grid gap-1 text-xs font-medium">Comment<input value={comment} maxLength={280} onChange={event=>setComment(event.target.value)} className="min-h-10 border border-ink/15 bg-white px-3 text-sm dark:border-white/15 dark:bg-ink"/></label><Button type="submit" className="mt-4" variant="signal">Send feedback<Send size={14}/></Button></form>:null}
    {ticket.rating?<div className="border border-green/20 bg-green/5 p-5 text-sm dark:bg-green/10"><strong>Requester feedback · {ticket.rating}/5</strong>{ticket.ratingComment?<p className="mt-2 text-muted dark:text-white/55">{ticket.ratingComment}</p>:null}</div>:null}
    <div className="border border-ink/10 p-5 text-xs leading-5 text-muted dark:border-white/10 dark:text-white/40"><span className="inline-flex items-center gap-2 font-semibold text-ink dark:text-white"><ShieldAlert size={14}/>Service data</span><p className="mt-2">Created {dateLabel(ticket.createdAt)} · updated {dateLabel(ticket.updatedAt)}. All sample people and ticket content are fictional.</p></div>
   </aside>
  </div>
 </div>;
}
