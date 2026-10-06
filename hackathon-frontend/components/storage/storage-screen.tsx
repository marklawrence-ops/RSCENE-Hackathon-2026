"use client";

import { useEffect, useMemo, useState } from "react";
import { endpoints } from "@/lib/api";
import { days, liters, num, STATUS } from "@/lib/format";
import type { Status, StorageRegistry } from "@/lib/types";
import { useLguData } from "@/lib/use-lgu-data";
import { DataTag, StatusPill } from "../map/ui";

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
  const totalShort = rows.reduce((s, r) => s + r.drumsShort, 0);
  const formsIn = rows.filter((r) => r.formThisQuarter).length;

  const sortBy = (key: SortKey) => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === "name" ? 1 : key === "days" ? 1 : -1 }));
  const arrow = (key: SortKey) => (sort.key === key ? (sort.dir === 1 ? " ↑" : " ↓") : "");

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold tracking-[0.18em] text-brand">DISTRIBUTED RESERVE</p>
          <h1 className="text-2xl font-extrabold tracking-[-0.03em]">Storage Registry</h1>
          <p className="text-sm text-zinc-500">
            Covered rain storage per barangay against the {target}-day target ({perHouseholdTarget} drums of {drumLiters} L per household). <DataTag status="simulated" />
          </p>
        </div>
        <button
          onClick={() => downloadCsv(visible, data.list.lgu.name)}
          className="rounded-lg border border-brand/40 px-3 py-1.5 text-sm font-medium text-brand hover:bg-brand/10 dark:text-aqua"
        >
          ⬇ Export CSV
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Total label="Stored water, citywide" value={liters(t.storage_liters)} sub={`${days(t.days_of_cover)} of non-potable demand`} />
        <Total label="Public rain tanks" value={`${tanksWorking} of ${t.public_tanks} working`} sub="City engineering records" />
        <Total label="Covered household drums" value={num(t.covered_drums)} sub={`${num(totalShort)} more needed for ${target} days`} />
        <Total label="Forms this quarter" value={`${formsIn} of ${rows.length}`} sub="Barangays reporting" />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search barangay…"
          className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-1.5 text-sm sm:w-64 dark:border-white/15"
          aria-label="Search barangay"
        />
        {(["all", "red", "amber", "green"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${filter === f ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"}`}
          >
            {f === "all" ? `All ${rows.length}` : `${STATUS[f].label} (${counts[f]})`}
          </button>
        ))}
      </div>

      {/* Wide screens: table */}
      <div className="mt-3 hidden overflow-hidden rounded-xl border border-black/10 md:block dark:border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900">
            <tr>
              <Th onClick={() => sortBy("name")}>Barangay{arrow("name")}</Th>
              <th className="px-3 py-2 text-right font-semibold">Public tanks</th>
              <th className="px-3 py-2 text-right font-semibold">Covered drums</th>
              <Th onClick={() => sortBy("storage")} right>
                Storage{arrow("storage")}
              </Th>
              <Th onClick={() => sortBy("days")}>Days of cover{arrow("days")}</Th>
              <Th onClick={() => sortBy("short")} right>
                Drums short{arrow("short")}
              </Th>
              <th className="px-3 py-2 font-semibold">Last form</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/10">
            {visible.map((r) => (
              <tr key={r.barangay_id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/60">
                <td className="px-3 py-2 font-medium">{r.name}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {r.public_tanks.count === 0 ? (
                    <span className="text-zinc-400">–</span>
                  ) : (
                    <>
                      {r.public_tanks.working}/{r.public_tanks.count}
                      {r.public_tanks.working < r.public_tanks.count && <span className="ml-1 text-xs text-red-600">needs repair</span>}
                    </>
                  )}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {num(r.covered_drums)}
                  <span className="block text-xs text-zinc-500">{r.drumsPerHousehold.toFixed(1)} per household</span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{liters(r.storage_liters)}</td>
                <td className="px-3 py-2">
                  <DaysBar days={r.days_of_cover} target={target} status={r.status} />
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{r.drumsShort === 0 ? <span className="text-emerald-700 dark:text-emerald-400">Met</span> : num(r.drumsShort)}</td>
                <td className="px-3 py-2 text-xs">
                  <FormDate iso={r.last_form_at} current={r.formThisQuarter} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && <p className="p-4 text-sm text-zinc-500">No barangays match.</p>}
      </div>

      {/* Phones: cards */}
      <ul className="mt-3 space-y-2 md:hidden">
        {visible.map((r) => (
          <li key={r.barangay_id} className="rounded-xl border border-black/10 p-3 text-sm dark:border-white/10">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">{r.name}</span>
              <StatusPill status={r.status} label={days(r.days_of_cover)} />
            </div>
            <div className="mt-2">
              <DaysBar days={r.days_of_cover} target={target} status={r.status} compact />
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <dt className="text-zinc-500">Storage</dt>
              <dd className="text-right tabular-nums">{liters(r.storage_liters)}</dd>
              <dt className="text-zinc-500">Covered drums</dt>
              <dd className="text-right tabular-nums">
                {num(r.covered_drums)} ({r.drumsPerHousehold.toFixed(1)}/household)
              </dd>
              <dt className="text-zinc-500">Public tanks</dt>
              <dd className="text-right tabular-nums">{r.public_tanks.count ? `${r.public_tanks.working}/${r.public_tanks.count} working` : "–"}</dd>
              <dt className="text-zinc-500">Drums short of {target} days</dt>
              <dd className="text-right tabular-nums">{r.drumsShort === 0 ? "Met" : num(r.drumsShort)}</dd>
              <dt className="text-zinc-500">Last form</dt>
              <dd className="text-right">
                <FormDate iso={r.last_form_at} current={r.formThisQuarter} />
              </dd>
            </dl>
          </li>
        ))}
        {visible.length === 0 && <p className="text-sm text-zinc-500">No barangays match.</p>}
      </ul>

      <p className="mt-4 text-xs text-zinc-500">
        Storage = working public tanks + covered rain drums × {drumLiters} L, counted full. Days of cover = storage ÷ (population × 34 L of flushing and laundry a day). Drum counts are
        barangay estimates from the quarterly form; simulated until the pilot.
      </p>
    </div>
  );
}

function Total({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-900">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-zinc-500">{sub}</p>
    </div>
  );
}

function Th({ children, onClick, right }: { children: React.ReactNode; onClick: () => void; right?: boolean }) {
  return (
    <th className={`px-3 py-2 font-semibold ${right ? "text-right" : ""}`}>
      <button onClick={onClick} className="uppercase tracking-wide hover:text-zinc-900 dark:hover:text-zinc-100">
        {children}
      </button>
    </th>
  );
}

function DaysBar({ days: d, target, status, compact }: { days: number; target: number; status: Status; compact?: boolean }) {
  const pct = Math.min(100, (d / target) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className={`relative h-2 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800 ${compact ? "" : "min-w-24"}`}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: STATUS[status].color }} />
      </div>
      {!compact && <span className="w-14 text-right text-xs tabular-nums">{d.toFixed(1)} d</span>}
    </div>
  );
}

function FormDate({ iso, current }: { iso: string | null; current: boolean }) {
  if (!iso) return <span className="text-red-600">None</span>;
  const label = new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
  return current ? <span className="text-emerald-700 dark:text-emerald-400">✓ {label}</span> : <span className="text-zinc-500">{label}</span>;
}
