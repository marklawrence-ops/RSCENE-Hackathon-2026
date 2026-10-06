# Circular Water Network Planner: web app + PWA

Next.js 16 PWA for LGU planners, the CDRRMO and barangay officials. Talks to the Laravel API in `hackathon-backend`.

- API contract: `hackathon-backend/docs/api-contract.md` (types mirrored in [lib/types.ts](lib/types.ts))
- Screen sketches: [docs/screens.md](docs/screens.md)

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev                  # http://localhost:3000
```

| Variable | Meaning |
|---|---|
| `NEXT_PUBLIC_API_URL` | Laravel origin, no trailing slash, e.g. `https://<app>.laravel.cloud` |
| `NEXT_PUBLIC_USE_MOCKS` | `true` = every screen uses [lib/mocks.ts](lib/mocks.ts). The home page health check always calls the real API. Flip to `false` once endpoints land. |

Call the API only through `endpoints.*` in [lib/api.ts](lib/api.ts), so switching from mocks to live is one env change.

## PWA

- Manifest: [app/manifest.ts](app/manifest.ts) → `/manifest.webmanifest`
- Icons: [public/icons/](public/icons/); regenerate from `icon.svg` with `node scripts/generate-icons.mjs`
- Service worker: [public/sw.js](public/sw.js), registered in production builds only. It caches the app shell and static assets and falls back to [public/offline.html](public/offline.html). It never caches API calls; the barangay form queues in IndexedDB instead.
- Test offline: `npm run build && npm run start`, open DevTools → Application → Service workers, tick **Offline**, reload.

## Deploy (Vercel)

1. Push to GitHub, then **vercel.com → Add New → Project** and import the repo (framework auto-detected).
2. Environment variables (Production and Preview): `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_USE_MOCKS=true`.
3. Deploy. `NEXT_PUBLIC_*` values are baked in at build time, so **redeploy after changing them**.
4. Add the Vercel URL to the backend's `CORS_ALLOWED_ORIGINS`. The home page should then say **Connected**.

## Credits

OpenStreetMap contributors and Leaflet (maps), Open-Meteo (rainfall), PSA (population), Next.js.
