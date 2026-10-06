// Mirrors hackathon-backend/docs/api-contract.md. Change both together.

export type LatLng = { lat: number; lng: number };
export type Money = { min: number; max: number };
export type Status = "green" | "amber" | "red";
export type DataStatus = "real" | "assumed" | "simulated";
export type Role = "planner" | "cdrrmo" | "barangay";
export type SourceKey = "rain" | "light_greywater" | "wash_water" | "condensate" | "kitchen" | "toilet";
export type Decision = "reuse" | "treat_then_reuse" | "discharge";

export type User = {
  id: number;
  name: string;
  email: string;
  role: Role;
  lgu_id: number | null;
  barangay_id: number | null;
};

export type Health = { status: "ok"; app: string; env: string; time: string };

export type Lgu = {
  id: number;
  slug: string;
  name: string;
  province: string;
  center: LatLng;
  is_simulated: boolean;
};

export type LguSettings = {
  liters_per_person_day: number;
  household_size: number;
  drum_liters: number;
  target_days_of_cover: number;
};

export type BarangayMetrics = {
  greywater_lpd: number;
  flushing_demand_lpd: number;
  nonpotable_demand_lpd: number;
  reusing_households: number;
  households: number;
  adoption_rate: number;
  reuse_gap_lpd: number;
  storage_liters: number;
  days_of_cover: number;
  readiness_score: number;
  status: Status;
  data_status: { population: DataStatus; storage: DataStatus; adoption: DataStatus };
};

export type BarangaySummary = {
  id: number;
  name: string;
  population: number;
  population_year: number;
  location: LatLng | null;
  outage_vulnerability: number;
  metrics: BarangayMetrics;
};

export type BarangayList = {
  lgu: Lgu;
  settings: LguSettings;
  totals: {
    population: number;
    greywater_lpd: number;
    storage_liters: number;
    days_of_cover: number;
    status_counts: Record<Status, number>;
  };
  barangays: BarangaySummary[];
};

export type Tank = {
  status: "none" | "candidate" | "installed";
  liters: number | null;
  covered: boolean | null;
  working: boolean | null;
  /** How long a full tank keeps this building's toilets and cleaning running. */
  days_of_cover: number | null;
};

export type Site = {
  id: number;
  barangay_id: number;
  name: string;
  kind: "public_building" | "business";
  category: string;
  location: LatLng;
  roof_area_m2: number | null;
  source_types: SourceKey[];
  greywater_lpd: number | null;
  rain_yield_lpd: number | null;
  nonpotable_demand_lpd: number | null;
  tank: Tank;
  data_status: DataStatus;
};

export type BarangayForm = {
  id: number;
  client_uuid: string;
  barangay_id: number;
  period: string;
  tanks_working: number;
  tanks_total: number;
  covered_drums: number;
  reusing_households: number;
  households_estimate: number;
  notes: string | null;
  channel: "app" | "paper";
  submitted_at: string;
  created_at: string;
};

export type BarangayFormInput = Omit<BarangayForm, "id" | "created_at">;

export type BarangayDetail = {
  barangay: BarangaySummary;
  per_person_lpd: { greywater: number; flushing: number; nonpotable: number };
  sites: Site[];
  latest_form: BarangayForm | null;
  drums_per_household_for_target: number;
};

export type ReuseRule = {
  source: SourceKey;
  label: string;
  allowed: string[];
  never: string[];
  storage: string;
  default_decision: Decision;
};

export type ReuseRules = { rules: ReuseRule[]; uses: Record<string, string>; storage_rules: string[] };

export type SiteMatches = {
  site_id: number;
  matches: { source: SourceKey; use: string; decision: Decision; liters_per_day: number; reason: string; safety_note: string }[];
};

export type OutageScenario = {
  id: number;
  slug: string;
  name: string;
  description: string;
  duration_days: number;
  supply_loss: number;
};

export type ProgramInput = {
  barangay_ids: number[] | null;
  public_tanks: number;
  tank_liters: number;
  cards: number;
  drum_covers: number;
  adoption_rate: number;
};

export type OutageRun = {
  scenario: OutageScenario;
  results: {
    barangay_id: number;
    days_of_cover: number;
    shortfall_liters: number;
    outcome: "holds" | "partial" | "fails";
    status: Status;
    suggested_site_id: number | null;
  }[];
  summary: { holds: number; partial: number; fails: number };
};

export type ProgramPreview = {
  cost_php: Money;
  liters_secured: number;
  days_of_cover: { before: number; after: number };
  phases: { phase: number; label: string; cost_php: Money; tanks: number; drum_covers: number; cards: number }[];
  funding_tag: string;
  share_of_funding: number;
  barangays: {
    id: number;
    days_before: number;
    days_after: number;
    status_before: Status;
    status_after: Status;
    greywater_reused_lpd_before: number;
    greywater_reused_lpd_after: number;
  }[];
};

export type StorageRegistry = {
  rows: {
    barangay_id: number;
    name: string;
    public_tanks: { count: number; working: number; covered: number; liters: number };
    covered_drums: number;
    storage_liters: number;
    days_of_cover: number;
    drums_per_household_for_target: number;
    last_form_at: string | null;
    data_status: DataStatus;
  }[];
  totals: { public_tanks: number; covered_drums: number; storage_liters: number; days_of_cover: number };
};

export type Rainfall = {
  months: { year: number; month: number; rainfall_mm: number; source: "open-meteo" | "seed" }[];
  annual_mm: number;
  data_status: DataStatus;
};
