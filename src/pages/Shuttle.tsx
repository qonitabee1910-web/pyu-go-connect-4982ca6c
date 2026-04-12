import { useState } from "react";
import { Bus, Clock, MapPin, Users, ArrowRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

type Step = "routes" | "seats" | "guest_info" | "confirmation";

export default function Shuttle() {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("routes");
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [selectedScheduleFare, setSelectedScheduleFare] = useState(0);
  const [selectedScheduleSeats, setSelectedScheduleSeats] = useState(0);
  const [selectedScheduleDeparture, setSelectedScheduleDeparture] = useState("");
  const [seatCount, setSeatCount] = useState(1);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [bookingRef, setBookingRef] = useState("");
  const [booking, setBooking] = useState(false);

  // Fetch routes with schedules
  const { data: routes, isLoading } = useQuery({
    queryKey: ["shuttle-routes"],
    queryFn: async () => {
      const { data: routesData, error: rErr } = await supabase
        .from("shuttle_routes")
        .select("*")
        .eq("active", true);
      if (rErr) throw rErr;

      const { data: schedulesData, error: sErr } = await supabase
        .from("shuttle_schedules")
        .select("*")
        .eq("active", true)
        .gte("departure_time", new Date().toISOString());
      if (sErr) throw sErr;

      return routesData.map((route) => ({
        ...route,
        schedules: (schedulesData || []).filter((s) => s.route_id === route.id),
      }));
    },
  });

  const selectedRoute = routes?.find((r) => r.id === selectedRouteId);

  const handleSelectSchedule = (routeId: string, schedule: any) => {
    setSelectedRouteId(routeId);
    setSelectedScheduleId(schedule.id);
    setSelectedScheduleFare(selectedRoute?.base_fare ?? routes?.find(r => r.id === routeId)?.base_fare ?? 0);
    setSelectedScheduleSeats(schedule.available_seats);
    setSelectedScheduleDeparture(schedule.departure_time);
    setStep("seats");
  };

  const handleConfirmSeats = () => {
    setStep("guest_info");
  };

  const handleBook = async () => {
    if (!guestName || !guestPhone) {
      toast.error("Please enter your name and phone number");
      return;
    }
    setBooking(true);
    try {
      const totalFare = selectedScheduleFare * seatCount;
      const { data, error } = await supabase.from("shuttle_bookings").insert({
        schedule_id: selectedScheduleId!,
        seat_count: seatCount,
        total_fare: totalFare,
        guest_name: guestName,
        guest_phone: guestPhone,
        user_id: user?.id ?? null,
      }).select("booking_ref").single();

      if (error) throw error;
      setBookingRef(data.booking_ref);
      setStep("confirmation");
      toast.success("Booking confirmed!");
    } catch (err: any) {
      console.error("Booking failed:", err);
      toast.error("Booking failed: " + err.message);
    } finally {
      setBooking(false);
    }
  };

  const handleReset = () => {
    setStep("routes");
    setSelectedRouteId(null);
    setSelectedScheduleId(null);
    setSeatCount(1);
    setGuestName("");
    setGuestPhone("");
    setBookingRef("");
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="gradient-primary px-6 pt-10 pb-8 rounded-b-3xl">
        <h1 className="text-2xl font-extrabold text-primary-foreground mb-1">Shuttle</h1>
        <p className="text-primary-foreground/70 text-sm">Book shuttle seats — no account needed</p>
      </div>

      <div className="px-4 mt-6 space-y-4">
        {step === "routes" && isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {step === "routes" && !isLoading && (!routes || routes.length === 0) && (
          <div className="text-center py-12 text-muted-foreground">
            <Bus className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No shuttle routes available at the moment</p>
          </div>
        )}

        {step === "routes" &&
          routes?.map((route) => (
            <Card key={route.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bus className="w-5 h-5 text-secondary" />
                  {route.name}
                </CardTitle>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {route.origin} → {route.destination}
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                {route.schedules.length === 0 && (
                  <p className="text-xs text-muted-foreground py-2">No upcoming schedules</p>
                )}
                {route.schedules.map((s: any) => (
                  <button
                    key={s.id}
                    disabled={s.available_seats === 0}
                    onClick={() => handleSelectSchedule(route.id, s)}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-border hover:bg-accent/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold text-sm">
                        {format(new Date(s.departure_time), "HH:mm")}
                      </span>
                      {s.arrival_time && (
                        <>
                          <ArrowRight className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(s.arrival_time), "HH:mm")}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs flex items-center gap-1 text-muted-foreground">
                        <Users className="w-3 h-3" />
                        {s.available_seats}
                      </span>
                      <span className="font-bold text-sm text-primary">
                        Rp {route.base_fare.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          ))}

        {step === "seats" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Select Seats</CardTitle>
              <p className="text-xs text-muted-foreground">
                {selectedRoute?.name} • {format(new Date(selectedScheduleDeparture), "dd MMM yyyy, HH:mm")}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Number of seats</Label>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSeatCount(Math.max(1, seatCount - 1))}>
                    -
                  </Button>
                  <span className="font-bold w-6 text-center">{seatCount}</span>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSeatCount(Math.min(selectedScheduleSeats, seatCount + 1))}>
                    +
                  </Button>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-extrabold text-lg">Rp {(selectedScheduleFare * seatCount).toLocaleString("id-ID")}</span>
              </div>
              <Button className="w-full gradient-primary text-primary-foreground font-bold" onClick={handleConfirmSeats}>
                Continue
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "guest_info" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Passenger Info</CardTitle>
              <p className="text-xs text-muted-foreground">No account required</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gn">Full Name</Label>
                <Input id="gn" value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Your name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gp">Phone Number</Label>
                <Input id="gp" type="tel" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="+62 812..." required />
              </div>
              <Button className="w-full gradient-primary text-primary-foreground font-bold" onClick={handleBook} disabled={booking}>
                {booking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {booking ? "Booking..." : "Confirm Booking"}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "confirmation" && (
          <Card className="text-center">
            <CardContent className="pt-8 pb-6 space-y-4">
              <div className="w-16 h-16 rounded-full gradient-primary mx-auto flex items-center justify-center">
                <Check className="w-8 h-8 text-primary-foreground" />
              </div>
              <h2 className="text-xl font-extrabold">Booking Confirmed!</h2>
              <p className="text-sm text-muted-foreground">Your reference number</p>
              <p className="text-2xl font-mono font-bold text-primary">{bookingRef}</p>
              <div className="text-left bg-muted rounded-xl p-4 space-y-1 text-sm">
                <p><strong>Route:</strong> {selectedRoute?.name}</p>
                <p><strong>Departure:</strong> {format(new Date(selectedScheduleDeparture), "dd MMM yyyy, HH:mm")}</p>
                <p><strong>Seats:</strong> {seatCount}</p>
                <p><strong>Passenger:</strong> {guestName}</p>
                <p><strong>Phone:</strong> {guestPhone}</p>
                <p><strong>Total:</strong> Rp {(selectedScheduleFare * seatCount).toLocaleString("id-ID")}</p>
              </div>
              <Button variant="outline" className="w-full" onClick={handleReset}>
                Book Another
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}