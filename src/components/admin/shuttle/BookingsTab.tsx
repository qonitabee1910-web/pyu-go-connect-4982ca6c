import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus, User, Car } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import ShuttleTicket from "@/components/shuttle/ShuttleTicket";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function BookingsTab() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("all");
  const [ticketBooking, setTicketBooking] = useState<any>(null);
  const [assignBooking, setAssignBooking] = useState<any>(null);
  const [driverName, setDriverName] = useState("");
  const [plateNumber, setPlateNumber] = useState("");

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["admin-shuttle-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shuttle_bookings")
        .select("*, shuttle_schedules(departure_time, shuttle_routes(name, origin, destination)), shuttle_pickup_points(name, rayon:shuttle_rayons(name))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const assignDriverMutation = useMutation({
    mutationFn: async ({ bookingId, name, plate }: { bookingId: string; name: string; plate: string }) => {
      const { error } = await supabase
        .from("shuttle_bookings")
        .update({
          pickup_driver_name: name,
          pickup_driver_plate: plate,
          pickup_status: "assigned",
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", bookingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-shuttle-bookings"] });
      toast.success("Driver penjemput berhasil ditugaskan");
      setAssignBooking(null);
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
    assignDriverMutation.mutate({
      bookingId: assignBooking.id,
      name: driverName,
      plate: plateNumber.toUpperCase(),
    });
  };

  const filtered = bookings?.filter((b: any) => filter === "all" || b.payment_status === filter) ?? [];

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {["all", "paid", "pending", "unpaid"].map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="text-xs capitalize">
            {f === "all" ? "Semua" : f}
          </Button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Tidak ada booking.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((b: any) => {
            const route = b.shuttle_schedules?.shuttle_routes;
            return (
              <Card key={b.id}>
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-mono font-bold text-xs text-primary">{b.booking_ref}</p>
                    <p className="text-xs text-muted-foreground font-medium">{b.guest_name} • {b.seat_count} kursi</p>
                    <p className="text-xs text-muted-foreground">{route?.name ?? "-"}</p>
                    {b.shuttle_pickup_points ? (
                      <p className="text-xs text-muted-foreground">
                        📍 {b.shuttle_pickup_points.name} ({b.shuttle_pickup_points.rayon?.name})
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Base Route</p>
                    )}
                    {b.pickup_driver_name && (
                      <div className="mt-1 flex items-center gap-2 text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full w-fit">
                        <Car className="w-3 h-3" />
                        <span>{b.pickup_driver_name} • {b.pickup_driver_plate}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={b.payment_status === "paid" ? "default" : "outline"} className="text-xs">{b.payment_status}</Badge>
                    <div className="flex flex-col gap-1">
                      <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => setTicketBooking(b)}>Tiket</Button>
                      {b.payment_status === "paid" && !b.pickup_driver_name && (
                        <Button size="sm" variant="outline" className="h-7 text-[10px] text-primary border-primary/20" onClick={() => setAssignBooking(b)}>
                          <UserPlus className="w-3 h-3 mr-1" /> Jemput
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Ticket Dialog */}
      <Dialog open={!!ticketBooking} onOpenChange={() => setTicketBooking(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Tiket Shuttle</DialogTitle>
            <DialogDescription>
              Detail tiket untuk referensi booking {ticketBooking?.booking_ref}.
            </DialogDescription>
          </DialogHeader>
          {ticketBooking && (
            <ShuttleTicket
              bookingRef={ticketBooking.booking_ref}
              routeName={ticketBooking.shuttle_schedules?.shuttle_routes?.name ?? ""}
              origin={ticketBooking.shuttle_schedules?.shuttle_routes?.origin ?? ""}
              destination={ticketBooking.shuttle_schedules?.shuttle_routes?.destination ?? ""}
              departure={ticketBooking.shuttle_schedules?.departure_time ? format(new Date(ticketBooking.shuttle_schedules.departure_time), "dd MMM yyyy, HH:mm") : ""}
              seatCount={ticketBooking.seat_count}
              guestName={ticketBooking.guest_name ?? ""}
              guestPhone={ticketBooking.guest_phone ?? ""}
              totalFare={ticketBooking.total_fare}
              paymentStatus={ticketBooking.payment_status}
              pickupPointName={ticketBooking.shuttle_pickup_points?.name}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Pickup Driver Dialog */}
      <Dialog open={!!assignBooking} onOpenChange={(open) => !open && setAssignBooking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tugaskan Driver Penjemput</DialogTitle>
            <DialogDescription>
              Detail penjemputan untuk {assignBooking?.guest_name} ({assignBooking?.booking_ref})
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAssignSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="shuttle_driver_name">Nama Driver</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="shuttle_driver_name"
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
              <Label htmlFor="shuttle_plate_number">Nomor Plat Kendaraan</Label>
              <div className="relative">
                <Car className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="shuttle_plate_number"
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
              <Button type="button" variant="ghost" onClick={() => setAssignBooking(null)}>Batal</Button>
              <Button type="submit" disabled={assignDriverMutation.isPending} className="gradient-primary text-white">
                {assignDriverMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Tugaskan Penjemputan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
