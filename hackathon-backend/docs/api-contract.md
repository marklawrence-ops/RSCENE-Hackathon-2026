# API Contract: Circular Water Network Planner

Version 1.1 (2026-10-06 afternoon; v1 agreed 12:00 NN). v1.1 only adds fields, see the changelog at the end. **Change it only by editing this file, and tell the other side when you do.**
The frontend builds against mocks with the same shapes (`hackathon-frontend/lib/mocks.ts`, types in `lib/types.ts`), so keep the two in step.

## Conventions

| Item | Rule |
|---|---|
| Base URL | `{API_URL}/api/v1`; local `http://localhost:8000/api/v1` |
| Format | JSON in and out. Always send `Accept: application/json`. |
| Auth | Laravel Sanctum **bearer tokens**: `Authorization: Bearer <token>`. No cookies, no CSRF. |
| Who needs a token | **Reads are public** (map, scores and registry are public information). **Writes need a token** (`POST /barangay-forms`). |
| LGU in URLs | `{lgu}` is the slug, e.g. `catbalogan`. |
| Units | Litres are integers. `*_lpd` means litres per day. Money is `{ "min": n, "max": n }` in PHP. Rates are 0–1. |
| Dates | ISO 8601 strings in UTC, e.g. `2026-10-06T04:00:00Z`. |
| Data labels | Any object built from modeled or simulated data carries `data_status`: `"real" \| "assumed" \| "simulated"`. The UI shows it as a label. |
| Status colours | `days_of_cover >= 3` → `"green"`, `>= 1` → `"amber"`, else `"red"`. Target days come from LGU settings (`target_days_of_cover`). |

### Errors (Laravel defaults)

```json
// 422 validation
{ "message": "The email field is required.", "errors": { "email": ["The email field is required."] } }
// 401 missing/expired token
{ "message": "Unauthenticated." }
// 404
{ "message": "Not found." }
```

## Shared shapes

```ts
type LatLng = { lat: number; lng: number }
type Money = { min: number; max: number }
type Status = "green" | "amber" | "red"
type DataStatus = "real" | "assumed" | "simulated"

type Lgu = {
  id: number; slug: string; name: string; province: string
  center: LatLng
  default_bounds: [[number, number], [number, number]] | null  // v1.1: [[south, west], [north, east]] for the map's first view; null = fit all
  is_simulated: boolean
}

type BarangayMetrics = {
  greywater_lpd: number            // population × 0.52 × L/person/day
  flushing_demand_lpd: number      // population × 0.30 × L/person/day
  nonpotable_demand_lpd: number    // population × 0.38 × L/person/day (what stored rain may serve)
  reusing_households: number       // from latest form; 0 if none
  households: number               // households_estimate from form, else population ÷ household_size
  adoption_rate: number            // reusing_households ÷ households
  reuse_gap_lpd: number            // greywater_lpd − reusing_households × greywater per household
  storage_liters: number           // working public tanks + covered drums × drum_liters
  days_of_cover: number            // storage_liters ÷ nonpotable_demand_lpd, 1 decimal
  readiness_score: number          // 0–100, see formula below
  status: Status
  data_status: { population: DataStatus; storage: DataStatus; adoption: DataStatus }
}

type BarangaySummary = {
  id: number; name: string
  population: number; population_year: number
  location: LatLng | null          // null until coordinates are seeded
  outage_vulnerability: number     // 0–1
  metrics: BarangayMetrics
}

type Tank = {
  status: "none" | "candidate" | "installed"; liters: number | null; covered: boolean | null; working: boolean | null
  days_of_cover: number | null    // v1.1: installed tank ÷ the building's own non-potable use ("toilets keep running N days")
}

type Site = {
  id: number; barangay_id: number; name: string
  kind: "public_building" | "business"
  category: string                 // school | barangay_hall | health_center | gym | market | laundromat | carwash | hotel
  location: LatLng
  roof_area_m2: number | null
  source_types: SourceKey[]
  greywater_lpd: number | null
  rain_yield_lpd: number | null    // last 12 months of Open-Meteo rain × roof × 0.8 ÷ 365
  nonpotable_demand_lpd: number | null  // v1.1: the building's own flushing and cleaning use
  tank: Tank
  data_status: DataStatus
}

type SourceKey = "rain" | "light_greywater" | "wash_water" | "condensate" | "kitchen" | "toilet"
type Decision = "reuse" | "treat_then_reuse" | "discharge"

type BarangayForm = {
  id: number; client_uuid: string; barangay_id: number
  period: string                   // "2026-Q4" or "2026-PRE-TYPHOON"
  tanks_working: number; tanks_total: number
  covered_drums: number; reusing_households: number; households_estimate: number
  notes: string | null
  channel: "app" | "paper"
  submitted_at: string; created_at: string
}

type ProgramInput = {
  barangay_ids: number[] | null    // null = whole LGU
  public_tanks: number             // new tanks per selected barangay
  tank_liters: number              // default 1000
  cards: number                    // guidance cards printed
  drum_covers: number
  adoption_rate: number            // target 0–1
}
```

