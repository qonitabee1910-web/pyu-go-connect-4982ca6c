import { useEffect, useState } from "react";
import { MapView } from "@/components/map/MapView";
import { useRideStore } from "@/stores/rideStore";
import { ServiceSelector } from "@/components/ride/ServiceSelector";
import { useAuth } from "@/hooks/useAuth";
import { useDriverTracking } from "@/hooks/useDriverTracking";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, DollarSign, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
    const data = await res.json();
    return data.display_name?.split(",").slice(0, 3).join(",") ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

export default function Ride() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    pickup, dropoff, pickupAddress, dropoffAddress,
    fare, rideStatus, serviceType,
    setPickup, setDropoff, setFare, setRideStatus,
    setServiceType, setCurrentRideId, currentRideId, resetRide,
  } = useRideStore();
  const [selectingMode, setSelectingMode] = useState<"pickup" | "dropoff">("pickup");
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [fareLoading, setFareLoading] = useState(false);
  const nearbyDrivers = useDriverTracking(true);
  const driverMarkers = nearbyDrivers.map((d) => ({
    id: d.id, name: d.full_name, lat: d.current_lat, lng: d.current_lng,
  }));

  useEffect(() => {
    if (!user) {
      toast.error("Please sign in to book a ride");
      navigate("/auth");
    }
  }, [user, navigate]);

  // When both points set, go to service selection (not fare calc yet)
  useEffect(() => {
    if (pickup && dropoff && rideStatus === "idle") {
      setRideStatus("selecting_service");
    }
  }, [pickup, dropoff, rideStatus, setRideStatus]);

  // Calculate fare when service type is selected
  const calculateFare = async (sType: string) => {
    if (!pickup || !dropoff) return;
    setFareLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("calculate-fare", {
        body: {
          pickup_lat: pickup.lat, pickup_lng: pickup.lng,
          dropoff_lat: dropoff.lat, dropoff_lng: dropoff.lng,
          service_type: sType,
        },
      });
      if (error) throw error;
      setFare(data.fare);
      setDistanceKm(data.distance_km);
      setRideStatus("confirming");
    } catch (err: any) {
      console.error("Fare calculation failed:", err);
      toast.error("Failed to calculate fare");
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
        if (newStatus === "accepted") { setRideStatus("accepted"); toast.success("Driver found! On the way."); }
        else if (newStatus === "in_progress") { setRideStatus("in_progress"); toast.info("Your ride has started!"); }
        else if (newStatus === "completed") { setRideStatus("completed"); toast.success("Ride completed! Thank you."); }
        else if (newStatus === "cancelled") { setRideStatus("cancelled"); toast.error("Ride was cancelled."); }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentRideId, setRideStatus]);

  if (!user) return null;

  return (
    <div className="relative h-screen">
      <MapView pickup={pickup} dropoff={dropoff} drivers={driverMarkers} onMapClick={handleMapClick} className="w-full h-full" />

      {/* Top bar overlay */}
      <div className="absolute top-4 left-4 right-4 z-10">
        <div className="bg-card/95 backdrop-blur rounded-2xl p-4 shadow-lg space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-primary shrink-0" />
            <p className="text-xs text-foreground truncate flex-1">
              {pickupAddress || "Tap map to set pick-up"}
            </p>
          </div>
          <div className="ml-1.5 border-l-2 border-dashed border-muted-foreground/30 h-3" />
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-destructive shrink-0" />
            <p className="text-xs text-foreground truncate flex-1">
              {dropoffAddress || "Then tap for drop-off"}
            </p>
          </div>
        </div>
      </div>

      {/* Selection mode indicator */}
      {rideStatus === "idle" && (
        <div className="absolute top-[140px] left-1/2 -translate-x-1/2 z-10">
          <div className="bg-foreground/80 text-background text-xs font-semibold px-4 py-2 rounded-full">
            <MapPin className="w-3 h-3 inline mr-1" />
            {selectingMode === "pickup" ? "Select pick-up location" : "Select drop-off location"}
          </div>
        </div>
      )}

      {/* Service selection panel */}
      {rideStatus === "selecting_service" && (
        <div className="absolute bottom-20 left-4 right-4 z-10 animate-slide-up">
          <div className="bg-card rounded-2xl p-5 shadow-xl border border-border">
            <div className="flex justify-between items-center mb-3">
              <div />
              <button onClick={resetRide} className="text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>
            <ServiceSelector selected={serviceType} onSelect={handleServiceSelect} loading={fareLoading} />
            {fareLoading && (
              <div className="flex items-center justify-center gap-2 mt-3 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Calculating fare...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirming panel */}
      {rideStatus === "confirming" && fare && (
        <div className="absolute bottom-20 left-4 right-4 z-10 animate-slide-up">
          <div className="bg-card rounded-2xl p-5 shadow-xl border border-border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Ride Summary</h3>
              <button onClick={resetRide} className="text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
              <span className="capitalize">{serviceType.replace("_", " ")}</span>
              {distanceKm && <span>• {distanceKm.toFixed(1)} km</span>}
            </div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                <span className="text-2xl font-extrabold">Rp {fare.toLocaleString("id-ID")}</span>
              </div>
              <button onClick={() => setRideStatus("selecting_service")} className="text-xs text-primary underline">Change service</button>
            </div>
            <Button className="w-full gradient-primary text-primary-foreground font-bold" size="lg" onClick={handleRequestRide}>
              <Navigation className="w-4 h-4 mr-2" /> Request Ride
            </Button>
          </div>
        </div>
      )}

      {rideStatus === "searching" && (
        <div className="absolute bottom-20 left-4 right-4 z-10 animate-slide-up">
          <div className="bg-card rounded-2xl p-6 shadow-xl border border-border text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-3 text-primary animate-spin" />
            <p className="font-bold">Finding your driver...</p>
            <p className="text-sm text-muted-foreground mt-1">Please wait</p>
          </div>
        </div>
      )}

      {rideStatus === "accepted" && (
        <div className="absolute bottom-20 left-4 right-4 z-10 animate-slide-up">
          <div className="bg-card rounded-2xl p-5 shadow-xl border border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Navigation className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-bold">Driver is on the way!</p>
                <p className="text-xs text-muted-foreground">Arriving soon</p>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={resetRide}>Cancel Ride</Button>
          </div>
        </div>
      )}
    </div>
  );
}
