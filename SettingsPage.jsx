import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, ShieldCheck, UserRound, UsersRound, X } from "lucide-react";
import { api } from "./api.js";
import { useAuth } from "./state.jsx";
import { useToast } from "./ToastProvider.jsx";
import { Button, ErrorState, Field, PageHeading, SelectField, Skeleton } from "./ui.jsx";

const roles=["requester","specialist","dispatcher","manager","admin"];

function UserRow({person,onSave,busy}) {
 const [draft,setDraft]=useState({name:person.name,email:person.email,role:person.role,team:person.team||"",active:person.active});
 return <form className="grid gap-3 border-b border-ink/10 px-4 py-4 last:border-0 dark:border-white/10 sm:grid-cols-[minmax(0,1.25fr)_145px_minmax(130px,.75fr)_150px_auto] sm:items-end" onSubmit={event=>{event.preventDefault();onSave(person.id,draft);}}>
  <div className="grid gap-2 sm:grid-cols-2"><Field label="Name" name={"name-"+person.id} required minLength={2} maxLength={100} value={draft.name} onChange={event=>setDraft({...draft,name:event.target.value})}/><Field label="Email" name={"email-"+person.id} type="email" required value={draft.email} onChange={event=>setDraft({...draft,email:event.target.value})}/></div>
  <SelectField label="Role" name={"role-"+person.id} value={draft.role} onChange={event=>setDraft({...draft,role:event.target.value})}>{roles.map(role=><option key={role} value={role}>{role}</option>)}</SelectField>
  {draft.role==="specialist"?<Field label="Support group" name={"team-"+person.id} required minLength={2} maxLength={120} placeholder="Match a category group" value={draft.team} onChange={event=>setDraft({...draft,team:event.target.value})}/>:<span className="hidden sm:block" aria-hidden="true"/>}
  <SelectField label="Account" name={"active-"+person.id} value={String(draft.active)} onChange={event=>setDraft({...draft,active:event.target.value==="true"})}><option value="true">Active</option><option value="false">Disabled</option></SelectField>
  <Button type="submit" variant="outline" size="sm" loading={busy}><Save size={14}/>Save</Button>
 </form>;
}

