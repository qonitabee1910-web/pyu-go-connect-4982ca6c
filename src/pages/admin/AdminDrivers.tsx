import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const statusStyle: Record<string, string> = {
  available: "text-green-600 border-green-300",
  busy: "text-blue-600 border-blue-300",
  offline: "text-muted-foreground",
};

export default function AdminDrivers() {
  const { data: drivers, isLoading } = useQuery({
    queryKey: ["admin-drivers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("drivers").select("*, vehicles(plate_number, model, vehicle_type)").order("full_name");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Driver Management</h2>
        <Button size="sm" className="gradient-primary text-primary-foreground">
          <Plus className="w-4 h-4 mr-1" /> Add Driver
        </Button>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : !drivers?.length ? (
        <p className="text-sm text-muted-foreground">No drivers registered yet.</p>
      ) : (
        <div className="space-y-3">
          {drivers.map((d) => (
            <Card key={d.id}>
              <CardContent className="flex items-center justify-between pt-4">
                <div>
                  <p className="font-bold text-sm">{d.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.phone} • ★ {Number(d.rating).toFixed(1)}
                    {d.vehicles && (d.vehicles as any[]).length > 0 && ` • ${(d.vehicles as any[])[0].model ?? (d.vehicles as any[])[0].plate_number}`}
                  </p>
                </div>
                <Badge variant="outline" className={statusStyle[d.status] ?? ""}>
                  {d.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}