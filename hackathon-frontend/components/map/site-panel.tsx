import { CATEGORY_LABEL, DECISION, days, liters, SOURCE_LABEL } from "@/lib/format";
import type { ReuseRules, Site, SiteMatches } from "@/lib/types";
import { DataTag, SectionTitle, Stat } from "./ui";

type Props = {
  site: Site;
  matches: SiteMatches | null;
  rules: ReuseRules | null;
  barangayName: string | undefined;
  onBack: () => void;
};

const TANK_LABEL = { installed: "Installed", candidate: "Candidate roof (no tank yet)", none: "None" } as const;

export function SitePanel({ site, matches, rules, barangayName, onBack }: Props) {
  const labelForUse = (use: string) => (use === "none" ? "No safe use" : (rules?.uses[use] ?? use.replaceAll("_", " ")));

  return (
    <div>
      <button onClick={onBack} className="mb-2 text-sm text-brand hover:underline dark:text-aqua">
        ‹ Back to {barangayName ?? "barangay"}
      </button>
      <p className="text-xs uppercase tracking-wide text-zinc-500">{CATEGORY_LABEL[site.category] ?? site.category}</p>
      <h2 className="flex items-center gap-2 text-xl font-semibold">
        {site.name} <DataTag status={site.data_status} />
      </h2>

      <dl className="mt-3">
        {site.roof_area_m2 != null && <Stat label="Roof area" value={`${site.roof_area_m2} m²`} />}
        {site.rain_yield_lpd != null && <Stat label="Rain caught (yearly average)" value={`${liters(site.rain_yield_lpd)}/day`} />}
        {site.nonpotable_demand_lpd != null && <Stat label="Own flushing and cleaning use" value={`${liters(site.nonpotable_demand_lpd)}/day`} />}
        {site.kind === "public_building" && <Stat label="Rain tank" value={TANK_LABEL[site.tank.status]} />}
        {site.tank.status === "installed" && site.tank.liters != null && (
          <Stat label="Tank" value={`${liters(site.tank.liters)}${site.tank.working === false ? " · not working" : ""}`} />
        )}
      </dl>
      {site.tank.days_of_cover != null && (
        <p className="mt-2 rounded-lg bg-brand/10 p-3 text-sm">
          A full tank keeps this building&apos;s toilets and cleaning running for about <strong>{days(site.tank.days_of_cover)}</strong> in an outage.
        </p>
      )}

      <SectionTitle>Source → safe use on this site</SectionTitle>
      {!matches ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : (
        <ul className="space-y-2">
          {matches.matches.map((m, i) => (
            <li key={`${m.source}-${m.use}-${i}`} className="rounded-lg border border-black/10 p-2.5 text-sm dark:border-white/10">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">
                  {SOURCE_LABEL[m.source] ?? m.source} → {labelForUse(m.use)}
                </span>
                <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${DECISION[m.decision].className}`}>{DECISION[m.decision].label}</span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                {m.liters_per_day > 0 && <>{liters(m.liters_per_day)}/day · </>}
                {m.safety_note}
              </p>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 rounded-lg border border-amber-500/40 bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
        ⚠ Non-potable only. Never for drinking, cooking or bathing. The planner gives guidance; it does not certify water quality.
      </p>
    </div>
  );
}
