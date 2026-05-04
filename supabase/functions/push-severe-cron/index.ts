import { corsHeaders } from "npm:@supabase/supabase-js@2.95.0/cors";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";
import { sendWebPush } from "../_shared/webpush.ts";

// Polls Open-Meteo for severe-ish conditions in the next 6h:
// wind gust >= 60 km/h (37 mph), or precipitation_probability_max >= 80%,
// or weather_code indicating thunderstorm/blizzard. De-duplicates by date+code.

const SEVERE_CODES = new Set([
  95, 96, 99, // thunderstorm
  75, // heavy snow
  82, // violent rain showers
  86, // heavy snow showers
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("severe_enabled", true);

  if (error) return json({ error: error.message }, 500);

  const results: Array<{ endpoint: string; status: string }> = [];

  for (const s of subs ?? []) {
    try {
      if (s.lat == null || s.lon == null) continue;

      const tz = s.timezone || "UTC";
      const u = new URL("https://api.open-meteo.com/v1/forecast");
      u.searchParams.set("latitude", String(s.lat));
      u.searchParams.set("longitude", String(s.lon));
      u.searchParams.set("hourly", "weather_code,wind_gusts_10m,precipitation_probability");
      u.searchParams.set("wind_speed_unit", "kmh");
      u.searchParams.set("timezone", tz);
      u.searchParams.set("forecast_hours", "6");

      const r = await fetch(u);
      if (!r.ok) continue;
      const f = await r.json();

      const codes: number[] = f.hourly?.weather_code ?? [];
      const gusts: number[] = f.hourly?.wind_gusts_10m ?? [];
      const pops: number[] = f.hourly?.precipitation_probability ?? [];
      const times: string[] = f.hourly?.time ?? [];

      let alert: { reason: string; idx: number } | null = null;
      for (let i = 0; i < codes.length; i++) {
        if (SEVERE_CODES.has(codes[i])) {
          alert = { reason: describeCode(codes[i]), idx: i };
          break;
        }
        if (gusts[i] >= 60) {
          alert = { reason: `Strong wind gusts ${Math.round(gusts[i])} km/h`, idx: i };
          break;
        }
        if (pops[i] >= 80) {
          alert = { reason: `Heavy rain likely (${pops[i]}%)`, idx: i };
          break;
        }
      }

      if (!alert) continue;

      const alertId = `${times[alert.idx]?.slice(0, 13) ?? ""}-${codes[alert.idx]}-${Math.round(gusts[alert.idx] ?? 0)}`;
      if (s.last_severe_alert_id === alertId) continue;

      const cityLabel = s.city_name || "your area";
      const title = `⚠️ Severe weather: ${cityLabel}`;
      const body = `${alert.reason} expected soon. Stay safe.`;

      const sendRes = await sendWebPush(
        { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
        { title, body, url: "/", icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", tag: "severe" },
        {
          vapidPublicKey: Deno.env.get("VAPID_PUBLIC_KEY")!,
          vapidPrivateKey: Deno.env.get("VAPID_PRIVATE_KEY")!,
          vapidSubject: Deno.env.get("VAPID_SUBJECT")!,
          urgency: "high",
          ttl: 60 * 60 * 2,
        },
      );

      if (sendRes.ok) {
        await supabase
          .from("push_subscriptions")
          .update({ last_severe_alert_id: alertId })
          .eq("endpoint", s.endpoint);
        results.push({ endpoint: s.endpoint, status: "sent" });
      } else if (sendRes.status === 404 || sendRes.status === 410) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
        results.push({ endpoint: s.endpoint, status: "expired-removed" });
      } else {
        results.push({ endpoint: s.endpoint, status: `push ${sendRes.status}` });
      }
    } catch (e) {
      console.error("severe push failed", e);
    }
  }

  return json({ ok: true, count: results.length, results });
});

function describeCode(code: number): string {
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  if (code === 75 || code === 86) return "Heavy snow";
  if (code === 82) return "Violent rain";
  return "Severe weather";
}

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
