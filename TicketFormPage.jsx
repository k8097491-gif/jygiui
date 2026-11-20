import { useQuery,useQueryClient } from "@tanstack/react-query";
import { ArrowLeft,Send } from "lucide-react";
import { Link,useNavigate } from "react-router-dom";
import { useState } from "react";
import { api } from "./api.js";
import { useAuth } from "./state.jsx";
import { useToast } from "./ToastProvider.jsx";
import { Button,ErrorState,Field,PageHeading,SelectField,Skeleton } from "./ui.jsx";
import { EmptyState } from "./ui.jsx";

const impacts=["One person","Several people","Teaching activity"];
const urgencies=["Low","Normal","Urgent"];
export default function TicketFormPage({ticket=null}){
 const {user}=useAuth();
 const queryClient=useQueryClient();
 const navigate=useNavigate();
 const {show}=useToast();
 const categories=useQuery({queryKey:["categories"],queryFn:async function(){return api("/api/categories");}});
 const requesters=useQuery({queryKey:["requesters"],queryFn:async function(){return api("/api/requesters");},enabled:["dispatcher","manager","admin"].includes(user.role)});
 const [form,setForm]=useState(function(){return {
  title:ticket?.title||"",description:ticket?.description||"",category:ticket?.category||"",
  impact:ticket?.impact||"One person",urgency:ticket?.urgency||"Normal",requesterId:""
 };});
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 async function submit(event){
  event.preventDefault();setBusy(true);setError("");
  try{
   const body={...form};
   if(!body.requesterId)delete body.requesterId;
   const result=await api(ticket?"/api/tickets/"+ticket.id:"/api/tickets",{method:ticket?"PUT":"POST",body});
   await Promise.all([queryClient.invalidateQueries({queryKey:["tickets"]}),queryClient.invalidateQueries({queryKey:["analytics"]})]);
   show(ticket?"Request details updated.":"Request sent to the support queue.");
   navigate("/app/tickets/"+result.ticket.id);
  }catch(err){setError(err.message);}
  finally{setBusy(false);}
 }
 if(categories.isLoading||requesters.isLoading)return <div className="mx-auto max-w-3xl" aria-busy="true" aria-label="Loading request form"><Skeleton className="mb-5 h-10"/><Skeleton className="h-96"/></div>;
 if(categories.isError)return <ErrorState title="Request form could not load" message={categories.error.message} onRetry={()=>categories.refetch()}/>;
 if(requesters.isError)return <ErrorState title="Requester list could not load" message={requesters.error.message} onRetry={()=>requesters.refetch()}/>;
 if(user.role==="specialist")return <EmptyState title="Request creation is not available for this role" description="You can work requests assigned to you from the support queue." action={<Link to="/app/tickets" className="inline-flex min-h-11 items-center border border-ink/20 bg-white px-4 text-sm font-semibold text-ink dark:border-white/20 dark:bg-ink-deep dark:text-white">Open support queue</Link>}/>;
 if(categories.data.items.length===0)return <EmptyState title="No active service categories" description="An administrator needs to add a category before requests can be submitted." action={<Link to="/app" className="inline-flex min-h-11 items-center border border-ink/20 bg-white px-4 text-sm font-semibold text-ink dark:border-white/20 dark:bg-ink-deep dark:text-white">Return to overview</Link>}/>;
 if(["dispatcher","manager","admin"].includes(user.role)&&requesters.data.items.length===0)return <EmptyState title="No active requester accounts" description="Create a requester account before submitting a request on someone else's behalf." action={<Link to="/app/settings" className="inline-flex min-h-11 items-center border border-ink/20 bg-white px-4 text-sm font-semibold text-ink dark:border-white/20 dark:bg-ink-deep dark:text-white">Open administration</Link>}/>;
 const canSelectRequester=["dispatcher","manager","admin"].includes(user.role);
 return <div className="mx-auto max-w-3xl">
  <Link to={ticket?"/app/tickets/"+ticket.id:"/app/tickets"} className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink dark:text-white/55 dark:hover:text-white"><ArrowLeft size={16}/>{ticket?"Back to request":"Back to queue"}</Link>
  <PageHeading title={ticket?"Edit request details":"Create a support request"} description="Include the service, where it happens, and what you have already tried. This helps support route your request."/>
  <form className="grid gap-6 border border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-ink-deep sm:p-8" onSubmit={submit}>
   {error?<p role="alert" className="border border-alert/20 bg-alert/5 px-4 py-3 text-sm text-alert">{error}</p>:null}
   {canSelectRequester?<SelectField label="Requester" name="requesterId" required value={form.requesterId} onChange={event=>setForm({...form,requesterId:event.target.value})}><option value="">Choose the student or staff member</option>{(requesters.data?.items||[]).map(function(item){return <option key={item.id} value={item.id}>{item.name} · {item.email}</option>;})}</SelectField>:null}
   <Field label="Short description" name="title" required minLength={5} maxLength={120} placeholder="For example, Wi-Fi keeps disconnecting in a teaching room" value={form.title} onChange={event=>setForm({...form,title:event.target.value})}/>
   <Field label="What is happening?" name="description" as="textarea" required minLength={15} maxLength={1200} placeholder="Include the affected service, location, and what you have already tried." value={form.description} onChange={event=>setForm({...form,description:event.target.value})}/>
   <SelectField label="Service category" name="category" required value={form.category||categories.data.items[0]?.name||""} onChange={event=>setForm({...form,category:event.target.value})}><option value="">Choose a category</option>{categories.data.items.map(function(item){return <option key={item.name} value={item.name}>{item.name}</option>;})}</SelectField>
   <fieldset className="grid gap-3 border-t border-ink/10 pt-5 dark:border-white/10"><legend className="px-1 text-sm font-semibold text-ink dark:text-white">How much is affected?</legend><div className="grid gap-2 sm:grid-cols-3">{impacts.map(function(value){return <label key={value} className={"flex min-h-12 cursor-pointer items-center gap-3 border px-3 text-sm "+(form.impact===value?"border-ink bg-signal-wash text-ink dark:border-signal dark:bg-signal/10":"border-ink/15 text-ink-soft dark:border-white/15 dark:text-white/65")}><input type="radio" name="impact" value={value} checked={form.impact===value} onChange={event=>setForm({...form,impact:event.target.value})}/>{value}</label>;})}</div></fieldset>
   <fieldset className="grid gap-3"><legend className="px-1 text-sm font-semibold text-ink dark:text-white">How urgent is it?</legend><div className="grid gap-2 sm:grid-cols-3">{urgencies.map(function(value){return <label key={value} className={"flex min-h-12 cursor-pointer items-center gap-3 border px-3 text-sm "+(form.urgency===value?"border-ink bg-signal-wash text-ink dark:border-signal dark:bg-signal/10":"border-ink/15 text-ink-soft dark:border-white/15 dark:text-white/65")}><input type="radio" name="urgency" value={value} checked={form.urgency===value} onChange={event=>setForm({...form,urgency:event.target.value})}/>{value}</label>;})}</div></fieldset>
   <p className="border-l-2 border-signal bg-campus px-4 py-3 text-xs leading-5 text-muted dark:bg-white/5 dark:text-white/50">Priority and service target are calculated from impact and urgency. Do not include passwords or recovery codes.</p>
   <div className="flex flex-wrap justify-end gap-2 border-t border-ink/10 pt-5 dark:border-white/10"><Link to={ticket?"/app/tickets/"+ticket.id:"/app/tickets"} className="inline-flex min-h-11 items-center border border-ink/15 px-4 text-sm font-semibold text-ink dark:border-white/15 dark:text-white">Cancel</Link><Button type="submit" variant="signal" loading={busy}>{ticket?"Save changes":"Send request"}<Send size={15}/></Button></div>
  </form>
 </div>;
}
