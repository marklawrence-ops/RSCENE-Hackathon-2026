# AGOS · Circular Water Network Planner

[![tests](https://github.com/marklawrence-ops/RSCENE-Hackathon-2026/actions/workflows/ci.yml/badge.svg)](https://github.com/marklawrence-ops/RSCENE-Hackathon-2026/actions/workflows/ci.yml)

**Team Eight Bit** (Mark Lawrence P. Lacdao, Aldrin Rey N. Taberara, Axyll Judd G. Picardal) · rSCENE 2026 Hackathon · Circular Economy in Water Resources

AGOS shows an LGU where used water and rain can safely serve a second, non-potable purpose in every barangay, and how long each barangay's stored water keeps toilets and cleaning running when the main supply fails. It is built for Catbalogan City (57 barangays, 106,440 people).

**Live app:** https://rscene-hackathon-2026.vercel.app (installable: open on a phone and choose *Add to Home Screen*)

## Try it

| Page | Access | What to look at |
|---|---|---|
| Overview `/` | Public | City at a glance; changes once you sign in |
| Reuse Map `/map` | Public | Switch **Reuse** / **Stored water**; click a barangay, then a building |
| Outage Mode `/map?outage=1` | Public | Pick a scenario; see which barangays run out and the best roofs for new tanks |
| Program Designer `/designer` | Sign in | *Load demo*: Bangon goes from 0.8 to 3.0 days of stored water for 0.52% of the preparedness fund |
| Storage Registry `/storage` | Sign in | Stored water and drums still needed per barangay; CSV export |
| Barangay Form `/form` | Sign in | Four-question quarterly form; works offline (try airplane mode) and has a Tally mode |
| Household Guide `/guide` | Public | Printable safe-reuse card in English, Filipino and Waray |
| About & credits `/about` | Public | Data sources and licences |

Demo accounts: `planner@demo.test` (planner), `cdrrmo@demo.test` (CDRRMO), `barangay@demo.test` (barangay secretary). The password is given to the judges separately.

## Real and simulated data

- **Real:** PSA 2020 population, PSA/NAMRIA barangay boundaries, OpenStreetMap locations, Open-Meteo rainfall and weather.
- **Assumed:** 90 L per person per day and its usage split; a reusing household reuses 40% of its greywater.
- **Simulated until a pilot:** buildings, tanks, covered drums and households reusing. Real quarterly forms replace them automatically, and `php artisan sites:import` loads a real building survey.

Every value in the app carries a Real, Assumed or Simulated tag.

## How it is built

```
hackathon-frontend/   Next.js 16 PWA (React 19, Tailwind 4, Leaflet), offline form outbox   → Vercel
hackathon-backend/    Laravel 13 REST API (/api/v1, Sanctum tokens), one WaterModel service → Laravel Cloud + PostgreSQL
```

- All formulas live in one backend service, so every screen shows the same numbers.
- API contract: [hackathon-backend/docs/api-contract.md](hackathon-backend/docs/api-contract.md)
- Quality: Pest tests, PHPStan level 7, Pint, ESLint and TypeScript, run on every push by [GitHub Actions](.github/workflows/ci.yml).

## Run locally

```bash
# API (http://localhost:8000/api/v1/health)
cd hackathon-backend
composer install && cp .env.example .env && php artisan key:generate
php artisan migrate:fresh --seed
php artisan serve

# App (http://localhost:3000)
cd hackathon-frontend
npm install && cp .env.example .env.local
npm run dev
```

More detail: [backend README](hackathon-backend/README.md) · [frontend README](hackathon-frontend/README.md)
