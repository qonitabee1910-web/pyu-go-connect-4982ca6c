import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

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
    const { ride_id } = await req.json();

    if (!ride_id) {
      return new Response(JSON.stringify({ error: "ride_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get ride details
    const { data: ride, error: rideErr } = await supabase
      .from("rides")
      .select("*")
      .eq("id", ride_id)
      .single();

    if (rideErr || !ride) {
      return new Response(JSON.stringify({ error: "Ride not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (ride.status !== "pending") {
      return new Response(JSON.stringify({ error: "Ride is not pending" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find available drivers with location
    // Filter by verification, and gender if service_type is bike_women
    let driverQuery = supabase
      .from("drivers")
      .select("*, vehicles!current_vehicle_id(*)")
      .eq("status", "available")
      .eq("is_verified", true)
      .not("current_lat", "is", null)
      .not("current_lng", "is", null);

    if (ride.service_type === "bike_women") {
      driverQuery = driverQuery.eq("gender", "female");
    }

    const { data: drivers, error: driverErr } = await driverQuery;

    if (driverErr || !drivers || drivers.length === 0) {
      return new Response(JSON.stringify({ error: "No available drivers", assigned: false }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter drivers by vehicle_type (bike for bike/bike_women, car for car)
    const requiredVehicleType = ride.service_type === "car" ? "car" : "bike";
    const compatibleDrivers = drivers.filter((d: any) => 
      d.vehicles && d.vehicles.vehicle_type === requiredVehicleType
    );

    if (compatibleDrivers.length === 0) {
      return new Response(JSON.stringify({ error: `No compatible ${requiredVehicleType} drivers available`, assigned: false }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find nearest compatible driver
    let nearest = compatibleDrivers[0];
    let minDist = Infinity;
    for (const d of compatibleDrivers) {
      const dist = haversineKm(ride.pickup_lat, ride.pickup_lng, d.current_lat!, d.current_lng!);
      if (dist < minDist) {
        minDist = dist;
        nearest = d;
      }
    }

    // Assign driver to ride
    const { error: updateErr } = await supabase
      .from("rides")
      .update({ driver_id: nearest.id, status: "accepted" })
      .eq("id", ride_id);

    if (updateErr) {
      return new Response(JSON.stringify({ error: "Failed to assign driver" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark driver as busy
    await supabase
      .from("drivers")
      .update({ status: "busy" })
      .eq("id", nearest.id);

    return new Response(JSON.stringify({
      assigned: true,
      driver: {
        id: nearest.id,
        full_name: nearest.full_name,
        phone: nearest.phone,
        rating: nearest.rating,
        distance_km: Math.round(minDist * 100) / 100,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
