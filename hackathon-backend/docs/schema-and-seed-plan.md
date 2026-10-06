# Database schema and seed plan

PostgreSQL in production, SQLite locally (migrations are portable). No table holds household names.

## Tables (6 domain tables + Laravel's users and tokens)

The concept doc lists 11 tables. For the hackathon we fold them into 6:

| Concept table | Where it lives now |
|---|---|
| `lgus`, `settings` | `lgus` (per-LGU assumptions in `lgus.settings` JSON) |
| `barangays` | `barangays` |
| `water_sources`, `demand_points`, `public_tanks` | `sites` (one row per public building or business; tank columns on the row) |
| `barangay_forms` | `barangay_forms` |
| `outage_scenarios` | `outage_scenarios` |
| `rainfall_monthly` | `rainfall_monthly` |
| `reuse_rules` | static PHP config (same for every LGU; it is the safety table, not data) |
| `programs` | not stored; Program Designer is a stateless preview (`POST /program-preview`) |

```
lgus 1─┬─* barangays 1─┬─* sites
       │               └─* barangay_forms *─1 users
       ├─* sites
       ├─* outage_scenarios
       ├─* rainfall_monthly
       └─* users (lgu_id, barangay_id nullable, role)
```

| Table | Key columns |
|---|---|
| `lgus` | slug (unique), name, province, latitude, longitude, settings JSON, is_simulated |
| `barangays` | lgu_id, name (unique per LGU), population, population_year, households?, latitude?, longitude?, outage_vulnerability 0–1 |
| `sites` | lgu_id, barangay_id, name, kind (`public_building`/`business`), category, latitude, longitude, roof_area_m2?, source_types JSON, greywater_lpd?, tank_status (`none`/`candidate`/`installed`), tank_liters?, tank_covered?, tank_working?, data_status |
| `barangay_forms` | client_uuid (unique, for offline idempotency), barangay_id, user_id?, period, tanks_working, tanks_total, covered_drums, reusing_households, households_estimate, notes?, channel (`app`/`paper`), submitted_at |
| `outage_scenarios` | lgu_id, slug, name, description, duration_days, supply_loss 0–1, affected_barangay_ids JSON? (null = all) |
| `rainfall_monthly` | lgu_id, year, month, rainfall_mm, source (`open-meteo`/`seed`); unique (lgu, year, month) |
| `users` (+) | lgu_id?, barangay_id?, role (`planner`/`cdrrmo`/`barangay`) |

## Seed plan

`php artisan migrate:fresh --seed` must always give the same demo state. Seeders are idempotent (`updateOrCreate`).

| # | Data | Status label | Source | Done? |
|---|---|---|---|---|
| 1 | Catbalogan LGU + settings (90.09 L, usage split, runoff 0.8, drum 200 L, costs, tariff, LDRRMF) | real / assumed | Concept doc | Yes |
| 2 | 57 barangays, 2020 population (sum 106,440) | real | PSA via PhilAtlas, `database/data/catbalogan_barangays.csv` | Yes |
| 3 | Barangay coordinates (centroids) | real | OpenStreetMap / PhilAtlas per-barangay pages → fill `latitude,longitude` in the CSV | **Phase 3, backend** |
| 4 | `outage_vulnerability` | simulated | Stable hash of name (coastal/upland override later if time) | Yes |
| 5 | 3 outage scenarios (turbid + power cut, dry season, typhoon) | simulated | July 2026 event | Yes |
| 6 | Demo users: planner@, cdrrmo@, barangay@demo.test (password from `DEMO_USER_PASSWORD`) | – | – | Yes |
| 7 | Public-building sites: ~2 per barangay (school, barangay hall), + health centers and the city gym/market; roofs 80–400 m²; 3–5 installed tanks citywide, rest `candidate` | simulated | Real building types; positions jittered around the barangay centroid | **Phase 3** |
| 8 | Businesses: ~15 (laundromats, carwashes, hotels) in Poblacion barangays | simulated | Real business types, simulated volumes | **Phase 3** |
| 9 | One past form per barangay (period `2026-Q3`): drums 5–20% of households, adoption 2–15% | simulated | – | **Phase 3** |
| 10 | Monthly rainfall, last 24 months | real | Open-Meteo archive API, `php artisan rainfall:sync`; fallback rows from annual 2,991 mm split evenly, `source=seed` | **Phase 3** |
| 11 | Second LGU (small municipality, all `is_simulated`) | simulated | For the scalability demo | Stretch |

Demo story the seed must support: a barangay starts **red**; adding 5 tanks + drum covers in the Program Designer moves it to **amber/green**.

> **Math check (decide by 5:30 PM):** with the concept-doc formula, days of cover = storage ÷ (population × 34 L). Five 1,000 L tanks are 5,000 L. That is 0.01 days for Mercedes (12,281 people, 420,000 L/day) and still only ~0.5 days for the smallest barangay (Manguehay, 135 people, 4,600 L/day). **Tanks alone can never turn a barangay green; covered drums do the work** (3 drums per household = 3 days). Options: (a) demo on a small upland barangay and let the drum covers + adoption slider carry it; (b) show public-building tanks as their own metric ("days the school's toilets keep running"), separate from household drum cover; (c) both. Recommendation: (c), and pick the demo barangay from the seeded numbers.
