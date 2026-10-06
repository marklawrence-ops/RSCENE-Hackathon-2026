import { CATEGORY_LABEL, days, liters, num, OUTCOME, STATUS } from "@/lib/format";
import type { BarangayDetail, BarangaySummary, OutageRun, Site } from "@/lib/types";
import { Bar, DataTag, SectionTitle, Stat, StatusPill } from "./ui";

type Props = {
  barangay: BarangaySummary;
  detail: BarangayDetail | null;
  outage: OutageRun["results"][number] | null;
  scenarioName: string | null;
  sitesById: Map<number, Site>;
  onSelectSite: (site: Site) => void;
  onClose: () => void;
};

export function BarangayPanel({ barangay: b, detail, outage, scenarioName, sitesById, onSelectSite, onClose }: Props) {
  const m = b.metrics;
  const reused = m.greywater_lpd - m.reuse_gap_lpd;
  const suggested = outage?.suggested_site_id ? sitesById.get(outage.suggested_site_id) : undefined;

  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Barangay</p>
          <h2 className="text-xl font-semibold">{b.name}</h2>
        </div>
        <button onClick={onClose} className="rounded-md px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Close panel">
          ✕
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <StatusPill status={m.status} />
        <span className="text-sm text-zinc-500">Readiness {m.readiness_score}/100</span>
      </div>

      {outage && scenarioName && (
        <div className="mt-4 rounded-lg border-l-4 bg-zinc-50 p-3 text-sm dark:bg-zinc-900" style={{ borderColor: STATUS[OUTCOME[outage.outcome].status].color }}>
          <p className="font-semibold">
            {scenarioName}: {OUTCOME[outage.outcome].label.toLowerCase()}
          </p>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            Stored water lasts about <strong>{days(outage.days_of_cover)}</strong>
            {outage.shortfall_liters > 0 && <> · short by {liters(outage.shortfall_liters)}</>}.
          </p>
          {suggested && (
            <button onClick={() => onSelectSite(suggested)} className="mt-2 text-left text-brand underline dark:text-aqua">
              Best roof for a new tank: {suggested.name} ›
            </button>
          )}
        </div>
      )}

      <dl className="mt-4">
        <Stat label="Population (PSA 2020)" value={num(b.population)} tag={m.data_status.population} />
        <Stat label="Households" value={num(m.households)} tag="assumed" />
      </dl>

      <SectionTitle>Used water per day</SectionTitle>
      <dl>
        <Stat label="Light greywater (shower, laundry)" value={liters(m.greywater_lpd)} tag="assumed" />
        <Stat label="Toilet flushing demand" value={liters(m.flushing_demand_lpd)} tag="assumed" />
      </dl>
      {detail && (
        <p className="mt-1 text-xs text-zinc-500">
          About {detail.per_person_lpd.greywater} L of greywater per person against {detail.per_person_lpd.flushing} L needed for flushing.
        </p>
      )}

      <div className="mt-3 space-y-2">
        <div>
          <div className="mb-1 flex justify-between text-xs text-zinc-500">
            <span>Greywater that could be reused</span>
            <span>{liters(m.greywater_lpd)}</span>
          </div>
          <Bar value={m.greywater_lpd} max={m.greywater_lpd} color="#53d3df" />
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs text-zinc-500">
            <span>
              Reused today ({Math.round(m.adoption_rate * 100)}% of households) <DataTag status={m.data_status.adoption} />
            </span>
            <span>{liters(reused)}</span>
          </div>
          <Bar value={reused} max={m.greywater_lpd} color="#168d98" />
        </div>
        <p className="text-sm">
          Reuse gap: <strong>{liters(m.reuse_gap_lpd)}</strong> a day
        </p>
      </div>

      <SectionTitle>Outage reserve</SectionTitle>
      <p className="text-sm">
        Stored water covers about <strong>{days(m.days_of_cover)}</strong> of non-potable demand ({liters(m.nonpotable_demand_lpd)} a day).
      </p>
      <dl className="mt-1">
        <Stat label="Storage (tanks + covered drums)" value={liters(m.storage_liters)} tag={m.data_status.storage} />
        {detail && <Stat label="Drums per household for 3 days" value={String(detail.drums_per_household_for_target)} />}
      </dl>

      <SectionTitle>Sites</SectionTitle>
      {!detail ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : detail.sites.length === 0 ? (
        <p className="text-sm text-zinc-500">No listed sites.</p>
      ) : (
        <ul className="divide-y divide-black/5 dark:divide-white/10">
          {detail.sites.map((s) => (
            <li key={s.id}>
              <button onClick={() => onSelectSite(s)} className="flex w-full items-center justify-between gap-2 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900">
                <span>
                  <span className="mr-1.5" aria-hidden>
                    {s.kind === "business" ? "■" : s.tank.status === "installed" ? "▲" : "△"}
                  </span>
                  {s.name}
                  <span className="ml-1.5 text-xs text-zinc-500">{CATEGORY_LABEL[s.category] ?? s.category}</span>
                </span>
                <span className="text-zinc-400">›</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {detail?.latest_form && (
        <p className="mt-3 text-xs text-zinc-500">
          Last barangay form: {detail.latest_form.period} ({detail.latest_form.channel === "paper" ? "paper" : "app"})
        </p>
      )}
    </div>
  );
}
