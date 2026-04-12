/// <reference lib="deno.ns" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple XOR encryption/decryption for demonstration
// In production, use a more robust library or Supabase Vault
const ENCRYPTION_KEY = Deno.env.get("INTERNAL_ENCRYPTION_KEY") || "default-secret-key";

function encrypt(text: string): string {
  const result = [];
  for (let i = 0; i < text.length; i++) {
    result.push(String.fromCharCode(text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)));
  }
  return btoa(result.join(""));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify if the user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const { data: { user }, error: authError } = await createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    ).auth.getUser();

    if (authError || !user) throw new Error("Unauthorized");

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) throw new Error("Forbidden: Admin access required");

    const { action, gateway, environment, client_key, server_key } = await req.json();

    if (action === "update") {
      // 1. Get old values for audit log
      const { data: oldConfig } = await supabaseAdmin
        .from("payment_gateway_configs")
        .select("*")
        .eq("gateway", gateway)
        .eq("environment", environment)
        .single();

      // 2. Encrypt server key
      const encryptedServerKey = encrypt(server_key);

      // 3. Upsert config
      const { error: upsertError } = await supabaseAdmin
        .from("payment_gateway_configs")
        .upsert({
          gateway,
          environment,
          client_key,
          server_key_encrypted: encryptedServerKey,
          updated_at: new Date().toISOString()
        }, { onConflict: "gateway,environment" });

      if (upsertError) throw upsertError;

      // 4. Create Audit Log
      await supabaseAdmin.from("payment_config_audit_logs").insert({
        gateway,
        environment,
        action: "update",
        changed_by: user.id,
        old_values: oldConfig || {},
        new_values: { client_key, server_key: "********" }
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");
  } catch (error: any) {
    console.error("manage-gateway-keys error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { 
      status: error.message === "Unauthorized" ? 401 : (error.message.includes("Forbidden") ? 403 : 500), 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
