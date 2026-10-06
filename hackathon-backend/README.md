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

PSA 2020 census via PhilAtlas (barangay populations), Open-Meteo (rainfall), Laravel, Sanctum.