**Readiness score** = `50 × min(days_of_cover ÷ target, 1) + 30 × min(adoption_rate ÷ 0.5, 1) + 20 × (form submitted for the current period ? 1 : 0)`, rounded.

## Endpoints

| # | Method & path | Auth | Screen |
|---|---|---|---|
| 1 | `GET /health` | – | deploy check |
| 2 | `POST /auth/login` | – | login |
| 3 | `GET /auth/me` | token | all |
| 4 | `POST /auth/logout` | token | all |
| 5 | `GET /lgus` | – | LGU dropdown |
| 6 | `GET /lgus/{lgu}/barangays` | – | Reuse Network Map |
| 7 | `GET /barangays/{id}` | – | Map detail panel |
| 8 | `GET /lgus/{lgu}/sites?kind=` | – | Map pins |
| 9 | `GET /reuse-rules` | – | Source-to-Use Matching, safety table |
| 10 | `GET /sites/{id}/matches` | – | Source-to-Use Matching |
| 11 | `GET /lgus/{lgu}/outage-scenarios` | – | Outage Mode |
| 12 | `POST /lgus/{lgu}/outage-runs` | – | Outage Mode |
| 13 | `POST /lgus/{lgu}/program-preview` | – | Program Designer |
| 14 | `GET /lgus/{lgu}/storage` | – | Storage Registry |
| 15 | `GET /barangays/{id}/forms` | – | Barangay Form history |
| 16 | `POST /barangay-forms` | token | Barangay Form (offline sync) |
| 17 | `GET /lgus/{lgu}/rainfall` | – | Detail panel, Designer |
| 18 | `GET /lgus/{lgu}/boundaries` | – | Map shapes (v1.1) |

Status: **all 18 live** (2026-10-06). Covered by `tests/Feature/WaterModelApiTest.php`.

### 1. `GET /health`
```json
{ "status": "ok", "app": "Circular Water Network Planner", "env": "production", "time": "2026-10-06T04:00:00+00:00" }
```

### 2. `POST /auth/login`
Request `{ "email": "cdrrmo@demo.test", "password": "…", "device_name": "pixel-7" }`
```json
{ "token": "1|abc…", "user": { "id": 2, "name": "CDRRMO Focal Person", "email": "cdrrmo@demo.test", "role": "cdrrmo", "lgu_id": 1, "barangay_id": null } }
```
`role`: `planner | cdrrmo | barangay`. Wrong credentials → 422 on `email`. Throttled to 10 per minute.

### 3. `GET /auth/me` → `{ "user": User }`
### 4. `POST /auth/logout` → `204`, revokes the current token.

### 5. `GET /lgus`
```json
{ "lgus": [ { "id": 1, "slug": "catbalogan", "name": "Catbalogan City", "province": "Samar", "center": { "lat": 11.7753, "lng": 124.8829 }, "default_bounds": [[11.735, 124.815], [11.91, 124.935]], "is_simulated": false } ] }
```

