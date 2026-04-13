import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, AlertCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface DropoffSelectorProps {
  rayons: any[] | undefined;
  selectedRoute: any;
  selectedScheduleDeparture: string;
  onSelectDropoffPoint: (rayon: any, point: any) => void;
  onSkip: () => void;
  onBack: () => void;
}

export function DropoffSelector({
  rayons,
  selectedRoute,
  selectedScheduleDeparture,
  onSelectDropoffPoint,
  onSkip,
  onBack
}: DropoffSelectorProps) {
  // Filter only dropoff-type points
  const dropoffRayons = rayons?.map(r => ({
    ...r,
    pickup_points: (r.pickup_points || []).filter((p: any) => p.point_type === 'dropoff')
  })).filter(r => r.pickup_points.length > 0);

  if (!rayons) {
    return (
      <div className="space-y-3">
        <Card>
          <CardContent className="p-6 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Memuat titik turun...</span>
          </CardContent>
        </Card>
        <Button variant="outline" className="w-full" onClick={onBack}>Kembali</Button>
      </div>
    );
  }

  if (!dropoffRayons || dropoffRayons.length === 0) {
    return (
      <div className="space-y-3">
        <Card className="border-muted">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Tidak ada titik turun khusus</p>
              <p className="text-xs text-muted-foreground mt-1">Tujuan akhir: {selectedRoute?.destination}</p>
            </div>
          </CardContent>
        </Card>
        <Button className="w-full" onClick={onSkip}>Lanjutkan ke Pilih Kursi</Button>
        <Button variant="outline" className="w-full" onClick={onBack}>Kembali</Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Pilih Titik Turun
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {selectedRoute?.name} • {format(new Date(selectedScheduleDeparture), "dd MMM yyyy, HH:mm")}
          </p>
        </CardHeader>
      </Card>

      {dropoffRayons.map((rayon) => (
        <div key={rayon.id} className="space-y-2">
          <div className="px-1">
            <h3 className="text-sm font-bold text-muted-foreground">{rayon.name}</h3>
            {rayon.description && <p className="text-xs text-muted-foreground">{rayon.description}</p>}
          </div>
          <div className="space-y-1">
            {rayon.pickup_points.map((p: any) => (
              <button
                key={p.id}
                onClick={() => onSelectDropoffPoint(rayon, p)}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-border hover:bg-accent/50 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 text-left">
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg min-w-fit">
                    T{p.stop_order}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.departure_time ? `${p.departure_time} WIB` : ""}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}

      <Button variant="ghost" className="w-full text-sm" onClick={onSkip}>
        Lewati — Turun di {selectedRoute?.destination}
      </Button>
      <Button variant="outline" className="w-full" onClick={onBack}>Kembali</Button>
    </div>
  );
}
