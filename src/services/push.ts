import { supabase } from "@/integrations/supabase/client";
import type { City } from "@/types/weather";

let cachedKey: string | null = null;

async function getServerVapidKey(): Promise<string> {
  if (cachedKey) return cachedKey;
  const { data, error } = await supabase.functions.invoke("push-vapid-key", { method: "GET" });
  if (error) throw new Error("Couldn't fetch push key from server");
  if (!data?.publicKey) throw new Error("Server is missing the push public key");
  cachedKey = data.publicKey as string;
  return cachedKey;
}

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

function getSubAppServerKey(sub: PushSubscription): string | null {
  const opts = sub.options as PushSubscriptionOptions;
  const key = opts?.applicationServerKey;
  if (!key) return null;
  const bytes = new Uint8Array(key as ArrayBuffer);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function getActiveSubscription(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return null;
  return await reg.pushManager.getSubscription();
}

export async function ensureSubscription(): Promise<PushSubscription> {
  const reg = await navigator.serviceWorker.ready;
  const serverKey = await getServerVapidKey();
  const existing = await reg.pushManager.getSubscription();
  if (existing) {
    const existingKey = getSubAppServerKey(existing);
    if (existingKey === serverKey) return existing;
    // Stale — created with a different VAPID key. Re-create.
    try {
      await existing.unsubscribe();
    } catch { /* ignore */ }
  }
  const key = urlBase64ToUint8Array(serverKey);
  return await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer,
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
      ? { id: opts.city.id, name: opts.city.name, lat: opts.city.lat, lon: opts.city.lon }
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
  } catch { /* ignore */ }
  await supabase.functions.invoke("push-unsubscribe", { body: { endpoint } });
}

export async function sendTestNotification(opts?: {
  city?: City | null;
  units?: "metric" | "imperial";
  notificationHour?: number | null;
  severeEnabled?: boolean;
}): Promise<void> {
  // Ensure we have a sub matching the server's VAPID key, and that the
  // server has it stored before we ask it to send.
  const sub = await ensureSubscription();
  await supabase.functions.invoke("push-subscribe", {
    body: {
      subscription: subToJSON(sub),
      city: opts?.city
        ? { id: opts.city.id, name: opts.city.name, lat: opts.city.lat, lon: opts.city.lon }
        : null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      units: opts?.units ?? "metric",
      notificationHour: opts?.notificationHour ?? null,
      dailyEnabled: (opts?.notificationHour ?? null) != null,
      severeEnabled: opts?.severeEnabled ?? true,
    },
  });
  const { error } = await supabase.functions.invoke("push-send-test", {
    body: { endpoint: sub.endpoint },
  });
  if (error) throw error;
}
