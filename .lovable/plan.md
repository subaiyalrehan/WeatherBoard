# WeatherBoard — Final Implementation Plan

A responsive PWA weather dashboard with OpenWeatherMap + Open-Meteo fallback, GeoDB autocomplete, favorites, offline cache, and a simple reliable daily push reminder.

## Confirmed Decisions

- **API keys**: client-side `VITE_*` env vars
- **Notifications**: Web Push, **simplified** — one daily push per user, hourly cron
- **PWA**: installable + last-viewed city offline cache
- **Theme**: light/dark, follows system, manual toggle
- **State**: TanStack Query + Zustand (persisted)

## Simplified Push Notification Design

Goal: one reliable daily notification, minimal cron complexity.

How it works:
1. User picks a local time (e.g. 8:00 AM). Client computes `preferred_hour_utc` using their current timezone offset and stores it with the subscription.
2. Cron runs **once per hour, on the hour**.
3. Each run: `SELECT * FROM push_subscriptions WHERE preferred_hour_utc = <current_utc_hour>` → fetch weather for each row's city → send Web Push.
4. To prevent duplicates if cron retries, track `last_sent_date` (UTC date) per subscription and skip rows already sent today.

Why this is simple:
- No per-minute matching, no timezone math at send time
- Hour-level granularity is fine for a daily reminder
- Single SQL filter, single loop, idempotent via `last_sent_date`

Edge case acknowledged: users who travel across timezones will keep getting their notification at the original UTC hour until they update their preference. This is acceptable for v1.

## Component Structure

```
<App>
├── <Layout>
│   ├── <Header>             logo, theme toggle, settings
│   └── <OfflineBanner>
├── <SearchBar>              GeoDB autocomplete (debounced 400ms)
├── <FavoritesBar>           up to 5 city chips
├── <CurrentWeatherCard>     hero: temp, condition, location, "updated X ago"
├── <WeatherDetailsGrid>     humidity, wind, pressure, UV, sunrise/sunset, feels-like
├── <HourlyForecast>         horizontal scroll, next 24h
├── <DailyForecast>          7-day list
├── <SettingsDrawer>         units, notification time, theme, manage favorites
└── ErrorBoundary, EmptyState, skeletons
```

## Folder Structure

```
src/
├── components/
│   ├── weather/        CurrentWeatherCard, HourlyForecast, DailyForecast, DetailsGrid
│   ├── search/         SearchBar, CityAutocomplete
│   ├── favorites/      FavoritesBar, FavoriteChip
│   ├── settings/       SettingsDrawer, NotificationSettings, ThemeToggle
│   └── ui/             (existing shadcn)
├── hooks/              useWeather, useCitySearch, useFavorites, useNotifications, useOnlineStatus, useTheme
├── services/           openWeatherMap.ts, openMeteo.ts, geoDb.ts, weatherProvider.ts
├── store/              preferencesStore.ts, favoritesStore.ts (Zustand + persist)
├── types/weather.ts    normalized Weather type
├── lib/                normalize.ts, icons.ts, format.ts
├── pages/Index.tsx
└── pwa/                sw-register.ts, push-subscription.ts

supabase/functions/
├── subscribe-push/         stores subscription + preferred_hour_utc
├── unsubscribe-push/
└── send-daily-weather/     hourly cron, sends due notifications
```

## State Management

- **TanStack Query**: weather + city search; long staleTime so cached data survives reloads/offline
- **Zustand stores** (persisted to localStorage):
  - `preferencesStore`: units, theme, notification time, push endpoint
  - `favoritesStore`: max-5 cities array

## Provider Fallback

`weatherProvider.ts` tries OWM → on network/5xx/429 falls back to Open-Meteo. Both responses normalized to one `Weather` type so UI is provider-agnostic.

## PWA & Offline

- `vite-plugin-pwa` with manifest, icons, `display: standalone`
- SW: `NetworkFirst` for HTML, `StaleWhileRevalidate` for weather API responses
- Last-viewed city ID in localStorage rehydrates app offline
- Registration guarded against Lovable preview iframe
- Offline banner + "updated X ago" indicator

## Edge Cases

- OWM 429/down → silent Open-Meteo fallback
- Both fail → cached data + "last known" banner
- GeoDB rate limit → 400ms debounce + query cache
- Missing API key → setup card, not a crash
- Offline first-load no cache → empty state with retry
- Geolocation denied/timeout → manual search fallback
- 6th favorite → toast "Remove one first"
- Unresolvable favorite → mark stale, allow removal
- Same-name cities → show country/region in autocomplete
- Notification permission denied → hide UI, show re-enable instructions
- iOS Safari → push only works for installed PWA; detect and inform
- °C ↔ °F switch reformats instantly (no refetch)

## Build Order (small steps)

1. Tailwind tokens (light/dark), layout shell, theme toggle
2. Types, provider services, normalizer, fallback orchestrator
3. Zustand stores with persist
4. SearchBar with GeoDB autocomplete
5. CurrentWeatherCard + DetailsGrid
6. HourlyForecast + DailyForecast
7. FavoritesBar (add/remove/select, max 5)
8. SettingsDrawer (units, theme, notification time)
9. PWA manifest + iframe-safe service worker
10. Lovable Cloud: VAPID secrets, `push_subscriptions` table, `subscribe-push` + `unsubscribe-push` functions
11. `send-daily-weather` hourly cron + idempotent send
12. Push subscription UI + permission flow
13. Polish: skeletons, error boundaries, empty states, offline banner

## What You'll Provide

- OpenWeatherMap API key (free tier)
- GeoDB Cities API key (RapidAPI free tier)
- Approval to enable Lovable Cloud (required for Web Push backend)

Approve to start with step 1.
