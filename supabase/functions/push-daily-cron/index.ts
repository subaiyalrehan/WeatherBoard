import { corsHeaders } from "@supabase/supabase-js/cors";
import { createClient } from "@supabase/supabase-js";
import { sendWebPush } from "../_shared/webpush.ts";

// Runs every hour. For each subscriber whose local time matches their
// chosen notification_hour and hasn't received today's daily yet, fetch
// today's forecast from Open-Meteo and send a push.

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("daily_enabled", true)
    .not("notification_hour", "is", null);

  if (error) return json({ error: error.message }, 500);

  const now = new Date();
  const results: Array<{ endpoint: string; status: string }> = [];

  for (const s of subs ?? []) {
    try {
      const tz = s.timezone || "UTC";
      const localHour = Number(
        new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: tz })
          .format(now),
      );
      if (localHour !== s.notification_hour) continue;

      // Already sent today?
      if (s.last_sent_at) {
        const last = new Date(s.last_sent_at);
        const lastLocalDate = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(last);
        const todayLocalDate = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(now);
        if (lastLocalDate === todayLocalDate) continue;
      }

      if (s.lat == null || s.lon == null) continue;

      const units = s.units === "imperial" ? "fahrenheit" : "celsius";
      const wind = s.units === "imperial" ? "mph" : "kmh";
      const u = new URL("https://api.open-meteo.com/v1/forecast");
      u.searchParams.set("latitude", String(s.lat));
      u.searchParams.set("longitude", String(s.lon));
      u.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max");
      u.searchParams.set("temperature_unit", units);
      u.searchParams.set("wind_speed_unit", wind);
      u.searchParams.set("timezone", tz);
      u.searchParams.set("forecast_days", "1");

      const r = await fetch(u);
      if (!r.ok) {
        results.push({ endpoint: s.endpoint, status: `forecast ${r.status}` });
        continue;
      }
      const f = await r.json();
      const tmax = Math.round(f.daily.temperature_2m_max[0]);
      const tmin = Math.round(f.daily.temperature_2m_min[0]);
      const pop = f.daily.precipitation_probability_max?.[0] ?? 0;
      const unitLabel = s.units === "imperial" ? "°F" : "°C";
      const cityLabel = s.city_name || "your area";

      const title = `Today in ${cityLabel}`;
      const body = `${tmin}${unitLabel} / ${tmax}${unitLabel} · Rain ${pop}%`;

      const sendRes = await sendWebPush(
        { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
        { title, body, url: "/" },
        {
          vapidPublicKey: Deno.env.get("VAPID_PUBLIC_KEY")!,
          vapidPrivateKey: Deno.env.get("VAPID_PRIVATE_KEY")!,
          vapidSubject: Deno.env.get("VAPID_SUBJECT")!,
          urgency: "low",
          ttl: 60 * 60 * 6,
        },
      );

      if (sendRes.ok) {
        await supabase
          .from("push_subscriptions")
          .update({ last_sent_at: now.toISOString() })
          .eq("endpoint", s.endpoint);
        results.push({ endpoint: s.endpoint, status: "sent" });
      } else if (sendRes.status === 404 || sendRes.status === 410) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
        results.push({ endpoint: s.endpoint, status: "expired-removed" });
      } else {
        results.push({ endpoint: s.endpoint, status: `push ${sendRes.status}` });
      }
    } catch (e) {
      console.error("daily push failed", e);
      results.push({ endpoint: s.endpoint, status: `error ${(e as Error).message}` });
    }
  }

  return json({ ok: true, count: results.length, results });
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
