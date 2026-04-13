// Local fare calculation fallback when Edge Function is unavailable
export function calculateFareLocally(
  pickupLat: number,
  pickupLng: number,
  dropoffLat: number,
  dropoffLng: number,
  serviceType: "bike" | "bike_women" | "car" = "car"
) {
  // Pricing configuration (same as Edge Function)
  const pricing: Record<string, { base_fare: number; per_km: number; min_fare: number }> = {
    bike: { base_fare: 5000, per_km: 2500, min_fare: 8000 },
    bike_women: { base_fare: 5000, per_km: 2500, min_fare: 8000 },
    car: { base_fare: 10000, per_km: 4000, min_fare: 15000 },
  };

  // Haversine formula to calculate distance
  const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Calculate distance
  const distance_km = haversineKm(pickupLat, pickupLng, dropoffLat, dropoffLng);

  // Validate distance
  if (distance_km < 0.1) {
    throw new Error("Pickup and dropoff locations are too close (minimum 100m required)");
  }

  // Get pricing for service type
  const config = pricing[serviceType] || pricing.car;

  // Calculate fare
  const rawFare = config.base_fare + distance_km * config.per_km;
  const fare = Math.max(config.min_fare, Math.round(rawFare / 500) * 500);

  return {
    distance_km: Math.round(distance_km * 100) / 100,
    fare,
    surge: false,
    surge_multiplier: 1.0,
    currency: "IDR",
    service_type: serviceType,
    calculated_locally: true,
  };
}
