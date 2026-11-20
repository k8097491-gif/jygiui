import { useState } from "react";
import { Link,useNavigate,useSearchParams } from "react-router-dom";
import { ArrowLeft,ArrowRight,Command,LifeBuoy,ShieldCheck } from "lucide-react";
import { useAuth } from "./state.jsx";
import { Button,Field,SelectField } from "./ui.jsx";
import ThemeToggle from "./ThemeToggle.jsx";

const demoRoles=[
  ["requester","Student / staff requester"],
  ["specialist","Support specialist"],
  ["dispatcher","Service dispatcher"],
  ["manager","Service manager"],
  ["admin","System administrator"]
];
export default function AuthPage() {
  const [params]=useSearchParams();
  const [mode,setMode]=useState(params.get("mode")==="register"?"register":"login");
  const [form,setForm]=useState({name:"",email:"",password:""});
  const [demoRole,setDemoRole]=useState("requester");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const {signIn,register,demoSignIn}=useAuth();
  const navigate=useNavigate();
  async function finish(action) {
    setBusy(true);setError("");
    try { await action();navigate("/app",{replace:true}); }
    catch(err){setError(err.message);}
    finally{setBusy(false);}
  }
  function submit(event) {
    event.preventDefault();
    const data={name:form.name,email:form.email,password:form.password};
    finish(function(){return mode==="register"?register(data):signIn({email:form.email,password:form.password});});
  }
  return <main className="grid min-h-screen bg-campus text-ink dark:bg-ink dark:text-white lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,.95fr)]">
    <section className="surface-grid relative hidden overflow-hidden bg-ink px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between lg:px-14">
      <Link to="/" className="flex w-fit items-center gap-3 text-white"><span className="grid size-10 place-items-center bg-signal text-ink"><Command size={20}/></span><span><strong className="block text-sm">CAMPUS IT</strong><span className="text-[10px] uppercase tracking-[.18em] text-white/55">Helpdesk</span></span></Link>
      <div className="max-w-xl"><span className="grid size-14 place-items-center border border-white/15 text-signal"><LifeBuoy size={25}/></span><h1 className="mt-7 text-5xl font-semibold leading-[.98] tracking-[-.045em]">Good support starts with a clear route.</h1><p className="mt-5 max-w-lg text-base leading-7 text-white/60">A working campus IT helpdesk demonstration with role-based access, accountable ticket history, and service analytics.</p><div className="mt-9 flex items-center gap-3 border-t border-white/15 pt-5 text-sm text-white/65"><ShieldCheck className="text-signal" size={18}/>Your session uses a protected, revocable cookie.</div></div>
      <p className="text-xs text-white/40">Fictional demonstration accounts · no university directory connected</p>
    </section>
    <section className="flex min-h-screen flex-col px-5 py-5 sm:px-8 lg:px-12">
      <header className="flex items-center justify-between"><Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted dark:text-white/65"><ArrowLeft size={16}/>Back to service overview</Link><ThemeToggle/></header>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
        <div className="mb-7"><h1 className="text-3xl font-semibold tracking-tight text-ink dark:text-white">{mode==="register"?"Create your requester account":"Sign in to the helpdesk"}</h1><p className="mt-2 text-sm leading-6 text-muted dark:text-white/60">{mode==="register"?"Use your account to submit and follow support requests.":"Continue to your requests, team queue, or service dashboard."}</p></div>
        {error?<p className="mb-4 border border-alert/25 bg-alert/5 px-4 py-3 text-sm text-alert" role="alert">{error}</p>:null}
        <form className="grid gap-4" onSubmit={submit}>
          {mode==="register"?<Field label="Your name" name="name" autoComplete="name" required minLength={2} maxLength={100} value={form.name} onChange={event=>setForm({...form,name:event.target.value})}/>:null}
          <Field label="University email" name="email" type="email" autoComplete="email" required maxLength={254} value={form.email} onChange={event=>setForm({...form,email:event.target.value})}/>
          <Field label="Password" name="password" type="password" autoComplete={mode==="register"?"new-password":"current-password"} required minLength={mode==="register"?12:1} maxLength={128} hint={mode==="register"?"Use at least 12 characters.":"Demo password is shown in the repository README."} value={form.password} onChange={event=>setForm({...form,password:event.target.value})}/>
          <Button className="mt-1 w-full" variant="signal" type="submit" loading={busy}>{mode==="register"?"Create account":"Sign in"}<ArrowRight size={16}/></Button>
        </form>
        <p className="mt-5 text-center text-sm text-muted dark:text-white/60">{mode==="register"?"Already have an account?":"New to the service?"}{" "}<button type="button" className="font-semibold text-ink underline underline-offset-4 dark:text-white" onClick={()=>{setMode(mode==="register"?"login":"register");setError("");}}>{mode==="register"?"Sign in":"Create an account"}</button></p>
        <div className="my-7 flex items-center gap-3 text-xs font-semibold uppercase tracking-[.12em] text-muted/70 dark:text-white/40"><span className="h-px flex-1 bg-ink/10 dark:bg-white/10"/>or explore a demo role<span className="h-px flex-1 bg-ink/10 dark:bg-white/10"/></div>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <SelectField label="Choose a demo role" name="demoRole" value={demoRole} onChange={event=>setDemoRole(event.target.value)}>
            {demoRoles.map(function(role){return <option key={role[0]} value={role[0]}>{role[1]}</option>;})}
          </SelectField>
          <Button className="self-end" variant="dark" type="button" loading={busy} onClick={()=>finish(function(){return demoSignIn(demoRole);})}>Enter demo<ArrowRight size={15}/></Button>
        </div>
        <p className="mt-3 text-xs leading-5 text-muted dark:text-white/45">Demo sign-in is enabled only when the local demo stack sets DEMO_MODE=true. Use a registered account for your own request history.</p>
      </div>
      <footer className="text-center text-xs text-muted/70 dark:text-white/40">Campus IT Helpdesk · sample records are fictional</footer>
    </section>
  </main>;
}
