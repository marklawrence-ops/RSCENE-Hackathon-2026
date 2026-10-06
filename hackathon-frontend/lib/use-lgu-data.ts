"use client";

import { useEffect, useState } from "react";
import { endpoints } from "./api";
import type { BarangayList, BoundaryFeature, OutageScenario, ReuseRules, Site } from "./types";

export type LguData = {
  list: BarangayList;
  sites: Site[];
  boundaries: BoundaryFeature[];
  scenarios: OutageScenario[];
  rules: ReuseRules;
};

/** Loads everything the map and designer need for the first LGU, in parallel. */
export function useLguData() {
  const [data, setData] = useState<LguData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { lgus } = await endpoints.lgus();
        const slug = lgus[0]?.slug;
        if (!slug) throw new Error("No LGU configured");
        const [list, s, sc, rules, geo] = await Promise.all([
          endpoints.barangays(slug),
          endpoints.sites(slug),
          endpoints.outageScenarios(slug),
          endpoints.reuseRules(),
          // Boundaries are optional: without them the map draws circles.
          endpoints.boundaries(slug).catch(() => null),
        ]);
        if (!cancelled) setData({ list, sites: s.sites, scenarios: sc.scenarios, rules, boundaries: geo?.features ?? [] });
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, error };
}
