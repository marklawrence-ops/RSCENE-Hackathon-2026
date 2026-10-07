"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { endpoints } from "@/lib/api";
import { m3PerYear, tariffEquivalent, tariffOf } from "@/lib/economics";
import { days, liters, num, OUTCOME, peso, STATUS } from "@/lib/format";
import type { BarangaySummary, OutageRun, ProgramInput, ProgramPreview } from "@/lib/types";
import { useLguData } from "@/lib/use-lgu-data";
import { GreywaterRule, StatusPill } from "../map/ui";

const BarangayMap = dynamic(() => import("../map/barangay-map"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-zinc-500">Loading map…</div>,
});

const TANK_SIZES = [500, 1000, 2000, 5000];
const NOT_IN_PROGRAM = "#cbd5e1";
const NO_SITES: never[] = [];
const NO_SUGGESTIONS = new Set<number>();

// The 2-minute demo: one small red barangay, five tanks and drum covers.
const DEMO = { name: "Bangon", public_tanks: 5, tank_liters: 1000, cards: 60, drum_covers: 80, adoption_rate: 0.3 };

type Controls = Omit<ProgramInput, "barangay_ids"> & { ids: number[]; wholeCity: boolean };

export function DesignerScreen() {
  const { data, error: loadError } = useLguData();
  const list = data?.list ?? null;
  const [edited, setEdited] = useState<Controls | null>(null);
  const [preview, setPreview] = useState<ProgramPreview | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scenarioSlug, setScenarioSlug] = useState("turbid-power-cut");
  const [outage, setOutage] = useState<{ before: OutageRun; after: OutageRun } | null>(null);
  const [outagePending, setOutagePending] = useState(false);
  const latest = useRef(0);

  const byId = useMemo(() => new Map(list?.barangays.map((b) => [b.id, b]) ?? []), [list]);

  // Start empty on the demo barangay so moving a slider shows the change.
  const initial = useMemo<Controls | null>(() => {
    if (!list) return null;
    const start = list.barangays.find((b) => b.name === DEMO.name) ?? list.barangays[0];
    return {
      ids: [start.id],
      wholeCity: false,
      public_tanks: 0,
      tank_liters: 1000,
      cards: 0,
      drum_covers: 0,
      adoption_rate: Math.round(start.metrics.adoption_rate * 20) / 20,
    };
  }, [list]);
  const controls = edited ?? initial;

  const input = useMemo<ProgramInput | null>(
    () =>
      controls && {
        barangay_ids: controls.wholeCity ? null : controls.ids,
        public_tanks: controls.public_tanks,
        tank_liters: controls.tank_liters,
        cards: controls.cards,
        drum_covers: controls.drum_covers,
        adoption_rate: controls.adoption_rate,
      },
    [controls],
  );

  // Debounced preview: sliders feel live without a request per pixel.
  useEffect(() => {
    if (!list || !input || (input.barangay_ids && input.barangay_ids.length === 0)) return;
    const id = ++latest.current;
    const t = setTimeout(() => {
      setPending(true);
      endpoints
        .programPreview(list.lgu.slug, input)
        .then((p) => {
          if (id !== latest.current) return;
          setPreview(p);
          setError(null);
        })
        .catch((e: Error) => id === latest.current && setError(e.message))
        .finally(() => id === latest.current && setPending(false));
    }, 250);
    return () => clearTimeout(t);
  }, [list, input]);

  const update = (patch: Partial<Controls>) => {
    setEdited((c) => {
      const base = c ?? initial;
      return base ? { ...base, ...patch } : c;
    });
    setOutage(null);
  };

  const toggleBarangay = useCallback(
    (id: number) =>
      setEdited((c) => {
        const base = c ?? initial;
        if (!base) return c;
        const ids = base.ids.includes(id) ? base.ids.filter((x) => x !== id) : [...base.ids, id];
        return { ...base, wholeCity: false, ids };
      }),
    [initial],
  );

  const loadDemo = () => {
    const b = list?.barangays.find((x) => x.name === DEMO.name);
    if (!b) return;
    update({ ids: [b.id], wholeCity: false, ...DEMO });
  };

  const runOutage = async () => {
    if (!list || !input) return;
    setOutagePending(true);
    try {
      const [before, after] = await Promise.all([
        endpoints.outageRun(list.lgu.slug, scenarioSlug),
        endpoints.outageRun(list.lgu.slug, scenarioSlug, input),
      ]);
      setOutage({ before, after });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOutagePending(false);
    }
  };

  const rowsById = useMemo(() => new Map(preview?.barangays.map((r) => [r.id, r]) ?? []), [preview]);
  const inProgram = useCallback(
    (id: number) => (controls?.wholeCity ? true : (controls?.ids.includes(id) ?? false)),
    [controls],
  );
  const colorFor = useCallback(
    (b: BarangaySummary) => {
      if (!inProgram(b.id)) return NOT_IN_PROGRAM;
      return STATUS[rowsById.get(b.id)?.status_after ?? b.metrics.status].color;
    },
    [inProgram, rowsById],
  );

  const households = useMemo(() => {
    if (!list || !controls) return 0;
    const targets = controls.wholeCity ? list.barangays : controls.ids.map((id) => byId.get(id)).filter(Boolean);
    return (targets as BarangaySummary[]).reduce((s, b) => s + b.metrics.households, 0);
  }, [list, controls, byId]);

  const error_ = loadError ?? error;
  if (error_ && !list) {
    return <div className="grid flex-1 place-items-center p-6 text-sm text-zinc-500">Could not load: {error_}</div>;
  }
  if (!list || !controls) {
    return <div className="grid flex-1 place-items-center text-sm text-zinc-500">Loading…</div>;
  }

  const targetCount = controls.wholeCity ? list.barangays.length : controls.ids.length;
  const coverMax = Math.max(100, Math.ceil((households * 3) / 50) * 50);
  const scenario = data?.scenarios.find((s) => s.slug === scenarioSlug);
  const sortedBarangays = [...list.barangays].sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }));

  return (
    <div className="map-panel-open relative flex min-h-0 flex-1 flex-col overflow-y-auto lg:block lg:overflow-hidden">
      {/* Map: the whole background on laptops, a strip at the top on phones */}
      <div className="relative h-[42dvh] shrink-0 lg:absolute lg:inset-0 lg:h-auto">
        <BarangayMap
          barangays={list.barangays}
          boundaries={data?.boundaries ?? []}
          colorFor={colorFor}
          selectedId={null}
          onSelect={toggleBarangay}
          sites={NO_SITES}
          selectedSiteId={null}
          onSelectSite={() => {}}
          suggestedSiteIds={NO_SUGGESTIONS}
          defaultBounds={list.lgu.default_bounds}
          view="town"
        />
        <div className="glass absolute bottom-6 left-3 z-[1000] rounded-2xl p-2 text-xs lg:left-[388px]">
          <ul className="flex flex-wrap gap-3">
            {(["green", "amber", "red"] as const).map((s) => (
              <li key={s} className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: STATUS[s].color }} />
                {STATUS[s].label}
              </li>
            ))}
            <li className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: NOT_IN_PROGRAM }} />
              Not in program
            </li>
          </ul>
        </div>
      </div>

      {/* Controls */}
      <section className="glass relative z-[1000] mx-3 mt-3 rounded-3xl p-4 lg:absolute lg:top-3 lg:bottom-3 lg:left-3 lg:m-0 lg:w-[360px] lg:overflow-y-auto">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-extrabold tracking-[0.18em] text-brand">BUDGET &amp; IMPACT</p>
            <h1 className="text-xl font-extrabold tracking-[-0.03em]">Program Designer</h1>
          </div>
          <button onClick={loadDemo} className="rounded-lg border border-brand/40 px-2.5 py-1 text-xs font-medium text-brand hover:bg-brand/10 dark:text-aqua">
            Load demo
          </button>
        </div>
        <p className="mt-1 text-sm text-zinc-500">What the LGU funds, where, and what it buys in days of cover.</p>

        <Field label="Barangays">
          <div className="flex flex-wrap gap-1.5">
            {controls.wholeCity ? (
              <span className="rounded-full bg-brand px-2.5 py-1 text-xs font-medium text-white">All {list.barangays.length} barangays</span>
            ) : (
              controls.ids.map((id) => (
                <button
                  key={id}
                  onClick={() => toggleBarangay(id)}
                  className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                  aria-label={`Remove ${byId.get(id)?.name}`}
                >
                  {byId.get(id)?.name} ✕
                </button>
              ))
            )}
          </div>
          <div className="mt-2 flex gap-2">
            <select
              value=""
              onChange={(e) => e.target.value && toggleBarangay(Number(e.target.value))}
              disabled={controls.wholeCity}
              className="min-w-0 flex-1 rounded-lg border border-black/15 bg-transparent px-2 py-1.5 text-sm disabled:opacity-40 dark:border-white/15"
              aria-label="Add a barangay"
            >
              <option value="">Add a barangay…</option>
              {sortedBarangays
                .filter((b) => !controls.ids.includes(b.id))
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({days(b.metrics.days_of_cover)})
                  </option>
                ))}
            </select>
            <label className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={controls.wholeCity} onChange={(e) => update({ wholeCity: e.target.checked })} />
              Whole city
            </label>
          </div>
          <p className="mt-1 text-xs text-zinc-500">Or click barangays on the map.</p>
        </Field>

        <Slider
          label="New public rain tanks"
          hint={`per barangay · ${num(controls.public_tanks * targetCount)} in total`}
          value={controls.public_tanks}
          min={0}
          max={10}
          onChange={(v) => update({ public_tanks: v })}
        />
        <Field label="Tank size">
          <div className="flex overflow-hidden rounded-lg border border-black/15 text-sm dark:border-white/15">
            {TANK_SIZES.map((s) => (
              <button
                key={s}
                onClick={() => update({ tank_liters: s })}
                className={`flex-1 px-2 py-1.5 ${controls.tank_liters === s ? "bg-brand text-white" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
              >
                {num(s)} L
              </button>
            ))}
          </div>
        </Field>
        <Slider
          label="Free drum covers"
          hint={`for households with uncovered drums · ${num(households)} households`}
          value={controls.drum_covers}
          min={0}
          max={coverMax}
          step={coverMax > 500 ? 10 : 1}
          onChange={(v) => update({ drum_covers: v })}
        />
        <Slider
          label="Guidance cards printed"
          hint="Waray and Filipino, handed out by health workers"
          value={controls.cards}
          min={0}
          max={Math.max(100, Math.ceil(households / 50) * 50)}
          step={households > 1000 ? 10 : 1}
          onChange={(v) => update({ cards: v })}
        />
        <Slider
          label="Households reusing greywater (target)"
          value={Math.round(controls.adoption_rate * 100)}
          min={0}
          max={60}
          format={(v) => `${v}%`}
          onChange={(v) => update({ adoption_rate: v / 100 })}
        />
        <GreywaterRule />
      </section>

      {/* Results */}
      <section className="relative z-[1000] lg:absolute lg:top-3 lg:right-3 lg:bottom-3 lg:w-[400px]">
        <div className="glass m-3 space-y-4 rounded-3xl p-4 lg:m-0 lg:h-full lg:overflow-y-auto">
          {!preview || targetCount === 0 ? (
            <p className="text-sm text-zinc-500">{targetCount === 0 ? "Add a barangay to start." : "Calculating…"}</p>
          ) : (
            <div className={`space-y-4 transition-opacity ${pending ? "opacity-60" : ""}`}>
              <div className="rounded-xl bg-brand p-4 text-white">
                <p className="text-xs uppercase tracking-wide text-white/70">Year-1 cost</p>
                <p className="text-3xl font-semibold tabular-nums">
                  {peso(preview.cost_php.min)} – {peso(preview.cost_php.max)}
                </p>
                <p className="mt-1 text-sm text-white/80">
                  {(preview.share_of_funding * 100).toFixed(2)}% of the {preview.funding_tag}
                </p>
                <p className="mt-0.5 text-[11px] text-white/70">A possible funding route: needs the local DRRM plan and budget approval.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Tile label="Rainwater stored" value={liters(preview.liters_secured)} />
                <Tile
                  label={preview.barangays.length > 1 ? "Days of cover (average)" : "Days of cover"}
                  value={`${preview.days_of_cover.before.toFixed(1)} → ${preview.days_of_cover.after.toFixed(1)}`}
                />
              </div>

              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Per barangay</h3>
                <ul className="divide-y divide-black/5 rounded-xl border border-black/10 dark:divide-white/10 dark:border-white/10">
                  {preview.barangays.slice(0, 60).map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                      <span className="min-w-0 truncate font-medium">{byId.get(r.id)?.name}</span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        <StatusPill status={r.status_before} label={r.days_before.toFixed(1)} />
                        <span className="text-zinc-400">→</span>
                        <StatusPill status={r.status_after} label={days(r.days_after)} />
                      </span>
                    </li>
                  ))}
                </ul>
                {(() => {
                  const before = preview.barangays.reduce((s, r) => s + r.greywater_reused_lpd_before, 0);
                  const after = preview.barangays.reduce((s, r) => s + r.greywater_reused_lpd_after, 0);
                  const t = data ? tariffOf(data.list.settings) : null;
                  return (
                    <p className="mt-2 text-xs text-zinc-500">
                      Greywater reused: {liters(before)} → {liters(after)} a day, freeing {num(m3PerYear(before))} → {num(m3PerYear(after))} m³ of treated water a year
                      {t && <> (≈ {peso(tariffEquivalent(after - before, t))} a year more, tariff equivalent)</>}.
                    </p>
                  );
                })()}
              </div>

              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Phases</h3>
                <ol className="space-y-2">
                  {preview.phases.map((p) => (
                    <li key={p.phase} className="rounded-xl border border-black/10 p-3 text-sm dark:border-white/10">
                      <div className="flex justify-between gap-2">
                        <span className="font-medium">{p.label}</span>
                        <span className="shrink-0 tabular-nums">
                          {peso(p.cost_php.min)}–{peso(p.cost_php.max)}
                        </span>
                      </div>
                      {p.phase === 1 && (
                        <p className="mt-1 text-xs text-zinc-500">
                          {num(p.tanks)} tanks · {num(p.drum_covers)} drum covers · {num(p.cards)} cards{p.tanks + p.cards > 0 && " · one training session"}
                        </p>
                      )}
                      {p.phase === 2 && <p className="mt-1 text-xs text-zinc-500">Only if the pilot meets its gate (e.g. 4 of 5 tanks working, 80% of forms in).</p>}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="rounded-xl border border-black/10 p-3 dark:border-white/10">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={scenarioSlug}
                    onChange={(e) => {
                      setScenarioSlug(e.target.value);
                      setOutage(null);
                    }}
                    className="min-w-0 flex-1 rounded-lg border border-black/15 bg-transparent px-2 py-1.5 text-sm dark:border-white/15"
                    aria-label="Outage scenario"
                  >
                    {data?.scenarios.map((s) => (
                      <option key={s.slug} value={s.slug}>
                        {s.name} ({s.duration_days} days)
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={runOutage}
                    disabled={outagePending}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    {outagePending ? "Running…" : "Run outage with this program"}
                  </button>
                </div>
                {outage && (
                  <div className="mt-3 space-y-2 text-sm">
                    <p>
                      <strong>{scenario?.name}</strong>, citywide: {outage.before.summary.holds} → <strong>{outage.after.summary.holds}</strong> barangays hold out.
                    </p>
                    <ul className="space-y-1">
                      {outage.after.results
                        .filter((r) => inProgram(r.barangay_id))
                        .slice(0, 12)
                        .map((r) => {
                          const before = outage.before.results.find((x) => x.barangay_id === r.barangay_id);
                          return (
                            <li key={r.barangay_id} className="flex items-center justify-between gap-2">
                              <span className="truncate">{byId.get(r.barangay_id)?.name}</span>
                              <span className="flex shrink-0 items-center gap-1.5 text-xs">
                                {before && <StatusPill status={OUTCOME[before.outcome].status} label={OUTCOME[before.outcome].label} />}
                                <span className="text-zinc-400">→</span>
                                <StatusPill status={OUTCOME[r.outcome].status} label={OUTCOME[r.outcome].label} />
                              </span>
                            </li>
                          );
                        })}
                    </ul>
                  </div>
                )}
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <p className="text-xs text-zinc-500">
                Costs: tanks ₱17k–30k per site, drum covers ₱155–210, cards and one training session (assumed). Storage counts rain for flushing and laundry only.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <p className="mb-1.5 text-sm font-medium">{label}</p>
      {children}
    </div>
  );
}

function Slider(props: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const { label, hint, value, min, max, step = 1, format = num, onChange } = props;
  return (
    <div className="mt-5">
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-sm font-medium">{label}</label>
        <span className="text-sm font-semibold tabular-nums">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={Math.min(value, max)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 w-full accent-brand"
        aria-label={label}
      />
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-900">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
