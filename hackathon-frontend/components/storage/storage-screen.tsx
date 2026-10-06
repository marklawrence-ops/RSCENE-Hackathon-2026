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
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:px-6">
      {/* Headline: the answer first */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <p className="text-[10px] font-extrabold tracking-[0.18em] text-brand">DISTRIBUTED RESERVE</p>
          <h1 className="text-2xl font-extrabold tracking-[-0.03em]">Storage Registry</h1>
          <p className="mt-2 text-[15px] leading-relaxed">
            <strong className="font-extrabold" style={{ color: STATUS.green.color }}>
              {counts.green} of {rows.length}
            </strong>{" "}
            barangays can keep toilets and cleaning running for {target} days if the water stops. Citywide, stored water lasts about{" "}
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
      <section className="mt-5 rounded-2xl border border-[#dde2e3] bg-white p-4 shadow-[0_2px_5px_rgba(27,56,58,.07)]">
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
                className={`flex items-center justify-center text-sm font-extrabold text-white transition ${filter !== "all" && filter !== g.status ? "opacity-35" : ""}`}
                style={{ width: `${(counts[g.status] / rows.length) * 100}%`, backgroundColor: STATUS[g.status].color }}
                title={`${g.label}: ${counts[g.status]}`}
              >
                {counts[g.status]}
              </button>
            ),
          )}
        </div>
        <ul className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
          {GROUPS.map((g) => (
            <li key={g.status} className="flex items-start gap-2">
              <span className="mt-0.5 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: STATUS[g.status].color }} />
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
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Total label="Stored water" value={liters(t.storage_liters)} sub={`about ${days(t.days_of_cover)} for the whole city`} />
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
            <strong>Days of cover</strong> = stored water ÷ what the barangay uses each day for flushing and laundry (about 34 L a person).
          </li>
          <li>
            The target is <strong>{target} days</strong>: about {perHouseholdTarget} covered {drumLiters} L drums per household.
          </li>
          <li>Only covered drums with rainwater and working public tanks count. Tap water stored before a typhoon is kept separately.</li>
          <li>Drum counts come from each barangay&apos;s quarterly form. They are estimates, not a household list.</li>
        </ul>
      </details>

      {/* Controls */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
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
            className="grid gap-x-5 gap-y-2 border-l-4 px-4 py-3 md:grid-cols-[minmax(150px,1fr)_minmax(200px,1.4fr)_minmax(170px,1fr)] md:items-center"
            style={{ borderLeftColor: STATUS[r.status].color }}
          >
            <div className="min-w-0">
              <p className="truncate font-extrabold">{r.name}</p>
              <p className="text-xs text-muted">{num(r.households)} households</p>
            </div>

            <div>
              <div className="flex items-baseline justify-between text-xs">
                <span>
                  <strong className="text-base font-extrabold tabular-nums">{r.days_of_cover.toFixed(1)}</strong> of {target} days
                </span>
                <span className="text-muted">{liters(r.storage_liters)} stored</span>
              </div>
              <DaysBar days={r.days_of_cover} target={target} status={r.status} />
            </div>

            <div className="text-sm">
              {r.drumsShort === 0 ? (
                <p className="font-bold" style={{ color: STATUS.green.color }}>
                  ✓ Target met
                </p>
              ) : (
                <p>
                  Needs <strong className="font-extrabold">{num(r.drumsShort)}</strong> more covered drums
                </p>
              )}
              <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                <Chip tone="neutral">
                  {num(r.covered_drums)} drums ({r.drumsPerHousehold.toFixed(1)} per home)
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
  { status: "red", label: "Needs help", hint: () => "Under 1 day of stored water" },
  { status: "amber", label: "Getting there", hint: (target) => `1 to ${target} days` },
  { status: "green", label: "Ready", hint: (target) => `${target}+ days: toilets and cleaning keep running` },
];

function Total({ label, value, sub, warn }: { label: string; value: string; sub: string; warn?: boolean }) {
  return (
    <div className="rounded-2xl border border-[#dde2e3] bg-white p-3.5 shadow-[0_2px_5px_rgba(27,56,58,.07)]">
      <p className="text-xs font-bold text-muted">{label}</p>
      <p className="mt-0.5 text-lg font-extrabold tabular-nums">{value}</p>
      <p className={`text-xs ${warn ? "font-semibold text-[#a96b1d]" : "text-muted"}`}>{sub}</p>
    </div>
  );
}

function Chip({ tone, children }: { tone: "good" | "warn" | "bad" | "neutral"; children: React.ReactNode }) {
  const cls = {
    good: "bg-[#dff2d8] text-[#3d7f37]",
    warn: "bg-[#f9ecd7] text-[#94601b]",
    bad: "bg-red-100 text-red-700",
    neutral: "bg-[#f1f4f4] text-[#4f5a5c]",
  }[tone];
  return <span className={`rounded-full px-2 py-0.5 ${cls}`}>{children}</span>;
}

/** Progress toward the target, with a tick at the target. Over-target fills the bar. */
function DaysBar({ days: d, target, status }: { days: number; target: number; status: Status }) {
  const pct = Math.min(100, (d / target) * 100);
  return (
    <div className="relative mt-1 h-2.5 w-full overflow-hidden rounded-full bg-[#e6ebec]">
      <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: STATUS[status].color }} />
    </div>
  );
}
