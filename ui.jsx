import { AlertCircle,ArrowRight,Check,LoaderCircle,Search } from "lucide-react";

export function cx(){return Array.from(arguments).filter(Boolean).join(" ");}
export function Button({children,className="",variant="dark",size="md",loading=false,disabled=false,...props}) {
  const base="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-4 font-semibold transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-55";
  const variants={
    dark:"border-ink bg-ink text-white hover:bg-[#29383b] dark:border-signal dark:bg-signal dark:text-ink dark:hover:bg-[#ffe85e]",
    signal:"border-signal bg-signal text-ink hover:bg-[#ffe85e]",
    outline:"border-ink/20 bg-white text-ink hover:border-ink hover:bg-campus dark:border-white/20 dark:bg-ink-deep dark:text-white dark:hover:bg-ink",
    quiet:"border-transparent bg-transparent text-ink-soft hover:bg-ink/5 dark:text-white/75 dark:hover:bg-white/10",
    danger:"border-alert bg-alert text-white hover:bg-[#7e201c]"
  };
  const sizes={sm:"min-h-9 px-3 text-sm",md:"text-sm",lg:"min-h-13 px-5 text-base"};
  return <button className={cx(base,variants[variant],sizes[size],className)} disabled={disabled||loading} {...props}>
    {loading?<LoaderCircle size={16} className="animate-spin" aria-hidden="true"/>:null}{children}
  </button>;
}
export function IconButton({label,children,className="",...props}) {
  return <button type="button" aria-label={label} title={label} className={cx("grid size-10 place-items-center rounded-full text-ink-soft transition hover:bg-ink/5 focus-visible:outline-2 dark:text-white/75 dark:hover:bg-white/10",className)} {...props}>{children}</button>;
}
export function Field({label,error,hint,className="",id,...props}) {
  const fieldId=id||props.name;
  const errorId=fieldId+"-error";
  const hintId=fieldId+"-hint";
  return <label className={cx("grid gap-1.5 text-sm font-medium text-ink-soft dark:text-white/80",className)} htmlFor={fieldId}>
    <span>{label}</span>
    {props.as==="textarea"?<textarea id={fieldId} aria-invalid={Boolean(error)} aria-describedby={[hint?hintId:"",error?errorId:""].filter(Boolean).join(" ")||undefined} className="min-h-28 w-full resize-y rounded-md border border-ink/20 bg-white px-3 py-2.5 text-ink outline-none transition placeholder:text-ink/40 focus:border-blue focus:ring-2 focus:ring-blue/20 dark:border-white/15 dark:bg-ink-deep dark:text-white" {...Object.fromEntries(Object.entries(props).filter(function(entry){return entry[0]!=="as"}))}/>:<input id={fieldId} aria-invalid={Boolean(error)} aria-describedby={[hint?hintId:"",error?errorId:""].filter(Boolean).join(" ")||undefined} className="min-h-11 w-full rounded-md border border-ink/20 bg-white px-3 text-ink outline-none transition placeholder:text-ink/40 focus:border-blue focus:ring-2 focus:ring-blue/20 dark:border-white/15 dark:bg-ink-deep dark:text-white" {...props}/>}
    {hint?<span id={hintId} className="text-xs font-normal text-muted dark:text-white/55">{hint}</span>:null}
    {error?<span id={errorId} className="inline-flex items-center gap-1 text-xs font-medium text-alert" role="alert"><AlertCircle size={14}/>{error}</span>:null}
  </label>;
}
export function SelectField({label,children,className="",id,...props}) {
  const fieldId=id||props.name;
  return <label className={cx("grid gap-1.5 text-sm font-medium text-ink-soft dark:text-white/80",className)} htmlFor={fieldId}>
    <span>{label}</span><select id={fieldId} className="min-h-11 rounded-md border border-ink/20 bg-white px-3 text-ink outline-none transition focus:border-blue focus:ring-2 focus:ring-blue/20 dark:border-white/15 dark:bg-ink-deep dark:text-white" {...props}>{children}</select>
  </label>;
}
export function PageHeading({eyebrow,title,description,action}) {
  return <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
    <div className="max-w-3xl"><h1 className="text-3xl font-semibold tracking-tight text-ink dark:text-white sm:text-4xl">{title}</h1>{description?<p className="mt-2 max-w-2xl text-sm leading-6 text-muted dark:text-white/60">{description}</p>:null}</div>
    {action}
  </div>;
}
export function SectionHeading({title,description,action}) {
  return <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
    <div><h2 className="text-lg font-semibold tracking-tight text-ink dark:text-white">{title}</h2>{description?<p className="mt-1 text-sm text-muted dark:text-white/60">{description}</p>:null}</div>{action}
  </div>;
}
export function Skeleton({className=""}) {
  return <div className={cx("skeleton rounded-md",className)} aria-hidden="true"/>;
}
export function ErrorState({title="This view could not load",message="Check the service connection and try again.",onRetry}) {
  return <div className="grid min-h-52 place-items-center rounded-xl border border-alert/20 bg-white p-8 text-center dark:bg-ink-deep" role="alert">
    <div className="max-w-sm"><span className="mx-auto grid size-10 place-items-center rounded-full bg-alert/10 text-alert"><AlertCircle size={18}/></span><h2 className="mt-3 text-base font-semibold text-ink dark:text-white">{title}</h2><p className="mt-1 text-sm text-muted dark:text-white/60">{message}</p>{onRetry?<Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>Try again<ArrowRight size={15}/></Button>:null}</div>
  </div>;
}
export function EmptyState({title,description,action}) {
  return <div className="grid min-h-52 place-items-center border border-dashed border-ink/20 bg-white p-8 text-center dark:border-white/15 dark:bg-ink-deep">
    <div className="max-w-sm"><span className="mx-auto grid size-10 place-items-center rounded-full bg-signal-wash text-ink dark:bg-signal/15 dark:text-signal"><Search size={18}/></span><h2 className="mt-3 text-base font-semibold text-ink dark:text-white">{title}</h2><p className="mt-1 text-sm text-muted dark:text-white/60">{description}</p>{action?<div className="mt-4">{action}</div>:null}</div>
  </div>;
}
export function Toast({toast,onClose}) {
  if(!toast)return null;
  return <div className={cx("fixed bottom-5 right-5 z-[100] flex max-w-sm items-center gap-3 border px-4 py-3 text-sm shadow-lg",toast.type==="error"?"border-alert bg-alert text-white":"border-ink bg-ink text-white")} role={toast.type==="error"?"alert":"status"} aria-live={toast.type==="error"?"assertive":"polite"}>
    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/15">{toast.type==="error"?<AlertCircle size={16}/>:<Check size={16}/>}</span><span className="flex-1">{toast.message}</span><button type="button" onClick={onClose} className="font-medium underline underline-offset-4">Dismiss</button>
  </div>;
}
