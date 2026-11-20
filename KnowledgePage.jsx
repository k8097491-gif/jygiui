import { useMemo,useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen,ChevronDown,LifeBuoy,Search } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "./state.jsx";
import { api } from "./api.js";
import { Button,EmptyState,ErrorState,PageHeading,Skeleton } from "./ui.jsx";

export default function KnowledgePage(){
 const {user}=useAuth();
 const [search,setSearch]=useState("");
 const [category,setCategory]=useState("");
 const articles=useQuery({queryKey:["knowledge"],queryFn:async function(){return api("/api/knowledge");}});
 const categories=useMemo(function(){return Array.from(new Set((articles.data?.items||[]).map(function(item){return item.category;})));},[articles.data]);
 const visible=(articles.data?.items||[]).filter(function(item){
  const query=search.trim().toLowerCase();
  return (!category||item.category===category)&&(!query||[item.title,item.summary,item.category,...item.steps].join(" ").toLowerCase().includes(query));
 });
 return <div>
  <PageHeading title="Knowledge base" description="Short, reviewed steps for common campus technology problems. If the guide does not solve it, open a request with the details support needs." action={<Link to={user.role==="specialist"?"/app/tickets":"/app/tickets/new"} className="inline-flex min-h-11 items-center gap-2 border border-signal bg-signal px-4 text-sm font-semibold text-ink"><LifeBuoy size={16}/>{user.role==="specialist"?"Review requests":"Ask for support"}</Link>}/>
  <section className="mb-5 grid gap-3 border border-ink/10 bg-white p-4 dark:border-white/10 dark:bg-ink-deep md:grid-cols-[minmax(0,1fr)_220px]">
   <label className="relative block"><span className="sr-only">Search help articles</span><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted/65 dark:text-white/40" size={16}/><input type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search guides and steps" className="min-h-11 w-full border border-ink/15 bg-white pl-10 pr-3 text-sm outline-none focus:border-blue focus:ring-2 focus:ring-blue/15 dark:border-white/15 dark:bg-ink dark:text-white"/></label>
   <label className="grid gap-1 text-xs font-medium text-muted dark:text-white/55"><span>Category</span><select value={category} onChange={event=>setCategory(event.target.value)} className="min-h-11 border border-ink/15 bg-white px-3 text-sm text-ink dark:border-white/15 dark:bg-ink dark:text-white"><option value="">All categories</option>{categories.map(function(item){return <option key={item}>{item}</option>;})}</select></label>
  </section>
  {articles.isLoading?<div className="grid gap-3 md:grid-cols-2" aria-busy="true" aria-label="Loading help articles">{[1,2,3,4].map(function(n){return <Skeleton className="h-64" key={n}/>})}</div>:articles.isError?<ErrorState title="Knowledge base could not load" message={articles.error.message} onRetry={()=>articles.refetch()}/>:visible.length===0?<EmptyState title="No guide matches that search" description="Try another phrase or clear the category filter." action={<Button variant="outline" onClick={()=>{setSearch("");setCategory("");}}>Clear search</Button>}/>:<div className="grid gap-3 md:grid-cols-2">{visible.map(function(article){return <article key={article.slug} className="border border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-ink-deep sm:p-7"><div className="flex items-center justify-between gap-4"><span className="text-[10px] font-bold uppercase tracking-[.14em] text-muted dark:text-white/45">{article.category}</span><BookOpen size={17} className="text-muted/55 dark:text-white/35"/></div><h2 className="mt-4 text-xl font-semibold tracking-tight text-ink dark:text-white">{article.title}</h2><p className="mt-2 text-sm leading-6 text-muted dark:text-white/55">{article.summary}</p><details className="group mt-5 border-t border-ink/10 pt-4 dark:border-white/10"><summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-ink dark:text-white"><span>Show the steps</span><ChevronDown size={15} className="transition group-open:rotate-180"/></summary><ol className="mt-3 grid gap-3 pl-5 text-sm leading-6 text-ink-soft marker:font-semibold marker:text-muted dark:text-white/65 dark:marker:text-signal">{article.steps.map(function(step,index){return <li key={index}>{step}</li>;})}</ol><p className="mt-4 border-l-2 border-signal bg-campus px-3 py-2 text-xs leading-5 text-muted dark:bg-white/5 dark:text-white/50">Never include your password or account recovery code in a support request.</p></details>{user.role==="specialist"?<Link to="/app/tickets" className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-ink underline underline-offset-4 dark:text-white">Review support requests</Link>:<Link to="/app/tickets/new" className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-ink underline underline-offset-4 dark:text-white">This did not solve it? Create a request</Link>}</article>;})}</div>}
 </div>;
}
