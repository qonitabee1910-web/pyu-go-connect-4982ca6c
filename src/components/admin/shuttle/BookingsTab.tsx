import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import ShuttleTicket from "@/components/shuttle/ShuttleTicket";

export default function BookingsTab() {
  const [filter, setFilter] = useState<string>("all");
  const [ticketBooking, setTicketBooking] = useState<any>(null);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["admin-shuttle-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shuttle_bookings")
        .select("*, shuttle_schedules!inner(departure_time, route_id, shuttle_routes:route_id(name, origin, destination)), shuttle_pickup_points(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

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
                  <div>
                    <p className="font-mono font-bold text-xs text-primary">{b.booking_ref}</p>
                    <p className="text-xs text-muted-foreground">{b.guest_name} • {b.seat_count} kursi</p>
                    <p className="text-xs text-muted-foreground">{route?.name ?? "-"}</p>
                    {b.shuttle_pickup_points?.name && <p className="text-xs text-muted-foreground">📍 {b.shuttle_pickup_points.name}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={b.payment_status === "paid" ? "default" : "outline"} className="text-xs">{b.payment_status}</Badge>
                    <Button size="sm" variant="ghost" className="text-xs" onClick={() => setTicketBooking(b)}>Tiket</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <Dialog open={!!ticketBooking} onOpenChange={() => setTicketBooking(null)}>
        <DialogContent className="max-w-sm">
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
    </div>
  );
}
