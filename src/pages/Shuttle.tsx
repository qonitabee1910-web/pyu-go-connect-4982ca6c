import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bus, Clock, Timer, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { format, isSameDay } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import ShuttleTicket from "@/components/shuttle/ShuttleTicket";
import { SeatInfo } from "@/components/shuttle/SeatLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Refactored Components
import { RouteSelector } from "@/components/shuttle/RouteSelector";
import { DateSelector } from "@/components/shuttle/DateSelector";
import { ServiceTypeSelector } from "@/components/shuttle/ServiceTypeSelector";
import { VehicleTypeSelector } from "@/components/shuttle/VehicleTypeSelector";
import { ScheduleSelector } from "@/components/shuttle/ScheduleSelector";
import { PickupSelector } from "@/components/shuttle/PickupSelector";

import { SeatSelector } from "@/components/shuttle/SeatSelector";
import { GuestInfoForm } from "@/components/shuttle/GuestInfoForm";
import { PaymentForm } from "@/components/shuttle/PaymentForm";

type Step = "routes" | "date" | "service" | "vehicle" | "schedule" | "pickup" | "seats" | "guest_info" | "payment" | "confirmation";

const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const vehicleDetails = {
  "SUV": { name: "SUV Premium", capacity: 7, facilities: ["AC", "Audio", "Charger"], icon: <Bus className="w-10 h-10" /> },
  "MiniCar": { name: "Mini Car", capacity: 4, facilities: ["AC", "Compact"], icon: <Bus className="w-10 h-10" /> },
  "Hiace": { name: "Hiace Executive", capacity: 10, facilities: ["AC", "Reclining Seat", "TV", "Charger"], icon: <Bus className="w-10 h-10" /> },
};

