import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { DriverAdminService } from "@/services/DriverAdminService";
import { Loader2, Clock, MapPin, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DriverActivityLogProps {
  driverId: string;
}

const statusStyles: Record<string, { bg: string; text: string }> = {
  completed: { bg: "bg-emerald-50", text: "text-emerald-700" },
  cancelled: { bg: "bg-red-50", text: "text-red-700" },
  pending: { bg: "bg-amber-50", text: "text-amber-700" },
  accepted: { bg: "bg-blue-50", text: "text-blue-700" },
};

export function DriverActivityLog({ driverId }: DriverActivityLogProps) {
  const { data: activities, isLoading, error } = useQuery({
    queryKey: ["driver-activity", driverId],
    queryFn: () => DriverAdminService.getDriverActivityLog(driverId, 30),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-700">Gagal memuat aktivitas driver</p>
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Belum ada aktivitas</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Aktivitas & Riwayat Perjalanan</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {activities.map((activity: any, idx: number) => {
            const statusInfo = statusStyles[activity.status] || statusStyles.pending;
            return (
              <div
                key={activity.id || idx}
                className={`p-4 rounded-lg border ${statusInfo.bg}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-medium text-sm mb-1">Perjalanan #{idx + 1}</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0 text-slate-400" />
                        <span className="text-slate-600">
                          {activity.pickup_address || "Lokasi Penjemputan"}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0 text-slate-400" />
                        <span className="text-slate-600">
                          {activity.dropoff_address || "Lokasi Tujuan"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Badge className={`ml-2 whitespace-nowrap ${statusInfo.text}`}>
                    {activity.status === "completed"
                      ? "Selesai"
                      : activity.status === "cancelled"
                      ? "Dibatalkan"
                      : activity.status === "accepted"
                      ? "Diterima"
                      : "Pending"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <div className="flex gap-4 text-xs text-slate-600">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>
                        {new Date(activity.created_at).toLocaleDateString("id-ID", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                    {activity.distance_km && (
                      <div>
                        Jarak: {Number(activity.distance_km).toFixed(1)} km
                      </div>
                    )}
                  </div>
                  {activity.fare && (
                    <div className="flex items-center gap-1 font-medium text-emerald-700">
                      <DollarSign className="w-3 h-3" />
                      Rp {new Intl.NumberFormat("id-ID").format(Math.floor(activity.fare))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
