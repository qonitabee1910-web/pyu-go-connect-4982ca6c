import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const url = new URL(req.url);
    const source = url.searchParams.get("source");

    if (source === "midtrans") {
      return await handleMidtrans(supabase, body, req);
    } else if (source === "xendit") {
      return await handleXendit(supabase, body, req);
    }

    return new Response(JSON.stringify({ error: "Unknown source" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

async function handleMidtrans(supabase: any, body: any, _req: Request) {
  const { order_id, transaction_status, fraud_status, signature_key, status_code, gross_amount } = body;

  // Verify signature
  const serverKey = Deno.env.get("MIDTRANS_SERVER_KEY");
  if (serverKey && signature_key) {
    const raw = order_id + status_code + gross_amount + serverKey;
    const hash = await crypto.subtle.digest("SHA-512", new TextEncoder().encode(raw));
    const expected = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
    if (expected !== signature_key) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  }

  const isSuccess = (transaction_status === "capture" && fraud_status === "accept") ||
                    transaction_status === "settlement";
  const isFailed = ["deny", "cancel", "expire"].includes(transaction_status);

  if (!isSuccess && !isFailed) {
    return new Response(JSON.stringify({ status: "ignored" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Find pending transaction
  const { data: txn } = await supabase.from("wallet_transactions")
    .select("id, wallet_id, amount, status")
    .eq("reference_id", order_id)
    .eq("status", "pending")
    .single();

  if (!txn) {
    return new Response(JSON.stringify({ status: "no_pending_txn" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Check if this is a shuttle payment
  if (order_id.startsWith("SHUTTLE-")) {
    if (isSuccess) {
      // Extract booking ref from order_id pattern: SHUTTLE-{ref}-{timestamp}
      const parts = order_id.split("-");
      const bookingRef = parts.slice(1, parts.length - 1).join("-");
      await supabase.from("shuttle_bookings").update({ payment_status: "paid" }).eq("booking_ref", bookingRef);
    } else {
      const parts = order_id.split("-");
      const bookingRef = parts.slice(1, parts.length - 1).join("-");
      await supabase.from("shuttle_bookings").update({ payment_status: "unpaid" }).eq("booking_ref", bookingRef);
    }
  } else if (txn) {
    if (isSuccess) {
      await supabase.rpc("process_wallet_transaction", {
        p_wallet_id: txn.wallet_id,
        p_type: "top_up",
        p_amount: txn.amount,
        p_description: `Top-up via Midtrans (${order_id})`,
        p_reference_id: order_id,
        p_payment_gateway: "midtrans",
        p_gateway_transaction_id: order_id,
      });
      await supabase.from("wallet_transactions").update({ status: "completed" }).eq("id", txn.id);
    } else {
      await supabase.from("wallet_transactions").update({ status: "failed" }).eq("id", txn.id);
    }
  }

  return new Response(JSON.stringify({ status: "ok" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function handleXendit(supabase: any, body: any, req: Request) {
  // Verify webhook token
  const webhookToken = Deno.env.get("XENDIT_WEBHOOK_TOKEN");
  const callbackToken = req.headers.get("x-callback-token");
  if (webhookToken && callbackToken !== webhookToken) {
    return new Response(JSON.stringify({ error: "Invalid token" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { external_id, status, id: invoiceId } = body;
  const isSuccess = status === "PAID" || status === "SETTLED";
  const isFailed = status === "EXPIRED" || status === "FAILED";

  if (!isSuccess && !isFailed) {
    return new Response(JSON.stringify({ status: "ignored" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { data: txn } = await supabase.from("wallet_transactions")
    .select("id, wallet_id, amount, status")
    .eq("reference_id", external_id)
    .eq("status", "pending")
    .single();

  if (!txn) {
    return new Response(JSON.stringify({ status: "no_pending_txn" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (external_id.startsWith("SHUTTLE-")) {
    if (isSuccess) {
      const parts = external_id.split("-");
      const bookingRef = parts.slice(1, parts.length - 1).join("-");
      await supabase.from("shuttle_bookings").update({ payment_status: "paid" }).eq("booking_ref", bookingRef);
    } else {
      const parts = external_id.split("-");
      const bookingRef = parts.slice(1, parts.length - 1).join("-");
      await supabase.from("shuttle_bookings").update({ payment_status: "unpaid" }).eq("booking_ref", bookingRef);
    }
  } else if (txn) {
    if (isSuccess) {
      await supabase.rpc("process_wallet_transaction", {
        p_wallet_id: txn.wallet_id,
        p_type: "top_up",
        p_amount: txn.amount,
        p_description: `Top-up via Xendit (${external_id})`,
        p_reference_id: external_id,
        p_payment_gateway: "xendit",
        p_gateway_transaction_id: invoiceId,
      });
      await supabase.from("wallet_transactions").update({ status: "completed" }).eq("id", txn.id);
    } else {
      await supabase.from("wallet_transactions").update({ status: "failed" }).eq("id", txn.id);
    }
  }

  return new Response(JSON.stringify({ status: "ok" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
