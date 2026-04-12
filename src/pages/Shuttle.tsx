import { useState } from "react";
import { Bus, Clock, MapPin, Users, ArrowRight, Loader2, Banknote, CreditCard, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { format, isSameDay } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { cn } from "@/lib/utils";
import ShuttleTicket from "@/components/shuttle/ShuttleTicket";

type Step = "routes" | "date" | "schedule" | "pickup" | "seats" | "guest_info" | "payment" | "confirmation";

export default function Shuttle() {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("routes");
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [selectedScheduleFare, setSelectedScheduleFare] = useState(0);
  const [selectedScheduleSeats, setSelectedScheduleSeats] = useState(0);
  const [selectedScheduleDeparture, setSelectedScheduleDeparture] = useState("");
  const [selectedPickupPoint, setSelectedPickupPoint] = useState<any>(null);
  const [selectedRayonId, setSelectedRayonId] = useState<string | null>(null);
  const [seatCount, setSeatCount] = useState(1);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [bookingRef, setBookingRef] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [booking, setBooking] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [paymentStatus, setPaymentStatus] = useState("unpaid");
  const [processingPayment, setProcessingPayment] = useState(false);

  const { data: routes, isLoading } = useQuery({
    queryKey: ["shuttle-routes"],
    queryFn: async () => {
      const { data: routesData, error: rErr } = await supabase.from("shuttle_routes").select("*").eq("active", true);
      if (rErr) throw rErr;
      const { data: schedulesData, error: sErr } = await supabase.from("shuttle_schedules").select("*").eq("active", true).gte("departure_time", new Date().toISOString());
      if (sErr) throw sErr;
      return routesData.map((route) => ({
        ...route,
        schedules: (schedulesData || []).filter((s) => s.route_id === route.id),
      }));
    },
  });

  const { data: rayons } = useQuery({
    queryKey: ["shuttle-rayons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("shuttle_rayons").select("*").eq("active", true).order("name");
      if (error) throw error;
      const { data: points } = await supabase.from("shuttle_pickup_points").select("*").eq("active", true).order("stop_order");
      return data.map((r) => ({ ...r, pickup_points: (points ?? []).filter((p) => p.rayon_id === r.id) }));
    },
  });

  const selectedRoute = routes?.find((r) => r.id === selectedRouteId);

  // Get unique dates for the selected route
  const availableDates = selectedRoute?.schedules.map((s: any) => new Date(s.departure_time)) ?? [];

  // Get schedules for selected route + date
  const filteredSchedules = selectedRoute?.schedules.filter((s: any) =>
    selectedDate && isSameDay(new Date(s.departure_time), selectedDate)
  ) ?? [];

  const handleSelectRoute = (routeId: string) => {
    setSelectedRouteId(routeId);
    setSelectedDate(undefined);
    setStep("date");
  };

  const handleSelectDate = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
    setStep("schedule");
  };

  const handleSelectSchedule = (schedule: any) => {
    setSelectedScheduleId(schedule.id);
    setSelectedScheduleFare(selectedRoute?.base_fare ?? 0);
    setSelectedScheduleSeats(schedule.available_seats);
    setSelectedScheduleDeparture(schedule.departure_time);
    if (rayons && rayons.length > 0) {
      setStep("pickup");
    } else {
      setStep("seats");
    }
  };

  const handleSelectPickupPoint = (rayon: any, point: any) => {
    setSelectedRayonId(rayon.id);
    setSelectedPickupPoint(point);
    setSelectedScheduleFare(Number(point.fare));
    setStep("seats");
  };

  const handleConfirmSeats = () => setStep("guest_info");

  const handleGuestInfoNext = () => {
    if (!guestName || !guestPhone) { toast.error("Masukkan nama dan nomor HP"); return; }
    setStep("payment");
  };

  const totalFare = selectedScheduleFare * seatCount;

  const createBooking = async (pMethod: string, pStatus: string) => {
    const { data, error } = await supabase.from("shuttle_bookings").insert({
      schedule_id: selectedScheduleId!,
      seat_count: seatCount,
      total_fare: totalFare,
      guest_name: guestName,
      guest_phone: guestPhone,
      user_id: user?.id ?? null,
      payment_method: pMethod,
      payment_status: pStatus,
      rayon_id: selectedRayonId,
      pickup_point_id: selectedPickupPoint?.id ?? null,
    } as any).select("booking_ref, id").single();
    if (error) throw error;
    return data;
  };

  const handlePayCash = async () => {
    setBooking(true);
    try {
      const data = await createBooking("cash", "unpaid");
      setBookingRef(data.booking_ref);
      setBookingId(data.id);
      setPaymentMethod("cash");
      setPaymentStatus("unpaid");
      setStep("confirmation");
      toast.success("Booking dikonfirmasi!");
    } catch (err: any) {
      toast.error("Booking gagal: " + err.message);
    } finally {
      setBooking(false);
    }
  };

  const handlePayOnline = async (gateway: "midtrans" | "xendit") => {
    setProcessingPayment(true);
    try {
      const bookingData = await createBooking(gateway, "pending");
      setBookingRef(bookingData.booking_ref);
      setBookingId(bookingData.id);
      setPaymentMethod(gateway);
      const { data: payData, error: payErr } = await supabase.functions.invoke("create-shuttle-payment", { body: { booking_id: bookingData.id, gateway } });
      if (payErr) throw payErr;
      if (gateway === "midtrans" && payData?.token) {
        const script = document.createElement("script");
        script.src = "https://app.sandbox.midtrans.com/snap/snap.js";
        script.setAttribute("data-client-key", "");
        document.body.appendChild(script);
        script.onload = () => {
          (window as any).snap.pay(payData.token, {
            onSuccess: () => { setPaymentStatus("paid"); setStep("confirmation"); toast.success("Pembayaran berhasil!"); },
            onPending: () => { setPaymentStatus("pending"); setStep("confirmation"); toast.info("Menunggu pembayaran..."); },
            onError: () => { setPaymentStatus("unpaid"); setStep("confirmation"); toast.error("Pembayaran gagal"); },
            onClose: () => { setPaymentStatus("pending"); setStep("confirmation"); },
          });
        };
      } else if (gateway === "xendit" && payData?.invoice_url) {
        window.open(payData.invoice_url, "_blank");
        setPaymentStatus("pending");
        setStep("confirmation");
        toast.info("Selesaikan pembayaran di halaman Xendit");
      } else {
        setPaymentStatus("pending");
        setStep("confirmation");
      }
    } catch (err: any) {
      toast.error("Pembayaran gagal: " + err.message);
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleReset = () => {
    setStep("routes");
    setSelectedRouteId(null);
    setSelectedDate(undefined);
    setSelectedScheduleId(null);
    setSelectedPickupPoint(null);
    setSelectedRayonId(null);
    setSeatCount(1);
    setGuestName("");
    setGuestPhone("");
    setBookingRef("");
    setBookingId("");
    setPaymentMethod("cash");
    setPaymentStatus("unpaid");
  };

  const goBack = () => {
    if (step === "date") setStep("routes");
    else if (step === "schedule") setStep("date");
    else if (step === "pickup") setStep("schedule");
    else if (step === "seats") setStep(rayons && rayons.length > 0 ? "pickup" : "schedule");
    else if (step === "guest_info") setStep("seats");
    else if (step === "payment") setStep("guest_info");
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="gradient-primary px-6 pt-10 pb-8 rounded-b-3xl">
        <h1 className="text-2xl font-extrabold text-primary-foreground mb-1">Shuttle</h1>
        <p className="text-primary-foreground/70 text-sm">Pesan kursi shuttle — tanpa perlu akun</p>
      </div>

      <div className="px-4 mt-6 space-y-4">
        {/* STEP 1: ROUTES */}
        {step === "routes" && isLoading && (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        )}
        {step === "routes" && !isLoading && (!routes || routes.length === 0) && (
          <div className="text-center py-12 text-muted-foreground">
            <Bus className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Belum ada rute shuttle tersedia</p>
          </div>
        )}
        {step === "routes" && routes?.map((route) => (
          <Card key={route.id} className="overflow-hidden cursor-pointer hover:border-primary transition-colors" onClick={() => handleSelectRoute(route.id)}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Bus className="w-5 h-5 text-secondary" />{route.name}
              </CardTitle>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />{route.origin} → {route.destination}
              </p>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{route.schedules.length} jadwal tersedia</span>
              <span className="font-bold text-sm text-primary">Rp {route.base_fare.toLocaleString("id-ID")}/kursi</span>
            </CardContent>
          </Card>
        ))}

        {/* STEP 2: DATE */}
        {step === "date" && (
          <div className="space-y-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pilih Tanggal</CardTitle>
                <p className="text-xs text-muted-foreground">{selectedRoute?.name} • {selectedRoute?.origin} → {selectedRoute?.destination}</p>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleSelectDate}
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date < today;
                  }}
                  modifiers={{
                    hasSchedule: availableDates,
                  }}
                  modifiersClassNames={{
                    hasSchedule: "bg-primary/20 font-bold",
                  }}
                  className={cn("p-3 pointer-events-auto")}
                />
              </CardContent>
            </Card>
            <Button variant="outline" className="w-full" onClick={goBack}>Kembali</Button>
          </div>
        )}

        {/* STEP 3: SCHEDULE */}
        {step === "schedule" && (
          <div className="space-y-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pilih Jadwal</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {selectedRoute?.name} • {selectedDate && format(selectedDate, "dd MMMM yyyy", { locale: localeId })}
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                {filteredSchedules.length === 0 && <p className="text-xs text-muted-foreground py-2">Tidak ada jadwal untuk tanggal ini</p>}
                {filteredSchedules.map((s: any) => (
                  <button key={s.id} disabled={s.available_seats === 0} onClick={() => handleSelectSchedule(s)}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-border hover:bg-accent/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold text-sm">{format(new Date(s.departure_time), "HH:mm")}</span>
                      {s.arrival_time && (<><ArrowRight className="w-3 h-3 text-muted-foreground" /><span className="text-sm text-muted-foreground">{format(new Date(s.arrival_time), "HH:mm")}</span></>)}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs flex items-center gap-1 text-muted-foreground"><Users className="w-3 h-3" />{s.available_seats} kursi</span>
                      <span className="font-bold text-sm text-primary">Rp {(selectedRoute?.base_fare ?? 0).toLocaleString("id-ID")}</span>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
            <Button variant="outline" className="w-full" onClick={goBack}>Kembali</Button>
          </div>
        )}

        {/* PICKUP POINT SELECTION */}
        {step === "pickup" && (
          <div className="space-y-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pilih Titik Jemput</CardTitle>
                <p className="text-xs text-muted-foreground">{selectedRoute?.name} • {format(new Date(selectedScheduleDeparture), "dd MMM yyyy, HH:mm")}</p>
              </CardHeader>
            </Card>
            {rayons?.map((rayon) => (
              <Card key={rayon.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{rayon.name}</CardTitle>
                  {rayon.description && <p className="text-xs text-muted-foreground">{rayon.description}</p>}
                </CardHeader>
                <CardContent className="space-y-1">
                  {rayon.pickup_points.map((p: any) => (
                    <button key={p.id} onClick={() => handleSelectPickupPoint(rayon, p)}
                      className="w-full flex items-center justify-between p-3 rounded-xl border border-border hover:bg-accent/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-primary w-6">J{p.stop_order}</span>
                        <div>
                          <p className="text-sm font-medium text-left">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.departure_time ? `${p.departure_time} WIB` : ""} • {p.distance_meters}m</p>
                        </div>
                      </div>
                      <span className="font-bold text-sm text-primary">Rp {Number(p.fare).toLocaleString("id-ID")}</span>
                    </button>
                  ))}
                </CardContent>
              </Card>
            ))}
            <Button variant="outline" className="w-full" onClick={goBack}>Kembali</Button>
          </div>
        )}

        {/* SEATS */}
        {step === "seats" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pilih Kursi</CardTitle>
              <p className="text-xs text-muted-foreground">
                {selectedRoute?.name} • {format(new Date(selectedScheduleDeparture), "dd MMM yyyy, HH:mm")}
                {selectedPickupPoint && ` • 📍 ${selectedPickupPoint.name}`}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Jumlah kursi</Label>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSeatCount(Math.max(1, seatCount - 1))}>-</Button>
                  <span className="font-bold w-6 text-center">{seatCount}</span>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSeatCount(Math.min(selectedScheduleSeats, seatCount + 1))}>+</Button>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-extrabold text-lg">Rp {totalFare.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={goBack}>Kembali</Button>
                <Button className="flex-1 gradient-primary text-primary-foreground font-bold" onClick={handleConfirmSeats}>Lanjut</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* GUEST INFO */}
        {step === "guest_info" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Info Penumpang</CardTitle>
              <p className="text-xs text-muted-foreground">Tidak perlu akun</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gn">Nama Lengkap</Label>
                <Input id="gn" value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Nama Anda" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gp">Nomor HP</Label>
                <Input id="gp" type="tel" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="+62 812..." />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={goBack}>Kembali</Button>
                <Button className="flex-1 gradient-primary text-primary-foreground font-bold" onClick={handleGuestInfoNext}>Lanjut ke Pembayaran</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* PAYMENT */}
        {step === "payment" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pembayaran</CardTitle>
              <p className="text-xs text-muted-foreground">{selectedRoute?.name} • {seatCount} kursi • Rp {totalFare.toLocaleString("id-ID")}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <button onClick={handlePayCash} disabled={booking || processingPayment}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary transition-colors">
                <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center"><Banknote className="w-6 h-6 text-primary" /></div>
                <div className="text-left"><p className="font-bold text-sm">Bayar Tunai</p><p className="text-xs text-muted-foreground">Bayar langsung saat naik</p></div>
              </button>
              <button onClick={() => handlePayOnline("midtrans")} disabled={booking || processingPayment}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary transition-colors">
                <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center"><CreditCard className="w-6 h-6 text-secondary" /></div>
                <div className="text-left"><p className="font-bold text-sm">Midtrans</p><p className="text-xs text-muted-foreground">GoPay, VA, Kartu Kredit</p></div>
              </button>
              <button onClick={() => handlePayOnline("xendit")} disabled={booking || processingPayment}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary transition-colors">
                <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center"><CreditCard className="w-6 h-6 text-secondary" /></div>
                <div className="text-left"><p className="font-bold text-sm">Xendit</p><p className="text-xs text-muted-foreground">OVO, DANA, Transfer Bank</p></div>
              </button>
              {(booking || processingPayment) && <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}
              <Button variant="outline" className="w-full" onClick={goBack}>Kembali</Button>
            </CardContent>
          </Card>
        )}

        {/* CONFIRMATION */}
        {step === "confirmation" && (
          <div className="space-y-4">
            <ShuttleTicket
              bookingRef={bookingRef}
              routeName={selectedRoute?.name ?? ""}
              origin={selectedRoute?.origin ?? ""}
              destination={selectedRoute?.destination ?? ""}
              departure={format(new Date(selectedScheduleDeparture), "dd MMM yyyy, HH:mm")}
              seatCount={seatCount}
              guestName={guestName}
              guestPhone={guestPhone}
              totalFare={totalFare}
              paymentStatus={paymentStatus}
              pickupPointName={selectedPickupPoint?.name}
            />
            <Button variant="outline" className="w-full" onClick={handleReset}>Pesan Lagi</Button>
          </div>
        )}
      </div>
    </div>
  );
}
