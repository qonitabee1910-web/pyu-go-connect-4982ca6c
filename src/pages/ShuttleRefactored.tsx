import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

import ShuttleService, { ServiceVehicleOption } from '@/services/ShuttleService';
import { PriceCalculator } from '@/utils/PriceCalculator';

// Components
import { RouteSelector } from '@/components/shuttle/RouteSelector';
import { ScheduleSelector } from '@/components/shuttle/ScheduleSelector';
import { ServiceVehicleSelector } from '@/components/shuttle/ServiceVehicleSelector';
import { PickupSelector } from '@/components/shuttle/PickupSelector';
import { SeatSelector } from '@/components/shuttle/SeatSelector';
import { GuestInfoForm } from '@/components/shuttle/GuestInfoForm';
import { PaymentForm } from '@/components/shuttle/PaymentForm';
import { BookingSummary } from '@/components/shuttle/BookingSummary';
import { PriceBreakdown } from '@/components/shuttle/PriceBreakdown';
import ShuttleTicket from '@/components/shuttle/ShuttleTicket';
import { RayonSelector } from '@/components/shuttle/RayonSelector';
import { PickupPointSelector } from '@/components/shuttle/PickupPointSelector';
import { ServiceTypeSelector } from '@/components/shuttle/ServiceTypeSelector';
import { VehicleTypeSelector } from '@/components/shuttle/VehicleTypeSelector';
import { Skeleton } from '@/components/ui/skeleton';

type Step = 'location' | 'pickup_point' | 'service' | 'vehicle' | 'schedule' | 'seats' | 'passengers' | 'summary' | 'payment' | 'confirmation';

const STEP_LIST: Step[] = ['location', 'pickup_point', 'service', 'vehicle', 'schedule', 'seats', 'passengers', 'summary', 'payment', 'confirmation'];
const STEP_LABELS: Record<Step, string> = {
  location: 'Wilayah (Rayon)',
  pickup_point: 'Titik Jemput',
  service: 'Layanan',
  vehicle: 'Kendaraan',
  schedule: 'Jadwal',
  seats: 'Kursi',
  passengers: 'Penumpang',
  summary: 'Ringkasan',
  payment: 'Pembayaran',
  confirmation: 'Konfirmasi',
};

interface BookingState {
  rayonId: string | null;
  pickupPointId: string | null;
  routeId: string | null;
  serviceTypeId: string | null;
  vehicleType: string | null;
  scheduleId: string | null;
  selectedService: ServiceVehicleOption | null;
  selectedSeats: number[];
  passengers: Array<{ seatNumber: number; name: string; phone: string }>;
  paymentMethod: string;
}

