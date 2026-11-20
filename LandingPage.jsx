import { useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowDownRight,ArrowRight,ArrowUpRight,CheckCircle2,ClipboardList,Command,FilePlus2,LifeBuoy,MoveUpRight,Route,ShieldCheck,UsersRound } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useAuth } from "./state.jsx";
import ThemeToggle from "./ThemeToggle.jsx";

gsap.registerPlugin(ScrollTrigger,useGSAP);
const words="IT support that keeps campus moving.".split(" ");
const workflow=[
  {title:"Reported",line:"A student or staff member shares the issue.",icon:FilePlus2},
  {title:"Routed",line:"Impact, urgency, and category guide the first handoff.",icon:Route},
  {title:"Worked",line:"The right support team investigates and posts updates.",icon:LifeBuoy},
  {title:"Confirmed",line:"The requester checks the fix and leaves feedback.",icon:CheckCircle2}
];
function HoverTile({children,className=""}) {
  return <div className={className} onPointerEnter={function(event){if(!window.matchMedia("(prefers-reduced-motion: reduce)").matches)gsap.to(event.currentTarget,{y:-5,duration:.28,ease:"power3.out"});}} onPointerLeave={function(event){gsap.to(event.currentTarget,{y:0,duration:.32,ease:"power3.out"});}}>{children}</div>;
}
export default function LandingPage() {
  const pageRef=useRef(null);
  const {user}=useAuth();
  useGSAP(function(){
    const page=pageRef.current;
    if(!page)return;
    const reduce=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if(!reduce) {
      gsap.from(page.querySelectorAll(".hero-word"),{yPercent:110,rotate:2,autoAlpha:0,duration:.82,stagger:.045,ease:"expo.out",delay:.1});
      gsap.from(page.querySelector(".hero-scene"),{clipPath:"inset(8% 0 0 10% round 1rem)",autoAlpha:0,duration:1,ease:"power3.out",delay:.18});
      gsap.from(page.querySelectorAll(".hero-copy-line"),{y:18,autoAlpha:0,duration:.65,stagger:.08,ease:"power3.out",delay:.35});
    }
    const media=gsap.matchMedia();
    media.add("(min-width: 900px) and (prefers-reduced-motion: no-preference)",function(){
      const stage=page.querySelector(".pin-stage");
      const lane=page.querySelector(".pin-lane");
      if(!stage||!lane)return;
      gsap.to(lane,{
        x:function(){return -Math.max(0,lane.scrollWidth-window.innerWidth+window.innerWidth*.12);},
        ease:"none",
        scrollTrigger:{
          trigger:stage,
          start:"top top",
          end:function(){return "+="+Math.max(900,lane.scrollWidth-window.innerWidth+window.innerWidth*.12);},
          pin:true,
          scrub:.8,
          anticipatePin:1,
          invalidateOnRefresh:true
        }
      });
      gsap.fromTo(page.querySelectorAll(".tour-step"),{scale:.94,filter:"blur(5px)",autoAlpha:.6},{
        scale:1,filter:"blur(0px)",autoAlpha:1,stagger:.1,ease:"none",
        scrollTrigger:{trigger:stage,start:"top 75%",end:"bottom 35%",scrub:.7}
      });
    });
    return function(){media.revert();};
  },{scope:pageRef});
  return <main ref={pageRef} className="w-full max-w-full overflow-x-hidden">
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="relative z-20 border-b border-ink/10 bg-campus/90 backdrop-blur-sm dark:border-white/10 dark:bg-ink/90">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-12">
        <Link to="/" className="flex items-center gap-3 text-ink no-underline dark:text-white" aria-label="Campus Helpdesk home">
          <span className="grid size-10 place-items-center bg-signal text-ink"><Command size={20}/></span>
          <span><strong className="block text-sm font-bold leading-4">CAMPUS IT</strong><span className="text-[10px] font-semibold uppercase tracking-[.18em] text-muted dark:text-white/55">Helpdesk</span></span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-ink-soft dark:text-white/70 md:flex" aria-label="Main navigation">
          <a href="#service-tour" className="transition hover:text-ink dark:hover:text-white">How it works</a>
          <a href="#service-points" className="transition hover:text-ink dark:hover:text-white">For the campus</a>
          <Link to="/sign-in" className="transition hover:text-ink dark:hover:text-white">Sign in</Link>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle/>
          <Link to={user?"/app":"/sign-in"} className="hidden min-h-9 items-center gap-2 border border-ink bg-ink px-3 text-sm font-semibold text-white transition hover:bg-[#29383b] focus-visible:outline-2 focus-visible:outline-offset-2 sm:inline-flex dark:border-signal dark:bg-signal dark:text-ink dark:hover:bg-[#ffe85e]">{user?"Open workspace":"Enter the helpdesk"}<ArrowUpRight size={15}/></Link>
        </div>
      </div>
    </header>

    <section id="main" className="relative isolate border-b border-ink/10 dark:border-white/10">
      <div className="pointer-events-none absolute -right-24 top-12 -z-10 size-[30rem] rounded-full bg-signal/20 blur-3xl dark:bg-signal/10"></div>
      <div className="mx-auto grid max-w-[1440px] items-center gap-12 px-5 pb-16 pt-14 sm:px-8 sm:pb-20 lg:grid-cols-[1.04fr_.96fr] lg:gap-14 lg:px-12 lg:pb-24 lg:pt-20">
        <div className="max-w-3xl">
          <h1 aria-label="IT support that keeps campus moving." className="max-w-6xl text-[clamp(3.35rem,7.5vw,7.4rem)] font-semibold leading-[.91] tracking-[-.055em] text-ink dark:text-white">
            <span aria-hidden="true" className="block">{words.map(function(word,index){return <span className="hero-word overflow-hidden" key={word+"-"+index}>{word}{index<words.length-1?" ":""}</span>;})}</span>
          </h1>
          <p className="hero-copy-line mt-7 max-w-[58ch] text-base leading-7 text-ink-soft dark:text-white/70 sm:text-lg sm:leading-8">One clear place to report a technology issue, follow its handoff, and understand what happens next—from first request to confirmed fix.</p>
          <div className="hero-copy-line mt-8 flex flex-wrap gap-3">
            <Link to={user?"/app/tickets/new":"/sign-in?mode=register"} className="inline-flex min-h-13 items-center gap-2 border border-signal bg-signal px-5 text-base font-semibold text-ink transition hover:bg-[#ffe85e] focus-visible:outline-2 focus-visible:outline-offset-2">Create a request<ArrowRight size={17}/></Link>
            <Link to="/sign-in" className="inline-flex min-h-13 items-center gap-2 border border-ink/20 bg-white px-5 text-base font-semibold text-ink transition hover:border-ink hover:bg-campus focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-white/20 dark:bg-ink-deep dark:text-white dark:hover:bg-ink">Explore the workspace<MoveUpRight size={16}/></Link>
          </div>
          <p className="hero-copy-line mt-5 max-w-xl text-xs leading-5 text-muted dark:text-white/50">Demonstration environment. Example tickets and people are fictional; no university identity service is connected.</p>
        </div>
        <div className="hero-scene relative min-w-0">
          <div className="absolute -left-5 top-8 z-10 hidden h-[82%] w-3 bg-signal lg:block"></div>
          <div className="overflow-hidden rounded-xl border border-white/15 bg-ink text-white shadow-[0_32px_80px_-45px_rgba(17,26,29,.8)] dark:border-white/10">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-7">
              <div><p className="text-xs font-semibold uppercase tracking-[.14em] text-white/55">Example workflow</p><h2 className="mt-1 text-lg font-semibold tracking-tight sm:text-xl">A request, all the way through</h2></div>
              <span className="grid size-10 place-items-center bg-signal text-ink"><Route size={19}/></span>
            </div>
            <div className="p-5 sm:p-7">
              <div className="flex items-start gap-4 border-b border-white/10 pb-6">
                <span className="grid size-11 shrink-0 place-items-center border border-white/20 text-signal"><ClipboardList size={20}/></span>
                <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[.12em] text-white/50">Request</p><p className="mt-1 text-base font-medium leading-6 sm:text-lg">Classroom display needs attention</p><p className="mt-1 text-xs text-white/55">Impact, urgency, and location travel with the ticket.</p></div>
              </div>
              <div className="relative mt-6 grid grid-cols-4 gap-2" aria-label="Request lifecycle example">
                <div className="absolute left-[7%] right-[7%] top-[13px] h-px bg-white/20"></div>
                {workflow.map(function(item,index){
                  const Icon=item.icon;
                  return <div className="relative z-[1] grid justify-items-center gap-2 text-center" key={item.title}>
                    <span className={"grid size-7 place-items-center border "+(index<2?"border-signal bg-signal text-ink":"border-white/30 bg-ink text-white/60")}><Icon size={14}/></span>
                    <span className={"text-[10px] font-semibold uppercase tracking-[.1em] "+(index===1?"text-signal":"text-white/60")}>{item.title}</span>
                  </div>;
                })}
              </div>
              <div className="mt-7 grid grid-cols-2 divide-x divide-white/10 border-t border-white/10 pt-5">
                <div className="pr-4"><p className="text-xs text-white/50">The requester sees</p><p className="mt-1 text-sm font-medium">Owner, next step, and updates</p></div>
                <div className="pl-4"><p className="text-xs text-white/50">Support staff sees</p><p className="mt-1 text-sm font-medium">Queue, deadlines, and workload</p></div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
      <a href="#service-tour" className="mx-auto mb-6 flex w-fit items-center gap-2 text-xs font-semibold uppercase tracking-[.12em] text-muted transition hover:text-ink dark:text-white/55 dark:hover:text-white">See the service route<ArrowDownRight size={14}/></a>
    </section>

    <section id="service-points" className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 sm:py-28 lg:px-12 lg:py-36">
      <div className="mb-10 grid gap-6 lg:mb-14 lg:grid-cols-[.82fr_1.18fr] lg:items-end">
        <h2 className="max-w-4xl text-4xl font-semibold leading-[.98] tracking-[-.04em] text-ink dark:text-white sm:text-6xl">Support moves better when the route is visible.</h2>
        <p className="max-w-2xl text-base leading-7 text-ink-soft dark:text-white/65 lg:justify-self-end">Students and staff get a clear place to ask for help. Support teams get the context, ownership, and history needed to resolve each issue.</p>
      </div>
      <div className="grid grid-flow-dense grid-cols-1 gap-3 md:grid-cols-12 md:grid-rows-[minmax(220px,auto)_minmax(220px,auto)]">
        <HoverTile className="md:col-span-8 md:row-span-1"><div className="h-full min-h-64 rounded-xl border border-ink/10 bg-white p-6 dark:border-white/10 dark:bg-ink-deep sm:p-8"><div className="flex h-full flex-col justify-between gap-8"><div className="flex items-start justify-between gap-5"><div><h3 className="text-2xl font-semibold tracking-tight text-ink dark:text-white sm:text-3xl">One ticket. A complete history.</h3><p className="mt-2 max-w-xl text-sm leading-6 text-muted dark:text-white/55">Assignment, conversations, service deadlines, resolution, and feedback stay together.</p></div><span className="grid size-11 shrink-0 place-items-center bg-signal text-ink"><ClipboardList size={20}/></span></div><div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-soft dark:text-white/65">{["Request","Owner","Updates","Resolution"].map(function(label,index){return <span className="inline-flex items-center gap-2" key={label}><span className="border border-ink/20 px-3 py-2 dark:border-white/15">{label}</span>{index<3?<ArrowRight className="text-muted" size={14}/>:null}</span>;})}</div></div></div></HoverTile>
        <HoverTile className="md:col-span-4 md:row-span-1"><div className="h-full min-h-64 rounded-xl bg-signal p-6 sm:p-8"><UsersRound size={24} className="text-ink"/><h3 className="mt-8 text-2xl font-semibold leading-tight tracking-tight text-ink">Every role sees its next move.</h3><p className="mt-3 max-w-xs text-sm leading-6 text-ink/75">Requesters, specialists, dispatchers, managers, and administrators work in one system with the right permissions.</p></div></HoverTile>
        <HoverTile className="md:col-span-8 md:row-span-1"><div className="h-full min-h-64 rounded-xl border border-ink/10 bg-ink p-6 text-white dark:border-white/10 sm:p-8"><div className="grid h-full gap-8 sm:grid-cols-[.8fr_1.2fr] sm:items-center"><div><span className="text-xs font-semibold uppercase tracking-[.15em] text-signal">Clear service route</span><h3 className="mt-3 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">Less guessing. Better handoffs.</h3><p className="mt-3 text-sm leading-6 text-white/60">Impact and urgency guide priority. The category helps route the request to a support group.</p></div><div className="grid grid-cols-2 gap-2 text-xs font-semibold sm:grid-cols-4">{["Report","Route","Resolve","Confirm"].map(function(label,index){return <div key={label} className="flex min-h-20 flex-col justify-between border border-white/15 p-3"><span className="text-signal">{"0"+(index+1)}</span><span>{label}</span></div>;})}</div></div></div></HoverTile>
        <HoverTile className="md:col-span-4 md:row-span-1"><div className="h-full min-h-64 rounded-xl border border-ink/10 bg-white p-6 dark:border-white/10 dark:bg-ink-deep sm:p-8"><div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-[.13em] text-muted dark:text-white/45">Work stays accountable</span><Route size={21} className="text-ink dark:text-signal"/></div><h3 className="mt-8 text-2xl font-semibold leading-tight tracking-tight text-ink dark:text-white">Deadlines with a reason.</h3><p className="mt-3 text-sm leading-6 text-muted dark:text-white/55">Visible targets, status history, and escalation context help teams act before a request gets stuck.</p></div></HoverTile>
      </div>
    </section>

    <section id="service-tour" className="pin-stage relative overflow-hidden bg-ink py-16 text-white lg:flex lg:min-h-screen lg:flex-col lg:justify-center lg:py-20">
      <div className="mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <div className="mb-10 grid gap-6 lg:mb-12 lg:grid-cols-[.75fr_1.25fr] lg:items-end">
          <h2 className="max-w-3xl text-4xl font-semibold leading-[.98] tracking-[-.04em] sm:text-6xl">Follow the work, not another inbox.</h2>
          <p className="max-w-xl text-sm leading-6 text-white/60 lg:justify-self-end">Each step keeps its owner, update, and next action visible. The route stays useful on a small screen too.</p>
        </div>
      </div>
      <div className="pin-lane gap-3 px-5 sm:px-8 lg:px-12">
        {workflow.map(function(item,index){
          const Icon=item.icon;
          return <article className="tour-step ticket-card flex w-[82vw] max-w-[760px] shrink-0 flex-col justify-between border border-white/15 bg-[#192427] p-6 sm:w-[58vw] sm:p-9 lg:w-[47vw] lg:p-11" key={item.title}>
            <div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-[.14em] text-white/45">{item.title}</span><Icon className="text-signal" size={21}/></div>
            <div><p className="max-w-2xl text-4xl font-medium leading-[1.04] tracking-[-.035em] sm:text-5xl">{item.line}</p><span className="mt-6 block h-px w-full bg-white/15"><span className="block h-px bg-signal" style={{width:(index+1)*25+"%"}}/></span></div>
          </article>;
        })}
      </div>
      <p className="mx-auto mt-7 w-full max-w-[1440px] px-5 text-xs text-white/45 sm:px-8 lg:px-12">Scroll to trace the route on larger screens. On touch screens, read each step in order.</p>
    </section>

    <section className="mx-auto grid max-w-[1440px] gap-8 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1fr_auto] lg:items-center lg:px-12 lg:py-36">
      <div><h2 className="max-w-4xl text-4xl font-semibold leading-[1.02] tracking-[-.04em] text-ink dark:text-white sm:text-6xl">A clearer first step starts here.</h2><p className="mt-4 max-w-2xl text-base leading-7 text-muted dark:text-white/60">Try the working support workspace with a sample role, or register a requester account and follow a ticket yourself.</p></div>
      <div className="flex flex-wrap gap-3"><Link to="/sign-in?mode=register" className="inline-flex min-h-13 items-center gap-2 border border-signal bg-signal px-5 text-base font-semibold text-ink transition hover:bg-[#ffe85e] focus-visible:outline-2 focus-visible:outline-offset-2">Create an account<ArrowRight size={17}/></Link><Link to="/sign-in" className="inline-flex min-h-13 items-center gap-2 border border-ink/20 bg-white px-5 text-base font-semibold text-ink transition hover:border-ink hover:bg-campus focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-white/20 dark:bg-ink-deep dark:text-white dark:hover:bg-ink">Sign in</Link></div>
    </section>
    <footer className="border-t border-ink/10 bg-white dark:border-white/10 dark:bg-ink-deep">
      <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-8 sm:px-8 md:grid-cols-[1fr_auto] md:items-center lg:px-12">
        <div><p className="font-semibold text-ink dark:text-white">Campus IT Helpdesk</p><p className="mt-1 max-w-2xl text-xs leading-5 text-muted dark:text-white/50">University support workflow demonstration. Sample records are fictional; service data lives in the local demo stack.</p></div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-soft dark:text-white/70" aria-label="Footer navigation"><a href="#service-points">Service model</a><a href="#service-tour">Ticket route</a><Link to="/sign-in">Sign in</Link></nav>
      </div>
    </footer>
  </main>;
}
