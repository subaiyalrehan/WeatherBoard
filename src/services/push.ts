import { supabase } from "@/integrations/supabase/client";
import type { City } from "@/types/weather";

// Public VAPID key (safe to expose; private key lives in edge function secrets).
export const VAPID_PUBLIC_KEY =
  "BNHONLYg7k0sWJA9v35Qb9NVdt5OfaGHssaZ-P_afPIaVrBVn2cYK0LNxTgfLSsiDp34IbWaErhsL4qjdyonSQw";

export type PushSupport =
  | { supported: true }
  | { supported: false; reason: string };

export function getPushSupport(): PushSupport {
  if (typeof window === "undefined") return { supported: false, reason: "No window" };
  if (!("serviceWorker" in navigator)) {
    return { supported: false, reason: "Service workers aren't supported in this browser." };
  }
  if (!("PushManager" in window)) {
    return {
      supported: false,
      reason: "Push notifications aren't supported in this browser (try Chrome, Edge, or Firefox).",
    };
  }
  if (!("Notification" in window)) {
    return { supported: false, reason: "Notifications aren't supported in this browser." };
  }
  // iOS requires the app to be installed (standalone) for push.
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  // @ts-expect-error - non-standard
  const standalone = window.navigator.standalone === true ||
    window.matchMedia?.("(display-mode: standalone)").matches;
  if (isIOS && !standalone) {
    return {
      supported: false,
      reason: "On iOS, please install the app to your home screen first to enable notifications.",
    };
  }
  return { supported: true };
}

function urlBase64ToUint8Array(b64: string): Uint8Array {
  const padding = "=".repeat((4 - (b64.length % 4)) % 4);
  const base64 = (b64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function subToJSON(sub: PushSubscription) {
  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  return {
    endpoint: json.endpoint!,
    keys: { p256dh: json.keys!.p256dh!, auth: json.keys!.auth! },
  };
}

export async function getActiveSubscription(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return null;
  return await reg.pushManager.getSubscription();
}

export async function ensureSubscription(): Promise<PushSubscription> {
  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;
  return await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  return await Notification.requestPermission();
}

export async function syncSubscription(opts: {
  city: City | null;
  units: "metric" | "imperial";
  notificationHour: number | null;
  dailyEnabled: boolean;
  severeEnabled: boolean;
}) {
  const sub = await ensureSubscription();
  const payload = {
    subscription: subToJSON(sub),
    city: opts.city
      ? {
          id: opts.city.id,
          name: opts.city.name,
          lat: opts.city.lat,
          lon: opts.city.lon,
        }
      : null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    units: opts.units,
    notificationHour: opts.notificationHour,
    dailyEnabled: opts.dailyEnabled,
    severeEnabled: opts.severeEnabled,
  };
  const { error } = await supabase.functions.invoke("push-subscribe", { body: payload });
  if (error) throw error;
  return sub;
}

export async function unsubscribePush(): Promise<void> {
  const sub = await getActiveSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  try {
    await sub.unsubscribe();
  } catch {
    /* ignore */
  }
  await supabase.functions.invoke("push-unsubscribe", { body: { endpoint } });
}

export async function sendTestNotification(): Promise<void> {
  const sub = await getActiveSubscription();
  if (!sub) throw new Error("Not subscribed");
  const { error } = await supabase.functions.invoke("push-send-test", {
    body: { endpoint: sub.endpoint },
  });
  if (error) throw error;
}
