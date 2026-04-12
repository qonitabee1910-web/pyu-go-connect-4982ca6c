import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface RoomCardProps {
  room: {
    id: string;
    name: string;
    description: string | null;
    price_per_night: number;
    max_guests: number;
    image_url: string | null;
    amenities: string[];
    available_rooms: number;
  };
  onBook: (roomId: string) => void;
}

export function RoomCard({ room, onBook }: RoomCardProps) {
  const soldOut = room.available_rooms <= 0;

  return (
    <div className="flex gap-3 p-4 rounded-xl bg-card border border-border">
      <div className="w-20 h-20 rounded-lg bg-muted overflow-hidden shrink-0">
        {room.image_url ? (
          <img src={room.image_url} alt={room.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[10px]">No Image</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm">{room.name}</p>
        {room.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{room.description}</p>}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="w-3 h-3" /> Max {room.max_guests}
          </div>
          {room.amenities.slice(0, 3).map((a) => (
            <Badge key={a} variant="secondary" className="text-[10px] px-1.5 py-0">{a}</Badge>
          ))}
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="font-bold text-primary">Rp {room.price_per_night.toLocaleString("id-ID")}<span className="text-xs font-normal text-muted-foreground">/night</span></p>
          <Button size="sm" disabled={soldOut} onClick={() => onBook(room.id)} className="text-xs h-7">
            {soldOut ? "Sold Out" : "Book"}
          </Button>
        </div>
      </div>
    </div>
  );
}
