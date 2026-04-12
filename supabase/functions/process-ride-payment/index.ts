import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { z } from "https://esm.sh/zod@3.23.8";

const Schema = z.object({
  ride_id: z.string().uuid(),
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { ride_id } = parsed.data;

    // Get ride details
    const { data: ride, error: rideErr } = await supabase.from("rides").select("*").eq("id", ride_id).single();
    if (rideErr || !ride) {
      return new Response(JSON.stringify({ error: "Ride not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (ride.status !== "completed") {
      return new Response(JSON.stringify({ error: "Ride not completed" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const fare = Number(ride.fare);
    if (!fare || fare <= 0) {
      return new Response(JSON.stringify({ error: "Invalid fare" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get commission rate
    const { data: settings } = await supabase.from("payment_settings").select("commission_rate").eq("is_default", true).single();
    const commissionRate = settings?.commission_rate ? Number(settings.commission_rate) : 0.1;

    // Get rider wallet
    const { data: riderWallet } = await supabase.from("wallets").select("id, balance").eq("user_id", ride.rider_id).single();
    if (!riderWallet) {
      return new Response(JSON.stringify({ error: "Rider wallet not found" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (Number(riderWallet.balance) < fare) {
      return new Response(JSON.stringify({ error: "Insufficient rider balance" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get driver info and wallet
    if (!ride.driver_id) {
      return new Response(JSON.stringify({ error: "No driver assigned" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: driver } = await supabase.from("drivers").select("user_id").eq("id", ride.driver_id).single();
    if (!driver?.user_id) {
      return new Response(JSON.stringify({ error: "Driver user not found" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let { data: driverWallet } = await supabase.from("wallets").select("id").eq("user_id", driver.user_id).single();
    if (!driverWallet) {
      const { data: nw } = await supabase.from("wallets").insert({ user_id: driver.user_id, wallet_type: "driver" }).select("id").single();
      driverWallet = nw;
    }

    const commission = Math.round(fare * commissionRate);
    const driverEarning = fare - commission;

    // Deduct from rider
    await supabase.rpc("process_wallet_transaction", {
      p_wallet_id: riderWallet.id,
      p_type: "ride_payment",
      p_amount: -fare,
      p_description: `Ride payment #${ride_id.slice(0, 8)}`,
      p_reference_id: ride_id,
    });

    // Credit driver
    await supabase.rpc("process_wallet_transaction", {
      p_wallet_id: driverWallet!.id,
      p_type: "ride_earning",
      p_amount: driverEarning,
      p_description: `Ride earning #${ride_id.slice(0, 8)} (${((1 - commissionRate) * 100).toFixed(0)}%)`,
      p_reference_id: ride_id,
    });

    return new Response(JSON.stringify({ success: true, fare, commission, driver_earning: driverEarning }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("process-ride-payment error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
