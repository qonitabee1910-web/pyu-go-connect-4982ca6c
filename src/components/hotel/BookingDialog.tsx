import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface BookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: { id: string; name: string; price_per_night: number; max_guests: number; hotel_id: string } | null;
  hotelName: string;
}

export function BookingDialog({ open, onOpenChange, room, hotelName }: BookingDialogProps) {
  const { user } = useAuth();
  const [checkIn, setCheckIn] = useState<Date>();
  const [checkOut, setCheckOut] = useState<Date>();
  const [guests, setGuests] = useState(1);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [loading, setLoading] = useState(false);

  if (!room) return null;

  const nights = checkIn && checkOut ? differenceInDays(checkOut, checkIn) : 0;
  const totalPrice = nights > 0 ? nights * room.price_per_night : 0;

  const handleBook = async () => {
    if (!user || !checkIn || !checkOut || nights <= 0) {
      toast.error("Please select valid dates");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("hotel_bookings").insert({
        user_id: user.id,
        hotel_id: room.hotel_id,
        room_id: room.id,
        check_in: format(checkIn, "yyyy-MM-dd"),
        check_out: format(checkOut, "yyyy-MM-dd"),
        guests,
        total_price: totalPrice,
        guest_name: guestName || user.user_metadata?.full_name || "",
        guest_phone: guestPhone,
        special_requests: specialRequests,
        status: "confirmed",
      });
      if (error) throw error;
      toast.success("Booking confirmed!");
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Booking failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book {room.name}</DialogTitle>
          <p className="text-xs text-muted-foreground">{hotelName}</p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Check-in</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left text-xs", !checkIn && "text-muted-foreground")}>
                    <CalendarIcon className="w-3 h-3 mr-1" />
                    {checkIn ? format(checkIn, "dd MMM yyyy") : "Select"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={checkIn} onSelect={setCheckIn} disabled={(d) => d < new Date()} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label className="text-xs">Check-out</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left text-xs", !checkOut && "text-muted-foreground")}>
                    <CalendarIcon className="w-3 h-3 mr-1" />
                    {checkOut ? format(checkOut, "dd MMM yyyy") : "Select"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={checkOut} onSelect={setCheckOut} disabled={(d) => d <= (checkIn || new Date())} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div>
            <Label className="text-xs">Guests</Label>
            <Input type="number" min={1} max={room.max_guests} value={guests} onChange={(e) => setGuests(Number(e.target.value))} />
          </div>

          <div>
            <Label className="text-xs">Guest Name</Label>
            <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Full name" />
          </div>

          <div>
            <Label className="text-xs">Phone</Label>
            <Input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="+62..." />
          </div>

          <div>
            <Label className="text-xs">Special Requests</Label>
            <Textarea value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} placeholder="Any special requests..." rows={2} />
          </div>

          {nights > 0 && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex justify-between text-sm">
                <span>{nights} night{nights > 1 ? "s" : ""} × Rp {room.price_per_night.toLocaleString("id-ID")}</span>
                <span className="font-bold">Rp {totalPrice.toLocaleString("id-ID")}</span>
              </div>
            </div>
          )}

          <Button className="w-full" onClick={handleBook} disabled={loading || nights <= 0}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Confirm Booking {totalPrice > 0 && `• Rp ${totalPrice.toLocaleString("id-ID")}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
