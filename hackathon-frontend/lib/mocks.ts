// Contract-shaped mock data so screens can be built before the backend endpoints land.
// Populations are real (PSA 2020); locations, storage, adoption and sites are SIMULATED.
// Turn off with NEXT_PUBLIC_USE_MOCKS=false.
import type {
  BarangayDetail,
  BarangayForm,
  BarangayList,
  BarangaySummary,
  Lgu,
  LguSettings,
  OutageRun,
  OutageScenario,
  ProgramInput,
  ProgramPreview,
  ReuseRules,
  Site,
  SiteMatches,
  Status,
  StorageRegistry,
} from "./types";

const POPULATIONS: [string, number][] = [
  ["Albalate", 293], ["Bagongon", 707], ["Bangon", 272], ["Basiao", 700], ["Buluan", 791], ["Bunuanan", 4786],
  ["Cabugawan", 964], ["Cagudalo", 275], ["Cagusipan", 231], ["Cagutian", 235], ["Cagutsan", 1215],
  ["Canhawan Gote", 307], ["Canlapwas", 11805], ["Cawayan", 165], ["Cinco", 865], ["Darahuway Daco", 810],
  ["Darahuway Gote", 689], ["Estaka", 1148], ["Guindaponan", 3597], ["Guinsorongan", 4255], ["Ibol", 541],
  ["Iguid", 1697], ["Lagundi", 1023], ["Libas", 325], ["Lobo", 186], ["Manguehay", 135], ["Maulong", 5954],
  ["Mercedes", 12281], ["Mombon", 861], ["Muñoz", 1712], ["New Mahayag", 1393], ["Old Mahayag", 1434],
  ["Palanyogon", 320], ["Pangdan", 3334], ["Payao", 2093], ["Poblacion 1", 1238], ["Poblacion 2", 799],
  ["Poblacion 3", 3102], ["Poblacion 4", 1038], ["Poblacion 5", 537], ["Poblacion 6", 1344], ["Poblacion 7", 1368],
  ["Poblacion 8", 1169], ["Poblacion 9", 2988], ["Poblacion 10", 1838], ["Poblacion 11", 1027], ["Poblacion 12", 620],
  ["Poblacion 13", 4266], ["Pupua", 1594], ["Rama", 1683], ["San Andres", 5898], ["San Pablo", 1209],
  ["San Roque", 1454], ["San Vicente", 936], ["Silanga", 2974], ["Socorro", 1773], ["Totoringon", 186],
];

export const MOCK_LGU: Lgu = {
  id: 1,
  slug: "catbalogan",
  name: "Catbalogan City",
  province: "Samar",
  center: { lat: 11.7753, lng: 124.8829 },
  is_simulated: false,
};

const SETTINGS: LguSettings = { liters_per_person_day: 90.09, household_size: 5, drum_liters: 200, target_days_of_cover: 3 };
const LPD = SETTINGS.liters_per_person_day;
const COST = { tank: { min: 17000, max: 30000 }, cover: { min: 155, max: 210 }, card: 8, training: 15000 };

