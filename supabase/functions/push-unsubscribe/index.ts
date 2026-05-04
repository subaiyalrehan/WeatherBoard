import { corsHeaders } from "@supabase/supabase-js/cors";
import { createClient } from "@supabase/supabase-js";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { endpoint } = await req.json();
    if (!endpoint) return json({ error: "endpoint required" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
