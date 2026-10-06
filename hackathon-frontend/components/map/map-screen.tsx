"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { endpoints } from "@/lib/api";
import { ADOPTION_STEPS, adoptionColor, days, liters, num, OUTCOME, STATUS } from "@/lib/format";
import type { BarangayDetail, BarangayList, BarangaySummary, BoundaryFeature, OutageRun, OutageScenario, ReuseRules, Site, SiteMatches } from "@/lib/types";
import type { MapView } from "./barangay-map";
import { BarangayPanel } from "./barangay-panel";
import { SitePanel } from "./site-panel";
import { DataTag, StatusPill } from "./ui";

// Leaflet touches `window`, so the map only renders in the browser.
const BarangayMap = dynamic(() => import("./barangay-map"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-zinc-500">Loading map…</div>,
});

export function MapScreen() {
  const [list, setList] = useState<BarangayList | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [boundaries, setBoundaries] = useState<BoundaryFeature[]>([]);
  const [scenarios, setScenarios] = useState<OutageScenario[]>([]);
  const [rules, setRules] = useState<ReuseRules | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<BarangayDetail | null>(null);
  const [site, setSite] = useState<Site | null>(null);
  const [matches, setMatches] = useState<SiteMatches | null>(null);

  const [outageOn, setOutageOn] = useState(false);
  const [scenarioSlug, setScenarioSlug] = useState<string>("turbid-power-cut");
  const [run, setRun] = useState<OutageRun | null>(null);
  const [view, setView] = useState<MapView>("town");
  // Only the latest click may fill the panel, even if an earlier request answers last.
  const latestBarangay = useRef<number | null>(null);
  const latestSite = useRef<number | null>(null);

  // Initial load: LGU → barangays, sites, scenarios, rules in parallel.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { lgus } = await endpoints.lgus();
        const slug = lgus[0]?.slug;
        if (!slug) throw new Error("No LGU configured");
        const [b, s, sc, r, geo] = await Promise.all([
          endpoints.barangays(slug),
          endpoints.sites(slug),
          endpoints.outageScenarios(slug),
          endpoints.reuseRules(),
          // Boundaries are optional: without them the map draws circles.
          endpoints.boundaries(slug).catch(() => null),
        ]);
        if (cancelled) return;
        setBoundaries(geo?.features ?? []);
        setList(b);
        setSites(s.sites);
        setScenarios(sc.scenarios);
        setRules(r);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Outage run whenever the toggle or scenario changes.
  useEffect(() => {
    if (!outageOn || !list) return;
    let cancelled = false;
    endpoints
      .outageRun(list.lgu.slug, scenarioSlug)
      .then((r) => !cancelled && setRun(r))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [outageOn, scenarioSlug, list]);

  const selectBarangay = useCallback((id: number) => {
    setSelectedId(id);
    setSite(null);
    setMatches(null);
    setDetail(null);
    latestBarangay.current = id;
    endpoints
      .barangay(id)
      .then((d) => latestBarangay.current === id && setDetail(d))
      .catch((e: Error) => setError(e.message));
  }, []);

  const selectSite = useCallback(
    (s: Site) => {
      if (s.barangay_id !== selectedId) selectBarangay(s.barangay_id);
      setSite(s);
      setMatches(null);
      latestSite.current = s.id;
      endpoints
        .siteMatches(s.id)
        .then((m) => latestSite.current === s.id && setMatches(m))
        .catch((e: Error) => setError(e.message));
    },
    [selectedId, selectBarangay],
  );

  const clearSelection = () => {
    setSelectedId(null);
    setDetail(null);
    setSite(null);
    setMatches(null);
  };

  const outageById = useMemo(() => new Map(run?.results.map((r) => [r.barangay_id, r]) ?? []), [run]);
  const showOutage = outageOn && run !== null;

  // Normal map leads with reuse (teal); Outage Mode switches to red / amber / green.
  const colorFor = useCallback(
    (b: BarangaySummary) =>
      showOutage ? STATUS[outageById.get(b.id)?.status ?? "green"].color : adoptionColor(b.metrics.adoption_rate),
    [showOutage, outageById],
  );

  // Pulse only the 5 roofs where one new tank adds the most days: small barangays that run out.
  const suggestedSiteIds = useMemo(() => {
    if (!showOutage || !list) return new Set<number>();
    const demand = new Map(list.barangays.map((b) => [b.id, b.metrics.nonpotable_demand_lpd]));
    return new Set(
      run!.results
        .filter((r) => r.outcome !== "holds" && r.suggested_site_id)
        .sort((a, b) => (demand.get(a.barangay_id) ?? 0) - (demand.get(b.barangay_id) ?? 0))
        .slice(0, 5)
        .map((r) => r.suggested_site_id!),
    );
  }, [showOutage, run, list]);

  const sitesById = useMemo(() => new Map(sites.map((s) => [s.id, s])), [sites]);

  const selected = list?.barangays.find((b) => b.id === selectedId) ?? null;
  const scenario = scenarios.find((s) => s.slug === scenarioSlug) ?? null;

  if (error && !list) {
    return (
      <div className="grid flex-1 place-items-center p-6 text-center">
        <div>
          <p className="font-semibold">Could not load the map data.</p>
          <p className="mt-1 text-sm text-zinc-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <section className="relative h-[55dvh] shrink-0 lg:h-auto lg:flex-1">
        {/* Outage Mode bar */}
        <div className="absolute top-3 right-3 left-3 z-[1000] flex flex-wrap items-center gap-2 rounded-xl bg-white/95 p-2 text-sm shadow-md lg:right-auto dark:bg-zinc-900/95">
          <button
            role="switch"
            aria-checked={outageOn}
            onClick={() => setOutageOn((v) => !v)}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 font-semibold ${outageOn ? "bg-red-600 text-white" : "bg-zinc-100 dark:bg-zinc-800"}`}
          >
            <span className={`h-4 w-7 rounded-full p-0.5 ${outageOn ? "bg-white/40" : "bg-zinc-300 dark:bg-zinc-600"}`}>
              <span className={`block h-3 w-3 rounded-full bg-white transition-transform ${outageOn ? "translate-x-3" : ""}`} />
            </span>
            Outage Mode
          </button>
          <select
            value={scenarioSlug}
            onChange={(e) => setScenarioSlug(e.target.value)}
            className="rounded-lg border border-black/10 bg-transparent px-2 py-1.5 dark:border-white/15"
            aria-label="Outage scenario"
          >
            {scenarios.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name} ({s.duration_days} days)
              </option>
            ))}
          </select>
          {showOutage && (
            <span className="flex gap-3 px-1 text-xs font-medium">
              <span style={{ color: STATUS.green.color }}>{run.summary.holds} hold out</span>
              <span style={{ color: STATUS.amber.color }}>{run.summary.partial} partly</span>
              <span style={{ color: STATUS.red.color }}>{run.summary.fails} run out</span>
            </span>
          )}
        </div>

        {list && (
          <BarangayMap
            barangays={list.barangays}
            boundaries={boundaries}
            colorFor={colorFor}
            selectedId={selectedId}
            onSelect={selectBarangay}
            sites={sites}
            selectedSiteId={site?.id ?? null}
            onSelectSite={selectSite}
            suggestedSiteIds={suggestedSiteIds}
            defaultBounds={list.lgu.default_bounds}
            view={view}
          />
        )}

        {/* Legend + view switch */}
        <div className="absolute bottom-6 left-3 z-[1000] rounded-xl bg-white/95 p-2 text-xs shadow-md sm:p-3 dark:bg-zinc-900/95">
          <p className="mb-1.5 hidden font-semibold sm:block">{showOutage ? `${scenario?.name ?? "Outage"}` : "Greywater reused today"}</p>
          <ul className="flex gap-3 sm:block sm:space-y-1">
            {(showOutage
              ? (["holds", "partial", "fails"] as const).map((o) => ({ color: STATUS[OUTCOME[o].status].color, label: OUTCOME[o].label }))
              : ADOPTION_STEPS.map((s) => ({ color: s.color, label: s.label }))
            ).map((row) => (
              <li key={row.label} className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: row.color }} />
                {row.label}
              </li>
            ))}
          </ul>
          <p className="mt-2 hidden text-zinc-500 sm:block">▲ tank · △ candidate roof · ■ business</p>
          <div className="mt-2 flex overflow-hidden rounded-lg border border-black/10 dark:border-white/15">
            {(["town", "city"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`flex-1 px-2 py-1 ${view === v ? "bg-[#0b5d6b] text-white" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
              >
                {v === "town" ? "Town area" : "Whole city"}
              </button>
            ))}
          </div>
        </div>
      </section>

      <aside className="min-h-0 flex-1 overflow-y-auto border-t border-black/10 bg-white p-4 lg:w-[400px] lg:flex-none lg:border-t-0 lg:border-l dark:border-white/10 dark:bg-zinc-950">
        <div key={site ? `s${site.id}` : selected ? `b${selected.id}` : "city"} className="panel-in">
        {!list ? (
          <p className="text-sm text-zinc-500">Loading barangays…</p>
        ) : site ? (
          <SitePanel site={site} matches={matches} rules={rules} barangayName={selected?.name} onBack={() => setSite(null)} />
        ) : selected ? (
          <BarangayPanel
            barangay={selected}
            detail={detail?.barangay.id === selected.id ? detail : null}
            outage={showOutage ? (outageById.get(selected.id) ?? null) : null}
            scenarioName={showOutage ? (scenario?.name ?? null) : null}
            sitesById={sitesById}
            onSelectSite={selectSite}
            onClose={clearSelection}
          />
        ) : (
          <CityOverview list={list} run={showOutage ? run : null} />
        )}
        </div>
      </aside>
    </div>
  );
}

