import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RoomCard } from "@/components/hotel/RoomCard";
import { BookingDialog } from "@/components/hotel/BookingDialog";
import { ArrowLeft, Star, MapPin, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function HotelDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bookingRoom, setBookingRoom] = useState<any>(null);

  const { data: hotel, isLoading } = useQuery({
    queryKey: ["hotel", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("hotels").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: rooms } = useQuery({
    queryKey: ["hotel-rooms", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("hotel_rooms").select("*").eq("hotel_id", id!).eq("active", true).order("price_per_night");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const handleBook = (roomId: string) => {
    if (!user) {
      toast.error("Please sign in to book");
      navigate("/auth");
      return;
    }
    const room = rooms?.find((r) => r.id === roomId);
    if (room) setBookingRoom({ ...room, hotel_id: id });
  };

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!hotel) {
    return <div className="p-6 text-center text-muted-foreground">Hotel not found</div>;
  }

  return (
    <div className="flex flex-col min-h-screen pb-20">
      {/* Hero */}
      <div className="relative h-48 bg-muted">
        {hotel.image_url ? (
          <img src={hotel.image_url} alt={hotel.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">No Image</div>
        )}
        <button onClick={() => navigate(-1)} className="absolute top-4 left-4 bg-card/80 backdrop-blur rounded-full p-2">
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Info */}
      <div className="px-6 py-4">
        <h1 className="text-xl font-extrabold">{hotel.name}</h1>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex">
            {Array.from({ length: hotel.star_rating }).map((_, i) => (
              <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">({hotel.rating?.toFixed(1) ?? "0"})</span>
        </div>
        <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4" />
          <span>{hotel.address}, {hotel.city}</span>
        </div>
        {hotel.description && <p className="text-sm text-muted-foreground mt-3">{hotel.description}</p>}

        {hotel.amenities && hotel.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {hotel.amenities.map((a: string) => (
              <Badge key={a} variant="secondary" className="text-xs">{a}</Badge>
            ))}
          </div>
        )}
      </div>

      {/* Rooms */}
      <div className="px-6">
        <h2 className="font-bold text-lg mb-3">Available Rooms</h2>
        <div className="space-y-3">
          {!rooms?.length ? (
            <p className="text-sm text-muted-foreground">No rooms available</p>
          ) : (
            rooms.map((room) => <RoomCard key={room.id} room={room} onBook={handleBook} />)
          )}
        </div>
      </div>

      <BookingDialog
        open={!!bookingRoom}
        onOpenChange={(open) => !open && setBookingRoom(null)}
        room={bookingRoom}
        hotelName={hotel.name}
      />
    </div>
  );
}
