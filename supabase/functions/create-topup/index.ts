import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { z } from "https://esm.sh/zod@3.23.8";

const TopUpSchema = z.object({
  amount: z.number().min(10000, "Minimum top-up is Rp 10,000").max(10000000, "Maximum top-up is Rp 10,000,000"),
  gateway: z.enum(["midtrans", "xendit"]).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const parsed = TopUpSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { amount, gateway: requestedGateway } = parsed.data;

    // Get or create wallet
    let { data: wallet } = await supabaseAdmin.from("wallets").select("id").eq("user_id", user.id).single();
    if (!wallet) {
      const { data: newWallet, error: walletErr } = await supabaseAdmin.from("wallets").insert({ user_id: user.id, wallet_type: "user" }).select("id").single();
      if (walletErr) throw walletErr;
      wallet = newWallet;
    }

    // Determine gateway
    let gateway = requestedGateway;
    if (!gateway) {
      const { data: defaultGw } = await supabaseAdmin.from("payment_settings").select("gateway").eq("is_default", true).eq("is_active", true).single();
      gateway = defaultGw?.gateway || "midtrans";
    }

    // Verify gateway is active
    const { data: gwSettings } = await supabaseAdmin.from("payment_settings").select("*").eq("gateway", gateway).eq("is_active", true).single();
    if (!gwSettings) {
      return new Response(JSON.stringify({ error: `Payment gateway '${gateway}' is not active` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const orderId = `TOPUP-${user.id.slice(0, 8)}-${Date.now()}`;

    // Insert pending transaction
    const { data: txn, error: txnErr } = await supabaseAdmin.from("wallet_transactions").insert({
      wallet_id: wallet.id,
      type: "top_up",
      amount,
      balance_after: 0,
      reference_id: orderId,
      description: `Top-up via ${gateway}`,
      status: "pending",
      payment_gateway: gateway,
    }).select("id").single();
    if (txnErr) throw txnErr;

    let paymentData: Record<string, unknown> = {};

    if (gateway === "midtrans") {
      const serverKey = Deno.env.get("MIDTRANS_SERVER_KEY");
      if (!serverKey) throw new Error("MIDTRANS_SERVER_KEY not configured");

      const isSandbox = gwSettings.config?.environment === "sandbox";
      const baseUrl = isSandbox ? "https://app.sandbox.midtrans.com/snap/v1" : "https://app.midtrans.com/snap/v1";

      const resp = await fetch(`${baseUrl}/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${btoa(serverKey + ":")}`,
        },
        body: JSON.stringify({
          transaction_details: { order_id: orderId, gross_amount: amount },
          customer_details: { email: user.email },
        }),
      });

      const snapData = await resp.json();
      if (!resp.ok) throw new Error(snapData.error_messages?.join(", ") || "Midtrans error");

      // Update transaction with gateway ref
      await supabaseAdmin.from("wallet_transactions").update({ gateway_transaction_id: snapData.token }).eq("id", txn.id);

      paymentData = { token: snapData.token, redirect_url: snapData.redirect_url, gateway: "midtrans" };
    } else if (gateway === "xendit") {
      const secretKey = Deno.env.get("XENDIT_SECRET_KEY");
      if (!secretKey) throw new Error("XENDIT_SECRET_KEY not configured");

      const isTest = gwSettings.config?.environment === "test";
      const baseUrl = "https://api.xendit.co";

      const resp = await fetch(`${baseUrl}/v2/invoices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${btoa(secretKey + ":")}`,
        },
        body: JSON.stringify({
          external_id: orderId,
          amount,
          currency: "IDR",
          description: `PYU GO Wallet Top-Up`,
          payer_email: user.email,
          success_redirect_url: `${req.headers.get("origin") || ""}/wallet?topup=success`,
          failure_redirect_url: `${req.headers.get("origin") || ""}/wallet?topup=failed`,
        }),
      });

      const invoiceData = await resp.json();
      if (!resp.ok) throw new Error(invoiceData.message || "Xendit error");

      await supabaseAdmin.from("wallet_transactions").update({ gateway_transaction_id: invoiceData.id }).eq("id", txn.id);

      paymentData = { invoice_url: invoiceData.invoice_url, invoice_id: invoiceData.id, gateway: "xendit" };
    }

    return new Response(JSON.stringify({ success: true, transaction_id: txn.id, ...paymentData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("create-topup error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
