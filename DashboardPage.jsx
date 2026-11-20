import { useQuery } from "@tanstack/react-query";
import { ArrowRight,ArrowUpRight,Clock3,Plus,Star,Ticket } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "./api.js";
import { useAuth } from "./state.jsx";
import StatusBadge from "./StatusBadge.jsx";
import { EmptyState,ErrorState,PageHeading,Skeleton } from "./ui.jsx";

function dateLabel(value){return new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(new Date(value));}
function Metric({label,value,note,icon:Icon,accent=false}) {
 return <div className={"min-w-0 border border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-ink-deep "+(accent?"border-t-2 border-t-signal":"")}>
  <div className="flex items-start justify-between gap-3"><p className="text-sm font-medium text-muted dark:text-white/55">{label}</p><Icon size={17} className={accent?"text-ink dark:text-signal":"text-muted dark:text-white/40"}/></div>
  <p className="mt-4 text-4xl font-semibold tracking-[-.04em] text-ink dark:text-white">{value}</p><p className="mt-2 text-xs text-muted dark:text-white/40">{note}</p>
 </div>;
}
export default function DashboardPage(){
 const {user}=useAuth();
 const analytics=useQuery({queryKey:["analytics"],queryFn:async function(){return api("/api/analytics");}});
 const tickets=useQuery({queryKey:["tickets",{limit:6}],queryFn:async function(){return api("/api/tickets?limit=6");}});
 return <div>
  <PageHeading title={"Good to see you, "+user.name.split(" ")[0]+"."} description="Here is the current view of your campus support work." action={user.role!=="specialist"?<Link to="/app/tickets/new" className="inline-flex min-h-11 items-center gap-2 border border-signal bg-signal px-4 text-sm font-semibold text-ink transition hover:bg-[#ffe85e] focus-visible:outline-2 focus-visible:outline-offset-2"><Plus size={17}/>New request</Link>:null}/>
  {analytics.isLoading?<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true" aria-label="Loading service summary">{[1,2,3,4].map(function(n){return <Skeleton className="h-36" key={n}/>})}</div>:analytics.isError?<ErrorState title="Analytics could not load" message={analytics.error.message} onRetry={()=>analytics.refetch()}/>:<section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Support summary">
   <Metric label="Open requests" value={analytics.data.open} note={"Across "+analytics.data.total+" visible records"} icon={Ticket} accent/>
   <Metric label="Past service target" value={analytics.data.overdue} note="Requests needing attention" icon={Clock3}/>
   <Metric label="Average rating" value={analytics.data.averageRating===null?"—":analytics.data.averageRating.toFixed(1)} note={analytics.data.averageRating===null?"No requester ratings yet":"From closed requests"} icon={Star}/>
   <Metric label="Service categories" value={analytics.data.byCategory.length} note="Categories with visible requests" icon={ArrowUpRight}/>
  </section>}
  <div className="mt-8 grid gap-5 xl:grid-cols-[.92fr_1.08fr]">
   <section className="border border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-ink-deep sm:p-7">
    <div className="mb-6 flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.13em] text-muted/70 dark:text-white/40">Service pattern</p><h2 className="mt-1 text-xl font-semibold tracking-tight text-ink dark:text-white">Requests by category</h2></div><span className="text-xs text-muted dark:text-white/40">Current role view</span></div>
    {analytics.isLoading?<div className="grid gap-4" aria-busy="true" aria-label="Loading category chart">{[1,2,3,4].map(function(n){return <Skeleton className="h-7" key={n}/>})}</div>:analytics.isError?<p className="text-sm text-alert" role="alert">Category data could not load. Retry the analytics summary.</p>:analytics.data.byCategory.length===0?<EmptyState title="No requests to chart yet" description="Requests that match your role will appear here once they are created."/>:<div role="img" aria-label={"Request count by category: "+analytics.data.byCategory.map(function(item){return item.name+" "+item.count}).join(", ")} className="grid gap-5">{analytics.data.byCategory.map(function(item,index){const max=Math.max(1,...analytics.data.byCategory.map(function(row){return row.count;}));return <div key={item.name} className="grid grid-cols-[minmax(0,1fr)_2.4rem] items-center gap-x-4 gap-y-2"><div className="truncate text-sm font-medium text-ink-soft dark:text-white/70">{item.name}</div><strong className="text-right text-sm text-ink dark:text-white">{item.count}</strong><div className="col-span-2 h-2 overflow-hidden bg-campus dark:bg-white/10"><span className={"block h-full origin-left bg-signal "+(index===1?"bg-blue":"")+(index===2?" bg-green":"")} style={{width:(item.count/max*100)+"%"}}/></div></div>;})}</div>}
    <p className="mt-6 border-t border-ink/10 pt-4 text-xs leading-5 text-muted dark:border-white/10 dark:text-white/40">Counts are calculated from the live database for your current role. The demo dataset is fictional.</p>
   </section>
   <section className="min-w-0 border border-ink/10 bg-white dark:border-white/10 dark:bg-ink-deep">
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink/10 px-5 py-5 dark:border-white/10 sm:px-7">
     <div><p className="text-xs font-semibold uppercase tracking-[.13em] text-muted/70 dark:text-white/40">Your workspace</p><h2 className="mt-1 text-xl font-semibold tracking-tight text-ink dark:text-white">Requests to follow</h2></div>
     <Link to="/app/tickets" className="inline-flex items-center gap-1 text-xs font-semibold text-ink hover:underline hover:underline-offset-4 dark:text-white">View all<ArrowRight size={14}/></Link>
    </div>
    {tickets.isLoading?<div className="grid gap-3 p-5" aria-busy="true" aria-label="Loading requests">{[1,2,3,4].map(function(n){return <Skeleton className="h-20" key={n}/>})}</div>:tickets.isError?<div className="p-5"><ErrorState title="Requests could not load" message={tickets.error.message} onRetry={()=>tickets.refetch()}/></div>:tickets.data.items.length===0?<div className="p-5"><EmptyState title="No requests in this view" description={user.role==="specialist"?"Requests assigned to you will appear here.":"Create a support request to start a trackable conversation."} action={user.role!=="specialist"?<Link to="/app/tickets/new" className="inline-flex min-h-11 items-center gap-2 border border-signal bg-signal px-4 text-sm font-semibold text-ink"><Plus size={15}/>Create a request</Link>:null}/></div>:<ul className="divide-y divide-ink/10 dark:divide-white/10">{tickets.data.items.map(function(ticket){return <li key={ticket.id}><Link to={"/app/tickets/"+ticket.id} className="grid gap-3 px-5 py-4 transition hover:bg-campus/70 dark:hover:bg-white/5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-7"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-bold uppercase tracking-[.12em] text-muted dark:text-white/45">{ticket.id.slice(0,8)}</span><StatusBadge status={ticket.status}/></div><strong className="mt-2 block truncate text-sm font-semibold text-ink dark:text-white">{ticket.title}</strong><span className="mt-1 block text-xs text-muted dark:text-white/45">{ticket.category} · Updated {dateLabel(ticket.updatedAt)}</span></div><span className="flex items-center gap-2 text-xs font-medium text-muted dark:text-white/50">Due {dateLabel(ticket.dueAt)}<ArrowRight size={14}/></span></Link></li>;})}</ul>}
   </section>
  </div>
 </div>;
}
