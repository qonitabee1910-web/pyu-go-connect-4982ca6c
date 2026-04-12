import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PaymentSchema = z.object({
  booking_id: z.string().uuid(),
  gateway: z.enum(["midtrans", "xendit"]),
});

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
    const parsed = PaymentSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { booking_id, gateway } = parsed.data;

    // Get booking
    const { data: booking, error: bErr } = await supabase
      .from("shuttle_bookings")
      .select("id, booking_ref, total_fare, guest_name, guest_phone, payment_status")
      .eq("id", booking_id)
      .single();

    if (bErr || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (booking.payment_status === "paid") {
      return new Response(JSON.stringify({ error: "Already paid" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orderId = `SHUTTLE-${booking.booking_ref}-${Date.now()}`;
    const amount = booking.total_fare;

    // Update booking with payment method and pending status
    await supabase.from("shuttle_bookings").update({
      payment_method: gateway,
      payment_status: "pending",
    }).eq("id", booking_id);

    let paymentData: Record<string, unknown> = {};

    if (gateway === "midtrans") {
      const serverKey = Deno.env.get("MIDTRANS_SERVER_KEY");
      if (!serverKey) throw new Error("MIDTRANS_SERVER_KEY not configured");

      const { data: gwSettings } = await supabase
        .from("payment_settings").select("config").eq("gateway", "midtrans").eq("is_active", true).single();

      const isSandbox = gwSettings?.config?.environment === "sandbox";
      const baseUrl = isSandbox
        ? "https://app.sandbox.midtrans.com/snap/v1"
        : "https://app.midtrans.com/snap/v1";

      const resp = await fetch(`${baseUrl}/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${btoa(serverKey + ":")}`,
        },
        body: JSON.stringify({
          transaction_details: { order_id: orderId, gross_amount: amount },
          customer_details: { first_name: booking.guest_name, phone: booking.guest_phone },
        }),
      });

      const snapData = await resp.json();
      if (!resp.ok) throw new Error(snapData.error_messages?.join(", ") || "Midtrans error");

      paymentData = { token: snapData.token, redirect_url: snapData.redirect_url, gateway: "midtrans" };
    } else if (gateway === "xendit") {
      const secretKey = Deno.env.get("XENDIT_SECRET_KEY");
      if (!secretKey) throw new Error("XENDIT_SECRET_KEY not configured");

      const resp = await fetch("https://api.xendit.co/v2/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${btoa(secretKey + ":")}`,
        },
        body: JSON.stringify({
          external_id: orderId,
          amount,
          currency: "IDR",
          description: `PYU GO Shuttle - ${booking.booking_ref}`,
          success_redirect_url: `${req.headers.get("origin") || ""}/shuttle?payment=success&ref=${booking.booking_ref}`,
          failure_redirect_url: `${req.headers.get("origin") || ""}/shuttle?payment=failed`,
        }),
      });

      const invoiceData = await resp.json();
      if (!resp.ok) throw new Error(invoiceData.message || "Xendit error");

      paymentData = { invoice_url: invoiceData.invoice_url, invoice_id: invoiceData.id, gateway: "xendit" };
    }

    // Store the order_id reference on the booking for webhook matching
    // We reuse booking_ref matching in webhook via the orderId pattern
    return new Response(JSON.stringify({ success: true, order_id: orderId, ...paymentData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("create-shuttle-payment error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
