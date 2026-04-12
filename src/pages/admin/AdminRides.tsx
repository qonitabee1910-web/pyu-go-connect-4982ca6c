import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

const statusColor: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  accepted: "bg-blue-100 text-blue-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function AdminRides() {
  const { data: rides, isLoading } = useQuery({
    queryKey: ["admin-rides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rides")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Ride Management</h2>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">All Rides</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : !rides?.length ? (
            <p className="text-sm text-muted-foreground">No rides found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                     <th className="pb-2 font-medium">Date</th>
                     <th className="pb-2 font-medium">Service</th>
                     <th className="pb-2 font-medium">Route</th>
                     <th className="pb-2 font-medium">Fare</th>
                     <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rides.map((r) => (
                    <tr key={r.id} className="border-b border-border/50">
                      <td className="py-3 text-xs text-muted-foreground">{format(new Date(r.created_at), "dd MMM HH:mm")}</td>
                       <td className="py-3"><Badge variant="secondary" className="text-[10px]">{(r as any).service_type?.replace("_", " ") ?? "car"}</Badge></td>
                       <td className="py-3 text-xs truncate max-w-[200px]">{r.pickup_address ?? "—"} → {r.dropoff_address ?? "—"}</td>
                      <td className="py-3 font-semibold">Rp {(r.fare ?? 0).toLocaleString("id-ID")}</td>
                      <td className="py-3">
                        <Badge variant="outline" className={statusColor[r.status] ?? ""}>{r.status.replace("_", " ")}</Badge>
                      </td>
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