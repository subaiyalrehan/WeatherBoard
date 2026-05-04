# WeatherBoard

A fast, offline-capable weather dashboard PWA with hourly and 7-day forecasts, favorites, severe-weather alerts, and daily push notifications for your current location.

**Live:** https://weatherboard.lovable.app

---

## Features

- Current conditions, hourly (next 24h) and 7-day forecasts
- City search with autocomplete (GeoDB Cities) and geolocation ("My Location")
- Favorites bar with persistent local storage
- Animated weather icons via Lottie (Meteocons, MIT)
- Light / dark theme, metric / imperial units
- Installable PWA with offline app shell + cached weather responses
- Web Push notifications:
  - Daily forecast at a user-chosen hour (local time)
  - Severe weather alerts (when issued by the provider)
- Graceful fallback: works without the OpenWeatherMap key via Open-Meteo

---

## Tech Stack

**Frontend**
- React 18 + TypeScript 5 + Vite 5
- Tailwind CSS v3 with semantic design tokens (HSL)
- shadcn/ui (Radix primitives)
- TanStack Query for data fetching/caching
- Zustand for client state (favorites, prefs, recent searches)
- React Router v6
- `lottie-react` for animated weather icons
- `vite-plugin-pwa` + Workbox (precache + runtime caching strategies)

**Backend (Lovable Cloud / Supabase)**
- Postgres for push subscriptions
- Deno Edge Functions for VAPID-signed Web Push
- Scheduled cron functions for daily + severe alerts

**Tooling**
- Vitest + Testing Library + jsdom
- ESLint 9 (typescript-eslint, react-hooks, react-refresh)

---

## Setup

### Prerequisites
- Node.js 20+ (or Bun 1.1+)
- An OpenWeatherMap API key (optional — Open-Meteo is used as a fallback)
- A GeoDB Cities API key from RapidAPI (optional — only required for richer city search)

### 1. Install
```bash
bun install
# or
npm install
```

### 2. Environment variables
Copy `.env.example` to `.env` and fill in:
```bash
VITE_OPENWEATHERMAP_API_KEY=your_openweathermap_key
VITE_GEODB_API_KEY=your_geodb_rapidapi_key
```
The `VITE_SUPABASE_*` variables are auto-provisioned by Lovable Cloud and should not be edited by hand.

### 3. Run
```bash
bun run dev      # http://localhost:8080
bun run build    # production build
bun run preview  # serve the production build
bun run test     # run Vitest
bun run lint     # ESLint
```

### 4. Push notifications (server-side secrets)
Web Push requires a VAPID keypair stored in the backend:
- `VAPID_PUBLIC_KEY` — base64url, served to the client by `push-vapid-key`
- `VAPID_PRIVATE_KEY` — base64url, used by edge functions to sign payloads
- `VAPID_SUBJECT` — `mailto:you@example.com` or your site URL

Set these in **Lovable Cloud → Settings → Secrets**. Generate a keypair with any standard web-push tool (e.g. `npx web-push generate-vapid-keys`).

> **Note:** Service workers and push notifications are disabled in the Lovable preview iframe by design. Test them on the published URL or a `bun run preview` build served over HTTPS.

---

## Architecture

### High-level
```
┌────────────────────────┐         ┌────────────────────────────┐
│  React PWA (client)    │         │  Lovable Cloud (Supabase)  │
│  ─ TanStack Query      │  HTTPS  │  ─ push_subscriptions      │
│  ─ Zustand stores      │ ──────▶ │  ─ Edge Functions (Deno)   │
│  ─ Workbox SW (sw.ts)  │         │     · push-subscribe       │
│                        │ ◀────── │     · push-vapid-key       │
└──────────┬─────────────┘  Push   │     · push-send-test       │
           │                       │     · push-daily-cron      │
           │ direct fetch          │     · push-severe-cron     │
           ▼                       └────────────────────────────┘
   OpenWeatherMap / Open-Meteo
   GeoDB Cities (RapidAPI)
```

### Key decisions

- **Provider abstraction (`src/services/weatherProvider.ts`)** — A single interface backed by either OpenWeatherMap (preferred when a key is present) or Open-Meteo (free, no-key fallback). UI code never talks to providers directly, so a missing key degrades gracefully instead of breaking the app.
- **Client-side caching via TanStack Query + Workbox** — Query deduplicates and caches in memory; Workbox caches the underlying HTTP responses with `StaleWhileRevalidate` (30 min for weather, 7 d for geocoding, 30 d for icons). This gives instant repeat loads and full offline reads of the last-seen city.
- **PWA registration is iframe-aware** — `src/pwa.ts` refuses to register the service worker inside iframes or on Lovable preview hosts, and actively unregisters any rogue SW it finds. This avoids the classic "preview is stuck on a stale build" problem.
- **Service worker strategies (`src/sw.ts`)** —
  - `NetworkFirst` for HTML navigations (3 s timeout) so deploys roll out fast
  - `StaleWhileRevalidate` for weather/geocoding APIs
  - `CacheFirst` for icons and fonts
