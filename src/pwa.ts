// PWA registration + update handling.
//
// IMPORTANT: We never register the service worker inside the Lovable preview
// iframe — it would cache the iframe shell and prevent live updates from
// reaching the editor preview. Push notifications and offline support work
// only in the published app.

import { toast } from "sonner";

function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function isPreviewHost(): boolean {
  const h = window.location.hostname;
  return (
    h.includes("id-preview--") ||
    h.includes("lovableproject.com") ||
    h === "localhost" ||
    h === "127.0.0.1"
  );
}

export async function registerPWA() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  // Always clean up any rogue SW in iframes/preview to avoid stale shells.
  if (isInIframe() || isPreviewHost()) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    } catch {
      /* noop */
    }
    return;
  }

  try {
    const { Workbox } = await import("workbox-window");
    const wb = new Workbox("/sw.js", { scope: "/" });

    wb.addEventListener("waiting", () => {
      toast("New version available", {
        description: "Reload to get the latest WeatherBoard.",
        action: {
          label: "Reload",
          onClick: () => {
            wb.addEventListener("controlling", () => window.location.reload());
            wb.messageSkipWaiting();
          },
        },
        duration: Infinity,
      });
    });

    await wb.register();
  } catch (err) {
    // Never let PWA setup break the app.
    console.warn("[pwa] registration failed", err);
  }
}
