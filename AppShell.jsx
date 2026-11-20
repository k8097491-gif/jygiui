import { useEffect,useState } from "react";
import { Link,NavLink,Outlet,useLocation,useNavigate } from "react-router-dom";
import { useQuery,useQueryClient } from "@tanstack/react-query";
import { Activity,BookOpen,ChevronDown,Command,FilePlus2,FolderKanban,LayoutDashboard,LogOut,Menu,Settings,ShieldCheck,Ticket,UsersRound,X,Bell } from "lucide-react";
import { api } from "./api.js";
import { useAuth,useTheme } from "./state.jsx";
import { useToast } from "./ToastProvider.jsx";
import ThemeToggle from "./ThemeToggle.jsx";
import { Button,cx } from "./ui.jsx";

const nav=[
 {to:"/app",label:"Overview",icon:LayoutDashboard,end:true},
 {to:"/app/tickets",label:"Requests",icon:Ticket},
 {to:"/app/knowledge",label:"Knowledge base",icon:BookOpen},
 {to:"/app/insights",label:"Service insights",icon:Activity,staff:true},
 {to:"/app/settings",label:"Administration",icon:Settings,admin:true}
];
const roleTitle={requester:"Requester",specialist:"Support specialist",dispatcher:"Dispatcher",manager:"Service manager",admin:"Administrator"};
function initials(name){return String(name||"").split(/\s+/).map(function(part){return part[0]||"";}).slice(0,2).join("").toUpperCase();}
function formatTime(value){return new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(new Date(value));}
export default function AppShell(){
 const {user,signOut,demoSignIn}=useAuth();
 const {show}=useToast();
 const [menuOpen,setMenuOpen]=useState(false);
 const [noticesOpen,setNoticesOpen]=useState(false);
 const [roleBusy,setRoleBusy]=useState(false);
 const location=useLocation();
 const navigate=useNavigate();
 const queryClient=useQueryClient();
 const notices=useQuery({queryKey:["notifications"],queryFn:async function(){return api("/api/notifications");},refetchInterval:60000});
 const appConfig=useQuery({queryKey:["publicConfig"],queryFn:async function(){return api("/api/config");},staleTime:300000});
 const count=notices.data?.unread||0;
 useEffect(function(){setMenuOpen(false);setNoticesOpen(false);},[location.pathname]);
 useEffect(function(){
   const stream=new EventSource("/events");
   function refresh(){queryClient.invalidateQueries({queryKey:["tickets"]});queryClient.invalidateQueries({queryKey:["analytics"]});queryClient.invalidateQueries({queryKey:["notifications"]});}
   stream.addEventListener("ticket.changed",refresh);
   stream.onerror=function(){};
   return function(){stream.removeEventListener("ticket.changed",refresh);stream.close();};
 },[queryClient,user.id]);
 async function changeRole(event){
   const role=event.target.value;
   if(!role||role===user.role)return;
   setRoleBusy(true);
   try{await demoSignIn(role);queryClient.clear();navigate("/app",{replace:true});show("Previewing the "+roleTitle[role].toLowerCase()+" role.");}
   catch(error){show(error.message,"error");event.target.value=user.role;}
   finally{setRoleBusy(false);}
 }
 async function logout(){
   try{await signOut();}catch(error){show(error.message,"error");}
   finally{queryClient.clear();navigate("/",{replace:true});}
 }
 async function markRead(id){
   try{await api("/api/notifications/"+id,{method:"PATCH",body:{read:true}});await queryClient.invalidateQueries({queryKey:["notifications"]});}
   catch(error){show(error.message,"error");}
 }
 async function markAll(){
   try{await api("/api/notifications/read-all",{method:"PATCH",body:{}});await queryClient.invalidateQueries({queryKey:["notifications"]});}
   catch(error){show(error.message,"error");}
 }
 const roleVisible=nav.filter(function(item){return !item.admin||user.role==="admin";}).filter(function(item){return !item.staff||user.role!=="requester";});
 const {theme}=useTheme();
 return <div className="min-h-screen bg-campus text-ink dark:bg-ink dark:text-white">
  <a className="skip-link" href="#workspace">Skip to workspace</a>
  <div className="mx-auto flex min-h-screen max-w-[1800px]">
   <aside className="hidden w-[248px] shrink-0 flex-col border-r border-ink/10 bg-white px-4 py-5 dark:border-white/10 dark:bg-ink-deep lg:flex">
    <Link to="/app" className="mb-9 flex items-center gap-3 px-2 text-ink no-underline dark:text-white"><span className="grid size-10 place-items-center bg-signal text-ink"><Command size={19}/></span><span><strong className="block text-sm leading-4">CAMPUS IT</strong><span className="text-[10px] font-semibold uppercase tracking-[.18em] text-muted dark:text-white/50">Helpdesk</span></span></Link>
    <p className="px-3 text-[10px] font-bold uppercase tracking-[.16em] text-muted/65 dark:text-white/35">Workspace</p>
    <nav className="mt-3 grid gap-1" aria-label="Workspace navigation">
     {roleVisible.map(function(item){const Icon=item.icon;return <NavLink key={item.to} to={item.to} end={item.end} className={function({isActive}){return cx("flex min-h-11 items-center gap-3 px-3 text-sm font-medium transition",isActive?"bg-signal text-ink":"text-ink-soft hover:bg-campus dark:text-white/65 dark:hover:bg-white/5");}}><Icon size={17}/><span>{item.label}</span></NavLink>;})}
    </nav>
    <div className="mt-auto border-t border-ink/10 pt-4 dark:border-white/10">
     <div className="flex items-center gap-3 px-2"><span className="grid size-9 place-items-center rounded-full bg-ink text-xs font-semibold text-white dark:bg-signal dark:text-ink">{initials(user.name)}</span><span className="min-w-0"><strong className="block truncate text-xs text-ink dark:text-white">{user.name}</strong><span className="text-[11px] text-muted dark:text-white/50">{roleTitle[user.role]}</span></span></div>
     <div className="mt-4 flex items-center gap-2 px-2 text-[11px] text-muted/70 dark:text-white/40"><span className="size-1.5 rounded-full bg-green"/>Connected to the demo stack</div>
    </div>
   </aside>
   <div className="flex min-w-0 flex-1 flex-col">
    <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-ink/10 bg-campus/90 px-4 backdrop-blur-md dark:border-white/10 dark:bg-ink/90 sm:px-7">
     <div className="flex items-center gap-3">
      <button type="button" className="grid size-10 place-items-center text-ink lg:hidden dark:text-white" aria-label={menuOpen?"Close navigation":"Open navigation"} aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={()=>setMenuOpen(!menuOpen)}>{menuOpen?<X size={20}/>:<Menu size={20}/>}</button>
      <div className="lg:hidden"><span className="block text-xs font-bold leading-4">CAMPUS IT</span><span className="text-[9px] uppercase tracking-[.18em] text-muted dark:text-white/50">Helpdesk</span></div>
      <p className="hidden text-sm font-semibold text-ink dark:text-white sm:block">{nav.find(function(item){return item.to===location.pathname;})?.label||"Support request"}</p>
     </div>
     <div className="flex items-center gap-1 sm:gap-3">
      {appConfig.data?.demoAvailable?<label className="hidden items-center gap-2 text-xs text-muted sm:flex dark:text-white/55">Preview role<select aria-label="Switch demo role" value={user.role} disabled={roleBusy} onChange={changeRole} className="min-h-9 max-w-48 border border-ink/15 bg-white px-2 text-xs text-ink dark:border-white/15 dark:bg-ink-deep dark:text-white">{Object.entries(roleTitle).map(function(entry){return <option value={entry[0]} key={entry[0]}>{entry[1]}</option>;})}</select></label>:null}
      <div className="relative">
       <button type="button" className="relative grid size-10 place-items-center rounded-full text-ink-soft transition hover:bg-ink/5 dark:text-white/70 dark:hover:bg-white/10" aria-label={"Notifications"+(count?", "+count+" unread":"")} aria-expanded={noticesOpen} aria-controls="notifications-popover" onClick={()=>setNoticesOpen(!noticesOpen)}><Bell size={18}/>{count>0?<span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-alert px-1 text-[9px] font-bold leading-4 text-white">{count>9?"9+":count}</span>:null}</button>
       {noticesOpen?<div id="notifications-popover" className="absolute right-0 top-12 z-40 w-[min(21rem,calc(100vw-2rem))] border border-ink/15 bg-white p-3 shadow-xl dark:border-white/15 dark:bg-ink-deep" aria-label="Notifications">
        <div className="flex items-center justify-between border-b border-ink/10 pb-2 dark:border-white/10"><h2 className="text-sm font-semibold">Notifications</h2>{count>0?<button type="button" className="text-xs font-semibold underline underline-offset-4" onClick={markAll}>Mark all read</button>:null}</div>
        {notices.isLoading?<div className="grid gap-2 py-3" aria-busy="true" aria-label="Loading notifications"><div className="skeleton h-12"/><div className="skeleton h-12"/></div>:notices.isError?<p className="py-5 text-xs text-alert" role="alert">Notifications could not load. <button type="button" className="underline" onClick={()=>notices.refetch()}>Try again</button></p>:notices.data.items.length===0?<p className="py-5 text-center text-xs text-muted dark:text-white/50">You are all caught up.</p>:<ul className="max-h-80 divide-y divide-ink/10 overflow-y-auto dark:divide-white/10">{notices.data.items.map(function(item){return <li key={item.id}><Link to={item.ticketId?"/app/tickets/"+item.ticketId:"/app"} onClick={()=>{setNoticesOpen(false);if(!item.readAt)markRead(item.id);}} className="block py-3 text-xs hover:bg-campus dark:hover:bg-white/5"><span className="flex items-center justify-between gap-3"><strong className="font-semibold text-ink dark:text-white">{item.title}</strong>{!item.readAt?<span className="size-1.5 rounded-full bg-blue"/>:null}</span><span className="mt-1 block text-muted dark:text-white/50">{item.body}</span><time className="mt-1 block text-[10px] text-muted/70 dark:text-white/35">{formatTime(item.createdAt)}</time></Link></li>;})}</ul>}
       </div>:null}
      </div>
      <ThemeToggle/>
      <details className="relative">
       <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full p-1.5 hover:bg-ink/5 dark:hover:bg-white/10" aria-label="Account menu"><span className="grid size-8 place-items-center rounded-full bg-ink text-[10px] font-semibold text-white dark:bg-signal dark:text-ink">{initials(user.name)}</span><span className="hidden max-w-28 truncate text-xs font-semibold sm:block">{user.name}</span><ChevronDown size={14} className="hidden text-muted sm:block"/></summary>
       <div className="absolute right-0 top-12 z-40 w-56 border border-ink/15 bg-white p-2 shadow-xl dark:border-white/15 dark:bg-ink-deep">
        <div className="border-b border-ink/10 px-3 py-2 dark:border-white/10"><strong className="block truncate text-xs">{user.name}</strong><span className="text-[11px] text-muted dark:text-white/50">{user.email}</span></div>
        <Link to="/app/settings" className="mt-1 flex items-center gap-2 px-3 py-2 text-xs hover:bg-campus dark:hover:bg-white/5"><Settings size={14}/>Profile and settings</Link>
        <button type="button" onClick={logout} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-alert hover:bg-alert/5"><LogOut size={14}/>Sign out</button>
       </div>
      </details>
     </div>
    </header>
    {menuOpen?<nav id="mobile-navigation" className="grid gap-1 border-b border-ink/10 bg-white p-3 dark:border-white/10 dark:bg-ink-deep lg:hidden" aria-label="Mobile workspace navigation">{roleVisible.map(function(item){const Icon=item.icon;return <NavLink key={item.to} to={item.to} end={item.end} className={function({isActive}){return cx("flex min-h-11 items-center gap-3 px-3 text-sm font-medium",isActive?"bg-signal text-ink":"text-ink-soft dark:text-white/70");}}><Icon size={17}/>{item.label}</NavLink>;})}<button type="button" className="mt-2 flex min-h-11 items-center gap-3 px-3 text-left text-sm font-medium text-muted sm:hidden" onClick={logout}><LogOut size={17}/>Sign out</button></nav>:null}
    <main id="workspace" className="w-full flex-1 px-4 py-7 sm:px-7 sm:py-9 xl:px-10"><Outlet/></main>
    <footer className="border-t border-ink/10 px-4 py-4 text-xs text-muted/70 dark:border-white/10 dark:text-white/35 sm:px-7">Campus IT Helpdesk · fictional demo data · {theme==="dark"?"Dark":"Light"} appearance</footer>
   </div>
  </div>
 </div>;
}
