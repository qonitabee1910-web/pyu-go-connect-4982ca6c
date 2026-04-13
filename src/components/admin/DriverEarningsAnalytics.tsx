import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { DriverAdminService } from "@/services/DriverAdminService";
import { Loader2, Download, TrendingUp } from "lucide-react";

interface DriverEarningsAnalyticsProps {
  driverId: string;
}

export function DriverEarningsAnalytics({ driverId }: DriverEarningsAnalyticsProps) {
  const { data: earnings, isLoading, error } = useQuery({
    queryKey: ["driver-earnings", driverId],
    queryFn: () => DriverAdminService.getDriverEarnings(driverId),
    staleTime: 5 * 60 * 1000, // 5 minutes
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
        <p className="text-sm text-red-700">Gagal memuat data penghasilan</p>
      </div>
    );
  }

  if (!earnings) return null;

  // Prepare data for charts
  const dailyData = Object.entries(earnings.dailyEarnings).map(([date, amount]) => ({
    date,
    earnings: amount,
  }));

  const chartData = [
    {
      name: "Penghasilan Harian Rata-rata",
      value: earnings.totalEarnings / Math.max(1, earnings.completedRides),
    },
    {
      name: "Total Penghasilan",
      value: earnings.totalEarnings,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Penghasilan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp {new Intl.NumberFormat("id-ID").format(Math.floor(earnings.totalEarnings))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Perjalanan Selesai
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{earnings.completedRides}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Penghasilan Per Perjalanan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp {new Intl.NumberFormat("id-ID").format(
                Math.floor(earnings.totalEarnings / Math.max(1, earnings.completedRides))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Hari Aktif
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(earnings.dailyEarnings).length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {dailyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Penghasilan Harian</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip
                  formatter={(value: any) => `Rp ${new Intl.NumberFormat("id-ID").format(Number(value))}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="earnings"
                  stroke="#3b82f6"
                  dot={false}
                  name="Penghasilan (Rp)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Ride History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Riwayat Perjalanan Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          {earnings.rides.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada riwayat perjalanan</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="text-left py-2 px-2">Waktu</th>
                    <th className="text-left py-2 px-2">Penghasilan</th>
                    <th className="text-left py-2 px-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {earnings.rides.slice(0, 10).map((ride: any) => (
                    <tr key={ride.id} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-2">
                        {new Date(ride.created_at).toLocaleDateString("id-ID", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="py-2 px-2 font-medium">
                        Rp {new Intl.NumberFormat("id-ID").format(Math.floor(ride.fare || 0))}
                      </td>
                      <td className="py-2 px-2">
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs">
                          Selesai
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
