import { Star, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface HotelCardProps {
  hotel: {
    id: string;
    name: string;
    city: string;
    address: string;
    star_rating: number;
    rating: number;
    image_url: string | null;
    min_price?: number;
  };
}

export function HotelCard({ hotel }: HotelCardProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/hotel/${hotel.id}`)}
      className="w-full flex gap-3 p-3 rounded-xl bg-card border border-border shadow-sm hover:shadow-md transition-all text-left"
    >
      <div className="w-24 h-24 rounded-lg bg-muted overflow-hidden shrink-0">
        {hotel.image_url ? (
          <img src={hotel.image_url} alt={hotel.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No Image</div>
        )}
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <p className="font-bold text-sm truncate">{hotel.name}</p>
          <div className="flex items-center gap-1 mt-0.5">
            {Array.from({ length: hotel.star_rating }).map((_, i) => (
              <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            ))}
          </div>
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3" />
            <span className="truncate">{hotel.city}</span>
          </div>
        </div>
        {hotel.min_price !== undefined && (
          <p className="text-sm font-bold text-primary mt-1">
            Rp {hotel.min_price.toLocaleString("id-ID")} <span className="text-xs font-normal text-muted-foreground">/night</span>
          </p>
        )}
      </div>
    </button>
  );
}
