import { MapPin, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PickupPointSelectorProps {
  pickupPoints: any[];
  onSelect: (pointId: string) => void;
  onBack: () => void;
}

export function PickupPointSelector({ pickupPoints, onSelect, onBack }: PickupPointSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        {pickupPoints.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className="w-full flex items-center justify-between p-3.5 rounded-xl border border-border hover:bg-accent/50 hover:border-primary/30 transition-all text-left group"
          >
            <div className="flex items-center gap-3.5">
              <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg min-w-fit group-hover:bg-primary group-hover:text-white transition-colors">
                J{p.stop_order}
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900 line-clamp-1">{p.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {p.departure_time ? `${p.departure_time} WIB` : ""}
                  {p.departure_time && p.distance_meters > 0 ? " • " : ""}
                  {p.distance_meters > 0
                    ? p.distance_meters >= 1000 
                      ? `${(p.distance_meters / 1000).toFixed(1)} km` 
                      : `${p.distance_meters}m`
                    : ""}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="font-bold text-sm text-primary">
                Rp {Number(p.fare || 0).toLocaleString("id-ID")}
              </span>
              <span className="text-[10px] text-muted-foreground">Biaya Jemput</span>
            </div>
          </button>
        ))}
      </div>
      
      <Button variant="ghost" className="w-full flex items-center gap-2 text-muted-foreground hover:text-primary" onClick={onBack}>
        <ArrowLeft className="w-4 h-4" />
        Pilih Wilayah Lain
      </Button>
    </div>
  );
}
