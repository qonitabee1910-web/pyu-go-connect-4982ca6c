import { useEffect, useState, useCallback } from "react";
import { MapView } from "@/components/map/MapView";
import { useRideStore } from "@/stores/rideStore";
import { RideStatusOverlay } from "@/components/ride/RideStatusOverlay";
import { LocationSearchInput } from "@/components/ride/LocationSearchInput";
import { useAuth } from "@/hooks/useAuth";
import { useDriverTracking } from "@/hooks/useDriverTracking";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { reverseGeocode } from "@/lib/location";
import { RideRatingDialog } from "@/components/ride/RideRatingDialog";
import { MapPin, Zap } from "lucide-react";
import GuestAccessCard from "@/components/GuestAccessCard";
import { calculateFareLocally } from "@/lib/fareCalculation";

export default function Ride() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const {
    pickup, dropoff, pickupAddress, dropoffAddress,
    fare, rideStatus, serviceType,
    setPickup, setDropoff, setFare, setRideStatus,
    setServiceType, setCurrentRideId, currentRideId, resetRide,
  } = useRideStore();
  const [selectingMode, setSelectingMode] = useState<"pickup" | "dropoff">("pickup");
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMin, setDurationMin] = useState<number | null>(null);
  const [fareLoading, setFareLoading] = useState(false);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [showRating, setShowRating] = useState(false);
  const handleRouteInfo = useCallback((dist: number, dur: number) => {
    setDistanceKm(Math.round(dist * 100) / 100);
    setDurationMin(Math.round(dur));
  }, []);
  const nearbyDrivers = useDriverTracking(true);
  const driverMarkers = nearbyDrivers.map((d) => ({
    id: d.id, name: d.full_name, lat: d.current_lat, lng: d.current_lng,
  }));

  if (!authLoading && !user) {
    return (
      <GuestAccessCard
        icon={<MapPin />}
        title="Pesan Perjalanan"
        description="Nikmati transportasi aman, nyaman, dan terjangkau. Pesan perjalanan dalam hitungan detik dengan driver profesional terdekat."
        features={[
          "🚗 Driver profesional & terverifikasi",
          "⭐ Rating & review from riders & drivers",
          "💰 Harga transparan tanpa biaya tersembunyi",
          "⏱️ Track perjalanan real-time",
        ]}
        ctaText="Pesan Perjalanan Sekarang"
        ctaLink="/auth"
      />
    );
  }

  // When both points set, go to service selection (not fare calc yet)
  useEffect(() => {
    if (pickup && dropoff && rideStatus === "idle") {
      setRideStatus("selecting_service");
    }
  }, [pickup, dropoff, rideStatus, setRideStatus]);

  // Calculate fare when service type is selected
  const calculateFare = async (sType: string) => {
    if (!pickup || !dropoff) {
      toast.error("Please select both pickup and dropoff locations");
      return;
    }
    
    // Validate coordinates are numbers
    if (typeof pickup.lat !== 'number' || typeof pickup.lng !== 'number' ||
        typeof dropoff.lat !== 'number' || typeof dropoff.lng !== 'number') {
      toast.error("Invalid location coordinates");
      return;
    }
    
    setFareLoading(true);
    
    const requestBody = {
      pickup_lat: pickup.lat, 
      pickup_lng: pickup.lng,
      dropoff_lat: dropoff.lat, 
      dropoff_lng: dropoff.lng,
      service_type: sType,
    };
    
    console.log("Sending fare calculation request:", requestBody);
    
    try {
      // Try Edge Function first
      const { data, error } = await supabase.functions.invoke("calculate-fare", {
        body: requestBody,
      });
      
      console.log("Fare calculation response:", { data, error });
      
      if (error) {
        console.warn("Edge Function failed, using fallback calculation", error);
        // Fallback to client-side calculation
        const fallbackData = calculateFareLocally(
          pickup.lat,
          pickup.lng,
          dropoff.lat,
          dropoff.lng,
          sType as "bike" | "bike_women" | "car"
        );
        
        setFare(fallbackData.fare);
        setDistanceKm(fallbackData.distance_km);
        setRideStatus("confirming");
        toast.info("Fare calculated locally");
        return;
      }
      
      if (!data || typeof data.fare !== 'number') {
        throw new Error("Invalid response from server: " + JSON.stringify(data));
      }
      
      setFare(data.fare);
      setDistanceKm(data.distance_km);
      setRideStatus("confirming");
    } catch (err: any) {
      console.error("Fare calculation failed:", err);
      console.error("Error details:", {
        message: err?.message,
        errorDescription: err?.error_description,
        status: err?.status,
      });
      
      try {
        // Try fallback calculation as last resort
        console.log("Attempting fallback fare calculation...");
        const fallbackData = calculateFareLocally(
          pickup.lat,
          pickup.lng,
          dropoff.lat,
          dropoff.lng,
          sType as "bike" | "bike_women" | "car"
        );
        
        setFare(fallbackData.fare);
        setDistanceKm(fallbackData.distance_km);
        setRideStatus("confirming");
        toast.info("Using local fare estimate");
      } catch (fallbackErr: any) {
        // Show specific error message if available
        const errorMsg = err?.error_description || err?.message || "Failed to calculate fare";
        
        // Check if it's a service zone error
        if (errorMsg.includes("zona layanan") || errorMsg.includes("service_zone")) {
          toast.error("Location is outside service area");
        } else if (errorMsg.includes("too close") || errorMsg.includes("DISTANCE_TOO_SHORT")) {
          toast.error("Pickup and dropoff are too close");
        } else {
          toast.error(errorMsg);
        }
      }
    } finally {
      setFareLoading(false);
    }
  };

  const handleServiceSelect = (type: typeof serviceType) => {
    setServiceType(type);
    calculateFare(type);
  };

  const handleMapClick = async (lat: number, lng: number) => {
    if (rideStatus !== "idle" && rideStatus !== "selecting_service") return;
    const address = await reverseGeocode(lat, lng);
    if (selectingMode === "pickup") {
      setPickup({ lat, lng }, address);
      setSelectingMode("dropoff");
    } else {
      setDropoff({ lat, lng }, address);
    }
  };

  const handleRequestRide = async () => {
    if (!user || !pickup || !dropoff || !fare) return;
    setRideStatus("searching");
    try {
      const { data: ride, error: insertErr } = await supabase.from("rides").insert({
        rider_id: user.id,
        pickup_lat: pickup.lat, pickup_lng: pickup.lng, pickup_address: pickupAddress,
        dropoff_lat: dropoff.lat, dropoff_lng: dropoff.lng, dropoff_address: dropoffAddress,
        fare, distance_km: distanceKm, status: "pending",
        service_type: serviceType,
      }).select().single();

      if (insertErr) throw insertErr;
      setCurrentRideId(ride.id);

      const { data: dispatchData, error: dispatchErr } = await supabase.functions.invoke("dispatch-driver", {
        body: { ride_id: ride.id },
      });

      if (dispatchErr || dispatchData?.error) {
        toast.info("No drivers available right now. We'll keep searching.");
      } else {
        setRideStatus("accepted");
        toast.success("Driver found! On the way.");
      }
    } catch (err: any) {
      console.error("Ride request failed:", err);
      toast.error("Failed to request ride: " + err.message);
      setRideStatus("confirming");
    }
  };

  // Realtime ride status
  useEffect(() => {
    if (!currentRideId) return;
    const channel = supabase
      .channel(`ride-${currentRideId}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "rides",
        filter: `id=eq.${currentRideId}`,
      }, (payload) => {
        const newStatus = payload.new.status as string;
        const dId = payload.new.driver_id as string;
        if (dId) setDriverId(dId);

        if (newStatus === "accepted") { setRideStatus("accepted"); toast.success("Driver found! On the way."); }
        else if (newStatus === "in_progress") { setRideStatus("in_progress"); toast.info("Your ride has started!"); }
        else if (newStatus === "completed") { setRideStatus("completed"); setShowRating(true); toast.success("Ride completed! Thank you."); }
        else if (newStatus === "cancelled") { setRideStatus("cancelled"); toast.error("Ride was cancelled."); }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentRideId, setRideStatus]);

  if (!user) return null;

  return (
    <div className="relative h-screen">
      <MapView
        pickup={pickup} dropoff={dropoff} drivers={driverMarkers}
        onMapClick={handleMapClick}
        onRouteInfo={handleRouteInfo}
        className="w-full h-full"
      />

      {/* Top bar overlay */}
      <div className="absolute top-4 left-4 right-4 z-10">
        <div className="bg-card/95 backdrop-blur rounded-2xl p-4 shadow-lg space-y-1">
          <LocationSearchInput
            placeholder="Cari lokasi jemput..."
            value={pickupAddress}
            dotColor="bg-primary"
            showMyLocation
            onSelect={(lat, lng, address) => {
              setPickup({ lat, lng }, address);
              setSelectingMode("dropoff");
            }}
            onClear={() => {
              setPickup(null);
              setSelectingMode("pickup");
              if (rideStatus !== "idle") resetRide();
            }}
          />
          <div className="ml-1.5 border-l-2 border-dashed border-muted-foreground/30 h-3" />
          <LocationSearchInput
            placeholder="Cari lokasi tujuan..."
            value={dropoffAddress}
            dotColor="bg-destructive"
            onSelect={(lat, lng, address) => {
              setDropoff({ lat, lng }, address);
            }}
            onClear={() => {
              setDropoff(null);
              if (rideStatus !== "idle") resetRide();
            }}
          />
        </div>
      </div>

      <RideStatusOverlay
        rideStatus={rideStatus}
        selectingMode={selectingMode}
        serviceType={serviceType}
        fare={fare}
        fareLoading={fareLoading}
        distanceKm={distanceKm}
        durationMin={durationMin}
        onReset={resetRide}
        onServiceSelect={handleServiceSelect}
        onRequestRide={handleRequestRide}
        onStatusChange={setRideStatus}
      />

      {currentRideId && driverId && (
        <RideRatingDialog
          rideId={currentRideId}
          driverId={driverId}
          isOpen={showRating}
          onClose={() => {
            setShowRating(false);
            resetRide();
          }}
          onSuccess={() => {
            setShowRating(false);
            resetRide();
          }}
        />
      )}
    </div>
  );
}
