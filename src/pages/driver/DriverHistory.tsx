import { useDriverStore } from "@/stores/driverStore";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Clock } from "lucide-react";

export default function DriverHistory() {
  const { driverId } = useDriverStore();

  const { data: rides, isLoading } = useQuery({
    queryKey: ["driver-ride-history", driverId],
    queryFn: async () => {
      // Get driver record to find driver_id in rides
      const { data: driver } = await supabase
        .from("drivers")
        .select("id")
        .eq("id", driverId!)
        .single();
      if (!driver) return [];

      const { data, error } = await supabase
        .from("rides")
        .select("*")
        .eq("driver_id", driver.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!driverId,
  });

  const fmt = (n: number) => new Intl.NumberFormat("id-ID").format(n);

  if (isLoading) return <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Memuat...</div>;

  return (
    <div className="px-4 pt-4 space-y-3">
      <h2 className="font-bold text-lg">Riwayat Ride</h2>
      {!rides?.length && <p className="text-sm text-muted-foreground">Belum ada riwayat ride.</p>}
      {rides?.map((r) => (
        <Card key={r.id}>
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {new Date(r.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
              </div>
              <span className="font-bold text-sm">Rp {fmt(Number(r.fare ?? 0))}</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-start gap-1.5">
                <MapPin className="w-3 h-3 text-emerald-600 mt-0.5 shrink-0" />
                <span className="line-clamp-1">{r.pickup_address || "Lokasi pickup"}</span>
              </div>
              <div className="flex items-start gap-1.5">
                <MapPin className="w-3 h-3 text-red-500 mt-0.5 shrink-0" />
                <span className="line-clamp-1">{r.dropoff_address || "Lokasi tujuan"}</span>
              </div>
            </div>
            {r.distance_km && (
              <p className="text-[10px] text-muted-foreground">{Number(r.distance_km).toFixed(1)} km</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
