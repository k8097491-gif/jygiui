import { cx } from "./ui.jsx";

const statuses={
  "New":"border-blue/20 bg-blue/5 text-blue",
  "Assigned":"border-ink/15 bg-ink/5 text-ink-soft dark:border-white/15 dark:bg-white/5 dark:text-white/70",
  "In progress":"border-blue/20 bg-blue/5 text-blue",
  "Waiting":"border-[#805300]/20 bg-[#fff0c7] text-[#63430b] dark:border-[#f0c867]/20 dark:bg-[#805300]/20 dark:text-[#f0c867]",
  "Escalated":"border-alert/20 bg-alert/5 text-alert",
  "Resolved":"border-green/20 bg-green/5 text-green",
  "Closed":"border-green/20 bg-green/5 text-green",
  "Reopened":"border-blue/20 bg-blue/5 text-blue"
};
export default function StatusBadge({status}) {
 return <span className={cx("inline-flex min-h-6 items-center gap-1.5 border px-2 text-[11px] font-semibold",statuses[status]||statuses.Assigned)}><span className="size-1.5 rounded-full bg-current"/>{status}</span>;
}
