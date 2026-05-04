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
  const data = event.data?.json() ?? { title: "WeatherBoard", body: "Check the weather!" };
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: "/" },
    })
  );
});

self.addEventListener("notificationclick", (event: any) => {
  event.notification.close();
  event.waitUntil(
    self.clients.openWindow(event.notification.data.url || "/")
  );
});
