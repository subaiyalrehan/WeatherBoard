/// <reference lib="webworker" />
/* eslint-disable @typescript-eslint/no-explicit-any */
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { NetworkFirst, StaleWhileRevalidate, CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// --- Precache app shell ---------------------------------------------------
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// --- App-shell navigation (NetworkFirst so deploys roll out fast) ---------
registerRoute(
  new NavigationRoute(
    new NetworkFirst({
      cacheName: "wb-html",
      networkTimeoutSeconds: 3,
      plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
    }),
    {
      // Don't intercept Lovable internal routes
      denylist: [/^~oauth/, /^\/api\//],
    },
  ),
);

// --- Weather APIs (StaleWhileRevalidate, short TTL) -----------------------
registerRoute(
  ({ url }) =>
    url.hostname === "api.openweathermap.org" ||
    url.hostname === "api.open-meteo.com" ||
    url.hostname === "geocoding-api.open-meteo.com",
  new StaleWhileRevalidate({
    cacheName: "wb-weather",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 60 * 30 }),
    ],
  }),
);

// --- Geocoding (longer TTL) -----------------------------------------------
registerRoute(
  ({ url }) => url.hostname.includes("geodb-cities") || url.hostname.includes("rapidapi"),
  new StaleWhileRevalidate({
    cacheName: "wb-geo",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 7 }),
    ],
  }),
);

// --- Weather icons (CacheFirst, long TTL) ---------------------------------
registerRoute(
  ({ url }) => url.hostname === "openweathermap.org" && url.pathname.startsWith("/img/"),
  new CacheFirst({
    cacheName: "wb-icons",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 }),
    ],
  }),
);

// --- Fonts ----------------------------------------------------------------
registerRoute(
  ({ request }) => request.destination === "font",
  new CacheFirst({
    cacheName: "wb-fonts",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 90 }),
    ],
  }),
);

// --- Skip waiting on demand ----------------------------------------------
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

// --- Push Notification Handlers -------------------------------------------
self.addEventListener("push", (event: any) => {
  let data: any = { title: "WeatherBoard", body: "Check the weather!" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    /* ignore non-JSON */
  }

  // Always resolve to absolute URLs so platforms that don't normalize
  // relative URLs (some Android Chrome builds, Edge) still render the icon.
  const scope = self.registration.scope; // e.g. https://weatherboard.lovable.app/
  const iconUrl = data.icon
    ? new URL(data.icon, scope).toString()
    : new URL("icons/icon-192.png", scope).toString();
  const badgeUrl = data.badge
    ? new URL(data.badge, scope).toString()
    : iconUrl;

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: iconUrl,
      badge: badgeUrl,
      tag: data.tag,
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event: any) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(self.clients.openWindow(url));
});
