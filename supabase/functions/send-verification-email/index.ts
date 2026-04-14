import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

interface VerificationRequest {
  email: string;
  user_id?: string;
  full_name?: string;
  verification_code?: string;
  is_driver?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, user_id, full_name = "User", verification_code, is_driver = false } = 
      (await req.json()) as VerificationRequest;

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate verification code if not provided
    const code = verification_code || Math.random().toString(36).substring(2, 8).toUpperCase();

    // Call the main send-email function
    const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
      },
      body: JSON.stringify({
        to: email,
        template_type: is_driver ? "driver_verification" : "user_verification",
        user_id,
        variables: {
          full_name,
          verification_code: code,
          app_name: "PYU GO",
          verification_link: `${Deno.env.get("SUPABASE_URL")}/auth/verify?code=${code}&email=${encodeURIComponent(email)}`,
        },
      }),
    });

    const result = await response.json();
    return new Response(JSON.stringify(result), {
      status: response.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Error in send-verification-email:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
