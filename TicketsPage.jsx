import { useDeferredValue,useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Filter,Plus,Search,SlidersHorizontal,X } from "lucide-react";
import { Link,useSearchParams } from "react-router-dom";
import { api } from "./api.js";
import { useAuth } from "./state.jsx";
import StatusBadge from "./StatusBadge.jsx";
import { Button,EmptyState,ErrorState,PageHeading,Skeleton } from "./ui.jsx";

const statuses=["New","Assigned","In progress","Waiting","Escalated","Resolved","Closed","Reopened"];
const priorities=["Critical","High","Normal","Low"];
function dateLabel(value){return new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(new Date(value));}
export default function TicketsPage(){
 const {user}=useAuth();
 const [params,setParams]=useSearchParams();
 const [search,setSearch]=useState(params.get("query")||"");
 const deferred=useDeferredValue(search.trim());
 const filters={query:deferred,status:params.get("status")||"",category:params.get("category")||"",priority:params.get("priority")||""};
 const key=["tickets",filters];
 const tickets=useQuery({queryKey:key,queryFn:async function(){
  const query=new URLSearchParams();
  Object.entries(filters).forEach(function(entry){if(entry[1])query.set(entry[0],entry[1]);});
  return api("/api/tickets"+(query.size?"?"+query.toString():""));
 }});
 const categories=useQuery({queryKey:["categories"],queryFn:async function(){return api("/api/categories");}});
 function setFilter(name,value){const next=new URLSearchParams(params);if(value)next.set(name,value);else next.delete(name);setParams(next,{replace:true});}
 function reset(){setSearch("");setParams({}, {replace:true});}
 const activeCount=Object.values(filters).filter(Boolean).length;
 return <div>
  <PageHeading title={user.role==="requester"?"Your requests":"Support queue"} description={user.role==="requester"?"Review updates, service targets, and next steps for your requests.":"Find, filter, and open requests in the queue."} action={user.role!=="specialist"?<Link to="/app/tickets/new" className="inline-flex min-h-11 items-center gap-2 border border-signal bg-signal px-4 text-sm font-semibold text-ink hover:bg-[#ffe85e]"><Plus size={17}/>New request</Link>:null}/>
  <section className="border border-ink/10 bg-white dark:border-white/10 dark:bg-ink-deep" aria-label="Request filters">
   <div className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_repeat(3,minmax(145px,.34fr))]">
    <label className="relative block"><span className="sr-only">Search requests</span><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted/65 dark:text-white/40" size={16}/><input type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search title, description, or ticket ID" className="min-h-11 w-full border border-ink/15 bg-white pl-10 pr-3 text-sm outline-none focus:border-blue focus:ring-2 focus:ring-blue/15 dark:border-white/15 dark:bg-ink dark:text-white"/></label>
    <label className="grid gap-1 text-xs font-medium text-muted dark:text-white/55"><span>Status</span><select value={filters.status} onChange={event=>setFilter("status",event.target.value)} className="min-h-11 border border-ink/15 bg-white px-3 text-sm text-ink dark:border-white/15 dark:bg-ink dark:text-white"><option value="">All statuses</option>{statuses.map(function(status){return <option key={status}>{status}</option>;})}</select></label>
    <label className="grid gap-1 text-xs font-medium text-muted dark:text-white/55"><span>Category</span><select value={filters.category} onChange={event=>setFilter("category",event.target.value)} className="min-h-11 border border-ink/15 bg-white px-3 text-sm text-ink dark:border-white/15 dark:bg-ink dark:text-white"><option value="">All categories</option>{(categories.data?.items||[]).map(function(item){return <option value={item.name} key={item.name}>{item.name}</option>;})}</select></label>
    <label className="grid gap-1 text-xs font-medium text-muted dark:text-white/55"><span>Priority</span><select value={filters.priority} onChange={event=>setFilter("priority",event.target.value)} className="min-h-11 border border-ink/15 bg-white px-3 text-sm text-ink dark:border-white/15 dark:bg-ink dark:text-white"><option value="">All priorities</option>{priorities.map(function(priority){return <option key={priority}>{priority}</option>;})}</select></label>
   </div>
   <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 px-4 py-3 text-xs text-muted dark:border-white/10 dark:text-white/45"><span className="inline-flex items-center gap-2"><SlidersHorizontal size={14}/>{tickets.data?tickets.data.items.length+" shown":"Loading requests"}{activeCount?" · "+activeCount+" active filters":""}</span>{activeCount?<button type="button" className="inline-flex items-center gap-1 font-semibold underline underline-offset-4" onClick={reset}><X size={13}/>Clear filters</button>:<span>Search updates as you type.</span>}</div>
  </section>
  <div className="mt-4">
   {tickets.isLoading?<div className="grid gap-2" aria-busy="true" aria-label="Loading request list">{[1,2,3,4,5].map(function(n){return <Skeleton className="h-24" key={n}/>})}</div>:tickets.isError?<ErrorState title="Queue could not load" message={tickets.error.message} onRetry={()=>tickets.refetch()}/>:tickets.data.items.length===0?<EmptyState title={activeCount?"No requests match those filters":"No requests in this view"} description={activeCount?"Adjust the search or clear one of the filters.":user.role==="specialist"?"Requests assigned to you will appear here.":"Create a request to start the service workflow."} action={<div className="flex justify-center gap-2">{activeCount?<Button variant="outline" onClick={reset}>Clear filters</Button>:null}{user.role!=="specialist"?<Link to="/app/tickets/new" className="inline-flex min-h-11 items-center gap-2 border border-signal bg-signal px-4 text-sm font-semibold text-ink"><Plus size={15}/>Create a request</Link>:null}</div>}/>:<div className="border border-ink/10 bg-white dark:border-white/10 dark:bg-ink-deep"><div className="hidden grid-cols-[minmax(0,1fr)_150px_140px_160px] gap-4 border-b border-ink/10 px-5 py-3 text-[10px] font-bold uppercase tracking-[.12em] text-muted/70 dark:border-white/10 dark:text-white/35 md:grid"><span>Request</span><span>Owner</span><span>Service target</span><span>Priority · status</span></div><ul className="divide-y divide-ink/10 dark:divide-white/10">{tickets.data.items.map(function(ticket){return <li key={ticket.id}><Link to={"/app/tickets/"+ticket.id} className="grid gap-3 px-4 py-4 transition hover:bg-campus/70 dark:hover:bg-white/5 md:grid-cols-[minmax(0,1fr)_150px_140px_160px] md:items-center md:gap-4 md:px-5"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-bold uppercase tracking-[.1em] text-muted dark:text-white/40">{ticket.id.slice(0,8)}</span><span className="text-[10px] text-muted dark:text-white/40">{ticket.category}</span></div><strong className="mt-1 block truncate text-sm font-semibold text-ink dark:text-white">{ticket.title}</strong><p className="mt-1 line-clamp-1 text-xs text-muted dark:text-white/45">{ticket.description}</p></div><span className="text-xs text-muted dark:text-white/55">{user.role==="requester"?"Support team":"Requester"}<strong className="mt-1 block truncate text-ink dark:text-white">{ticket.group}</strong></span><span className="text-xs text-muted dark:text-white/55">Target<strong className={"mt-1 block "+(new Date(ticket.dueAt)<new Date()&&!["Resolved","Closed"].includes(ticket.status)?"text-alert":"text-ink dark:text-white")}>{dateLabel(ticket.dueAt)}</strong></span><span className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-bold uppercase tracking-[.1em]">{ticket.priority}</span><StatusBadge status={ticket.status}/></span></Link></li>;})}</ul></div>}
  </div>
 </div>;
}
