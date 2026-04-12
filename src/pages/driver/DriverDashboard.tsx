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
import { Badge } from "@/components/ui/badge";
import { Can } from "@/hooks/useRBAC";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import { Car, DollarSign, Star, ShieldCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

L.Icon.Default.mergeOptions({ iconUrl, shadowUrl });

export default function DriverDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isOnline, setOnline, setDriverId, driverId, currentRideId } = useDriverStore();

  // Fetch driver profile
  const { data: driver, isLoading: driverLoading } = useQuery({
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

  // Fetch vehicles separately
  const { data: vehicles = [] } = useQuery({
    queryKey: ["driver-vehicles", driverId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("driver_id", driverId!);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!driverId,
  });

  const updateVehicleMutation = useMutation({
    mutationFn: async (vehicleId: string) => {
      const { error } = await (supabase
        .from("drivers") as any)
        .update({ current_vehicle_id: vehicleId })
        .eq("id", driverId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-profile"] });
      toast.success("Kendaraan aktif diperbarui");
    },
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

  if (driverLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Memuat...</p>
      </div>
    );
  }

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
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="font-bold text-lg">{driver.full_name}</p>
                {driver.is_verified ? (
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 flex gap-1 px-1.5 py-0">
                    <ShieldCheck className="w-3 h-3" /> <span className="text-[10px]">Verified</span>
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 flex gap-1 px-1.5 py-0">
                    <ShieldAlert className="w-3 h-3" /> <span className="text-[10px]">Pending</span>
                  </Badge>
                )}
              </div>
              <p className={`text-sm font-medium ${isOnline ? "text-emerald-600" : "text-muted-foreground"}`}>
                {isOnline ? "🟢 Online" : "⚫ Offline"}
              </p>
            </div>
            <Can perform="driver:status:toggle">
              <Switch
                checked={isOnline}
                onCheckedChange={(checked) => toggleMutation.mutate(checked)}
                disabled={toggleMutation.isPending}
                className="data-[state=checked]:bg-emerald-500"
              />
            </Can>
          </CardContent>
        </Card>
      </div>

      {/* Vehicle Selection */}
      <div className="px-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <Car className="w-4 h-4" /> Kendaraan Aktif
            </div>
            <Select 
              value={driver.current_vehicle_id || ""} 
              onValueChange={(val) => updateVehicleMutation.mutate(val)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih Kendaraan" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.length > 0 ? (
                  vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.model} ({v.plate_number}) - {v.vehicle_type}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>Belum ada kendaraan terdaftar</SelectItem>
                )}
              </SelectContent>
            </Select>
            {!driver.current_vehicle_id && (
              <p className="text-[10px] text-amber-600 font-medium">
                * Pilih kendaraan untuk mulai menerima order
              </p>
            )}
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