export default function SettingsPage(){
 const {user,updateUser}=useAuth();
 const queryClient=useQueryClient();
 const {show}=useToast();
 const [profile,setProfile]=useState({name:user.name,email:user.email});
 const [profileBusy,setProfileBusy]=useState(false);
 const [category,setCategory]=useState({name:"",group:""});
 const [categoryBusy,setCategoryBusy]=useState(false);
 const [savingUser,setSavingUser]=useState("");
 const [error,setError]=useState("");
 const isAdmin=user.role==="admin";
 const users=useQuery({queryKey:["adminUsers"],queryFn:()=>api("/api/users"),enabled:isAdmin});
 const categories=useQuery({queryKey:["categories"],queryFn:()=>api("/api/categories"),enabled:isAdmin});

 async function saveProfile(event){
  event.preventDefault();setProfileBusy(true);setError("");
  try{const result=await api("/api/profile",{method:"PUT",body:profile});updateUser(result.user);show("Profile details saved.");}
  catch(err){setError(err.message);}
  finally{setProfileBusy(false);}
 }
 async function saveUser(id,data){
  setSavingUser(id);setError("");
  try{await api("/api/users/"+id,{method:"PUT",body:data});await Promise.all([queryClient.invalidateQueries({queryKey:["adminUsers"]}),queryClient.invalidateQueries({queryKey:["specialists"]})]);show("Account updated.");}
  catch(err){setError(err.message);}
  finally{setSavingUser("");}
 }
 async function createCategory(event){
  event.preventDefault();setCategoryBusy(true);setError("");
  try{await api("/api/categories",{method:"POST",body:category});setCategory({name:"",group:""});await queryClient.invalidateQueries({queryKey:["categories"]});show("Support category added.");}
  catch(err){setError(err.message);}
  finally{setCategoryBusy(false);}
 }
 async function deactivateCategory(name){
  setError("");
  try{await api("/api/categories/"+encodeURIComponent(name),{method:"DELETE"});await queryClient.invalidateQueries({queryKey:["categories"]});show("Category deactivated. Existing requests keep their history.");}
  catch(err){setError(err.message);}
 }

 return <div>
  <PageHeading title={isAdmin?"Administration":"Profile and settings"} description={isAdmin?"Manage your profile, account access, and the service categories used to route requests.":"Update the account details shown to your university support team."}/>
  {error?<p role="alert" className="mb-5 border border-alert/20 bg-alert/5 px-4 py-3 text-sm text-alert">{error}</p>:null}
  <section className="max-w-3xl border border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-ink-deep sm:p-7" aria-labelledby="profile-title">
   <h2 id="profile-title" className="flex items-center gap-2 text-lg font-semibold text-ink dark:text-white"><UserRound size={18}/>Your profile</h2>
   <p className="mt-1 text-sm text-muted dark:text-white/50">Used in request updates and ownership history.</p>
   <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={saveProfile}>
    <Field label="Full name" name="profile-name" required minLength={2} maxLength={100} value={profile.name} onChange={event=>setProfile({...profile,name:event.target.value})}/>
    <Field label="Email address" name="profile-email" type="email" required maxLength={254} value={profile.email} onChange={event=>setProfile({...profile,email:event.target.value})}/>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-4 dark:border-white/10 sm:col-span-2"><p className="text-xs text-muted dark:text-white/45">Current role: <strong className="capitalize text-ink dark:text-white">{user.role}</strong></p><Button type="submit" variant="signal" loading={profileBusy}><Save size={15}/>Save profile</Button></div>
   </form>
  </section>
  <section className="mt-4 max-w-3xl border border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-ink-deep sm:p-7" aria-labelledby="security-title">
   <h2 id="security-title" className="flex items-center gap-2 text-lg font-semibold text-ink dark:text-white"><ShieldCheck size={18}/>Account security</h2>
   <p className="mt-2 text-sm leading-6 text-muted dark:text-white/55">Your session uses a secure, HTTP-only cookie and expires after seven days. Password changes are managed by the university identity service and are not available in this demo.</p>
  </section>
  {isAdmin?<>
   <section className="mt-8 border border-ink/10 bg-white dark:border-white/10 dark:bg-ink-deep" aria-labelledby="users-title">
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink/10 p-5 dark:border-white/10 sm:px-7"><div><h2 id="users-title" className="flex items-center gap-2 text-lg font-semibold text-ink dark:text-white"><UsersRound size={18}/>Accounts</h2><p className="mt-1 text-sm text-muted dark:text-white/50">Change roles and specialist groups, or disable access. Disabling an account revokes its sessions.</p></div><span className="text-xs text-muted dark:text-white/45">Up to 250 accounts</span></div>
    {users.isLoading?<div className="grid gap-3 p-5" aria-busy="true" aria-label="Loading accounts">{[1,2,3].map(n=><Skeleton key={n} className="h-24"/>)}</div>:users.isError?<div className="p-5"><ErrorState title="Accounts could not load" message={users.error.message} onRetry={()=>users.refetch()}/></div>:users.data.items.length===0?<p className="p-7 text-sm text-muted dark:text-white/50">No accounts found.</p>:users.data.items.map(person=><UserRow key={person.id} person={person} onSave={saveUser} busy={savingUser===person.id}/>)}
   </section>
   <section className="mt-8 grid gap-4 xl:grid-cols-[.72fr_1.28fr]" aria-labelledby="categories-title">
    <form className="h-fit border border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-ink-deep sm:p-7" onSubmit={createCategory}>
     <h2 className="text-lg font-semibold text-ink dark:text-white">Add a category</h2><p className="mt-1 text-sm leading-6 text-muted dark:text-white/50">New requests use this label and support group for first routing.</p>
     <div className="mt-5 grid gap-4"><Field label="Category name" name="category-name" required minLength={2} maxLength={120} value={category.name} onChange={event=>setCategory({...category,name:event.target.value})}/><Field label="Support group" name="category-group" required minLength={2} maxLength={120} value={category.group} onChange={event=>setCategory({...category,group:event.target.value})}/><Button variant="signal" loading={categoryBusy}><Plus size={15}/>Add category</Button></div>
    </form>
    <div className="border border-ink/10 bg-white dark:border-white/10 dark:bg-ink-deep">
     <div className="border-b border-ink/10 p-5 dark:border-white/10 sm:px-7"><h2 id="categories-title" className="text-lg font-semibold text-ink dark:text-white">Active categories</h2><p className="mt-1 text-sm text-muted dark:text-white/50">Inactive categories stay attached to old requests.</p></div>
     {categories.isLoading?<div className="grid gap-3 p-5" aria-busy="true" aria-label="Loading categories">{[1,2,3].map(n=><Skeleton key={n} className="h-16"/>)}</div>:categories.isError?<div className="p-5"><ErrorState title="Categories could not load" message={categories.error.message} onRetry={()=>categories.refetch()}/></div>:<ul className="divide-y divide-ink/10 dark:divide-white/10">{categories.data.items.map(item=><li key={item.name} className="flex items-center justify-between gap-3 px-5 py-4"><span className="min-w-0"><strong className="block truncate text-sm font-semibold text-ink dark:text-white">{item.name}</strong><span className="mt-1 block text-xs text-muted dark:text-white/50">Routes to {item.group}</span></span><Button type="button" variant="quiet" size="sm" className="text-alert" aria-label={"Deactivate "+item.name} onClick={()=>deactivateCategory(item.name)}><X size={15}/><span className="hidden sm:inline">Deactivate</span></Button></li>)}</ul>}
    </div>
   </section>
  </>:null}
 </div>;
}
