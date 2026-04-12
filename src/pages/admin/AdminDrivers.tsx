import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, ShieldCheck, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const statusStyle: Record<string, string> = {
  available: "text-green-600 border-green-300",
  busy: "text-blue-600 border-blue-300",
  offline: "text-muted-foreground",
};

export default function AdminDrivers() {
  const queryClient = useQueryClient();
  const { data: drivers, isLoading } = useQuery({
    queryKey: ["admin-drivers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("drivers").select("*, vehicles(plate_number, model, vehicle_type)").order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ id, verified }: { id: string; verified: boolean }) => {
      const { error } = await (supabase.from("drivers") as any).update({ is_verified: verified }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-drivers"] });
      toast.success("Driver verification updated");
    },
    onError: (err: any) => {
      toast.error("Failed to update verification: " + err.message);
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
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-bold text-sm">{d.full_name}</p>
                    {d.is_verified ? (
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {d.phone} • ★ {Number(d.rating).toFixed(1)}
                    {d.vehicles && (d.vehicles as any) && ` • ${(d.vehicles as any).model ?? (d.vehicles as any).plate_number}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!d.is_verified && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-7 text-[10px] border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                      onClick={() => verifyMutation.mutate({ id: d.id, verified: true })}
                      disabled={verifyMutation.isPending}
                    >
                      Verify
                    </Button>
                  )}
                  <Badge variant="outline" className={statusStyle[d.status] ?? ""}>
                    {d.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}