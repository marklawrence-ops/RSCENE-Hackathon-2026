"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { endpoints } from "@/lib/api";
import { days, liters, num, OUTCOME, STATUS } from "@/lib/format";
import type { BarangayDetail, BarangayList, BarangaySummary, OutageRun, Site, SiteMatches } from "@/lib/types";
import { useLguData } from "@/lib/use-lgu-data";
import type { MapView } from "./barangay-map";
import { BarangayPanel } from "./barangay-panel";
import { DetailsSheet } from "./details-sheet";
import { SitePanel } from "./site-panel";
import { DataTag } from "./ui";

// Leaflet touches `window`, so the map only renders in the browser.
const BarangayMap = dynamic(() => import("./barangay-map"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-zinc-500">Loading map…</div>,
});

const isOutageParam = (p: { get(key: string): string | null } | null) => p?.get("outage") === "1";

export function MapScreen() {
  const searchParams = useSearchParams();
  const { data, error: loadError } = useLguData();
  const list = data?.list ?? null;
  const sites = useMemo(() => data?.sites ?? [], [data]);
  const boundaries = useMemo(() => data?.boundaries ?? [], [data]);
  const scenarios = useMemo(() => data?.scenarios ?? [], [data]);
  const rules = data?.rules ?? null;
  const [actionError, setError] = useState<string | null>(null);
  const error = loadError ?? actionError;

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<BarangayDetail | null>(null);
  const [site, setSite] = useState<Site | null>(null);
  const [matches, setMatches] = useState<SiteMatches | null>(null);

  // /map?outage=1 opens with Outage Mode on (handy for the demo and shared links).
  const [outageOn, setOutageOn] = useState(() => isOutageParam(searchParams));
  // Following such a link while already on the map switches it on too.
  const outageParam = isOutageParam(searchParams);
  const [seenOutageParam, setSeenOutageParam] = useState(outageParam);
  if (outageParam !== seenOutageParam) {
    setSeenOutageParam(outageParam);
    if (outageParam) setOutageOn(true);
  }
  const [scenarioSlug, setScenarioSlug] = useState<string>("turbid-power-cut");
  const [run, setRun] = useState<OutageRun | null>(null);
  const [view, setView] = useState<MapView>("town");
  const [summaryOpen, setSummaryOpen] = useState(false);
  // Only the latest click may fill the panel, even if an earlier request answers last.
  const latestBarangay = useRef<number | null>(null);
  const latestSite = useRef<number | null>(null);

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

  // Esc closes the details panel.
  useEffect(() => {
    if (selectedId === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setSelectedId(null);
      setDetail(null);
      setSite(null);
      setMatches(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  const clearSelection = () => {
    setSelectedId(null);
    setDetail(null);
    setSite(null);
    setMatches(null);
  };

  const outageById = useMemo(() => new Map(run?.results.map((r) => [r.barangay_id, r]) ?? []), [run]);
  const showOutage = outageOn && run !== null;

  // Normal map: days of stored water. Outage Mode: whether each barangay holds out.
  const colorFor = useCallback(
    (b: BarangaySummary) => STATUS[showOutage ? (outageById.get(b.id)?.status ?? "green") : b.metrics.status].color,
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

  const panelOpen = Boolean(list && (site || selected));

  return (
    <div className={`relative min-h-0 flex-1 overflow-hidden ${panelOpen ? "map-panel-open" : ""}`}>
      {/* Full-bleed map */}
      <div className="absolute inset-0">
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
      </div>

      {/* Outage Mode + city summary, one translucent card */}
      <div className="glass absolute top-3 left-3 z-[1000] w-[min(360px,calc(100%-1.5rem))] rounded-2xl p-2.5 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <button
            role="switch"
            aria-checked={outageOn}
            onClick={() => setOutageOn((v) => !v)}
            className={`flex items-center gap-2 rounded-xl px-3 py-1.5 font-bold transition ${outageOn ? "bg-red-600 text-white" : "bg-white/80 text-foreground hover:bg-white"}`}
          >
            <span className={`h-4 w-7 rounded-full p-0.5 transition ${outageOn ? "bg-white/40" : "bg-zinc-300"}`}>
              <span className={`block h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${outageOn ? "translate-x-3" : ""}`} />
            </span>
            Outage Mode
          </button>
          <select
            value={scenarioSlug}
            onChange={(e) => setScenarioSlug(e.target.value)}
            className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white/70 px-2 py-1.5"
            aria-label="Outage scenario"
          >
            {scenarios.map((sc) => (
              <option key={sc.slug} value={sc.slug}>
                {sc.name} ({sc.duration_days} days)
              </option>
            ))}
          </select>
        </div>
        {list && (
          <>
            <button
              onClick={() => setSummaryOpen((v) => !v)}
              aria-expanded={summaryOpen}
              className="mt-2 flex w-full items-center justify-between rounded-lg px-1 py-0.5 text-xs font-bold text-muted lg:hidden"
            >
              {list.lgu.name} summary <span aria-hidden>{summaryOpen ? "▴" : "▾"}</span>
            </button>
            <div className={`${summaryOpen ? "block" : "hidden"} lg:block`}>
              <CitySummary list={list} run={showOutage ? run : null} />
            </div>
          </>
        )}
      </div>

      {/* Legend + view switch (hidden on phones while the details sheet is open) */}
      <div className={`glass absolute bottom-6 left-3 z-[1000] rounded-2xl p-2 text-xs sm:p-3 ${panelOpen ? "hidden lg:block" : ""}`}>
        <p className="mb-1.5 hidden font-bold sm:block">{showOutage ? `${scenario?.name ?? "Outage"}` : "Days of stored water"}</p>
        <ul className="flex gap-3 sm:block sm:space-y-1">
          {(showOutage
            ? (["holds", "partial", "fails"] as const).map((o) => ({ color: STATUS[OUTCOME[o].status].color, label: OUTCOME[o].label }))
            : (["green", "amber", "red"] as const).map((st) => ({ color: STATUS[st].color, label: STATUS[st].label }))
          ).map((row) => (
            <li key={row.label} className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: row.color }} />
              {row.label}
            </li>
          ))}
        </ul>
        <p className="mt-2 hidden text-[#5f6869] sm:block">▲ tank · △ candidate roof · ■ business</p>
        <div className="mt-2 flex overflow-hidden rounded-lg border border-black/10">
          {(["town", "city"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={`flex-1 px-2 py-1 ${view === v ? "bg-brand text-white" : "bg-white/60 hover:bg-white"}`}>
              {v === "town" ? "Town area" : "Whole city"}
            </button>
          ))}
        </div>
      </div>

      {/* Details: only while a barangay or building is selected */}
      {panelOpen && list && (
        <DetailsSheet key={`b${selected?.id}`} label="Selected barangay details" onClose={clearSelection}>
          {site ? (
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
          ) : null}
        </DetailsSheet>
      )}
    </div>
  );
}

function CitySummary({ list, run }: { list: BarangayList; run: OutageRun | null }) {
  const t = list.totals;
  const reusable = list.barangays.reduce((sum, b) => sum + b.metrics.greywater_lpd, 0);
  const reused = list.barangays.reduce((sum, b) => sum + (b.metrics.greywater_lpd - b.metrics.reuse_gap_lpd), 0);
  const tiles = run
    ? ([
        ["green", run.summary.holds, "hold out"],
        ["amber", run.summary.partial, "partly"],
        ["red", run.summary.fails, "run out"],
      ] as const)
    : ([
        ["green", t.status_counts.green, STATUS.green.label],
        ["amber", t.status_counts.amber, STATUS.amber.label],
        ["red", t.status_counts.red, STATUS.red.label],
      ] as const);

  return (
    <div className="mt-2.5 border-t border-black/10 px-1 pt-2.5">
      <p className="text-xs text-[#5f6869]">
        <strong className="text-foreground">{list.lgu.name}</strong> · {num(t.population)} people · {list.barangays.length} barangays <DataTag status="real" />
      </p>
      <p className="mt-2 text-[10px] font-extrabold tracking-[0.14em] text-brand">
        {run ? `${run.scenario.name.toUpperCase()}, ${run.scenario.duration_days} DAYS` : "BARANGAYS BY DAYS OF STORED WATER"}
      </p>
      <div className="mt-1.5 grid grid-cols-3 gap-1.5 text-center">
        {tiles.map(([st, n, label]) => (
          <div key={st} className="rounded-xl bg-white/70 px-1 py-1.5">
            <p className="text-lg leading-none font-extrabold tabular-nums" style={{ color: STATUS[st].color }}>
              {n}
            </p>
            <p className="mt-1 text-[10px] font-semibold text-[#5f6869]">{label}</p>
          </div>
        ))}
      </div>
      <dl className="mt-2 space-y-0.5 text-xs">
        <div className="flex justify-between gap-2">
          <dt className="text-[#5f6869]">Light greywater produced</dt>
          <dd className="font-bold tabular-nums">{liters(reusable)}/day</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-[#5f6869]">Reused today (estimate)</dt>
          <dd className="font-bold tabular-nums">{liters(reused)}/day</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-[#5f6869]">Stored water, citywide</dt>
          <dd className="font-bold tabular-nums">
            {liters(t.storage_liters)} · {days(t.days_of_cover)}
          </dd>
        </div>
      </dl>
      <p className="mt-2 text-[11px] text-[#5f6869]">{run ? "Pulsing roofs: where one new tank adds the most days. " : ""}Click a barangay for details.</p>
    </div>
  );
}
