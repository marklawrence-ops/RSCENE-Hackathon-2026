# Circular Water Network Planner: API

Laravel 13 JSON API for the Circular Water Network Planner (Next.js PWA in `hackathon-frontend`). Auth is Sanctum bearer tokens.

- API contract: [docs/api-contract.md](docs/api-contract.md)
- Schema and seed plan: [docs/schema-and-seed-plan.md](docs/schema-and-seed-plan.md)

## Run locally

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate:fresh --seed
php artisan serve            # http://localhost:8000/api/v1/health
php artisan test --compact
```

Demo accounts (password = `DEMO_USER_PASSWORD`, default `password`): `planner@demo.test`, `cdrrmo@demo.test`, `barangay@demo.test`.

After rehearsing the Barangay Form, `php artisan demo:reset` deletes forms filed by the demo accounts (seeded and real forms are kept), so the next demo shows the same readiness jump.

## Loading real buildings and tanks

The seed uses simulated buildings for the demo. To load a real survey (e.g. City Engineering), fill a CSV like `database/data/templates/sites_import_template.csv` and run:

```bash
php artisan sites:import path/to/survey.csv --dry-run      # check only, saves nothing
php artisan sites:import path/to/survey.csv                # add or update (matched by barangay + name)
php artisan sites:import path/to/survey.csv --replace      # also remove SIMULATED sites in the barangays the file covers
```

Imported rows are marked `real`. A bad row stops the whole import and names the line; a point outside its barangay boundary is a warning. Columns: barangay, name, kind (public_building | business), category, latitude, longitude, roof_area_m2, source_types (rain|light_greywater|wash_water|condensate|kitchen|toilet, pipe-separated), greywater_lpd, nonpotable_demand_lpd, tank_status (none | candidate | installed), tank_liters, tank_covered, tank_working (yes/no).

## Deploy (Laravel Cloud)

1. Push this repo to GitHub.
2. cloud.laravel.com → **New application** → pick the repo, region Singapore (`ap-southeast-1`).
3. **Add resource → Database → Laravel Serverless Postgres** and attach it to the environment. Cloud injects the `DB_*` variables.
4. **Environment variables** (Settings → Environment), then redeploy:
   ```
   APP_ENV=production
   APP_DEBUG=false
   CORS_ALLOWED_ORIGINS=https://<your-app>.vercel.app,http://localhost:3000
   CORS_ALLOWED_ORIGIN_PATTERN=#^https://<your-app>-[a-z0-9-]+\.vercel\.app$#
   DEMO_USER_PASSWORD=<pick one, share with the team only>
   ```
5. Deploy commands: keep `php artisan migrate --force`. Seed once from the **Commands** tab: `php artisan db:seed --force`.
6. Check `https://<app>.laravel.cloud/api/v1/health` returns `{"status":"ok",…}`, then put that origin in the frontend's `NEXT_PUBLIC_API_URL`.

Other hosts (Forge, Railway, Render) work too: set the same variables, run `migrate --force` on deploy, and make sure the site is served over HTTPS.

## Credits

PSA 2020 census via PhilAtlas (barangay populations); PSA/NAMRIA barangay boundaries (PSGC Q4 2023) via [faeldon/philippines-json-maps](https://github.com/faeldon/philippines-json-maps) (MIT); OpenStreetMap contributors (barangay points); Open-Meteo (rainfall); Laravel, Sanctum.
