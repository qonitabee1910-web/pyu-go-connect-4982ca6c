import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useDriverStore } from "@/stores/driverStore";
import { useDriverLocation } from "@/hooks/useDriverLocation";
import { useIncomingRide } from "@/hooks/useIncomingRide";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import { Car, DollarSign, Star } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({ iconUrl, shadowUrl });

export default function DriverDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isOnline, setOnline, setDriverId, driverId, currentRideId } = useDriverStore();

  // Fetch driver profile
  const { data: driver } = useQuery({
    queryKey: ["driver-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (driver) {
      setDriverId(driver.id);
      setOnline(driver.status === "available" || driver.status === "busy");
    }
  }, [driver, setDriverId, setOnline]);

  // Today's stats
  const { data: todayStats } = useQuery({
    queryKey: ["driver-today-stats", driverId],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("driver_earnings")
        .select("gross_fare, net_earning")
        .eq("driver_id", driverId!)
        .gte("created_at", today);
      if (error) throw error;
      const totalEarning = data?.reduce((s, e) => s + Number(e.net_earning), 0) ?? 0;
      return { rides: data?.length ?? 0, earning: totalEarning };
    },
    enabled: !!driverId,
  });

  useDriverLocation();
  useIncomingRide();

  // Navigate to active ride if one is set
  useEffect(() => {
    if (currentRideId) navigate("/driver/ride");
  }, [currentRideId, navigate]);

  // Toggle online/offline
  const toggleMutation = useMutation({
    mutationFn: async (online: boolean) => {
      const newStatus = online ? "available" : "offline";
      await supabase.from("drivers").update({ status: newStatus }).eq("id", driverId!);
    },
    onSuccess: (_, online) => {
      setOnline(online);
      queryClient.invalidateQueries({ queryKey: ["driver-profile"] });
    },
  });

  if (!driver) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Akun driver tidak ditemukan.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status toggle */}
      <div className="px-4 pt-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="font-bold text-lg">{driver.full_name}</p>
              <p className={`text-sm font-medium ${isOnline ? "text-emerald-600" : "text-muted-foreground"}`}>
                {isOnline ? "🟢 Online" : "⚫ Offline"}
              </p>
            </div>
            <Switch
              checked={isOnline}
              onCheckedChange={(v) => toggleMutation.mutate(v)}
              className="data-[state=checked]:bg-emerald-600"
            />
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="px-4 grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <Car className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
            <p className="text-xl font-bold">{todayStats?.rides ?? 0}</p>
            <p className="text-[10px] text-muted-foreground">Rides Hari Ini</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <DollarSign className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
            <p className="text-xl font-bold">
              {new Intl.NumberFormat("id-ID").format(todayStats?.earning ?? 0)}
            </p>
            <p className="text-[10px] text-muted-foreground">Pendapatan</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Star className="w-5 h-5 mx-auto text-yellow-500 mb-1" />
            <p className="text-xl font-bold">{Number(driver.rating ?? 5).toFixed(1)}</p>
            <p className="text-[10px] text-muted-foreground">Rating</p>
          </CardContent>
        </Card>
      </div>

      {/* Map */}
      <div className="px-4">
        <Card className="overflow-hidden">
          <div className="h-64">
            <MapContainer
              center={[driver.current_lat ?? -7.43, driver.current_lng ?? 109.24]}
              zoom={14}
              className="h-full w-full"
              zoomControl={false}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {driver.current_lat && driver.current_lng && (
                <Marker position={[driver.current_lat, driver.current_lng]} />
              )}
            </MapContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
