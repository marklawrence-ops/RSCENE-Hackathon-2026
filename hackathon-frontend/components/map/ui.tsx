import { DATA_STATUS_LABEL, STATUS } from "@/lib/format";
import type { DataStatus, Status } from "@/lib/types";

export function StatusPill({ status, label }: { status: Status; label?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
      style={{ backgroundColor: STATUS[status].color }}
    >
      {label ?? STATUS[status].label}
    </span>
  );
}

export function DataTag({ status }: { status: DataStatus }) {
  const tone =
    status === "real"
      ? "border-emerald-600/40 text-emerald-700 dark:text-emerald-400"
      : "border-zinc-400/60 text-zinc-500 dark:text-zinc-400";
  return (
    <span className={`rounded border px-1.5 py-px text-[10px] font-medium uppercase tracking-wide ${tone}`}>
      {DATA_STATUS_LABEL[status]}
    </span>
  );
}

export function Stat({ label, value, tag }: { label: string; value: string; tag?: DataStatus }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <dt className="text-sm text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="flex items-center gap-2 text-sm font-medium tabular-nums">
        {value}
        {tag && <DataTag status={tag} />}
      </dd>
    </div>
  );
}

export function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-5 mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">{children}</h3>;
}