function CityOverview({ list, run }: { list: BarangayList; run: OutageRun | null }) {
  const t = list.totals;
  const reusable = list.barangays.reduce((s, b) => s + b.metrics.greywater_lpd, 0);
  const reused = list.barangays.reduce((s, b) => s + (b.metrics.greywater_lpd - b.metrics.reuse_gap_lpd), 0);

  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-zinc-500">{list.lgu.province}</p>
      <h2 className="text-xl font-semibold">{list.lgu.name}</h2>
      <p className="mt-1 text-sm text-zinc-500">
        {num(t.population)} people in {list.barangays.length} barangays <DataTag status="real" />
      </p>

      <h3 className="mt-5 mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Barangays by days of stored water</h3>
      <div className="grid grid-cols-3 gap-2 text-center">
        {(["green", "amber", "red"] as const).map((s) => (
          <div key={s} className="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-900">
            <p className="text-2xl font-semibold tabular-nums" style={{ color: STATUS[s].color }}>
              {t.status_counts[s]}
            </p>
            <StatusPill status={s} />
          </div>
        ))}
      </div>

      <dl className="mt-4 space-y-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-zinc-500">Light greywater produced</dt>
          <dd className="font-medium tabular-nums">{liters(reusable)}/day</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-zinc-500">Reused today (estimate)</dt>
          <dd className="font-medium tabular-nums">{liters(reused)}/day</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-zinc-500">Stored water, citywide</dt>
          <dd className="font-medium tabular-nums">
            {liters(t.storage_liters)} · {days(t.days_of_cover)}
          </dd>
        </div>
      </dl>

      {run && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm dark:bg-red-950/40">
          <strong>{run.scenario.name}</strong> for {run.scenario.duration_days} days: {run.summary.holds} barangays hold out on their own storage,{" "}
          {run.summary.partial} partly, {run.summary.fails} run out. The 5 pulsing roofs are where one new tank adds the most days.
        </p>
      )}

      <p className="mt-6 text-sm text-zinc-500">Click a barangay to see its used water, reuse gap and outage reserve.</p>
      <p className="mt-2 text-xs text-zinc-400">
        Population: PSA 2020. Rainfall: Open-Meteo. Storage, adoption and sites are simulated until the pilot replaces them.
      </p>
    </div>
  );
}