### 6. `GET /lgus/{lgu}/barangays`
```json
{
  "lgu": { "...": "Lgu" },
  "settings": { "liters_per_person_day": 90.09, "household_size": 5, "drum_liters": 200, "target_days_of_cover": 3 },
  "totals": { "population": 106440, "greywater_lpd": 4987000, "storage_liters": 0, "days_of_cover": 0.0, "status_counts": { "green": 0, "amber": 0, "red": 57 } },
  "barangays": [ "BarangaySummary", "…" ]
}
```

### 7. `GET /barangays/{id}`
```json
{
  "barangay": "BarangaySummary",
  "per_person_lpd": { "greywater": 46.8, "flushing": 27.0, "nonpotable": 34.2 },
  "sites": [ "Site" ],
  "latest_form": "BarangayForm | null",
  "drums_per_household_for_target": 3
}
```

### 8. `GET /lgus/{lgu}/sites?kind=public_building|business` → `{ "sites": [Site] }` (no `kind` = all)

### 9. `GET /reuse-rules`
```json
{
  "rules": [
    { "source": "rain", "label": "Harvested rainwater (roof)", "allowed": ["flushing", "floor_washing", "laundry", "plants"], "never": ["drinking", "cooking", "bathing"], "storage": "covered, labelled, first flush discarded", "default_decision": "reuse" },
    { "source": "light_greywater", "label": "Light greywater (shower, laundry)", "allowed": ["flushing", "subsurface_watering"], "never": ["spray_irrigation", "drinking", "storage_over_1_day", "drums"], "storage": "same day only", "default_decision": "reuse" },
    { "source": "wash_water", "label": "Commercial wash water", "allowed": ["cleaning", "landscaping"], "never": ["drinking", "raw_food_crops", "storage_over_1_day"], "storage": "same day only", "default_decision": "treat_then_reuse" },
    { "source": "condensate", "label": "Aircon condensate", "allowed": ["plants", "floor_cleaning"], "never": ["drinking"], "storage": "use on site", "default_decision": "reuse" },
    { "source": "kitchen", "label": "Kitchen sink water", "allowed": [], "never": ["all_reuse"], "storage": "none", "default_decision": "discharge" },
    { "source": "toilet", "label": "Toilet water", "allowed": [], "never": ["all_reuse"], "storage": "none", "default_decision": "discharge" }
  ],
  "uses": { "flushing": "Toilet flushing", "floor_washing": "Floor and street washing", "laundry": "Laundry", "plants": "Plants", "subsurface_watering": "Sub-surface plant watering", "cleaning": "Cleaning", "landscaping": "Landscaping", "floor_cleaning": "Floor cleaning" },
  "storage_rules": ["Rainwater only", "Covered at all times", "Let the first minutes of rain run off", "Label \"Hindi maiinom / Not for drinking\"", "Keep apart from drinking water", "Use and refill every few weeks"]
}
```

### 10. `GET /sites/{id}/matches`
```json
{
  "site_id": 12,
  "matches": [
    { "source": "rain", "use": "flushing", "decision": "reuse", "liters_per_day": 520, "reason": "Rain tier allows flushing on the same site.", "safety_note": "Covered, labelled tank." },
    { "source": "wash_water", "use": "cleaning", "decision": "treat_then_reuse", "liters_per_day": 300, "reason": "Gritty: settle or filter first.", "safety_note": "Use the same day." }
  ]
}
```

### 11. `GET /lgus/{lgu}/outage-scenarios`
```json
{ "scenarios": [ { "id": 1, "slug": "turbid-power-cut", "name": "Turbid source + power cut", "description": "…", "duration_days": 5, "supply_loss": 0.9 } ] }
```

### 12. `POST /lgus/{lgu}/outage-runs`
Request `{ "scenario": "turbid-power-cut", "program": ProgramInput | null }`. Nothing is saved.
```json
{
  "scenario": { "...": "OutageScenario" },
  "results": [
    { "barangay_id": 5, "days_of_cover": 0.4, "shortfall_liters": 812000, "outcome": "fails", "status": "red", "suggested_site_id": 31 }
  ],
  "summary": { "holds": 3, "partial": 10, "fails": 44 }
}
```
Days of cover here = storage ÷ (non-potable demand × `supply_loss`), because storage only replaces the piped water that is lost. `outcome`: `holds` (cover ≥ scenario days, or barangay not affected), `partial` (≥ 1 day), `fails`. `suggested_site_id` = candidate roof where a new tank adds the most cover, or `null`.