- **Web Push without a Node SDK** — Edge functions run on Deno, so we ship a dependency-free RFC 8291 / RFC 8292 implementation in `supabase/functions/_shared/webpush.ts` using WebCrypto (ECDH P-256, HKDF-SHA-256, AES-128-GCM, ES256 JWT).
- **VAPID key sync** — The client fetches the public key from `push-vapid-key` at subscribe time and re-subscribes if the local subscription was created with a stale key. This prevents the 403 "VAPID mismatch" class of bugs after key rotation.
- **Subscription is the source of truth for notifications** — When the user changes city/units/time/toggles in the UI, `syncSubscription` pushes the new context to the server, so cron-driven notifications always reflect the latest UI state. "My Location (Karachi, Sindh)" is normalized to "Karachi, Sindh" before display.
- **Design tokens, not colors** — All colors are HSL CSS variables in `src/index.css` and consumed via Tailwind semantic classes. Components never hardcode colors.
- **Roles/auth not in scope** — The app is single-user-per-device; push subscriptions are keyed by endpoint, not by an authenticated user.

### Project layout
```
src/
  components/        UI: layout, weather, settings, search, ui (shadcn)
  hooks/             useWeather, useCitySearch, useTheme, useOnlineStatus, ...
  services/          weatherProvider, openWeatherMap, openMeteo, geoDb, push
  store/             Zustand: favorites, preferences, recentSearches
  pages/             Index, NotFound
  integrations/      Auto-generated Supabase client + types (do not edit)
  sw.ts              Service worker (Workbox, injectManifest)
  pwa.ts             SW registration with iframe/preview guards
supabase/
  functions/         Deno edge functions (push-*)
  migrations/        SQL migrations
public/
  icons/             PWA icons (192, 512, maskable 512)
  lottie/            Meteocons animated weather JSON (offline-friendly)
```

---

## APIs Used

| API | Purpose | Auth | Notes |
|---|---|---|---|
| [OpenWeatherMap](https://openweathermap.org/api) — Current, One Call 3.0 | Current + hourly + daily forecast, alerts | API key (`VITE_OPENWEATHERMAP_API_KEY`) | Preferred provider. Free tier supports basic endpoints; One Call 3.0 requires a (free) subscription. |
| [Open-Meteo](https://open-meteo.com/) | Forecast fallback when OWM key is missing | None | Includes `geocoding-api.open-meteo.com` for city lookup. |
| [GeoDB Cities](https://rapidapi.com/wirefreethought/api/geodb-cities/) | Rich city autocomplete (population, region, country) | RapidAPI key (`VITE_GEODB_API_KEY`) | Falls back to Open-Meteo geocoding if missing. |
| Browser Geolocation API | "My Location" pin | User permission | Reverse-geocoded to a human-readable name. |
| Web Push + Notifications API | Daily + severe alert delivery | VAPID | Server uses Deno WebCrypto to sign and encrypt payloads. |

---

## Known Limitations

- **PWA + push only work on the published site.** Service workers are intentionally disabled in the Lovable preview iframe and on `localhost`. Use `https://weatherboard.lovable.app` (or a deployed `bun run preview`) to test offline mode and notifications.
- **iOS push requires Add to Home Screen.** Per Apple, web push on iOS Safari only works after the user installs the PWA. The app detects this and surfaces an "Install" hint.
- **Severe alerts depend on OpenWeatherMap.** Open-Meteo doesn't expose government alert feeds, so when the OWM key is missing the severe-alert cron has nothing to send.
- **Single subscription per device.** Each browser/device profile manages its own push subscription; we do not link them to a user account.
- **Free-tier rate limits** — OpenWeatherMap (60 req/min), GeoDB Cities (~1 req/sec on free RapidAPI). Workbox caching mitigates this but very heavy usage can still throttle.
- **Notification icon rendering varies.** Most platforms honor the `icon`/`badge` we send (resolved to absolute URLs in the SW), but a few Android OEM skins still substitute their own glyph.
- **One language / timezone per device.** Display strings are English; timezone is taken from the browser at subscribe time and re-synced when the user changes city.
- **No historical data.** Only current conditions and forecasts are shown; there is no time-series archive view.

---

## License

This project is private. Lottie animations under `public/lottie/` are from [Meteocons](https://bas.dev/work/meteocons) and are MIT licensed.
