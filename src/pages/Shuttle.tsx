import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bus, Clock, MapPin, Users, ArrowRight, Loader2, Banknote, CreditCard, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { SeatLayout, SeatInfo } from "@/components/shuttle/SeatLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Step = "routes" | "date" | "service" | "schedule" | "pickup" | "seats" | "guest_info" | "payment" | "confirmation";

export default function Shuttle() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("booking");
  const [step, setStep] = useState<Step>("routes");
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedServiceTypeId, setSelectedServiceTypeId] = useState<string | null>(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [selectedScheduleFare, setSelectedScheduleFare] = useState(0);
  const [selectedScheduleSeats, setSelectedScheduleSeats] = useState(0);
  const [selectedScheduleDeparture, setSelectedScheduleDeparture] = useState("");
  const [selectedPickupPoint, setSelectedPickupPoint] = useState<any>(null);
  const [selectedRayonId, setSelectedRayonId] = useState<string | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [bookingRef, setBookingRef] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [booking, setBooking] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [paymentStatus, setPaymentStatus] = useState("unpaid");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [sessionId] = useState(() => user?.id || `guest-${crypto.randomUUID()}`);

  const { data: serviceTypes } = useQuery({
    queryKey: ["shuttle-service-types"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("shuttle_service_types").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: routes, isLoading } = useQuery({
    queryKey: ["shuttle-routes"],
    queryFn: async () => {
      const { data: routesData, error: rErr } = await (supabase as any).from("shuttle_routes").select("*").eq("active", true);
      if (rErr) throw rErr;
      const { data: schedulesData, error: sErr } = await (supabase as any).from("shuttle_schedules").select("*").eq("active", true).gte("departure_time", new Date().toISOString());
      if (sErr) throw sErr;
      
      return (routesData || []).map((r: any) => ({
        ...r,
        schedules: (schedulesData || []).filter((s: any) => s.route_id === r.id),
      }));
    },
  });

  const { data: rayons } = useQuery({
    queryKey: ["shuttle-rayons", selectedRouteId],
    queryFn: async () => {
      if (!selectedRouteId) return [];
      const { data, error } = await (supabase as any)
        .from("shuttle_rayons")
        .select("*")
        .eq("active", true)
        .eq("route_id", selectedRouteId)
        .order("name");
      if (error) throw error;
      const { data: points } = await (supabase as any).from("shuttle_pickup_points").select("*").eq("active", true).order("stop_order");
      return data.map((r: any) => ({ ...r, pickup_points: (points || []).filter((p: any) => p.rayon_id === r.id) }));
    },
    enabled: !!selectedRouteId,
  });

  const { data: userBookings, isLoading: historyLoading } = useQuery({
    queryKey: ["user-shuttle-bookings", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from("shuttle_bookings")
        .select("*, shuttle_schedules!inner(departure_time, route_id, shuttle_routes:route_id(name, origin, destination)), shuttle_pickup_points(name), shuttle_booking_seats(shuttle_seats(seat_number))")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: scheduleSeats, refetch: refetchSeats } = useQuery({
    queryKey: ["schedule-seats", selectedScheduleId],
    queryFn: async () => {
      if (!selectedScheduleId) return [];
      const { data, error } = await (supabase as any)
        .from("shuttle_seats")
        .select("*")
        .eq("schedule_id", selectedScheduleId)
        .order("seat_number");
      if (error) throw error;
      return data as SeatInfo[];
    },
    enabled: !!selectedScheduleId,
  });

  const selectedRoute = routes?.find((r) => r.id === selectedRouteId);
  const selectedSchedule = selectedRoute?.schedules.find((s: any) => s.id === selectedScheduleId);

  // Get unique dates for the selected route
  const availableDates = selectedRoute?.schedules.map((s: any) => new Date(s.departure_time)) ?? [];

  // Get schedules for selected route + date + service type
  const filteredSchedules = selectedRoute?.schedules.filter((s: any) =>
    selectedDate && isSameDay(new Date(s.departure_time), selectedDate) &&
    (!selectedServiceTypeId || s.service_type_id === selectedServiceTypeId)
  ) ?? [];

  const handleSelectRoute = (routeId: string) => {
    setSelectedRouteId(routeId);
    setSelectedDate(undefined);
    setStep("date");
  };

  const handleSelectDate = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
    setStep("service");
  };

  const handleSelectService = (serviceId: string) => {
    setSelectedServiceTypeId(serviceId);
    setStep("schedule");
  };

  const handleSelectSchedule = (schedule: any) => {
    setSelectedScheduleId(schedule.id);
    setSelectedScheduleFare(selectedRoute?.base_fare ?? 0);
    setSelectedScheduleSeats(schedule.available_seats);
    setSelectedScheduleDeparture(schedule.departure_time);
    if (rayons && (rayons as any[]).length > 0) {
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

  const handleSeatClick = (seat: any) => {
    if (selectedSeats.includes(seat.number)) {
      setSelectedSeats(selectedSeats.filter(s => s !== seat.number));
    } else {
      setSelectedSeats([...selectedSeats, seat.number]);
    }
  };

  const handleConfirmSeats = async () => {
    if (selectedSeats.length === 0) {
      toast.error("Pilih minimal satu kursi");
      return;
    }
    
    // Seat Locking Mechanism: Use atomic RPC
    try {
      const { data: success, error } = await (supabase as any).rpc("reserve_shuttle_seats", {
        p_schedule_id: selectedScheduleId,
        p_seat_numbers: selectedSeats,
        p_session_id: sessionId
      });

      if (error) throw error;
      
      if (!success) {
        toast.error("Maaf, satu atau lebih kursi sudah dipesan/terkunci. Silakan pilih kursi lain.");
        refetchSeats();
        return;
      }
      
      setStep("guest_info");
    } catch (err: any) {
      toast.error("Gagal mengunci kursi: " + err.message);
    }
  };

  const handleGuestInfoNext = () => {
    if (!guestName) {
      toast.error("Masukkan nama");
      return;
    }
    
    // Basic phone validation: min 10 digits
    const phoneRegex = /^[0-9]{10,15}$/;
    if (!phoneRegex.test(guestPhone.replace(/\D/g, ''))) {
      toast.error("Masukkan nomor HP yang valid (min 10 digit)");
      return;
    }
    
    setStep("payment");
  };

  const totalFare = selectedScheduleFare * selectedSeats.length;

  const createBooking = async (pMethod: string, pStatus: string) => {
    // Generate reference number: PYU-YYYYMMDD-XXXXX
    const dateStr = format(new Date(), "yyyyMMdd");
    const randStr = Math.random().toString(36).substring(2, 7).toUpperCase();
    const ref = `PYU-${dateStr}-${randStr}`;

    // Atomic transaction using RPC
    const { data: bookingId, error } = await (supabase as any).rpc("create_shuttle_booking_atomic", {
      p_schedule_id: selectedScheduleId,
      p_user_id: user?.id ?? null,
      p_guest_name: guestName,
      p_guest_phone: guestPhone,
      p_seat_numbers: selectedSeats,
      p_total_fare: totalFare,
      p_payment_method: pMethod,
      p_payment_status: pStatus,
      p_rayon_id: selectedRayonId,
      p_pickup_point_id: selectedPickupPoint?.id ?? null,
      p_booking_ref: ref
    });

    if (error) throw error;

    return { id: String(bookingId), booking_ref: ref };
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
      const { data: payData, error: payErr } = await (supabase as any).functions.invoke("create-shuttle-payment", { body: { booking_id: bookingData.id, gateway } });
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
    setSelectedServiceTypeId(null);
    setSelectedScheduleId(null);
    setSelectedPickupPoint(null);
    setSelectedRayonId(null);
    setSelectedSeats([]);
    setGuestName("");
    setGuestPhone("");
    setBookingRef("");
    setBookingId("");
    setPaymentMethod("cash");
    setPaymentStatus("unpaid");
  };

  const goBack = () => {
    if (step === "date") setStep("routes");
    else if (step === "service") setStep("date");
    else if (step === "schedule") setStep("service");
    else if (step === "pickup") setStep("schedule");
    else if (step === "seats") setStep(rayons && (rayons as any[]).length > 0 ? "pickup" : "schedule");
    else if (step === "guest_info") setStep("seats");
    else if (step === "payment") setStep("guest_info");
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="gradient-primary px-6 pt-10 pb-8 rounded-b-3xl">
        <h1 className="text-2xl font-extrabold text-primary-foreground mb-1">Shuttle</h1>
        <p className="text-primary-foreground/70 text-sm">Pesan kursi shuttle — tanpa perlu akun</p>
      </div>

      <div className="px-4 mt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="booking">Pesan Tiket</TabsTrigger>
            <TabsTrigger value="history">Riwayat Saya</TabsTrigger>
          </TabsList>

          <TabsContent value="booking" className="space-y-4">
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

            {/* STEP NEW: SERVICE TYPE */}
            {step === "service" && (
              <div className="space-y-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Pilih Jenis Layanan</CardTitle>
                    <p className="text-xs text-muted-foreground">{selectedRoute?.name} • {selectedDate && format(selectedDate, "dd MMM yyyy")}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {serviceTypes?.map((st) => (
                      <button 
                        key={st.id} 
                        onClick={() => handleSelectService(st.id)}
                        className="w-full text-left p-4 rounded-xl border-2 border-border hover:border-primary transition-all group relative overflow-hidden"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-lg text-primary">{st.name}</h3>
                          <Badge variant="outline" className="bg-primary/5">Pilih</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">
                          <span className="font-semibold text-foreground">Bawaan:</span> {st.baggage_info}
                        </p>
                        {st.description && <p className="text-[10px] italic text-muted-foreground">{st.description}</p>}
                        <div className="absolute right-0 bottom-0 opacity-5 group-hover:opacity-10 transition-opacity">
                          <Bus className="w-16 h-16 -mr-4 -mb-4" />
                        </div>
                      </button>
                    ))}
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
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Pilih Kursi</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {selectedRoute?.name} • {format(new Date(selectedScheduleDeparture), "dd MMM yyyy, HH:mm")}
                      {selectedPickupPoint && ` • 📍 ${selectedPickupPoint.name}`}
                    </p>
                  </CardHeader>
                  <CardContent className="p-0">
                    <SeatLayout 
                      vehicleType={selectedSchedule?.vehicle_type ?? "SUV"}
                      seats={scheduleSeats || []}
                      selectedSeats={selectedSeats}
                      onSeatSelect={handleSeatClick}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Kursi dipilih ({selectedSeats.length})</span>
                      <span className="font-bold">{selectedSeats.join(", ") || "-"}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Total Biaya</span>
                      <span className="font-extrabold text-lg text-primary">Rp {totalFare.toLocaleString("id-ID")}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={goBack}>Kembali</Button>
                      <Button 
                        className="flex-1 gradient-primary text-primary-foreground font-bold" 
                        onClick={handleConfirmSeats}
                        disabled={selectedSeats.length === 0}
                      >
                        Lanjut
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
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
                  <p className="text-xs text-muted-foreground">{selectedRoute?.name} • {selectedSeats.length} kursi • Rp {totalFare.toLocaleString("id-ID")}</p>
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
                  seatCount={selectedSeats.length}
                  guestName={guestName}
                  guestPhone={guestPhone}
                  totalFare={totalFare}
                  paymentStatus={paymentStatus}
                  pickupPointName={selectedPickupPoint?.name}
                />
                <Button variant="outline" className="w-full" onClick={handleReset}>Pesan Lagi</Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {!user ? (
              <div className="text-center py-12 bg-card rounded-2xl border border-dashed">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm text-muted-foreground mb-4">Masuk untuk melihat riwayat perjalanan Anda</p>
                <Button onClick={() => navigate("/auth")}>Masuk Sekarang</Button>
              </div>
            ) : historyLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : userBookings?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bus className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Belum ada riwayat pemesanan</p>
              </div>
            ) : (
              userBookings?.map((b: any) => (
                <Card key={b.id} className="overflow-hidden">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-mono font-bold text-xs text-primary">{b.booking_ref}</p>
                      <p className="font-bold text-sm">{b.shuttle_schedules?.shuttle_routes?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(b.shuttle_schedules?.departure_time), "dd MMM yyyy, HH:mm")}
                      </p>
                      {b.shuttle_pickup_points?.name && (
                        <p className="text-xs text-muted-foreground mt-1">📍 {b.shuttle_pickup_points.name}</p>
                      )}
                      {b.shuttle_booking_seats && b.shuttle_booking_seats.length > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Kursi: {b.shuttle_booking_seats.map((s: any) => s.shuttle_seats?.seat_number).join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">Rp {b.total_fare.toLocaleString("id-ID")}</p>
                      <Badge variant={b.payment_status === "paid" ? "default" : "outline"} className="text-[10px] mt-1">
                        {b.payment_status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
