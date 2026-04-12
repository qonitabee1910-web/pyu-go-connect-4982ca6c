import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Fallback pricing if DB fetch fails
const FALLBACK_PRICING: Record<string, { base_fare: number; per_km: number; min_fare: number; surge_multiplier: number }> = {
  bike: { base_fare: 5000, per_km: 2500, min_fare: 8000, surge_multiplier: 1.0 },
  bike_women: { base_fare: 5000, per_km: 2500, min_fare: 8000, surge_multiplier: 1.0 },
  car: { base_fare: 10000, per_km: 4000, min_fare: 15000, surge_multiplier: 1.0 },
};

const SURGE_ACTIVE_RIDES_THRESHOLD = 5;

type ZoneConfig = { name: string; lat: number; lng: number; radius_km: number };

async function getFareConfig(): Promise<Record<string, { base_fare: number; per_km: number; min_fare: number; surge_multiplier: number }>> {
  try {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "ride_fares")
      .maybeSingle();
    if (data?.value) return data.value as any;
  } catch (_) {
    // fall through
  }
  return FALLBACK_PRICING;
}

async function getServiceZones(): Promise<ZoneConfig[]> {
  try {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "service_zones")
      .maybeSingle();
    if (data?.value && Array.isArray(data.value)) return data.value as ZoneConfig[];
  } catch (_) {
    // fall through
  }
  return [];
}

function isInAnyZone(lat: number, lng: number, zones: ZoneConfig[]): string | null {
  for (const zone of zones) {
    const dist = haversineKm(lat, lng, zone.lat, zone.lng);
    if (dist <= zone.radius_km) return zone.name;
  }
  return null;
}

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

    const [fareConfig, zones] = await Promise.all([getFareConfig(), getServiceZones()]);

    // Validate service zone
    if (zones.length > 0) {
      const pickupZone = isInAnyZone(pickup_lat, pickup_lng, zones);
      const dropoffZone = isInAnyZone(dropoff_lat, dropoff_lng, zones);
      if (!pickupZone && !dropoffZone) {
        return new Response(JSON.stringify({
          error: "Lokasi pickup dan dropoff berada di luar zona layanan",
          code: "OUTSIDE_SERVICE_ZONE",
        }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!pickupZone) {
        return new Response(JSON.stringify({
          error: "Lokasi pickup berada di luar zona layanan",
          code: "PICKUP_OUTSIDE_ZONE",
        }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!dropoffZone) {
        return new Response(JSON.stringify({
          error: "Lokasi dropoff berada di luar zona layanan",
          code: "DROPOFF_OUTSIDE_ZONE",
        }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const sType = service_type && fareConfig[service_type] ? service_type : "car";
    const pricing = fareConfig[sType];
    const distance_km = haversineKm(pickup_lat, pickup_lng, dropoff_lat, dropoff_lng);

    // Check surge based on active rides
    const { count } = await supabase
      .from("rides")
      .select("*", { count: "exact", head: true })
      .in("status", ["pending", "accepted", "in_progress"]);

    const surgeFromDb = pricing.surge_multiplier || 1.0;
    const surgeDemand = (count ?? 0) >= SURGE_ACTIVE_RIDES_THRESHOLD ? 1.5 : 1.0;
    const surgeMultiplier = Math.max(surgeFromDb, surgeDemand);

    const rawFare = pricing.base_fare + (distance_km * pricing.per_km);
    const fare = Math.max(pricing.min_fare, Math.round(rawFare * surgeMultiplier / 500) * 500);

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
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
