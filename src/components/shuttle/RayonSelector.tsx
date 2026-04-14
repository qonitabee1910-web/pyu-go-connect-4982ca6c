import { useState } from "react";
import { MapPin, Search, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface RayonSelectorProps {
  rayons: any[];
  onSelect: (rayon: any) => void;
}

export function RayonSelector({ rayons, onSelect }: RayonSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRayons = rayons.filter((rayon) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      rayon.name.toLowerCase().includes(searchLower) ||
      rayon.shuttle_routes?.origin?.toLowerCase().includes(searchLower) ||
      rayon.shuttle_routes?.destination?.toLowerCase().includes(searchLower) ||
      rayon.shuttle_routes?.name?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Cari wilayah atau tujuan..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {filteredRayons.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-20" />
            <p className="text-sm text-muted-foreground">Wilayah tidak ditemukan</p>
            <Button 
              variant="link" 
              className="mt-2 text-primary"
              onClick={() => setSearchQuery("")}
            >
              Lihat semua wilayah
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredRayons.map((rayon) => (
            <Card 
              key={rayon.id} 
              className="cursor-pointer hover:border-primary transition-colors group"
              onClick={() => onSelect(rayon)}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{rayon.name}</h4>
                  {rayon.shuttle_routes && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Rute: {rayon.shuttle_routes.origin} → {rayon.shuttle_routes.destination}
                    </p>
                  )}
                  {rayon.description && (
                    <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1 italic">
                      {rayon.description}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
