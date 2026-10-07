"use client";

import { useEffect, useMemo, useState } from "react";
import { endpoints } from "@/lib/api";
import { days, liters, num, STATUS } from "@/lib/format";
import type { Status, StorageRegistry } from "@/lib/types";
import { useLguData } from "@/lib/use-lgu-data";
import { DataTag } from "../map/ui";

type Row = StorageRegistry["rows"][number] & {
  status: Status;
  households: number;
  drumsPerHousehold: number;
  drumsShort: number;
  formThisQuarter: boolean;
};

type SortKey = "name" | "days" | "storage" | "short";

// Gentler than the map's STATUS colours: tint for fills, mid for bars and edges, ink for text on the tint.
const SOFT: Record<Status, { tint: string; mid: string; ink: string }> = {
  red: { tint: STATUS.red.tint, mid: STATUS.red.color, ink: STATUS.red.ink },
  amber: { tint: STATUS.amber.tint, mid: STATUS.amber.color, ink: STATUS.amber.ink },
  green: { tint: STATUS.green.tint, mid: STATUS.green.color, ink: STATUS.green.ink },
};

const statusFor = (d: number, target: number): Status => (d >= target ? "green" : d >= 1 ? "amber" : "red");

function inCurrentQuarter(iso: string | null) {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && Math.floor(d.getMonth() / 3) === Math.floor(now.getMonth() / 3);
}