### 13. `POST /lgus/{lgu}/program-preview`
Request `ProgramInput`. Nothing is saved.
```json
{
  "cost_php": { "min": 131000, "max": 228000 },
  "liters_secured": 5000,
  "days_of_cover": { "before": 0.2, "after": 1.4 },
  "phases": [
    { "phase": 1, "label": "Pilot, 1 barangay, 6 months", "cost_php": { "min": 131000, "max": 228000 }, "tanks": 5, "drum_covers": 120, "cards": 300 },
    { "phase": 2, "label": "Citywide year 2", "cost_php": { "min": 900000, "max": 1700000 }, "tanks": 56, "drum_covers": 0, "cards": 0 }
  ],
  "funding_tag": "LDRRMF 70% preparedness share (RA 10121)",
  "share_of_funding": 0.004,
  "barangays": [ { "id": 33, "days_before": 0.2, "days_after": 1.4, "status_before": "red", "status_after": "amber" } ]
}
```

### 14. `GET /lgus/{lgu}/storage`
```json
{
  "rows": [
    { "barangay_id": 33, "name": "Mercedes", "public_tanks": { "count": 2, "working": 2, "covered": 2, "liters": 2000 }, "covered_drums": 140, "storage_liters": 30000, "days_of_cover": 0.1, "drums_per_household_for_target": 3, "last_form_at": "2026-10-06T03:00:00Z", "data_status": "simulated" }
  ],
  "totals": { "public_tanks": 10, "covered_drums": 900, "storage_liters": 190000, "days_of_cover": 0.05 }
}
```

### 15. `GET /barangays/{id}/forms` → `{ "forms": [BarangayForm] }`, newest first.

### 16. `POST /barangay-forms` (token)
Request (all required except `notes`):
```json
{ "client_uuid": "9b1d…", "barangay_id": 33, "period": "2026-Q4", "tanks_working": 1, "tanks_total": 2, "covered_drums": 140, "reusing_households": 40, "households_estimate": 300, "notes": null, "channel": "app", "submitted_at": "2026-10-06T03:00:00Z" }
```
- `201 { "form": BarangayForm }` when new.
- `200 { "form": BarangayForm }` when that `client_uuid` already exists, so the offline queue can safely retry.
- A `barangay` user may only submit for their own `barangay_id` (403 otherwise). `planner`/`cdrrmo` may submit for any barangay (paper encoding uses `channel: "paper"`).
- `submitted_at` is the time on the device, not the sync time.

### 17. `GET /lgus/{lgu}/rainfall`
```json
{ "months": [ { "year": 2025, "month": 7, "rainfall_mm": 303.0, "source": "open-meteo" } ], "annual_mm": 2991, "data_status": "real" }
```

## Changelog

**v1.1 (2026-10-06, afternoon).** Additive only; nothing removed or renamed.
- `Site.nonpotable_demand_lpd` and `Site.tank.days_of_cover`, so public buildings can show their own cover separately from household drums.
- `program-preview` → each `barangays[]` row also has `greywater_reused_lpd_before` / `greywater_reused_lpd_after` (effect of the adoption slider).
- `Lgu.default_bounds`: the map opens on the mainland town area (49 of 57 barangays). A "Whole city" button fits all barangays. All data and totals stay citywide.
- #18 `GET /lgus/{lgu}/boundaries`: GeoJSON FeatureCollection of official barangay polygons (PSA/NAMRIA, PSGC Q4 2023), `properties: { name, psgc, area_km2, barangay_id }`, cached 1 day. Every barangay point and simulated site lies inside its own polygon. If an LGU has no file the endpoint is 404 and the map falls back to circles.
- Outage days of cover now scale with the scenario's `supply_loss` (see #12).
- Seed: the "turbid-power-cut" scenario lasts 3 days (matches the 3-day target). Demo barangay: **Bangon** (id 3), red → green with 5 tanks + 80 drum covers.
