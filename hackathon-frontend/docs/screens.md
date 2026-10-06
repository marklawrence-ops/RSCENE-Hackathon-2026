# Screens (low-fi)

The concept has six screens, but we build **four routes**: Source-to-Use Matching lives in the map's site panel, and Outage Mode is a toggle on the map. Mobile first for `/form`; desktop first for the rest (planners sit at a desk). Endpoint numbers refer to `hackathon-backend/docs/api-contract.md`.

| Route | Screens it covers | Endpoints | Demo beat |
|---|---|---|---|
| `/` | Overview (AGOS design): hero, live stats, map preview, action queue | 5, 6, 8, 14, 17 | Opening shot |
| `/map` (`?outage=1`) | 1 Reuse Network Map, 2 Source-to-Use Matching (site panel), 3 Outage Mode (toggle) | 5, 6, 7, 8, 9, 10, 11, 12 | Click a barangay; switch on the outage |
| `/designer` | 4 Program Designer | 13 (+12 to re-run the outage) | Add 5 tanks + covers → red to green |
| `/storage` | 5 Storage Registry | 14 | (backup if asked) |
| `/form` | 6 Barangay Form (offline) | 2, 16 | Airplane mode submit, then sync |
| `/guide` | Household guide (public, no sign-in; printable card) | none (static; mirrors config/reuse.php) | Answer to "how do households take part?" |

Sign-in (Oct 6 night): Program Designer, Storage Registry and Barangay Form are shown only to signed-in users (tabs hidden; the pages show the sign-in card); /login signs in and opens the Designer. Overview, Reuse Map and Household Guide stay public. This is a UI gate: the API reads stay public.

Shared shell (AGOS design, Oct 6 evening; nav: Overview, Reuse Map (Outage Mode is its toggle), Program Designer, Storage Registry, Barangay Form, Household Guide): left sidebar on desktop, aqua top bar with active LGU and live Open-Meteo weather,
bottom tab bar + drawer on phones; Manrope; light theme only. Previous shell: top bar `[logo] Water Planner   [LGU ▾ Catbalogan]   Map · Designer · Storage · Form   [login]`. On a phone the links collapse into a bottom tab bar.

## `/map`: Reuse Map