function downloadCsv(rows: Row[], lguName: string) {
  const header = ["Barangay", "Tanks working", "Tanks total", "Tank litres", "Covered drums", "Households", "Drums per household", "Storage litres", "Days of cover", "Drums short of 3-day target", "Last form", "Data"];
  const lines = rows.map((r) =>
    [
      r.name,
      r.public_tanks.working,
      r.public_tanks.count,
      r.public_tanks.liters,
      r.covered_drums,
      r.households,
      r.drumsPerHousehold.toFixed(2),
      r.storage_liters,
      r.days_of_cover,
      r.drumsShort,
      r.last_form_at ?? "",
      r.data_status,
    ]
      .map((v) => `"${String(v).replaceAll('"', '""')}"`)
      .join(","),
  );
  const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `storage-registry-${lguName.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function StorageScreen() {
  const { data, error: loadError } = useLguData();
  const [registry, setRegistry] = useState<StorageRegistry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Status | "all">("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "days", dir: 1 });

  const slug = data?.list.lgu.slug;
  useEffect(() => {
    if (!slug) return;
    endpoints.storage(slug).then(setRegistry).catch((e: Error) => setError(e.message));
  }, [slug]);

  const target = data?.list.settings.target_days_of_cover ?? 3;
  const drumLiters = data?.list.settings.drum_liters ?? 200;
  const perHouseholdTarget = registry?.rows[0]?.drums_per_household_for_target ?? 3;

  const rows = useMemo<Row[]>(() => {
    if (!registry || !data) return [];
    const households = new Map(data.list.barangays.map((b) => [b.id, b.metrics.households]));
    return registry.rows.map((r) => {
      const hh = households.get(r.barangay_id) ?? 1;
      return {
        ...r,
        status: statusFor(r.days_of_cover, target),
        households: hh,
        drumsPerHousehold: r.covered_drums / hh,
        drumsShort: Math.max(0, perHouseholdTarget * hh - r.covered_drums - Math.floor(r.public_tanks.liters / drumLiters)),
        formThisQuarter: inCurrentQuarter(r.last_form_at),
      };
    });
  }, [registry, data, target, perHouseholdTarget, drumLiters]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const value = (r: Row) =>
      sort.key === "name" ? r.name : sort.key === "days" ? r.days_of_cover : sort.key === "storage" ? r.storage_liters : r.drumsShort;
    return rows
      .filter((r) => (filter === "all" || r.status === filter) && (!q || r.name.toLowerCase().includes(q)))
      .sort((a, b) => {
        const va = value(a);
        const vb = value(b);
        const c = typeof va === "string" ? va.localeCompare(vb as string, "en", { numeric: true }) : (va as number) - (vb as number);
        return c * sort.dir;
      });
  }, [rows, query, filter, sort]);

  const counts = useMemo(() => {
    const c = { green: 0, amber: 0, red: 0 };
    rows.forEach((r) => c[r.status]++);
    return c;
  }, [rows]);

  const err = loadError ?? error;
  if (err && !registry) return <div className="grid flex-1 place-items-center p-6 text-sm text-zinc-500">Could not load: {err}</div>;
  if (!registry || !data) return <div className="grid flex-1 place-items-center text-sm text-zinc-500">Loading storage registry…</div>;

  const t = registry.totals;
  const tanksWorking = rows.reduce((s, r) => s + r.public_tanks.working, 0);
  const tanksBroken = t.public_tanks - tanksWorking;
  const totalShort = rows.reduce((s, r) => s + r.drumsShort, 0);
  const formsIn = rows.filter((r) => r.formThisQuarter).length;

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-3 py-4 sm:px-6 sm:py-5">
      {/* Headline: the answer first */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <p className="text-[10px] font-extrabold tracking-[0.18em] text-brand">DISTRIBUTED RESERVE</p>
          <h1 className="text-2xl font-extrabold tracking-[-0.03em]">Storage Registry</h1>
          <p className="mt-2 text-[15px] leading-relaxed">
            <strong className="font-extrabold" style={{ color: SOFT.green.ink }}>
              {counts.green} of {rows.length}
            </strong>{" "}
            barangays can keep toilets and cleaning running for {target} days if the water stops. Citywide, stored rainwater lasts about{" "}
            <strong className="font-extrabold">{days(t.days_of_cover)}</strong>. <DataTag status="simulated" />
          </p>
        </div>
        <button
          onClick={() => downloadCsv(visible, data.list.lgu.name)}
          className="rounded-full border border-brand/40 px-4 py-2 text-sm font-bold text-brand hover:bg-brand/10"
        >
          ⬇ Export CSV
        </button>
      </div>

      {/* At a glance: one bar, three groups, click to filter */}
      <section className="mt-4 rounded-2xl border border-[#dde2e3] bg-white p-3 shadow-[0_2px_5px_rgba(27,56,58,.07)] sm:mt-5 sm:p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-extrabold">Barangays at a glance</h2>
          <span className="text-xs text-muted">Click a group to list it</span>
        </div>
        <div className="mt-3 flex h-9 w-full overflow-hidden rounded-xl" role="group" aria-label="Barangays by readiness">
          {GROUPS.map((g) =>
            counts[g.status] === 0 ? null : (
              <button
                key={g.status}
                onClick={() => setFilter(filter === g.status ? "all" : g.status)}
                aria-pressed={filter === g.status}
                className={`flex items-center justify-center border-r-2 border-white text-sm font-extrabold transition last:border-r-0 ${filter !== "all" && filter !== g.status ? "opacity-40" : ""}`}
                style={{ width: `${(counts[g.status] / rows.length) * 100}%`, backgroundColor: SOFT[g.status].tint, color: SOFT[g.status].ink }}
                title={`${g.label}: ${counts[g.status]}`}
              >
                {counts[g.status]}
              </button>
            ),
          )}
        </div>
        <ul className="mt-2.5 grid gap-1.5 text-xs sm:mt-3 sm:grid-cols-3 sm:gap-2">
          {GROUPS.map((g) => (
            <li key={g.status} className="flex items-start gap-2">
              <span className="mt-0.5 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: SOFT[g.status].mid }} />
              <span>
                <strong className="font-extrabold">
                  {g.label} ({counts[g.status]})
                </strong>
                <span className="block text-muted">{g.hint(target)}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Key numbers in plain words */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-3 lg:grid-cols-4">
        <Total label="Stored rainwater" value={liters(t.storage_liters)} sub={`about ${days(t.days_of_cover)} for the whole city`} />
        <Total label="Covered rain drums" value={num(t.covered_drums)} sub={`${num(totalShort)} more needed for ${target} days`} />
        <Total
          label="Public rain tanks"
          value={`${tanksWorking} of ${t.public_tanks} working`}
          sub={tanksBroken > 0 ? `${tanksBroken} needs repair` : "all working"}
          warn={tanksBroken > 0}
        />
        <Total label="Forms this quarter" value={`${formsIn} of ${rows.length}`} sub={`${rows.length - formsIn} barangays still to report`} warn={formsIn < rows.length} />
      </div>

      <details className="mt-3 rounded-xl bg-[#eff7f7] px-4 py-3 text-sm">
        <summary className="cursor-pointer font-bold text-brand">How to read this</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[#4f5a5c]">
          <li>
            <strong>Only rain is stored.</strong> Shower and laundry water is reused the same day at home and never counted here.
          </li>
          <li>
            <strong>Days of cover</strong> = stored rainwater ÷ what the barangay uses each day for flushing and laundry (about 34 L a person), counting every tank and drum as full.
          </li>
          <li>
            The target is <strong>{target} days</strong>: about {perHouseholdTarget} covered {drumLiters} L drums per household.
          </li>
          <li>Only covered drums with rainwater and working public tanks count. Tap water stored before a typhoon is kept separately.</li>
          <li>Drum counts come from each barangay&apos;s quarterly form. They are estimates, not a household list.</li>
        </ul>
      </details>

      {/* Controls */}
      <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-5">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search barangay…"
          className="w-full rounded-full border border-black/15 bg-white px-4 py-2 text-sm sm:w-64"
          aria-label="Search barangay"
        />
        <select
          value={`${sort.key}:${sort.dir}`}
          onChange={(e) => {
            const [key, dir] = e.target.value.split(":");
            setSort({ key: key as SortKey, dir: Number(dir) as 1 | -1 });
          }}
          className="rounded-full border border-black/15 bg-white px-3 py-2 text-sm"
          aria-label="Sort"
        >
          <option value="days:1">Needs help first</option>
          <option value="short:-1">Most drums needed</option>
          <option value="storage:-1">Most water stored</option>
          <option value="name:1">A to Z</option>
        </select>
        {filter !== "all" && (
          <button onClick={() => setFilter("all")} className="rounded-full bg-zinc-900 px-3 py-2 text-xs font-bold text-white">
            {GROUPS.find((g) => g.status === filter)?.label} only ✕
          </button>
        )}
        <span className="ml-auto text-xs text-muted">
          Showing {visible.length} of {rows.length}
        </span>
      </div>

      {/* One row per barangay */}
      <ul className="mt-3 divide-y divide-[#e7eaea] overflow-hidden rounded-2xl border border-[#dde2e3] bg-white shadow-[0_2px_5px_rgba(27,56,58,.07)]">
        {visible.map((r) => (
          <li
            key={r.barangay_id}
            className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-x-3 gap-y-2 border-l-4 px-3 py-2.5 sm:gap-x-6 sm:px-4 sm:py-3.5 lg:grid-cols-[minmax(140px,0.9fr)_minmax(200px,1.3fr)_minmax(160px,1fr)_minmax(190px,1.1fr)] lg:items-start"
            style={{ borderLeftColor: SOFT[r.status].mid }}
          >
            <div className="min-w-0">
              <CellLabel>Barangay</CellLabel>
              <p className="truncate font-extrabold">{r.name}</p>
              <p className="text-[11px] text-muted sm:text-xs">{num(r.households)} households</p>
            </div>

            <div>
              <CellLabel>Stored rainwater</CellLabel>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span>
                  <strong className="text-[15px] font-extrabold tabular-nums sm:text-base">{r.days_of_cover.toFixed(1)}</strong> of {target} days
                </span>
                <span className="text-muted">{liters(r.storage_liters)}</span>
              </div>
              <DaysBar days={r.days_of_cover} target={target} status={r.status} />
            </div>

            <div className="text-sm">
              <CellLabel>What it needs</CellLabel>
              {r.drumsShort === 0 ? (
                <p className="font-bold" style={{ color: SOFT.green.ink }}>
                  ✓ Target met
                </p>
              ) : (
                <p>
                  <strong className="font-extrabold">{num(r.drumsShort)}</strong> more covered drums
                </p>
              )}
            </div>

            <div>
              <CellLabel>Details</CellLabel>
              <div className="flex flex-wrap gap-1 text-[10.5px] font-semibold sm:gap-1.5 sm:text-[11px]">
                <Chip tone="neutral">
                  {num(r.covered_drums)} drums · {r.drumsPerHousehold.toFixed(1)} per home
                </Chip>
                {r.public_tanks.count > 0 && (
                  <Chip tone={r.public_tanks.working < r.public_tanks.count ? "bad" : "neutral"}>
                    {r.public_tanks.working < r.public_tanks.count
                      ? `${r.public_tanks.count - r.public_tanks.working} tank needs repair`
                      : `${r.public_tanks.count} public tank${r.public_tanks.count > 1 ? "s" : ""}`}
                  </Chip>
                )}
                <Chip tone={r.formThisQuarter ? "good" : "warn"}>{r.formThisQuarter ? "✓ Form in" : "No form this quarter"}</Chip>
              </div>
            </div>
          </li>
        ))}
        {visible.length === 0 && <li className="p-4 text-sm text-muted">No barangays match.</li>}
      </ul>

      <p className="mt-4 text-xs text-muted">
        Storage = working public tanks + covered rain drums × {drumLiters} L, counted full. Drum counts are barangay estimates from the quarterly form,
        simulated until the pilot.
      </p>
    </div>
  );
}

const GROUPS: { status: Status; label: string; hint: (target: number) => string }[] = [
  { status: "red", label: "Needs help", hint: () => "Under 1 day of stored rainwater" },
  { status: "amber", label: "Getting there", hint: (target) => `1 to ${target} days` },
  { status: "green", label: "Ready", hint: (target) => `${target}+ days: toilets and cleaning keep running` },
];

function CellLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[9px] leading-tight font-extrabold tracking-[0.12em] text-[#8a9496] uppercase sm:mb-0.5 sm:text-[10px]">{children}</p>;
}

function Total({ label, value, sub, warn }: { label: string; value: string; sub: string; warn?: boolean }) {
  return (
    <div className="rounded-2xl border border-[#dde2e3] bg-white p-3 shadow-[0_2px_5px_rgba(27,56,58,.07)] sm:p-3.5">
      <p className="text-xs font-bold text-muted">{label}</p>
      <p className="mt-0.5 text-lg font-extrabold tabular-nums">{value}</p>
      <p className={`text-xs ${warn ? "font-semibold text-[#8c5a17]" : "text-muted"}`}>{sub}</p>
    </div>
  );
}

function Chip({ tone, children }: { tone: "good" | "warn" | "bad" | "neutral"; children: React.ReactNode }) {
  const cls = {
    good: "bg-[#e6f3e3] text-[#3a7a34]",
    warn: "bg-[#faf0df] text-[#8c5a17]",
    bad: "bg-[#f9e4e1] text-[#9b3b33]",
    neutral: "bg-[#f1f4f4] text-[#4f5a5c]",
  }[tone];
  return <span className={`rounded-full px-2 py-0.5 ${cls}`}>{children}</span>;
}

/** Progress toward the target, with a tick at the target. Over-target fills the bar. */
function DaysBar({ days: d, target, status }: { days: number; target: number; status: Status }) {
  const pct = Math.min(100, (d / target) * 100);
  return (
    <div className="relative mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#eef1f1]">
      <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: SOFT[status].mid }} />
    </div>
  );
}
