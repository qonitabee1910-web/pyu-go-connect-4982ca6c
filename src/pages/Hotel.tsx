import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HotelCard } from "@/components/hotel/HotelCard";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Building2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Hotel() {
  const [search, setSearch] = useState("");
  const [starFilter, setStarFilter] = useState<number | null>(null);

  const { data: hotels, isLoading } = useQuery({
    queryKey: ["hotels"],
    queryFn: async () => {
      const { data: hotelData, error } = await supabase
        .from("hotels")
        .select("*")
        .eq("active", true)
        .order("rating", { ascending: false });
      if (error) throw error;

      // Get min price per hotel
      const { data: rooms } = await supabase
        .from("hotel_rooms")
        .select("hotel_id, price_per_night")
        .eq("active", true);

      const minPrices: Record<string, number> = {};
      rooms?.forEach((r) => {
        if (!minPrices[r.hotel_id] || r.price_per_night < minPrices[r.hotel_id]) {
          minPrices[r.hotel_id] = r.price_per_night;
        }
      });

      return hotelData.map((h) => ({ ...h, min_price: minPrices[h.id] }));
    },
  });

  const filtered = hotels?.filter((h) => {
    const matchSearch = !search || h.name.toLowerCase().includes(search.toLowerCase()) || h.city.toLowerCase().includes(search.toLowerCase());
    const matchStar = !starFilter || h.star_rating === starFilter;
    return matchSearch && matchStar;
  });

  return (
    <div className="flex flex-col min-h-screen pb-20">
      {/* Header */}
      <div className="gradient-primary px-6 pt-8 pb-6 rounded-b-3xl">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-6 h-6 text-primary-foreground" />
          <h1 className="text-xl font-extrabold text-primary-foreground">Hotels</h1>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search city or hotel name..."
            className="pl-9 bg-card/90 backdrop-blur border-0"
          />
        </div>
      </div>

      {/* Star filter */}
      <div className="px-6 mt-4 flex gap-2 overflow-x-auto">
        <Button variant={starFilter === null ? "default" : "outline"} size="sm" className="text-xs h-7 shrink-0" onClick={() => setStarFilter(null)}>All</Button>
        {[5, 4, 3, 2, 1].map((s) => (
          <Button key={s} variant={starFilter === s ? "default" : "outline"} size="sm" className="text-xs h-7 shrink-0 gap-1" onClick={() => setStarFilter(s)}>
            {s} <Star className="w-3 h-3 fill-current" />
          </Button>
        ))}
      </div>

      {/* Hotel list */}
      <div className="px-6 mt-4 space-y-3 flex-1">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : !filtered?.length ? (
          <div className="text-center py-12 text-muted-foreground">
            <Building2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No hotels found</p>
          </div>
        ) : (
          filtered.map((hotel) => <HotelCard key={hotel.id} hotel={hotel} />)
        )}
      </div>
    </div>
  );
}
