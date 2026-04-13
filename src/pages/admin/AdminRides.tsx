import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserPlus, Car, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const statusColor: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  accepted: "bg-blue-100 text-blue-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function AdminRides() {
  const queryClient = useQueryClient();
  const [selectedRide, setSelectedRide] = useState<any>(null);
  const [driverName, setDriverName] = useState("");
  const [plateNumber, setPlateNumber] = useState("");

  const { data: rides, isLoading } = useQuery({
    queryKey: ["admin-rides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rides")
        .select("*, drivers(full_name, phone)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const assignDriverMutation = useMutation({
    mutationFn: async ({ rideId, name, plate }: { rideId: string; name: string; plate: string }) => {
      const { error } = await supabase
        .from("rides")
        .update({
          external_driver_name: name,
          external_driver_plate: plate,
          status: "accepted",
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", rideId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-rides"] });
      toast.success("Driver manual berhasil ditugaskan");
      setSelectedRide(null);
      setDriverName("");
      setPlateNumber("");
    },
    onError: (err: any) => {
      toast.error("Gagal menugaskan driver: " + err.message);
    },
  });

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverName || !plateNumber) {
      toast.error("Nama driver dan nomor plat wajib diisi");
      return;
    }
    if (driverName.length > 100) {
      toast.error("Nama driver maksimal 100 karakter");
      return;
    }
    if (plateNumber.length > 15) {
      toast.error("Nomor plat maksimal 15 karakter");
      return;
    }
    assignDriverMutation.mutate({
      rideId: selectedRide.id,
      name: driverName,
      plate: plateNumber.toUpperCase(),
    });
  };

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
                     <th className="pb-2 font-medium">Driver</th>
                     <th className="pb-2 font-medium">Fare</th>
                     <th className="pb-2 font-medium">Status</th>
                     <th className="pb-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rides.map((r) => (
                    <tr key={r.id} className="border-b border-border/50">
                      <td className="py-3 text-xs text-muted-foreground">{format(new Date(r.created_at), "dd MMM HH:mm")}</td>
                       <td className="py-3"><Badge variant="secondary" className="text-[10px]">{(r as any).service_type?.replace("_", " ") ?? "car"}</Badge></td>
                       <td className="py-3 text-xs truncate max-w-[200px]">{r.pickup_address ?? "—"} → {r.dropoff_address ?? "—"}</td>
                       <td className="py-3">
                         {r.drivers ? (
                           <div className="flex flex-col">
                             <span className="font-medium">{r.drivers.full_name}</span>
                             <span className="text-[10px] text-muted-foreground">{r.drivers.phone}</span>
                           </div>
                         ) : (r as any).external_driver_name ? (
                           <div className="flex flex-col">
                             <span className="font-medium text-blue-600">{(r as any).external_driver_name} (Manual)</span>
                             <span className="text-[10px] text-muted-foreground">{(r as any).external_driver_plate}</span>
                           </div>
                         ) : (
                           <span className="text-muted-foreground italic">Unassigned</span>
                         )}
                       </td>
                      <td className="py-3 font-semibold">Rp {(r.fare ?? 0).toLocaleString("id-ID")}</td>
                      <td className="py-3">
                        <Badge variant="outline" className={statusColor[r.status] ?? ""}>{r.status.replace("_", " ")}</Badge>
                      </td>
                      <td className="py-3">
                        {r.status === "pending" && (
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setSelectedRide(r)}>
                            <UserPlus className="h-4 w-4 text-primary" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedRide} onOpenChange={(open) => !open && setSelectedRide(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tugaskan Driver Manual</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAssignSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="driver_name">Nama Driver</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="driver_name"
                  placeholder="Nama Lengkap Driver"
                  className="pl-9"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  maxLength={100}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="plate_number">Nomor Plat Kendaraan</Label>
              <div className="relative">
                <Car className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="plate_number"
                  placeholder="B 1234 ABC"
                  className="pl-9"
                  value={plateNumber}
                  onChange={(e) => setPlateNumber(e.target.value)}
                  maxLength={15}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setSelectedRide(null)}>Batal</Button>
              <Button type="submit" disabled={assignDriverMutation.isPending}>
                {assignDriverMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Tugaskan Sekarang
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}