export default function Shuttle() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("booking");

  const handleTabChange = (val: string) => {
    if (activeTab === "booking" && val === "history" && lockedUntil) {
      releaseSeats();
    }
    setActiveTab(val);
  };

  const [step, setStep] = useState<Step>("routes");
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedServiceTypeId, setSelectedServiceTypeId] = useState<string | null>(null);
  const [selectedVehicleType, setSelectedVehicleType] = useState<string | null>(null);
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
  const [sessionId] = useState(() => user?.id || `guest-${generateUUID()}`);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [timerExpired, setTimerExpired] = useState(false);

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
      const rayonIds = data.map((r: any) => r.id);
      const { data: points } = await (supabase as any).from("shuttle_pickup_points").select("*").eq("active", true).in("rayon_id", rayonIds).order("stop_order");
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
      
      return (data || []).map((s: any) => ({
        ...s,
        number: s.seat_number
      })) as SeatInfo[];
    },
    enabled: !!selectedScheduleId,
  });

  useEffect(() => {
    if (!selectedScheduleId) return;

    const channel = supabase
      .channel(`seats-${selectedScheduleId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shuttle_seats",
          filter: `schedule_id=eq.${selectedScheduleId}`,
        },
        () => {
          refetchSeats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedScheduleId, refetchSeats]);

  const releaseSeats = useCallback(async () => {
    if (!selectedScheduleId || selectedSeats.length === 0) return;

    try {
      await (supabase as any)
        .from("shuttle_seats")
        .update({
          status: "available",
          reserved_at: null,
          reserved_by_session: null
        })
        .eq("schedule_id", selectedScheduleId)
        .eq("reserved_by_session", sessionId)
        .eq("status", "reserved");

      setLockedUntil(null);
      setTimeLeft("");
      refetchSeats();
    } catch (err) {
      console.error("Failed to release seats:", err);
    }
  }, [selectedScheduleId, selectedSeats, sessionId, refetchSeats]);

  useEffect(() => {
    return () => {
      if (lockedUntil) {
        releaseSeats();
      }
    };
  }, [lockedUntil, releaseSeats]);

  useEffect(() => {
    if (!lockedUntil) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = lockedUntil - now;

      if (diff <= 0) {
        clearInterval(interval);
        setTimeLeft("0:00");
        setLockedUntil(null);
        setTimerExpired(true);
        toast.error("Sesi pemesanan berakhir. Kursi telah dilepaskan.");
        setStep("seats");
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [lockedUntil]);

  const selectedRoute = routes?.find((r) => r.id === selectedRouteId);
  const selectedSchedule = selectedRoute?.schedules.find((s: any) => s.id === selectedScheduleId);
  const availableDates = selectedRoute?.schedules.map((s: any) => new Date(s.departure_time)) ?? [];
  
  const filteredSchedules = selectedRoute?.schedules.filter((s: any) =>
    selectedDate && isSameDay(new Date(s.departure_time), selectedDate) &&
    (!selectedServiceTypeId || s.service_type_id === selectedServiceTypeId) &&
    (!selectedVehicleType || s.vehicle_type === selectedVehicleType)
  ) ?? [];

  const availableVehicles = Array.from(new Set(
    selectedRoute?.schedules
      .filter((s: any) => 
        selectedDate && isSameDay(new Date(s.departure_time), selectedDate) &&
        (!selectedServiceTypeId || s.service_type_id === selectedServiceTypeId) &&
        s.available_seats > 0
      )
      .map((s: any) => s.vehicle_type)
      .filter(Boolean)
  )) as string[];

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
    setStep("vehicle");
  };

  const handleSelectVehicle = (vehicleType: string) => {
    setSelectedVehicleType(vehicleType);
    setStep("schedule");
  };

  const handleSelectSchedule = (schedule: any) => {
    setSelectedScheduleId(schedule.id);
    setSelectedScheduleFare(selectedRoute?.base_fare ?? 0);
    setSelectedScheduleSeats(schedule.available_seats);
    setSelectedScheduleDeparture(schedule.departure_time);
    // Clear previously selected pickup point when switching schedules
    setSelectedPickupPoint(null);
    setSelectedRayonId(null);
    
    if (rayons && (rayons as any[]).length > 0) {
      setStep("pickup");
    } else {
      setStep("seats");
    }
  };

  const handleSelectPickupPoint = (rayon: any, point: any) => {
    if (!point || !point.id) {
      toast.error("Titik jemput tidak valid");
      return;
    }
    
    setSelectedRayonId(rayon.id);
    setSelectedPickupPoint(point);
    setSelectedScheduleFare(Number(point.fare) || selectedRoute?.base_fare || 0);
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
      
      setTimerExpired(false);
      setLockedUntil(Date.now() + 10 * 60000);
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
    
    const phoneRegex = /^[0-9]{10,15}$/;
    if (!phoneRegex.test(guestPhone.replace(/\D/g, ''))) {
      toast.error("Masukkan nomor HP yang valid (min 10 digit)");
      return;
    }
    
    setStep("payment");
  };

  const totalFare = selectedScheduleFare * selectedSeats.length;

  const createBooking = async (pMethod: string, pStatus: string) => {
    const dateStr = format(new Date(), "yyyyMMdd");
    const randStr = Math.random().toString(36).substring(2, 7).toUpperCase();
    const ref = `PYU-${dateStr}-${randStr}`;

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
    if (lockedUntil) releaseSeats();
    setStep("routes");
    setSelectedRouteId(null);
    setSelectedDate(undefined);
    setSelectedServiceTypeId(null);
    setSelectedVehicleType(null);
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
    setLockedUntil(null);
    setTimeLeft("");
  };

  const goBack = () => {
    if (step === "date") setStep("routes");
    else if (step === "service") setStep("date");
    else if (step === "vehicle") setStep("service");
    else if (step === "schedule") setStep("vehicle");
    else if (step === "pickup") setStep("schedule");
    else if (step === "seats") setStep(rayons && (rayons as any[]).length > 0 ? "pickup" : "schedule");
    else if (step === "guest_info") {
      releaseSeats();
      setStep("seats");
    }
    else if (step === "payment") setStep("guest_info");
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="gradient-primary px-6 pt-10 pb-8 rounded-b-3xl">
        <h1 className="text-2xl font-extrabold text-primary-foreground mb-1">Shuttle</h1>
        <p className="text-primary-foreground/70 text-sm">Pesan kursi shuttle — tanpa perlu akun</p>
      </div>

      {timeLeft && (step === "guest_info" || step === "payment") && (
        <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-primary/10 shadow-sm px-4 py-2 animate-in slide-in-from-top duration-300">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary">
              <Timer className="w-4 h-4 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Sisa Waktu Pemesanan</span>
            </div>
            <div className={cn(
              "px-3 py-1 rounded-full font-mono font-extrabold text-sm flex items-center gap-1.5",
              timeLeft.startsWith("0:") ? "bg-red-100 text-red-600 animate-pulse" : "bg-primary/10 text-primary"
            )}>
              <Clock className="w-3.5 h-3.5" />
              {timeLeft}
            </div>
          </div>
        </div>
      )}

      <div className="px-4 mt-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="booking">Pesan Tiket</TabsTrigger>
            <TabsTrigger value="history">Riwayat Saya</TabsTrigger>
          </TabsList>

          <TabsContent value="booking" className="space-y-4">
            {step !== "confirmation" && (() => {
              const steps: Step[] = ["routes", "date", "service", "vehicle", "schedule", "pickup", "seats", "guest_info", "payment", "confirmation"];
              const currentIdx = steps.indexOf(step);
              const progress = ((currentIdx + 1) / steps.length) * 100;
              return (
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Langkah {currentIdx + 1} dari {steps.length}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-1.5" />
                </div>
              );
            })()}
            {step === "routes" && (
              <RouteSelector 
                routes={routes} 
                isLoading={isLoading} 
                onSelectRoute={handleSelectRoute} 
              />
            )}

            {step === "date" && (
              <DateSelector 
                selectedRoute={selectedRoute}
                selectedDate={selectedDate}
                availableDates={availableDates}
                onSelectDate={handleSelectDate}
                onBack={goBack}
              />
            )}

            {step === "service" && (
              <ServiceTypeSelector 
                serviceTypes={serviceTypes}
                selectedRoute={selectedRoute}
                selectedDate={selectedDate}
                onSelectService={handleSelectService}
                onBack={goBack}
              />
            )}

            {step === "vehicle" && (
              <VehicleTypeSelector 
                availableVehicles={availableVehicles}
                selectedRoute={selectedRoute}
                selectedDate={selectedDate}
                serviceTypeName={serviceTypes?.find(st => st.id === selectedServiceTypeId)?.name}
                vehicleDetails={vehicleDetails}
                onSelectVehicle={handleSelectVehicle}
                onBack={goBack}
              />
            )}

            {step === "schedule" && (
              <ScheduleSelector 
                filteredSchedules={filteredSchedules}
                selectedRoute={selectedRoute}
                selectedDate={selectedDate}
                onSelectSchedule={handleSelectSchedule}
                onBack={goBack}
              />
            )}

            {step === "pickup" && (
              <PickupSelector 
                rayons={rayons}
                selectedRoute={selectedRoute}
                selectedScheduleDeparture={selectedScheduleDeparture}
                onSelectPickupPoint={handleSelectPickupPoint}
                onBack={goBack}
              />
            )}

            {step === "seats" && (
              <SeatSelector 
                selectedRoute={selectedRoute}
                selectedScheduleDeparture={selectedScheduleDeparture}
                selectedPickupPoint={selectedPickupPoint}
                selectedSchedule={selectedSchedule}
                scheduleSeats={scheduleSeats || []}
                selectedSeats={selectedSeats}
                totalFare={totalFare}
                onSeatClick={handleSeatClick}
                onConfirmSeats={handleConfirmSeats}
                onBack={goBack}
              />
            )}

            {step === "guest_info" && (
              <GuestInfoForm 
                guestName={guestName}
                guestPhone={guestPhone}
                setGuestName={setGuestName}
                setGuestPhone={setGuestPhone}
                onNext={handleGuestInfoNext}
                onBack={goBack}
              />
            )}

            {step === "payment" && (
              <PaymentForm 
                totalFare={totalFare}
                seatCount={selectedSeats.length}
                booking={booking}
                processingPayment={processingPayment}
                onPayCash={handlePayCash}
                onPayOnline={handlePayOnline}
                onBack={goBack}
              />
            )}

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
                        <p className="text-xs text-muted-foreground mt-1">📍 Jemput: {b.shuttle_pickup_points.name}</p>
                      )}
                      {b.shuttle_booking_seats && b.shuttle_booking_seats.length > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Kursi: {b.shuttle_booking_seats.map((s: any) => s.shuttle_seats?.seat_number).join(", ")}
                        </p>
                      )}
                      {b.pickup_status && (
                        <Badge 
                          variant={b.pickup_status === "picked_up" ? "default" : b.pickup_status === "delivered" ? "secondary" : "outline"} 
                          className="text-[10px] mt-1"
                        >
                          {b.pickup_status === "pending" ? "Menunggu jemput" : b.pickup_status === "picked_up" ? "Dijemput" : b.pickup_status === "delivered" ? "Tiba" : b.pickup_status}
                        </Badge>
                      )}
                      {b.pickup_driver_name && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          🚗 {b.pickup_driver_name} • {b.pickup_driver_plate}
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
