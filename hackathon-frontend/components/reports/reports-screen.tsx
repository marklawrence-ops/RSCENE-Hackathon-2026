"use client";

import { useEffect, useMemo, useState } from "react";
import { endpoints } from "@/lib/api";
import { useAuthUser } from "@/lib/auth";
import { CATEGORY_LABEL, days, liters, num, OUTCOME, pct, peso, STATUS } from "@/lib/format";
import type { BarangayForm, BarangaySummary, OutageRun, StorageRegistry } from "@/lib/types";
import { householdSaving, m3PerYear, tariffEquivalent, tariffOf } from "@/lib/economics";
import { useLguData } from "@/lib/use-lgu-data";

// Printable reports built only from live AGOS data: fixed wording, real numbers, nothing generated.
type Kind = "quarterly" | "barangay";

const quarterLabel = (d = new Date()) => `${d.getFullYear()} Q${Math.floor(d.getMonth() / 3) + 1}`;
const inCurrentQuarter = (iso: string | null) => {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && Math.floor(d.getMonth() / 3) === Math.floor(now.getMonth() / 3);
};
const stamp = () =>
  new Date().toLocaleString("en-PH", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Manila" });
const roleName = (role: string) => (role === "cdrrmo" ? "CDRRMO" : role === "planner" ? "City planning office" : role);
const reusedLpd = (b: BarangaySummary) => b.metrics.greywater_lpd - b.metrics.reuse_gap_lpd;
const list = (names: string[]) => (names.length ? names.join(", ") : "none");

export function ReportsScreen() {
  const user = useAuthUser();
  const { data, error } = useLguData();
  const [registry, setRegistry] = useState<StorageRegistry | null>(null);
  const [runs, setRuns] = useState<Record<string, OutageRun>>({});
  const [kind, setKind] = useState<Kind>("quarterly");
  const [scenarioSlug, setScenarioSlug] = useState("turbid-power-cut");
  const [barangayId, setBarangayId] = useState<number | null>(null);
  const [forms, setForms] = useState<{ id: number; forms: BarangayForm[] } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const slug = data?.list.lgu.slug;

  // Registry and every outage scenario, once: both reports read from them.
  useEffect(() => {
    if (!slug || !data) return;
    let cancelled = false;
    Promise.all([endpoints.storage(slug), ...data.scenarios.map((s) => endpoints.outageRun(slug, s.slug))])
      .then(([reg, ...results]) => {
        if (cancelled) return;
        setRegistry(reg as StorageRegistry);
        setRuns(Object.fromEntries((results as OutageRun[]).map((r) => [r.scenario.slug, r])));
      })
      .catch((e: Error) => !cancelled && setLoadError(e.message));
    return () => {
      cancelled = true;
    };
  }, [slug, data]);

  const barangays = useMemo(() => data?.list.barangays ?? [], [data]);
  // Default profile: the barangay with the least stored rainwater.
  const selectedId = barangayId ?? [...barangays].sort((a, b) => a.metrics.days_of_cover - b.metrics.days_of_cover)[0]?.id ?? null;

  useEffect(() => {
    if (kind !== "barangay" || selectedId === null) return;
    let cancelled = false;
    endpoints
      .forms(selectedId)
      .then((r) => !cancelled && setForms({ id: selectedId, forms: r.forms }))
      .catch((e: Error) => !cancelled && setLoadError(e.message));
    return () => {
      cancelled = true;
    };
  }, [kind, selectedId]);

  if (error || loadError) {
    return <p className="p-6 text-sm text-red-600">Could not load report data: {error ?? loadError}</p>;
  }
  const ready = data && registry && Object.keys(runs).length > 0;

  return (
    <div className="mx-auto w-full max-w-[920px] px-4 py-6 print:max-w-none print:p-0">
      <div className="mb-5 flex flex-wrap items-end gap-3 print:hidden">
        <div>
          <p className="text-[10px] font-extrabold tracking-[0.18em] text-brand">REPORTS</p>
          <h1 className="text-2xl font-extrabold tracking-[-0.02em]">Print a report from live data</h1>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="Report" className="flex rounded-xl bg-black/5 p-1 text-sm font-bold">
            {(
              [
                ["quarterly", "Quarterly readiness"],
                ["barangay", "Barangay profile"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                role="tab"
                aria-selected={kind === k}
                onClick={() => setKind(k)}
                className={`rounded-lg px-3 py-1.5 ${kind === k ? "bg-white text-brand shadow-sm" : "text-[#5f6869]"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {kind === "quarterly" ? (
            <select value={scenarioSlug} onChange={(e) => setScenarioSlug(e.target.value)} aria-label="Outage scenario" className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm">
              {(data?.scenarios ?? []).map((s) => (
                <option key={s.slug} value={s.slug}>
                  Outage check: {s.name} ({s.duration_days} days)
                </option>
              ))}
            </select>
          ) : (
            <select
              value={selectedId ?? ""}
              onChange={(e) => setBarangayId(Number(e.target.value))}
              aria-label="Barangay"
              className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
            >
              {[...barangays]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
            </select>
          )}
          <button onClick={() => window.print()} disabled={!ready} className="rounded-full bg-brand px-4 py-2 text-sm font-extrabold text-white hover:bg-brand-dark disabled:opacity-50">
            Print / Save as PDF
          </button>
        </div>
      </div>

      {!ready ? (
        <p className="text-sm text-muted">Loading live data…</p>
      ) : (
        <article className="rounded-2xl border border-line bg-white p-6 text-[14px] leading-relaxed text-[#1f2a2c] shadow-[0_2px_8px_rgba(26,57,60,.08)] sm:p-9 print:rounded-none print:border-0 print:p-0 print:shadow-none">
          {kind === "quarterly" ? (
            <QuarterlyReport data={data} registry={registry} run={runs[scenarioSlug] ?? Object.values(runs)[0]} preparedBy={user ? `${user.name} (${roleName(user.role)})` : ""} />
          ) : (
            (() => {
              const b = barangays.find((x) => x.id === selectedId);
              return b ? (
                <BarangayProfile
                  b={b}
                  data={data}
                  registry={registry}
                  runs={runs}
                  forms={forms?.id === b.id ? forms.forms : null}
                  preparedBy={user ? `${user.name} (${roleName(user.role)})` : ""}
                />
              ) : null;
            })()
          )}
        </article>
      )}
    </div>
  );
}

type Data = NonNullable<ReturnType<typeof useLguData>["data"]>;

function Header({ eyebrow, title, preparedBy }: { eyebrow: string; title: string; preparedBy: string }) {
  return (
    <header className="border-b border-[#dfe5e6] pb-4">
      <p className="text-[10px] font-extrabold tracking-[0.18em] text-brand">AGOS · {eyebrow}</p>
      <h2 className="mt-1 text-2xl leading-tight font-extrabold tracking-[-0.02em]">{title}</h2>
      <p className="mt-1 text-xs text-[#5f6869]">
        Prepared {stamp()}
        {preparedBy && <> by {preparedBy}</>} · from live AGOS data
      </p>
    </header>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-7 mb-2 text-[15px] font-extrabold tracking-[-0.01em] break-after-avoid">{children}</h3>;
}

function Table({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full border-collapse text-[13px]">
      <thead>
        <tr className="border-b-2 border-[#cfd8d9] text-left text-[11px] tracking-wide text-[#5f6869] uppercase">
          {head.map((h) => (
            <th key={h} className="py-1.5 pr-3 font-bold">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-[#e6ebec] break-inside-avoid">
            {r.map((c, j) => (
              <td key={j} className={`py-1.5 pr-3 align-top ${j > 0 ? "tabular-nums" : "font-semibold"}`}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DataNote() {
  return (
    <>
      <H>About these numbers</H>
      <ul className="list-disc space-y-1 pl-5 text-[12.5px] text-[#4f5a5c]">
        <li>
          <strong>Real:</strong> barangay population (PSA 2020), barangay boundaries (PSA/NAMRIA), rainfall (Open-Meteo).
        </li>
        <li>
          <strong>Reported:</strong> tanks, covered drums and households reusing come from each barangay&apos;s quarterly form. Until the pilot, these are{" "}
          <strong>simulated</strong> demo values.
        </li>
        <li>
          <strong>Assumed:</strong> 90 L of water per person a day and its usage split; a reusing household reuses about 40% of its shower and laundry water.
        </li>
        <li>Days of cover count every tank and drum as full. Shower and laundry water is used the same day and never stored; only rain is stored.</li>
      </ul>
      <p className="mt-6 border-t border-[#dfe5e6] pt-3 text-[11px] text-[#7a8486]">Generated by AGOS · rscene-hackathon-2026.vercel.app</p>
    </>
  );
}

function QuarterlyReport({ data, registry, run, preparedBy }: { data: Data; registry: StorageRegistry; run: OutageRun; preparedBy: string }) {
  const { list: l, sites } = data;
  const t = l.totals;
  const target = l.settings.target_days_of_cover;
  const drumLiters = l.settings.drum_liters;
  const bs = l.barangays;
  const byId = new Map(bs.map((b) => [b.id, b]));
  const households = bs.reduce((s, b) => s + b.metrics.households, 0);
  const reusing = bs.reduce((s, b) => s + b.metrics.reusing_households, 0);
  const reused = bs.reduce((s, b) => s + reusedLpd(b), 0);

  const rows = registry.rows.map((r) => {
    const b = byId.get(r.barangay_id)!;
    const perHh = r.drums_per_household_for_target;
    return {
      r,
      b,
      drumsShort: Math.max(0, perHh * b.metrics.households - r.covered_drums - Math.floor(r.public_tanks.liters / drumLiters)),
      broken: r.public_tanks.count - r.public_tanks.working,
      filed: inCurrentQuarter(r.last_form_at),
    };
  });
  const filed = rows.filter((x) => x.filed);
  const missing = rows.filter((x) => !x.filed).map((x) => x.b.name).sort();
  const brokenRows = rows.filter((x) => x.broken > 0);
  const neediest = [...rows].sort((a, b) => a.r.days_of_cover - b.r.days_of_cover || b.b.population - a.b.population).slice(0, 10);
  // Quick wins: not yet at target, fewest drums to go.
  const quickWins = rows.filter((x) => x.drumsShort > 0).sort((a, b) => a.drumsShort - b.drumsShort).slice(0, 3);
  const runsOut = run.results.filter((r) => r.outcome === "fails").map((r) => byId.get(r.barangay_id)?.name ?? "").sort();
  const siteById = new Map(sites.map((s) => [s.id, s]));
  const roofs = run.results
    .filter((r) => r.outcome !== "holds" && r.suggested_site_id)
    .sort((a, b) => (byId.get(a.barangay_id)?.metrics.nonpotable_demand_lpd ?? 0) - (byId.get(b.barangay_id)?.metrics.nonpotable_demand_lpd ?? 0))
    .slice(0, 5)
    .map((r) => `${siteById.get(r.suggested_site_id!)?.name ?? "Site"} (${byId.get(r.barangay_id)?.name})`);

  return (
    <>
      <Header eyebrow="QUARTERLY READINESS REPORT" title={`${l.lgu.name} · ${quarterLabel()}`} preparedBy={preparedBy} />

      <p className="mt-4 text-[17px] leading-snug font-bold">
        {t.status_counts.green} of {bs.length} barangays could keep toilets and cleaning running for {target} days if the water stops. In a{" "}
        {run.scenario.name.toLowerCase()} ({run.scenario.duration_days} days), {run.summary.fails} would run out.
      </p>

      <H>Citywide figures</H>
      <Table
        head={["Measure", "This quarter", "Basis"]}
        rows={[
          ["Population", num(t.population), "Real (PSA 2020)"],
          [`Barangays at the ${target}-day target`, `${t.status_counts.green} of ${bs.length} (${t.status_counts.amber} at 1–${target} days, ${t.status_counts.red} under 1 day)`, "Reported / simulated"],
          ["Stored rainwater (if full)", `${liters(t.storage_liters)} = ${days(t.days_of_cover)} citywide`, "Reported / simulated"],
          ["Public tanks · covered drums", `${num(registry.totals.public_tanks)} · ${num(registry.totals.covered_drums)}`, "Reported / simulated"],
          ["Households reusing greywater", `${num(reusing)} of ${num(households)} (${pct(households ? reusing / households : 0)})`, "Reported / simulated"],
          ["Greywater reused", `${liters(reused)} a day`, "Estimate"],
          ["Treated water freed by reuse", `${num(m3PerYear(reused))} m³ a year (≈ ${peso(tariffEquivalent(reused, tariffOf(l.settings)))} tariff equivalent)`, "Estimate · water-district base tariff"],
          ["Example household saving", `≈ ${peso(householdSaving(l.settings).perMonth)} a month for a family of ${l.settings.household_size} that reuses`, "Estimate · base tariff, before VAT"],
          ["Greywater still going down the drain", `${liters(t.greywater_lpd - reused)} a day`, "Estimate"],
          [`Forms filed for ${quarterLabel()}`, `${filed.length} of ${bs.length}`, "Reported"],
        ]}
      />

      <H>Barangays that need help most</H>
      <Table
        head={["Barangay", "Days of cover", "Status", "Covered drums still needed", "Tanks to repair", "Form this quarter"]}
        rows={neediest.map((x) => [
          x.b.name,
          days(x.r.days_of_cover),
          STATUS[x.b.metrics.status].label,
          num(x.drumsShort),
          x.broken || "–",
          x.filed ? "Yes" : "No",
        ])}
      />

      <H>
        Outage check: {run.scenario.name} ({run.scenario.duration_days} days)
      </H>
      <p>
        <strong>{run.summary.holds}</strong> barangays hold out · <strong>{run.summary.partial}</strong> are partly covered · <strong>{run.summary.fails}</strong> run out.
      </p>
      <p className="mt-1 text-[13px] text-[#4f5a5c]">
        <strong>Run out:</strong> {list(runsOut)}.
      </p>
      {roofs.length > 0 && (
        <p className="mt-1 text-[13px] text-[#4f5a5c]">
          <strong>Best roofs for one new tank:</strong> {roofs.join("; ")}.
        </p>
      )}

      <H>Quarterly forms</H>
      <p>
        {filed.length} of {bs.length} barangays filed their form for {quarterLabel()}.
      </p>
      <p className="mt-1 text-[13px] text-[#4f5a5c]">
        <strong>Not yet filed:</strong> {list(missing)}.
      </p>

      <H>Recommended next steps</H>
      <ol className="list-decimal space-y-1 pl-5">
        {missing.length > 0 && <li>Follow up the {missing.length} barangays that have not filed this quarter.</li>}
        {brokenRows.length > 0 && (
          <li>
            Repair {brokenRows.reduce((s, x) => s + x.broken, 0)} public tank(s) that are not working: {list(brokenRows.map((x) => x.b.name))}.
          </li>
        )}
        {quickWins.length > 0 && (
          <li>
            Quick wins for drum covers: {quickWins.map((x) => `${x.b.name} (${num(x.drumsShort)} drums to reach ${target} days)`).join(", ")}.
          </li>
        )}
        {roofs.length > 0 && <li>Price tanks for the best roofs above in the Program Designer before typhoon season.</li>}
      </ol>

      <DataNote />
    </>
  );
}

function BarangayProfile({
  b,
  data,
  registry,
  runs,
  forms,
  preparedBy,
}: {
  b: BarangaySummary;
  data: Data;
  registry: StorageRegistry;
  runs: Record<string, OutageRun>;
  forms: BarangayForm[] | null;
  preparedBy: string;
}) {
  const m = b.metrics;
  const s = data.list.settings;
  const target = s.target_days_of_cover;
  const r = registry.rows.find((x) => x.barangay_id === b.id);
  const drumsShort = r ? Math.max(0, r.drums_per_household_for_target * m.households - r.covered_drums - Math.floor(r.public_tanks.liters / s.drum_liters)) : 0;
  const broken = r ? r.public_tanks.count - r.public_tanks.working : 0;
  const filed = inCurrentQuarter(r?.last_form_at ?? null);
  const sites = data.sites.filter((x) => x.barangay_id === b.id);
  const siteById = new Map(data.sites.map((x) => [x.id, x]));
  const outageRows = data.scenarios.map((sc) => {
    const res = runs[sc.slug]?.results.find((x) => x.barangay_id === b.id);
    return { sc, res };
  });
  const bestRoof = outageRows.map((o) => o.res?.suggested_site_id).find(Boolean);

  return (
    <>
      <Header eyebrow="BARANGAY PROFILE" title={`Barangay ${b.name} · ${quarterLabel()}`} preparedBy={preparedBy} />

      <p className="mt-4 text-[17px] leading-snug font-bold">
        {b.name} has {days(m.days_of_cover)} of stored rainwater if full ({STATUS[m.status].label.toLowerCase()}), and {pct(m.adoption_rate)} of its households reuse shower or
        laundry water. Readiness {m.readiness_score}/100.
      </p>

      <H>Figures</H>
      <Table
        head={["Measure", "Value", "Basis"]}
        rows={[
          ["Population · households", `${num(b.population)} · ${num(m.households)}`, "Real (PSA 2020) · assumed 5 per household"],
          ["Shower and laundry water produced", `${liters(m.greywater_lpd)} a day`, "Estimate"],
          ["Reused (same day, never stored)", `${liters(reusedLpd(b))} a day · ${num(m.reusing_households)} households`, "Reported / simulated"],
          ["Reuse gap", `${liters(m.reuse_gap_lpd)} a day`, "Estimate"],
          ["Flushing and cleaning need", `${liters(m.nonpotable_demand_lpd)} a day`, "Estimate"],
          ["Stored rainwater (if full)", `${liters(m.storage_liters)} = ${days(m.days_of_cover)}`, "Reported / simulated"],
          ["Public tanks · covered drums", r ? `${r.public_tanks.count} (${r.public_tanks.working} working) · ${num(r.covered_drums)}` : "–", "Reported / simulated"],
          [`Covered drums still needed for ${target} days`, num(drumsShort), "Estimate"],
        ]}
      />

      <H>Outage scenarios</H>
      <Table
        head={["Scenario", "Days of cover", "Result", "Short by"]}
        rows={outageRows.map(({ sc, res }) => [
          `${sc.name} (${sc.duration_days} days)`,
          res ? days(res.days_of_cover) : "–",
          res ? OUTCOME[res.outcome].label : "–",
          res && res.shortfall_liters > 0 ? liters(res.shortfall_liters) : "–",
        ])}
      />

      <H>Public buildings and businesses</H>
      {sites.length === 0 ? (
        <p className="text-[13px] text-[#4f5a5c]">No listed sites.</p>
      ) : (
        <Table
          head={["Site", "Type", "Rain tank", "Roof", "Rain caught"]}
          rows={sites.map((x) => [
            x.name,
            CATEGORY_LABEL[x.category] ?? x.category,
            x.tank.status === "installed" ? `${num(x.tank.liters ?? 0)} L${x.tank.working === false ? " (needs repair)" : ""}` : x.tank.status === "candidate" ? "Candidate roof" : "–",
            x.roof_area_m2 ? `${num(x.roof_area_m2)} m²` : "–",
            x.rain_yield_lpd ? `${liters(x.rain_yield_lpd)} a day` : "–",
          ])}
        />
      )}

      <H>Quarterly forms</H>
      {forms === null ? (
        <p className="text-[13px] text-[#4f5a5c]">Loading…</p>
      ) : forms.length === 0 ? (
        <p className="text-[13px] text-[#4f5a5c]">No forms filed yet.</p>
      ) : (
        <Table
          head={["Period", "Submitted", "Channel", "Tanks working", "Covered drums", "Households reusing"]}
          rows={forms.map((f) => [
            f.period,
            new Date(f.submitted_at).toLocaleDateString("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" }),
            f.channel === "paper" ? "Paper" : "App",
            `${f.tanks_working} of ${f.tanks_total}`,
            num(f.covered_drums),
            `${num(f.reusing_households)} of ${num(f.households_estimate)}`,
          ])}
        />
      )}

      <H>Recommended next steps</H>
      <ol className="list-decimal space-y-1 pl-5">
        {drumsShort > 0 && (
          <li>
            Cover {num(drumsShort)} more drums to reach {target} days (about {r?.drums_per_household_for_target ?? 3} covered drums per household).
          </li>
        )}
        {broken > 0 && <li>Repair {broken} public tank(s) that are not working.</li>}
        {!filed && <li>File the quarterly form for {quarterLabel()}.</li>}
        {bestRoof && <li>Best roof for a new tank: {siteById.get(bestRoof)?.name}.</li>}
        {m.adoption_rate < 0.3 && <li>Hand out Household Guide cards on health-worker visits to raise reuse toward 30% of households.</li>}
      </ol>

      <DataNote />
    </>
  );
}
