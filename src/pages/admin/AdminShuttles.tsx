import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export default function AdminShuttles() {
  const { data: routes, isLoading } = useQuery({
    queryKey: ["admin-shuttle-routes"],
    queryFn: async () => {
      const { data: routesData, error: rErr } = await supabase.from("shuttle_routes").select("*").order("name");
      if (rErr) throw rErr;

      const { data: schedulesData } = await supabase.from("shuttle_schedules").select("route_id");
      const { data: bookingsData } = await supabase.from("shuttle_bookings").select("schedule_id, shuttle_schedules!inner(route_id)").eq("status", "confirmed");

      return routesData.map((r) => ({
        ...r,
        scheduleCount: (schedulesData ?? []).filter((s) => s.route_id === r.id).length,
        bookingCount: (bookingsData ?? []).filter((b: any) => b.shuttle_schedules?.route_id === r.id).length,
      }));
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Shuttle Management</h2>
        <Button size="sm" className="gradient-primary text-primary-foreground">
          <Plus className="w-4 h-4 mr-1" /> Add Route
        </Button>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : !routes?.length ? (
        <p className="text-sm text-muted-foreground">No shuttle routes yet.</p>
      ) : (
        <div className="space-y-3">
          {routes.map((r) => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{r.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{r.origin} → {r.destination}</p>
              </CardHeader>
              <CardContent className="flex gap-4 text-sm text-muted-foreground">
                <span>{r.scheduleCount} schedules</span>
                <span>{r.bookingCount} bookings</span>
                <span>Rp {r.base_fare.toLocaleString("id-ID")}/seat</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}