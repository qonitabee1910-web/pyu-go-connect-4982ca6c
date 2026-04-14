import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Verify Resend webhook signature
async function verifyResendSignature(
  signature: string,
  body: string,
  secret: string
): Promise<boolean> {
  try {
    // Resend uses HMAC-SHA256
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(body);

    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature_bytes = await crypto.subtle.sign("HMAC", key, messageData);
    const hex = Array.from(new Uint8Array(signature_bytes))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return signature === hex;
  } catch {
    return false;
  }
}

// Verify SendGrid signature
async function verifySendGridSignature(
  publicKey: string,
  payload: string,
  signature: string,
  timestamp: string
): Promise<boolean> {
  try {
    // SendGrid uses HMAC-SHA256
    const encoder = new TextEncoder();
    const messageData = encoder.encode(`${timestamp}${payload}`);
    const keyData = encoder.encode(publicKey);

    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature_bytes = await crypto.subtle.sign("HMAC", key, messageData);
    const hex = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(signature_bytes))));

    return signature === hex;
  } catch {
    return false;
  }
}

// Parse event type from different providers
function parseEventType(
  provider: string,
  event: Record<string, unknown>
): string {
  if (provider === "resend") {
    const type = event.type as string;
    switch (type) {
      case "email.sent":
        return "sent";
      case "email.delivered":
        return "delivered";
      case "email.bounced":
        return "bounced";
      case "email.complained":
        return "complained";
      case "email.opened":
        return "opened";
      case "email.clicked":
        return "clicked";
      default:
        return "sent";
    }
  } else if (provider === "sendgrid") {
    const type = event.event as string;
    switch (type) {
      case "sent":
        return "sent";
      case "delivered":
        return "delivered";
      case "bounce":
        return "bounced";
      case "complaint":
        return "complained";
      case "open":
        return "opened";
      case "click":
        return "clicked";
      case "unsubscribe":
        return "unsubscribed";
      case "deferred":
        return "deferred";
      default:
        return "sent";
    }
  }
  return "sent";
}

// Extract email from event
function extractEmail(provider: string, event: Record<string, unknown>): string {
  if (provider === "resend") {
    return event.email as string;
  } else if (provider === "sendgrid") {
    return event.email as string;
  }
  return "";
}

// Extract bounce type
function extractBounceType(
  provider: string,
  event: Record<string, unknown>
): { type: string | null; subtype: string | null } {
  if (provider === "resend") {
    const bounceType = event.bounce_type as string;
    return {
      type: bounceType === "hard" ? "permanent" : "transient",
      subtype: null,
    };
  } else if (provider === "sendgrid") {
    const type = event.type as string;
    const reason = event.reason as string;
    return {
      type: type === "permanent" ? "permanent" : "transient",
      subtype: reason || null,
    };
  }
  return { type: null, subtype: null };
}

export async function handleRequest(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          error: "Missing Supabase configuration",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Determine provider and verify signature
    const authHeader = req.headers.get("Authorization") || "";
    const xResendSignature = req.headers.get("x-resend-signature");
    const sgEventId = req.headers.get("X-SendGrid-Event-Id");

    let provider = "";
    let bodyText = await req.text();
    let events: Record<string, unknown>[] = [];

    if (xResendSignature) {
      provider = "resend";
      // Verify Resend signature
      const { data: config } = await supabase
        .from("email_webhook_config")
        .select("webhook_secret")
        .eq("provider", "resend")
        .single();

      if (!config || !config.webhook_secret) {
        return new Response(
          JSON.stringify({ error: "Resend webhook not configured" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const isValid = await verifyResendSignature(
        xResendSignature,
        bodyText,
        config.webhook_secret
      );

      if (!isValid) {
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const payload = JSON.parse(bodyText);
      events = [payload];
    } else if (sgEventId) {
      provider = "sendgrid";
      // SendGrid sends array of events
      events = JSON.parse(bodyText);
    } else {
      return new Response(
        JSON.stringify({ error: "Unknown provider or missing signature" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Process each event
    const results = [];
    for (const event of events) {
      const eventType = parseEventType(provider, event);
      const email = extractEmail(provider, event);
      const { type: bounceType, subtype: bounceSubtype } = extractBounceType(
        provider,
        event
      );

      // Find the email_log entry
      let emailLogId = null;
      if (email) {
        const { data: emailLog } = await supabase
          .from("email_logs")
          .select("id")
          .eq("recipient_email", email)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (emailLog) {
          emailLogId = emailLog.id;
        }
      }

      // Store webhook event
      const { data: webhookEvent, error: webhookError } = await supabase
        .from("email_webhook_events")
        .insert({
          email_log_id: emailLogId,
          event_type: eventType,
          provider: provider,
          provider_event_id: event.id || event.message_id || null,
          bounce_type: bounceType,
          bounce_subtype: bounceSubtype,
          recipient_email: email,
          error_code: event.error_code || null,
          error_message: event.error_message || event.reason || null,
          metadata: JSON.stringify(event),
        });

      if (webhookError) {
        console.error("Error storing webhook event:", webhookError);
      } else {
        results.push({
          event_type: eventType,
          email: email,
          stored: true,
        });
      }
    }

    // Update metrics
    try {
      await supabase.rpc("update_email_delivery_metrics");
    } catch (metricsError) {
      console.error("Error updating metrics:", metricsError);
    }

    return new Response(JSON.stringify({ success: true, events: results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

Deno.serve(handleRequest);