// Stable pseudo-random 0..1 from a string, so mocks don't change between reloads.
function rand(seed: string): number {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const statusFor = (days: number): Status => (days >= SETTINGS.target_days_of_cover ? "green" : days >= 1 ? "amber" : "red");

type Raw = { id: number; name: string; population: number; households: number; tankLiters: number; drums: number; reusing: number };

const RAW: Raw[] = POPULATIONS.map(([name, population], i) => {
  const households = Math.round(population / SETTINGS.household_size);
  const small = population < 1000;
  return {
    id: i + 1,
    name,
    population,
    households,
    tankLiters: rand(name + "t") > 0.85 ? 1000 : 0,
    // Small upland barangays keep more drums; that gives the map some green and amber.
    drums: Math.round(households * (small ? 0.8 + rand(name + "d") * 2.6 : 0.05 + rand(name + "d") * 0.3)),
    reusing: Math.round(households * (0.02 + rand(name + "a") * 0.13)),
  };
});

function summarize(r: Raw, extraLiters = 0): BarangaySummary {
  const greywater = Math.round(r.population * 0.52 * LPD);
  const nonpotable = Math.round(r.population * 0.38 * LPD);
  const storage = r.tankLiters + r.drums * SETTINGS.drum_liters + extraLiters;
  const days = round1(storage / nonpotable);
  const adoption = r.reusing / r.households;
  return {
    id: r.id,
    name: r.name,
    population: r.population,
    population_year: 2020,
    location: {
      lat: MOCK_LGU.center.lat + (rand(r.name + "y") - 0.5) * 0.16,
      lng: MOCK_LGU.center.lng + (rand(r.name + "x") - 0.5) * 0.16,
    },
    outage_vulnerability: round1(0.2 + rand(r.name + "v") * 0.7),
    metrics: {
      greywater_lpd: greywater,
      flushing_demand_lpd: Math.round(r.population * 0.3 * LPD),
      nonpotable_demand_lpd: nonpotable,
      reusing_households: r.reusing,
      households: r.households,
      adoption_rate: Math.round(adoption * 1000) / 1000,
      reuse_gap_lpd: Math.round(greywater - r.reusing * SETTINGS.household_size * 0.52 * LPD),
      storage_liters: storage,
      days_of_cover: days,
      readiness_score: Math.round(
        50 * Math.min(days / SETTINGS.target_days_of_cover, 1) + 30 * Math.min(adoption / 0.5, 1) + 20,
      ),
      status: statusFor(days),
      data_status: { population: "real", storage: "simulated", adoption: "simulated" },
    },
  };
}

const SITES: Site[] = RAW.flatMap((r) => {
  const b = summarize(r);
  const at = (k: string) => ({
    lat: b.location!.lat + (rand(r.name + k + "y") - 0.5) * 0.01,
    lng: b.location!.lng + (rand(r.name + k + "x") - 0.5) * 0.01,
  });
  const roof = (k: string) => Math.round(80 + rand(r.name + k + "r") * 320);
  const site = (n: number, name: string, category: string, k: string): Site => ({
    id: r.id * 10 + n,
    barangay_id: r.id,
    name,
    kind: "public_building",
    category,
    location: at(k),
    roof_area_m2: roof(k),
    source_types: ["rain", "light_greywater"],
    greywater_lpd: Math.round(200 + rand(r.name + k + "g") * 600),
    rain_yield_lpd: Math.round((2991 * roof(k) * 0.8) / 365),
    tank:
      n === 1 && r.tankLiters
        ? { status: "installed", liters: 1000, covered: true, working: true }
        : { status: "candidate", liters: null, covered: null, working: null },
    data_status: "simulated",
  });
  const list = [site(1, `${r.name} Barangay Hall`, "barangay_hall", "h"), site(2, `${r.name} Elementary School`, "school", "s")];
  if (r.name.startsWith("Poblacion") && rand(r.name + "biz") > 0.5) {
    list.push({
      ...site(3, `${r.name} Laundromat`, "laundromat", "b"),
      kind: "business",
      source_types: ["wash_water", "condensate"],
      tank: { status: "none", liters: null, covered: null, working: null },
    });
  }
  return list;
});

const SCENARIOS: OutageScenario[] = [
  { id: 1, slug: "turbid-power-cut", name: "Turbid source + power cut", description: "The July 2026 case: heavy rain makes the main source too turbid to treat and a power-line outage stops pumping.", duration_days: 5, supply_loss: 0.9 },
  { id: 2, slug: "dry-season", name: "Dry-season spring drawdown", description: "Springs run low after dry months; rationing cuts piped supply by about half.", duration_days: 14, supply_loss: 0.5 },
  { id: 3, slug: "typhoon", name: "Typhoon landfall", description: "Pipes and power lines damaged citywide for several days.", duration_days: 3, supply_loss: 1.0 },
];

const REUSE_RULES: ReuseRules = {
  rules: [
    { source: "rain", label: "Harvested rainwater (roof)", allowed: ["flushing", "floor_washing", "laundry", "plants"], never: ["drinking", "cooking", "bathing"], storage: "covered, labelled, first flush discarded", default_decision: "reuse" },
    { source: "light_greywater", label: "Light greywater (shower, laundry)", allowed: ["flushing", "subsurface_watering"], never: ["spray_irrigation", "drinking", "storage_over_1_day", "drums"], storage: "same day only", default_decision: "reuse" },
    { source: "wash_water", label: "Commercial wash water", allowed: ["cleaning", "landscaping"], never: ["drinking", "raw_food_crops", "storage_over_1_day"], storage: "same day only", default_decision: "treat_then_reuse" },
    { source: "condensate", label: "Aircon condensate", allowed: ["plants", "floor_cleaning"], never: ["drinking"], storage: "use on site", default_decision: "reuse" },
    { source: "kitchen", label: "Kitchen sink water", allowed: [], never: ["all_reuse"], storage: "none", default_decision: "discharge" },
    { source: "toilet", label: "Toilet water", allowed: [], never: ["all_reuse"], storage: "none", default_decision: "discharge" },
  ],
  uses: {
    flushing: "Toilet flushing", floor_washing: "Floor and street washing", laundry: "Laundry", plants: "Plants",
    subsurface_watering: "Sub-surface plant watering", cleaning: "Cleaning", landscaping: "Landscaping", floor_cleaning: "Floor cleaning",
  },
  storage_rules: [
    "Rainwater only", "Covered at all times", "Let the first minutes of rain run off",
    'Label "Hindi maiinom / Not for drinking"', "Keep apart from drinking water", "Use and refill every few weeks",
  ],
};

const submittedForms: BarangayForm[] = [];

function barangayList(): BarangayList {
  const barangays = RAW.map((r) => summarize(r));
  const storage = barangays.reduce((s, b) => s + b.metrics.storage_liters, 0);
  const nonpotable = barangays.reduce((s, b) => s + b.metrics.nonpotable_demand_lpd, 0);
  const counts = { green: 0, amber: 0, red: 0 };
  barangays.forEach((b) => counts[b.metrics.status]++);
  return {
    lgu: MOCK_LGU,
    settings: SETTINGS,
    totals: {
      population: barangays.reduce((s, b) => s + b.population, 0),
      greywater_lpd: barangays.reduce((s, b) => s + b.metrics.greywater_lpd, 0),
      storage_liters: storage,
      days_of_cover: round1(storage / nonpotable),
      status_counts: counts,
    },
    barangays,
  };
}

function programPreview(input: ProgramInput): ProgramPreview {
  const targets = RAW.filter((r) => !input.barangay_ids || input.barangay_ids.includes(r.id));
  const tanks = input.public_tanks * targets.length;
  const liters = tanks * input.tank_liters + input.drum_covers * SETTINGS.drum_liters;
  const perBarangayExtra = liters / Math.max(targets.length, 1);
  const rows = targets.map((r) => {
    const before = summarize(r).metrics;
    const after = summarize(r, perBarangayExtra).metrics;
    return { id: r.id, days_before: before.days_of_cover, days_after: after.days_of_cover, status_before: before.status, status_after: after.status };
  });
  const cost = {
    min: tanks * COST.tank.min + input.drum_covers * COST.cover.min + input.cards * COST.card + COST.training,
    max: tanks * COST.tank.max + input.drum_covers * COST.cover.max + input.cards * COST.card + COST.training,
  };
  const avg = (k: "days_before" | "days_after") => round1(rows.reduce((s, r) => s + r[k], 0) / Math.max(rows.length, 1));
  return {
    cost_php: cost,
    liters_secured: liters,
    days_of_cover: { before: avg("days_before"), after: avg("days_after") },
    phases: [
      { phase: 1, label: "Pilot, 1 barangay, 6 months", cost_php: cost, tanks, drum_covers: input.drum_covers, cards: input.cards },
      { phase: 2, label: "Citywide year 2", cost_php: { min: 900000, max: 1700000 }, tanks: 56, drum_covers: 0, cards: 0 },
    ],
    funding_tag: "LDRRMF 70% preparedness share (RA 10121)",
    share_of_funding: Math.round((cost.max / 35000000) * 10000) / 10000,
    barangays: rows,
  };
}

function outageRun(slug: string, program: ProgramInput | null): OutageRun {
  const scenario = SCENARIOS.find((s) => s.slug === slug) ?? SCENARIOS[0];
  const boosted = program ? new Map(programPreview(program).barangays.map((b) => [b.id, b.days_after])) : new Map();
  const results = RAW.map((r) => {
    const m = summarize(r).metrics;
    const days = boosted.get(r.id) ?? m.days_of_cover;
    const outcome = days >= scenario.duration_days ? "holds" : days >= 1 ? "partial" : "fails";
    return {
      barangay_id: r.id,
      days_of_cover: days,
      shortfall_liters: Math.max(0, Math.round((scenario.duration_days - days) * m.nonpotable_demand_lpd * scenario.supply_loss)),
      outcome: outcome as "holds" | "partial" | "fails",
      status: (outcome === "holds" ? "green" : outcome === "partial" ? "amber" : "red") as Status,
      suggested_site_id: outcome === "holds" ? null : r.id * 10 + 2,
    };
  });
  const summary = { holds: 0, partial: 0, fails: 0 };
  results.forEach((r) => summary[r.outcome]++);
  return { scenario, results, summary };
}

function siteMatches(id: number): SiteMatches {
  const site = SITES.find((s) => s.id === id);
  if (!site) throw new Error("Not found.");
  return {
    site_id: id,
    matches: site.source_types.flatMap((source) => {
      const rule = REUSE_RULES.rules.find((r) => r.source === source)!;
      return rule.allowed.slice(0, 2).map((use) => ({
        source,
        use,
        decision: rule.default_decision,
        liters_per_day: source === "rain" ? site.rain_yield_lpd ?? 0 : site.greywater_lpd ?? 0,
        reason: `${rule.label} may be used for ${REUSE_RULES.uses[use].toLowerCase()} on the same site.`,
        safety_note: rule.storage,
      }));
    }),
  };
}

function storage(): StorageRegistry {
  const rows = RAW.map((r) => {
    const m = summarize(r).metrics;
    return {
      barangay_id: r.id,
      name: r.name,
      public_tanks: { count: r.tankLiters ? 1 : 0, working: r.tankLiters ? 1 : 0, covered: r.tankLiters ? 1 : 0, liters: r.tankLiters },
      covered_drums: r.drums,
      storage_liters: m.storage_liters,
      days_of_cover: m.days_of_cover,
      drums_per_household_for_target: 3,
      last_form_at: "2026-09-30T02:00:00Z",
      data_status: "simulated" as const,
    };
  });
  const storageLiters = rows.reduce((s, r) => s + r.storage_liters, 0);
  const demand = RAW.reduce((s, r) => s + r.population * 0.38 * LPD, 0);
  return {
    rows,
    totals: {
      public_tanks: rows.reduce((s, r) => s + r.public_tanks.count, 0),
      covered_drums: rows.reduce((s, r) => s + r.covered_drums, 0),
      storage_liters: storageLiters,
      days_of_cover: round1(storageLiters / demand),
    },
  };
}

function route(method: string, path: string, body: unknown): unknown {
  const [p] = path.split("?");
  const kind = new URLSearchParams(path.split("?")[1] ?? "").get("kind");
  let m: RegExpMatchArray | null;

  if (method === "POST" && p === "/auth/login") {
    return { token: "mock-token", user: { id: 2, name: "CDRRMO Focal Person", email: "cdrrmo@demo.test", role: "cdrrmo", lgu_id: 1, barangay_id: null } };
  }
  if (p === "/auth/me") return { user: { id: 2, name: "CDRRMO Focal Person", email: "cdrrmo@demo.test", role: "cdrrmo", lgu_id: 1, barangay_id: null } };
  if (p === "/auth/logout") return undefined;
  if (p === "/lgus") return { lgus: [MOCK_LGU] };
  if (p === "/reuse-rules") return REUSE_RULES;
  if (p === "/barangay-forms" && method === "POST") {
    const input = body as Omit<BarangayForm, "id" | "created_at">;
    const existing = submittedForms.find((f) => f.client_uuid === input.client_uuid);
    if (existing) return { form: existing };
    const form = { ...input, id: submittedForms.length + 1000, created_at: new Date().toISOString() };
    submittedForms.unshift(form);
    return { form };
  }
  if ((m = p.match(/^\/lgus\/[^/]+\/barangays$/))) return barangayList();
  if ((m = p.match(/^\/lgus\/[^/]+\/sites$/))) return { sites: kind ? SITES.filter((s) => s.kind === kind) : SITES };
  if ((m = p.match(/^\/lgus\/[^/]+\/outage-scenarios$/))) return { scenarios: SCENARIOS };
  if ((m = p.match(/^\/lgus\/[^/]+\/outage-runs$/))) {
    const b = body as { scenario: string; program: ProgramInput | null };
    return outageRun(b.scenario, b.program);
  }
  if ((m = p.match(/^\/lgus\/[^/]+\/program-preview$/))) return programPreview(body as ProgramInput);
  if ((m = p.match(/^\/lgus\/[^/]+\/storage$/))) return storage();
  if ((m = p.match(/^\/lgus\/[^/]+\/rainfall$/))) {
    return {
      // Placeholder months until Open-Meteo is wired in; 2,991 mm a year split evenly.
      months: Array.from({ length: 12 }, (_, i) => ({ year: 2025, month: i + 1, rainfall_mm: 249.3, source: "seed" })),
      annual_mm: 2991,
      data_status: "assumed",
    };
  }
  if ((m = p.match(/^\/barangays\/(\d+)\/forms$/))) {
    return { forms: submittedForms.filter((f) => f.barangay_id === Number(m![1])) };
  }
  if ((m = p.match(/^\/barangays\/(\d+)$/))) {
    const r = RAW.find((x) => x.id === Number(m![1]));
    if (!r) throw new Error("Not found.");
    const detail: BarangayDetail = {
      barangay: summarize(r),
      per_person_lpd: { greywater: round1(0.52 * LPD), flushing: round1(0.3 * LPD), nonpotable: round1(0.38 * LPD) },
      sites: SITES.filter((s) => s.barangay_id === r.id),
      latest_form: submittedForms.find((f) => f.barangay_id === r.id) ?? null,
      drums_per_household_for_target: 3,
    };
    return detail;
  }
  if ((m = p.match(/^\/sites\/(\d+)\/matches$/))) return siteMatches(Number(m[1]));

  throw new Error(`No mock for ${method} ${path}`);
}

export async function mockRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  await new Promise((r) => setTimeout(r, 150)); // feel like a network call
  return route(method, path, body) as T;
}
