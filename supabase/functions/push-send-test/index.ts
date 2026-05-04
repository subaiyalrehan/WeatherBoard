import { corsHeaders } from "npm:@supabase/supabase-js@2.95.0/cors";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";
import { sendWebPush } from "../_shared/webpush.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { endpoint } = await req.json();
    if (!endpoint) return json({ error: "endpoint required" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: sub, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth, city_name")
      .eq("endpoint", endpoint)
      .maybeSingle();

    if (error) return json({ error: error.message }, 500);
    if (!sub) return json({ error: "Subscription not found" }, 404);

    const result = await sendWebPush(
      sub,
      {
        title: "WeatherBoard",
        body: `Test notification${sub.city_name ? ` for ${sub.city_name}` : ""} — looks good!`,
        url: "/",
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: "test",
      },
      {
        vapidPublicKey: Deno.env.get("VAPID_PUBLIC_KEY")!,
        vapidPrivateKey: Deno.env.get("VAPID_PRIVATE_KEY")!,
        vapidSubject: Deno.env.get("VAPID_SUBJECT")!,
        urgency: "normal",
      },
    );

    if (!result.ok && (result.status === 404 || result.status === 410)) {
      await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
    }

    return json(result, result.ok ? 200 : 502);
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
