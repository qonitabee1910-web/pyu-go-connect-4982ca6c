import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Pricing config (Rp) per service type
const PRICING: Record<string, { base: number; perKm: number; minFare: number }> = {
  bike: { base: 5000, perKm: 1800, minFare: 7000 },
  bike_women: { base: 5500, perKm: 2000, minFare: 8000 },
  car: { base: 7000, perKm: 2500, minFare: 10000 },
};

const SURGE_MULTIPLIER_THRESHOLD = 5;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, service_type } = await req.json();

    if (!pickup_lat || !pickup_lng || !dropoff_lat || !dropoff_lng) {
      return new Response(JSON.stringify({ error: "Missing coordinates" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sType = service_type && PRICING[service_type] ? service_type : "car";
    const pricing = PRICING[sType];
    const distance_km = haversineKm(pickup_lat, pickup_lng, dropoff_lat, dropoff_lng);

    // Check surge
    const { count } = await supabase
      .from("rides")
      .select("*", { count: "exact", head: true })
      .in("status", ["pending", "accepted", "in_progress"]);

    const surgeMultiplier = (count ?? 0) >= SURGE_MULTIPLIER_THRESHOLD ? 1.5 : 1.0;
    const rawFare = pricing.base + (distance_km * pricing.perKm);
    const fare = Math.max(pricing.minFare, Math.round(rawFare * surgeMultiplier / 500) * 500);

    return new Response(JSON.stringify({
      distance_km: Math.round(distance_km * 100) / 100,
      fare,
      surge: surgeMultiplier > 1,
      surge_multiplier: surgeMultiplier,
      currency: "IDR",
      service_type: sType,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
