# UX & UI Polish Pass

Scope: refinement only. No PWA, no backend, no Web Push.

## 1. Geolocation UX

**Reverse geocode the resolved coordinates** so the hero shows a real city + country instead of "My location".
- Add `reverseGeocode(lat, lon)` to `services/openWeatherMap.ts` using OWM's `/geo/1.0/reverse` (already covered by the existing key). On failure, fall back to Open-Meteo's reverse geocoding endpoint (`https://geocoding-api.open-meteo.com/v1/reverse`).
- In `Index.tsx` `useGeolocation`, await reverse geocoding before `setCity`, and set proper `name`, `country`, `region`.

**Permission feedback** (no silent failures):
- Inspect `navigator.permissions.query({ name: "geolocation" })` first when available.
- On `PermissionDeniedError`, show a sonner toast: *"Location blocked — enable it in your browser's site settings (lock icon → Permissions → Location), then try again."* with an action button "Try again".
- On timeout / position unavailable, distinct toast: *"Couldn't get your location. Check signal/GPS and retry."*
- Track denial in component state → render a small inline hint under the "My location" button: *"Location blocked. [Retry]"* button stays visible so retry is never hidden.
- Add a loading state on the button (spinner + "Locating…") while the request is in flight.

## 2. Dark Mode Readability (hero card)

`CurrentWeatherCard` uses `bg-gradient-sky` + `text-primary-foreground`. In dark mode `--gradient-sky` is dark blue and `--primary-foreground` is `222 47% 11%` (near-black) — that's the contrast bug.

Fixes in `src/index.css`:
- Add a dedicated `--hero-foreground` token: light `0 0% 100%`, dark `210 40% 98%`.
- Add `--hero-foreground-muted` for secondary text (90% opacity equivalent).
- Update dark `--gradient-sky` to a slightly richer `linear-gradient(135deg, hsl(220 70% 22%), hsl(210 85% 38%))` so white text has clean contrast.

Update `CurrentWeatherCard.tsx`:
- Replace `text-primary-foreground` with `text-[hsl(var(--hero-foreground))]`.
- Bump the "updated/via" line and city meta from `opacity-75` → `opacity-90` and add a subtle `text-shadow` utility (`drop-shadow-sm`) on the temperature for legibility against the gradient blobs.
- Same token applied to the Save button so it stays readable in both themes.

## 3. Search UX

Update `useCitySearch.ts`:
- Reduce debounce from 400ms → 200ms.
- Trigger on `length >= 1` (not 2).

Update `SearchBar.tsx`:
- On focus with empty query, render a **suggestions panel** with two sections:
  - **Recent searches** (max 5) from a new `recentSearchesStore` (Zustand + persist).
  - **Popular cities** — static curated list (London, New York, Tokyo, Paris, Sydney, Dubai, Singapore, San Francisco) when no recents exist.
- On select, push to recents (dedupe by id, cap at 5).
- Show keyboard hint footer ("↑↓ to navigate · ↵ to select · Esc to close") and wire arrow-key navigation + Enter for the top result.
- Update threshold copy: drop the "≥2 chars" guard.

New file: `src/store/recentSearchesStore.ts` (persisted, key `wb.recents`).

## 4. Layout & Visual Hierarchy (Linear/Mercury feel)

`Index.tsx` and component tweaks:
- Tighten the page rhythm: replace `space-y-6` with a clearer two-tier structure — a "control row" (search + my location + favorites) grouped in a single `glass` panel with subtle border, then a "content stack" below for weather.
- Reduce hero radius from `rounded-3xl` to `rounded-2xl` to match the rest; add a faint inner ring (`ring-1 ring-white/10`) for that crisp Linear edge.
- Add hover affordances:
  - Favorites chips: `hover:-translate-y-0.5 hover:shadow-elevated transition`.
  - Hourly/Daily rows: `hover:bg-accent/40` with smooth transition.
  - Search results: already have hover; add `transition-colors duration-150`.
- Section headings ("Hourly", "7-day forecast"): smaller uppercase tracking-wide labels in `text-muted-foreground` for dashboard feel.
- Footer: tighter, single divider line above.

## 5. Error / Empty States (no silent failures)

- **Geolocation**: covered above.
- **Search empty / error**: already handled — add a "Try again" button when `error` and a friendlier copy when GeoDB key missing ("Search needs a GeoDB API key. See settings.").
- **Favorites limit**: already toasts; verify wording.
- **Favorites empty**: keep current dashed card, add a small "Search a city to add ★" hint.
- **Reverse-geocode failure**: toast *"Found your location but couldn't resolve the city name — showing coordinates."* and still load weather.
- **Weather refetch on stale data**: when `isError` but cached `lastWeather` exists for the city, show cached data with a non-blocking warning banner *"Showing cached data — couldn't refresh."* + Retry. (Today the error blocks the UI even when cache exists.)

## Files Changed

```text
src/index.css                                  (hero tokens, dark gradient)
src/components/weather/CurrentWeatherCard.tsx  (hero text contrast)
src/components/search/SearchBar.tsx            (focus suggestions, kbd nav)
src/hooks/useCitySearch.ts                     (debounce, min length)
src/store/recentSearchesStore.ts               (NEW)
src/services/openWeatherMap.ts                 (reverseGeocode)
src/services/openMeteo.ts                      (reverseGeocode fallback)
src/pages/Index.tsx                            (geolocation flow, layout grouping, cached-fallback banner)
src/components/favorites/FavoritesBar.tsx      (hover lift, hint copy)
src/components/weather/HourlyForecast.tsx      (row hover, section label)
src/components/weather/DailyForecast.tsx       (row hover, section label)
```

No new dependencies. No backend work.
