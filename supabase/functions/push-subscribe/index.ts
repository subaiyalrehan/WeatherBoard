import { corsHeaders } from "@supabase/supabase-js/cors";
import { createClient } from "@supabase/supabase-js";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const sub = body.subscription;
    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
      return json({ error: "Invalid subscription" }, 400);
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(url, key);

    const row = {
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      city_id: body.city?.id ?? null,
      city_name: body.city?.name ?? null,
      lat: body.city?.lat ?? null,
      lon: body.city?.lon ?? null,
      timezone: body.timezone ?? null,
      units: body.units === "imperial" ? "imperial" : "metric",
      notification_hour: typeof body.notificationHour === "number" ? body.notificationHour : null,
      daily_enabled: body.dailyEnabled !== false,
      severe_enabled: body.severeEnabled !== false,
      user_agent: req.headers.get("user-agent") ?? null,
    };

    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(row, { onConflict: "endpoint" });

    if (error) {
      console.error("upsert error", error);
      return json({ error: error.message }, 500);
    }

    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
