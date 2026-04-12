import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDriverStore } from "@/stores/driverStore";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import { toast } from "sonner";
import { Phone, MapPin, Navigation } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({ iconUrl, shadowUrl });

const greenIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl, iconSize: [25, 41], iconAnchor: [12, 41],
});
const redIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl, iconSize: [25, 41], iconAnchor: [12, 41],
});

export default function DriverActiveRide() {
  const { currentRideId, setCurrentRideId, driverId } = useDriverStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: ride, isLoading } = useQuery({
    queryKey: ["active-ride", currentRideId],
    queryFn: async () => {
      // If no currentRideId, find active ride for this driver
      const id = currentRideId;
      if (!id && driverId) {
        const { data } = await supabase
          .from("rides")
          .select("*")
          .eq("driver_id", driverId)
          .in("status", ["accepted", "in_progress"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) {
          setCurrentRideId(data.id);
          return data;
        }
        return null;
      }
      if (!id) return null;
      const { data, error } = await supabase.from("rides").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!currentRideId || !!driverId,
    refetchInterval: 5000,
  });

  // Rider profile
  const { data: riderProfile } = useQuery({
    queryKey: ["rider-profile", ride?.rider_id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name, phone").eq("user_id", ride!.rider_id).maybeSingle();
      return data;
    },
    enabled: !!ride?.rider_id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      if (newStatus === "completed") {
        // Call complete-ride edge function
        const { data, error } = await supabase.functions.invoke("complete-ride", {
          body: { ride_id: ride!.id },
        });
        if (error) throw error;
        return data;
      }
      const { error } = await supabase.from("rides").update({ status: newStatus as any }).eq("id", ride!.id);
      if (error) throw error;
    },
    onSuccess: (_, newStatus) => {
      queryClient.invalidateQueries({ queryKey: ["active-ride"] });
      if (newStatus === "completed") {
        toast.success("Ride selesai! Pendapatan telah dicatat.");
        setCurrentRideId(null);
        navigate("/driver");
      } else if (newStatus === "in_progress") {
        toast.info("Ride dimulai!");
      }
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Memuat...</div>;
  }

  if (!ride) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-2">
        <Navigation className="w-12 h-12 text-muted-foreground/30" />
        <p className="text-muted-foreground">Tidak ada ride aktif</p>
      </div>
    );
  }

  const statusLabel: Record<string, string> = {
    accepted: "Menuju Pickup",
    in_progress: "Dalam Perjalanan",
    completed: "Selesai",
  };

  return (
    <div className="space-y-4">
      {/* Map */}
      <div className="h-56">
        <MapContainer
          center={[ride.pickup_lat, ride.pickup_lng]}
          zoom={13}
          className="h-full w-full"
          zoomControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={[ride.pickup_lat, ride.pickup_lng]} icon={greenIcon} />
          <Marker position={[ride.dropoff_lat, ride.dropoff_lng]} icon={redIcon} />
          <Polyline
            positions={[[ride.pickup_lat, ride.pickup_lng], [ride.dropoff_lat, ride.dropoff_lng]]}
            pathOptions={{ color: "#10b981", weight: 3, dashArray: "8" }}
          />
        </MapContainer>
      </div>

      {/* Ride info */}
      <div className="px-4 space-y-3">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-emerald-600">{statusLabel[ride.status] ?? ride.status}</span>
              <span className="text-lg font-bold">Rp {new Intl.NumberFormat("id-ID").format(Number(ride.fare ?? 0))}</span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <span>{ride.pickup_address || "Lokasi pickup"}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <span>{ride.dropoff_address || "Lokasi tujuan"}</span>
              </div>
            </div>

            {riderProfile && (
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm font-medium">{riderProfile.full_name || "Penumpang"}</span>
                {riderProfile.phone && (
                  <a href={`tel:${riderProfile.phone}`} className="text-emerald-600">
                    <Phone className="w-5 h-5" />
                  </a>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action buttons */}
        {ride.status === "accepted" && (
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => updateStatusMutation.mutate("in_progress")}
            disabled={updateStatusMutation.isPending}
          >
            Mulai Perjalanan
          </Button>
        )}
        {ride.status === "in_progress" && (
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => updateStatusMutation.mutate("completed")}
            disabled={updateStatusMutation.isPending}
          >
            Selesaikan Ride
          </Button>
        )}
      </div>
    </div>
  );
}