Built (Oct 6 night): full-bleed map. Top-left translucent card = Outage Mode switch + scenario + city summary (status counts, or outage counts when on; greywater, reused, storage); on phones the summary folds behind a button. The details panel is a translucent card that appears only when a barangay or building is selected (right side on laptops, bottom sheet on phones), closed with ✕ or Esc. The sketch below is the earlier layout.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ◉ Water Planner   [Catbalogan ▾]        Map  Designer  Storage  Form   [CDRRMO]│
├──────────────────────────────────────────────┬───────────────────────────────┤
│ Colour by: (●) Reuse readiness ( ) Outage    │  BRGY. MERCEDES      ● RED     │
│ [ Outage Mode ○──  Turbid source + power ▾ ] │  pop 12,281 (PSA 2020 · real) │
│                                              │                               │
│        Leaflet map, circles per barangay     │  Greywater   575,000 L/day    │
│        sized by population, coloured         │  Flushing    332,000 L/day    │
│        green / amber / red                   │  ███████████░░░ potential     │
│                                              │  █░░░░░░░░░░░░ reused (11%)   │
│   ▲ tank pin   △ candidate roof  ■ business  │  Reuse gap   512,000 L/day    │
│                                              │                               │
│                                              │  Stored water covers ~0.2 days│
│                                              │  Readiness 30/100             │
│  Legend: ● ≥3 days  ● 1–3  ● <1   [sim.]     │  ── Sites ──                   │
│                                              │  ▲ Mercedes Brgy Hall  ›      │
│                                              │  △ Mercedes Elem School ›     │
└──────────────────────────────────────────────┴───────────────────────────────┘
Built: official barangay boundaries coloured red / amber / green by days of stored water; Outage Mode recolours
them by outcome (holds / partly / runs out) and pulses the 5 roofs where one new tank adds the most days.
First view: fit `lgu.default_bounds` (mainland town area, 49 of 57 barangays incl. Bangon). A [Whole city] button
fits every barangay; the side panel and totals stay citywide either way.
Outage Mode ON: circles recolour by outcome (holds/partial/fails); a strip shows
"3 hold · 10 partial · 44 fail"; suggested tank roofs pulse.
```

Site panel (click a pin; replaces the barangay panel, `‹ back`):

```
│  MERCEDES ELEM. SCHOOL   school · simulated │
│  Roof 220 m² · rain ≈ 1,440 L/day avg        │
│  Tank: candidate                             │
│  ── Source → Use ──                          │
│  Rain        → Flushing        ✓ REUSE       │
│  Rain        → Floor washing   ✓ REUSE       │
│  Greywater   → Flushing        ✓ REUSE       │
│  Kitchen     → —               ✕ DISCHARGE   │
│  ⚠ Never for drinking, cooking or bathing    │
```

## `/designer`: Program Designer

```
┌──────────────────────────────────┬────────────────────────────────────────────┐
│ Barangays  [Manguehay ▾] [+ add] │  Year-1 cost     Php 110k – 178k           │
│                                  │  Litres secured  17,000                    │
│ Public tanks   ──●────── 5       │  Days of cover   1.8 → 5.5   ● → ●         │
│ Tank size      [1,000 L ▾]       │  Funding  LDRRMF 70% preparedness · 0.5%   │
│ Drum covers    ────●──── 60      │                                            │
│ Cards printed  ──●────── 30      │  Phase 1 Pilot (6 mo)   Php 110k–178k      │
│ Adoption       ───●───── 30%     │  Phase 2 Citywide yr 2  Php 0.9–1.7M       │
│                                  │                                            │
│ [Run outage with this program ▸] │  mini-map of selected barangays, recoloured│
└──────────────────────────────────┴────────────────────────────────────────────┘
```
Built: sliders call `program-preview` (debounced 250 ms); click barangays on the map to add/remove them; "Load demo"
sets Bangon + 5 tanks + 80 covers + 60 cards + 30% (red → green, ₱113k–182k); "Run outage with this program"
compares the scenario with and without the program.

## `/storage`: Storage Registry

```
 Built: totals (storage + days, tanks working, drums + drums still needed, forms this quarter), search,
 status filter, sortable columns, table on desktop / cards on phones, CSV export for the quarterly summary.
 Totals: N tanks · N drums · 1.6M L · 0.4 days citywide                  [simulated]
 ┌───────────────┬───────┬────────┬───────────┬────────┬────────────┬───────────┐
 │ Barangay  ↕   │ Tanks │ Drums  │ Storage L │ Days ↕ │ Drums/hh   │ Last form │
 ├───────────────┼───────┼────────┼───────────┼────────┼────────────┼───────────┤
 │ ● Mercedes    │ 0/0   │ 491    │ 98,200    │ 0.2    │ need 3     │ Sep 30    │
 │ ● Manguehay   │ 1/1   │ 37     │ 8,400     │ 1.8    │ need 3     │ Sep 30    │
 └───────────────┴───────┴────────┴───────────┴────────┴────────────┴───────────┘
```

## `/form`: Barangay Form (phone, offline)

```
┌──────────────────────────┐
│ ◉ Barangay Form   ⚡ Offline│   ← banner when offline
│ Brgy. Mercedes · 2026-Q4  │
│                           │
│ Public tanks working      │
│ [ 1 ] of [ 2 ]            │
│ Covered rain drums        │
│ [ 140        ] (estimate) │
│ Households reusing water  │
│ [ 40 ] of [ 300 ]         │
│ Notes (optional)          │
│ [                       ] │
│                           │
│ [  Save form  ]           │
│                           │
│ Waiting to sync (1)  ⟳    │   ← IndexedDB queue, client_uuid per form
│ ✓ 2026-Q3 synced Sep 30   │
└───────────────────────────┘
```
Built: sign in once online (token + user cached); barangay users are fixed to their barangay, planner/CDRRMO
pick one and can mark "Encoding a paper form". Barangay list is cached for offline use; /form is precached by
the service worker. Sync runs on load, on the online event, every 30 s, and via "Sync now"; 4xx answers mark the
item "Not accepted" with a Discard button, 401 asks to sign in again (queued forms are kept).
Offline flow: Save → write to IndexedDB with `crypto.randomUUID()` → on `online` event (and on load) POST each queued form → remove on 200/201. Re-sending the same `client_uuid` is safe (the API returns 200 with the existing form).

## `/guide`: Household guide

Public, no sign-in, precached for offline. English / Filipino / Waray switch; Filipino and Waray are **draft
translations** (banner on the page) until a native speaker reviews `components/guide/guide-content.ts`. Sections: Do this
(source → use), Never, Rules for rain drums (label "Hindi maiinom / Not for drinking" in every language), Be ready when
the water stops (3 drums ≈ 3 days for a family of 5). "Print card" hides the app chrome.