export default function Shuttle() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('booking');
  const [step, setStep] = useState<Step>('location');
  const [priceBreakdown, setPriceBreakdown] = useState<any>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Booking state
  const [booking, setBooking] = useState<BookingState>({
    rayonId: null,
    pickupPointId: null,
    routeId: null,
    serviceTypeId: null,
    vehicleType: null,
    scheduleId: null,
    selectedService: null,
    selectedSeats: [],
    passengers: [],
    paymentMethod: 'CASH',
  });

  // Query rayons
  const { data: rayons, isLoading: rayonsLoading } = useQuery({
    queryKey: ['shuttle-rayons-active'],
    queryFn: async () => {
      const { data, error } = await (window as any).supabase
        .from('shuttle_rayons')
        .select('*, shuttle_routes(id, name, origin, destination)')
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Query pickup points for selected rayon
  const { data: pickupPoints, isLoading: pickupPointsLoading } = useQuery({
    queryKey: ['shuttle-pickup-points', booking.rayonId],
    queryFn: async () => {
      if (!booking.rayonId) return [];
      const { data, error } = await (window as any).supabase
        .from('shuttle_pickup_points')
        .select('*')
        .eq('rayon_id', booking.rayonId)
        .eq('active', true)
        .order('stop_order');
      if (error) throw error;
      return data || [];
    },
    enabled: !!booking.rayonId,
  });

  // Query available services for route (via schedule_services)
  const { data: availableServices, isLoading: servicesLoading } = useQuery({
    queryKey: ['shuttle-available-services', booking.routeId],
    queryFn: async () => {
      if (!booking.routeId) return [];
      // This query finds distinct service types available for any schedule on this route
      const { data, error } = await (window as any).supabase
        .from('shuttle_schedule_services')
        .select('service_type_id, shuttle_service_types(id, name, baggage_info)')
        .eq('active', true)
        .in('schedule_id', (
          await (window as any).supabase
            .from('shuttle_schedules')
            .select('id')
            .eq('route_id', booking.routeId)
            .eq('active', true)
        ).data?.map((s: any) => s.id) || []);

      if (error) throw error;

      // Uniq by service_type_id
      const uniqueServices = Array.from(new Set((data || []).map((s: any) => s.service_type_id)))
        .map(id => (data || []).find((s: any) => s.service_type_id === id)?.shuttle_service_types);

      return uniqueServices.filter(Boolean);
    },
    enabled: !!booking.routeId,
  });

  // Query available vehicles for service type
  const { data: availableVehicles, isLoading: vehiclesLoading } = useQuery({
    queryKey: ['shuttle-available-vehicles', booking.routeId, booking.serviceTypeId],
    queryFn: async () => {
      if (!booking.routeId || !booking.serviceTypeId) return [];
      const { data, error } = await (window as any).supabase
        .from('shuttle_schedule_services')
        .select('vehicle_type')
        .eq('route_id', booking.routeId) // Assuming we added route_id to schedule_services or joining via schedule
        .eq('service_type_id', booking.serviceTypeId)
        .eq('active', true);

      // Actually, joining via schedule is better if route_id is not in schedule_services
      const { data: joinedData, error: joinError } = await (window as any).supabase
        .from('shuttle_schedule_services')
        .select('vehicle_type, shuttle_schedules!inner(route_id)')
        .eq('shuttle_schedules.route_id', booking.routeId)
        .eq('service_type_id', booking.serviceTypeId)
        .eq('active', true);

      if (joinError) throw joinError;

      const uniqueVehicles = Array.from(new Set((joinedData || []).map((v: any) => v.vehicle_type))) as string[];
      return uniqueVehicles;
    },
    enabled: !!booking.routeId && !!booking.serviceTypeId,
  });

  // Query schedules for selected combination
  const { data: filteredSchedules, isLoading: schedulesLoading } = useQuery({
    queryKey: ['shuttle-filtered-schedules', booking.routeId, booking.serviceTypeId, booking.vehicleType],
    queryFn: async () => {
      if (!booking.routeId || !booking.serviceTypeId || !booking.vehicleType) return [];
      const { data, error } = await (window as any).supabase
        .from('shuttle_schedule_services')
        .select('*, shuttle_schedules!inner(id, departure_time, arrival_time, route_id)')
        .eq('shuttle_schedules.route_id', booking.routeId)
        .eq('service_type_id', booking.serviceTypeId)
        .eq('vehicle_type', booking.vehicleType)
        .eq('active', true)
        .gte('shuttle_schedules.departure_time', new Date().toISOString())
        .order('departure_time', { foreignTable: 'shuttle_schedules' });

      if (error) throw error;
      return data || [];
    },
    enabled: !!booking.routeId && !!booking.serviceTypeId && !!booking.vehicleType,
  });

  // Legacy queries - keep for now to avoid breaking other parts or remove if sure
  // ...


  // Query seats for selected schedule
  const { data: scheduleSeats, isLoading: seatsLoading } = useQuery({
    queryKey: ['shuttle-seats', booking.scheduleId],
    queryFn: async () => {
      if (!booking.scheduleId) return [];
      const { data, error } = await (window as any).supabase
        .from('shuttle_seats')
        .select('*')
        .eq('schedule_id', booking.scheduleId)
        .order('seat_number');
      if (error) throw error;
      return data || [];
    },
    enabled: !!booking.scheduleId,
  });

  // Query user bookings
  const { data: userBookings } = useQuery({
    queryKey: ['user-shuttle-bookings', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (window as any).supabase
        .from('shuttle_bookings')
        .select('*, shuttle_schedules(*, shuttle_routes(name, origin, destination))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Calculate price when service/route/rayon changes
  useEffect(() => {
    const calculatePrice = async () => {
      if (
        !booking.routeId ||
        !booking.scheduleId ||
        !booking.selectedService ||
        !booking.rayonId ||
        booking.selectedSeats.length === 0
      ) {
        return;
      }

      try {
        const breakdown = await ShuttleService.calculatePrice(
          booking.routeId,
          booking.selectedService.id,
          booking.rayonId,
          booking.selectedSeats.length
        );

        if (breakdown) {
          setPriceBreakdown(breakdown);
        }
      } catch (error) {
        console.error('Error calculating price:', error);
      }
    };

    calculatePrice();
  }, [booking.routeId, booking.selectedService, booking.rayonId, booking.selectedSeats]);

  // Handlers
  const handleSelectRayon = (rayon: any) => {
    setBooking((prev) => ({
      ...prev,
      rayonId: rayon.id,
      routeId: rayon.route_id || rayon.shuttle_routes?.id || null,
      pickupPointId: null,
      serviceTypeId: null,
      vehicleType: null,
      scheduleId: null,
      selectedService: null,
    }));
    setStep('pickup_point');
  };

  const handleSelectPickupPoint = (pointId: string) => {
    setBooking((prev) => ({ ...prev, pickupPointId: pointId }));
    setStep('service');
  };

  const handleSelectServiceType = (serviceTypeId: string) => {
    setBooking((prev) => ({ 
      ...prev, 
      serviceTypeId,
      vehicleType: null,
      scheduleId: null,
      selectedService: null
    }));
    setStep('vehicle');
  };

  const handleSelectVehicleType = (vehicleType: string) => {
    setBooking((prev) => ({ 
      ...prev, 
      vehicleType,
      scheduleId: null,
      selectedService: null
    }));
    setStep('schedule');
  };

  const handleSelectSchedule = (scheduleService: any) => {
    setBooking((prev) => ({ 
      ...prev, 
      scheduleId: scheduleService.schedule_id,
      selectedService: {
        id: scheduleService.service_type_id,
        serviceName: '', // Will be filled from data if needed
        vehicleType: scheduleService.vehicle_type,
        vehicleName: '', 
        capacity: scheduleService.total_seats,
        totalSeats: scheduleService.total_seats,
        availableSeats: scheduleService.available_seats,
        displayPrice: scheduleService.price_override || 0,
        isFeatured: scheduleService.is_featured,
        facilities: [],
      }
    }));
    setStep('seats');
  };

  const handleSeatClick = (seat: any) => {
    setBooking((prev) => {
      const isSelected = prev.selectedSeats.includes(Number(seat.seat_number));
      if (isSelected) {
        return { ...prev, selectedSeats: prev.selectedSeats.filter(s => s !== Number(seat.seat_number)) };
      } else {
        return { ...prev, selectedSeats: [...prev.selectedSeats, Number(seat.seat_number)] };
      }
    });
  };

  const handleConfirmSeats = () => {
    if (booking.selectedSeats.length === 0) {
      toast.error("Silakan pilih minimal satu kursi");
      return;
    }
    setStep('passengers');
  };

  const handleAddPassenger = (seatNumber: number, name: string, phone: string) => {
    setBooking((prev) => {
      const existing = prev.passengers.filter((p) => p.seatNumber !== seatNumber);
      return {
        ...prev,
        passengers: [...existing, { seatNumber, name, phone }],
      };
    });
  };

  const handleSetPayment = (method: string) => {
    setBooking((prev) => ({ ...prev, paymentMethod: method }));
  };

  const handleConfirmBooking = async (method: 'CASH' | 'CARD' | 'TRANSFER', gateway?: string) => {
    try {
      if (!user) {
        toast.error('Please log in to book');
        navigate('/auth');
        return;
      }

      if (booking.passengers.length !== booking.selectedSeats.length) {
        toast.error('Please fill in all passenger information');
        return;
      }

      if (!priceBreakdown) {
        toast.error('Price calculation failed');
        return;
      }

      setIsBooking(true);

      // Create booking
      const confirmation = await ShuttleService.createBooking(user.id, {
        scheduleId: booking.scheduleId!,
        serviceTypeId: booking.serviceTypeId!,
        vehicleType: booking.vehicleType!,
        rayonId: booking.rayonId!,
        pickupPointId: booking.pickupPointId!,
        seatNumbers: booking.selectedSeats,
        passengerInfo: booking.passengers,
        paymentMethod: method,
        expectedTotalPrice: priceBreakdown.totalAmount,
      });

      if (confirmation) {
        setStep('confirmation');
        toast.success('Booking confirmed!');
      }
    } catch (error: any) {
      console.error('Booking error:', error);
      toast.error(error.message || 'Booking failed');
    } finally {
      setIsBooking(false);
    }
  };

  const handlePreviousStep = () => {
    const currentIndex = STEP_LIST.indexOf(step);
    if (currentIndex > 0) {
      setStep(STEP_LIST[currentIndex - 1]);
    }
  };

  const handleNextStep = () => {
    const currentIndex = STEP_LIST.indexOf(step);
    if (currentIndex < STEP_LIST.length - 1) {
      setStep(STEP_LIST[currentIndex + 1]);
    }
  };

  const currentIndex = STEP_LIST.indexOf(step);
  const progress = ((currentIndex + 1) / STEP_LIST.length) * 100;

  const selectedRoute = rayons?.find((r) => r.id === booking.rayonId)?.shuttle_routes;
  const selectedSchedule = filteredSchedules?.find((s) => s.id === booking.scheduleId)?.shuttle_schedules;
  const selectedRayon = rayons?.find((r) => r.id === booking.rayonId);
  const selectedPickupPoint = pickupPoints?.find((p) => p.id === booking.pickupPointId);

  return (
    <div className="container mx-auto py-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="booking">Book Shuttle</TabsTrigger>
          <TabsTrigger value="history">My Bookings</TabsTrigger>
        </TabsList>

        {/* Booking Tab */}
        <TabsContent value="booking" className="space-y-6 mt-6">
          {/* Progress Bar */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span>{STEP_LABELS[step]}</span>
                  <span className="text-muted-foreground">
                    Step {currentIndex + 1} of {STEP_LIST.length}
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Main Content */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Left Column: Step Content */}
            <div className="md:col-span-2">
              <Card>
                <CardContent className="pt-6">
                  {/* Location (Rayon) Step */}
                  {step === 'location' && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Pilih Wilayah (Rayon)</h3>
                      {rayonsLoading ? (
                        <div className="space-y-3">
                          <Skeleton className="h-[100px] w-full" />
                          <Skeleton className="h-[100px] w-full" />
                          <Skeleton className="h-[100px] w-full" />
                        </div>
                      ) : (
                        <RayonSelector
                          rayons={rayons || []}
                          onSelect={handleSelectRayon}
                        />
                      )}
                    </div>
                  )}

                  {/* Pickup Point Step */}
                  {step === 'pickup_point' && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Pilih Titik Jemput</h3>
                      {pickupPointsLoading ? (
                        <div className="space-y-3">
                          <Skeleton className="h-[80px] w-full" />
                          <Skeleton className="h-[80px] w-full" />
                          <Skeleton className="h-[80px] w-full" />
                        </div>
                      ) : (
                        <PickupPointSelector
                          pickupPoints={pickupPoints || []}
                          onSelect={handleSelectPickupPoint}
                          onBack={handlePreviousStep}
                        />
                      )}
                    </div>
                  )}

                  {/* Service Step */}
                  {step === 'service' && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Pilih Jenis Layanan</h3>
                      {servicesLoading ? (
                        <div className="space-y-3">
                          <Skeleton className="h-[120px] w-full" />
                          <Skeleton className="h-[120px] w-full" />
                        </div>
                      ) : (
                        <ServiceTypeSelector
                          serviceTypes={availableServices || []}
                          selectedRoute={selectedRoute}
                          selectedDate={new Date()}
                          onSelectService={handleSelectServiceType}
                          onBack={handlePreviousStep}
                        />
                      )}
                    </div>
                  )}

                  {/* Vehicle Step */}
                  {step === 'vehicle' && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Pilih Jenis Kendaraan</h3>
                      {vehiclesLoading ? (
                        <div className="space-y-3">
                          <Skeleton className="h-[100px] w-full" />
                          <Skeleton className="h-[100px] w-full" />
                        </div>
                      ) : (
                        <VehicleTypeSelector
                          availableVehicles={availableVehicles || []}
                          selectedRoute={selectedRoute}
                          selectedDate={new Date()}
                          serviceTypeName={availableServices?.find(s => s.id === booking.serviceTypeId)?.name}
                          vehicleDetails={{
                            'MINI_CAR': { name: 'Mini Car', capacity: 4, facilities: ['AC', 'Music'], icon: <Loader2 /> },
                            'SUV': { name: 'SUV', capacity: 6, facilities: ['AC', 'Music', 'USB'], icon: <Loader2 /> },
                            'HIACE': { name: 'Hiace', capacity: 14, facilities: ['AC', 'TV', 'Music', 'USB'], icon: <Loader2 /> }
                          }}
                          onSelectVehicle={handleSelectVehicleType}
                          onBack={handlePreviousStep}
                        />
                      )}
                    </div>
                  )}

                  {/* Schedule Step */}
                  {step === 'schedule' && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Pilih Jadwal Keberangkatan</h3>
                      {schedulesLoading ? (
                        <div className="space-y-3">
                          <Skeleton className="h-[80px] w-full" />
                          <Skeleton className="h-[80px] w-full" />
                          <Skeleton className="h-[80px] w-full" />
                        </div>
                      ) : (
                        <ScheduleSelector
                          filteredSchedules={filteredSchedules?.map(s => ({
                            ...s.shuttle_schedules,
                            available_seats: s.available_seats,
                            total_seats: s.total_seats,
                            price_override: s.price_override
                          })) || []}
                          selectedRoute={selectedRoute}
                          selectedDate={new Date()}
                          onSelectSchedule={(s) => {
                            const selected = filteredSchedules?.find(fs => fs.shuttle_schedules.id === s.id);
                            if (selected) handleSelectSchedule(selected);
                          }}
                          onBack={handlePreviousStep}
                        />
                      )}
                    </div>
                  )}

                  {/* Seats Step */}
                  {step === 'seats' && booking.scheduleId && (
                    <div className="space-y-4">
                      {seatsLoading ? (
                        <div className="space-y-3">
                          <Skeleton className="h-[200px] w-full" />
                        </div>
                      ) : (
                        <SeatSelector
                          selectedRoute={selectedRoute}
                          selectedScheduleDeparture={selectedSchedule?.departure_time || ""}
                          selectedPickupPoint={selectedPickupPoint}
                          selectedSchedule={selectedSchedule}
                          scheduleSeats={scheduleSeats || []}
                          selectedSeats={booking.selectedSeats.map(String)}
                          totalFare={priceBreakdown?.totalAmount || 0}
                          onSeatClick={handleSeatClick}
                          onConfirmSeats={handleConfirmSeats}
                          onBack={handlePreviousStep}
                        />
                      )}
                    </div>
                  )}

                  {/* Passengers Step */}
                  {step === 'passengers' && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Informasi Penumpang</h3>
                      <div className="space-y-3">
                        {booking.selectedSeats.map((seatNumber) => (
                          <GuestInfoForm
                            key={seatNumber}
                            seatNumber={seatNumber}
                            onSave={(name, phone) => handleAddPassenger(seatNumber, name, phone)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Summary Step */}
                  {step === 'summary' && selectedRoute && selectedSchedule && booking.selectedService && selectedRayon && priceBreakdown && (
                    <BookingSummary
                      route={selectedRoute}
                      schedule={{
                        departureTime: selectedSchedule.departure_time,
                        arrivalTime: selectedSchedule.arrival_time,
                      }}
                      service={booking.selectedService}
                      rayonName={selectedRayon.name}
                      seatCount={booking.selectedSeats.length}
                      priceBreakdown={priceBreakdown}
                      passengerCount={booking.passengers.length}
                    />
                  )}

                  {/* Payment Step */}
                  {step === 'payment' && (
                    <div className="space-y-4">
                      <PaymentForm
                        totalFare={priceBreakdown?.totalAmount || 0}
                        seatCount={booking.selectedSeats.length}
                        booking={isBooking}
                        processingPayment={isProcessingPayment}
                        onPayCash={() => handleConfirmBooking('CASH')}
                        onPayOnline={(gateway) => handleConfirmBooking('TRANSFER', gateway)}
                        onBack={handlePreviousStep}
                      />
                    </div>
                  )}

                  {/* Confirmation Step */}
                  {step === 'confirmation' && userBookings && userBookings.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Pemesanan Berhasil! 🎉</h3>
                      <ShuttleTicket 
                        bookingRef={userBookings[0].booking_ref}
                        routeName={userBookings[0].shuttle_schedules?.shuttle_routes?.name || ""}
                        origin={userBookings[0].shuttle_schedules?.shuttle_routes?.origin || ""}
                        destination={userBookings[0].shuttle_schedules?.shuttle_routes?.destination || ""}
                        departure={userBookings[0].shuttle_schedules?.departure_time || ""}
                        seatCount={userBookings[0].seat_count}
                        guestName={userBookings[0].guest_name || ""}
                        guestPhone={userBookings[0].guest_phone || ""}
                        totalFare={userBookings[0].total_fare}
                        paymentStatus={userBookings[0].payment_status}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Navigation Buttons */}
              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={handlePreviousStep}
                  disabled={currentIndex === 0 || step === 'confirmation'}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Kembali
                </Button>

                {step !== 'payment' && step !== 'confirmation' && (
                  <Button
                    onClick={handleNextStep}
                    disabled={
                      (step === 'location' && !booking.rayonId) ||
                      (step === 'pickup_point' && !booking.pickupPointId) ||
                      (step === 'service' && !booking.serviceTypeId) ||
                      (step === 'vehicle' && !booking.vehicleType) ||
                      (step === 'schedule' && !booking.scheduleId) ||
                      (step === 'seats' && booking.selectedSeats.length === 0) ||
                      (step === 'passengers' && booking.passengers.length !== booking.selectedSeats.length)
                    }
                    className="ml-auto"
                  >
                    Selanjutnya
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>

            {/* Right Column: Price Summary (sticky) */}
            {priceBreakdown && (
              <div className="md:col-span-1">
                <div className="sticky top-6">
                  <PriceBreakdown breakdown={priceBreakdown} />
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              {!user ? (
                <p className="text-center text-muted-foreground py-8">
                  Please log in to view your booking history
                </p>
              ) : userBookings && userBookings.length > 0 ? (
                <div className="space-y-3">
                  {userBookings.map((booking: any) => (
                    <Card key={booking.id} className="p-3">
                      <p className="font-medium">{booking.reference_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {booking.shuttle_schedules?.shuttle_routes?.origin} →{' '}
                        {booking.shuttle_schedules?.shuttle_routes?.destination}
                      </p>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No bookings yet
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
