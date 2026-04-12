import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, Bus, Users, DollarSign, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export default function AdminOverview() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [ridesRes, bookingsRes, usersRes, revenueRes] = await Promise.all([
        supabase.from("rides").select("*", { count: "exact", head: true }).in("status", ["pending", "accepted", "in_progress"]),
        supabase.from("shuttle_bookings").select("*", { count: "exact", head: true }).eq("status", "confirmed"),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("rides").select("fare").eq("status", "completed"),
      ]);
      const totalRevenue = (revenueRes.data ?? []).reduce((sum, r) => sum + (Number(r.fare) || 0), 0);
      return {
        activeRides: ridesRes.count ?? 0,
        shuttleBookings: bookingsRes.count ?? 0,
        users: usersRes.count ?? 0,
        revenue: totalRevenue,
      };
    },
  });

  const { data: recentRides, isLoading: ridesLoading } = useQuery({
    queryKey: ["admin-recent-rides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rides")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const cards = [
    { label: "Active Rides", value: stats?.activeRides ?? "—", icon: Car, color: "text-primary" },
    { label: "Shuttle Bookings", value: stats?.shuttleBookings ?? "—", icon: Bus, color: "text-secondary" },
    { label: "Users", value: stats?.users ?? "—", icon: Users, color: "text-accent-foreground" },
    { label: "Revenue", value: stats ? `Rp ${stats.revenue.toLocaleString("id-ID")}` : "—", icon: DollarSign, color: "text-primary" },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Dashboard Overview</h2>
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {cards.map((s) => (
            <Card key={s.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground font-medium">{s.label}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-3">
                <s.icon className={`w-8 h-8 ${s.color}`} />
                <span className="text-2xl font-extrabold">{s.value}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent Rides</CardTitle>
        </CardHeader>
        <CardContent>
          {ridesLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          ) : !recentRides?.length ? (
            <p className="text-sm text-muted-foreground">No rides yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Route</th>
                    <th className="pb-2 font-medium">Fare</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRides.map((r) => (
                    <tr key={r.id} className="border-b border-border/50">
                      <td className="py-2 text-xs truncate max-w-[200px]">{r.pickup_address ?? "—"} → {r.dropoff_address ?? "—"}</td>
                      <td className="py-2 font-semibold text-xs">Rp {(r.fare ?? 0).toLocaleString("id-ID")}</td>
                      <td className="py-2 capitalize text-xs">{r.status.replace("_", " ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}