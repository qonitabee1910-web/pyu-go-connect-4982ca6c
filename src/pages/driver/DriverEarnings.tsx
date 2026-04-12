import { useState } from "react";
import { useDriverStore } from "@/stores/driverStore";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, TrendingUp } from "lucide-react";

export default function DriverEarnings() {
  const { driverId } = useDriverStore();
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");

  const getStartDate = () => {
    const now = new Date();
    if (period === "day") return now.toISOString().split("T")[0];
    if (period === "week") {
      now.setDate(now.getDate() - 7);
      return now.toISOString();
    }
    now.setMonth(now.getMonth() - 1);
    return now.toISOString();
  };

  const { data: earnings } = useQuery({
    queryKey: ["driver-earnings", driverId, period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("driver_earnings")
        .select("*")
        .eq("driver_id", driverId!)
        .gte("created_at", getStartDate())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!driverId,
  });

  const totalGross = earnings?.reduce((s, e) => s + Number(e.gross_fare), 0) ?? 0;
  const totalCommission = earnings?.reduce((s, e) => s + Number(e.commission_amount), 0) ?? 0;
  const totalNet = earnings?.reduce((s, e) => s + Number(e.net_earning), 0) ?? 0;
  const fmt = (n: number) => new Intl.NumberFormat("id-ID").format(n);

  return (
    <div className="px-4 pt-4 space-y-4">
      <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
        <TabsList className="w-full">
          <TabsTrigger value="day" className="flex-1">Hari Ini</TabsTrigger>
          <TabsTrigger value="week" className="flex-1">Minggu</TabsTrigger>
          <TabsTrigger value="month" className="flex-1">Bulan</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Summary */}
      <Card className="bg-emerald-600 text-white border-0">
        <CardContent className="p-4 text-center">
          <Wallet className="w-8 h-8 mx-auto mb-2 opacity-80" />
          <p className="text-3xl font-bold">Rp {fmt(totalNet)}</p>
          <p className="text-sm opacity-80">Pendapatan Bersih</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold">Rp {fmt(totalGross)}</p>
            <p className="text-xs text-muted-foreground">Total Tarif</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold text-red-500">-Rp {fmt(totalCommission)}</p>
            <p className="text-xs text-muted-foreground">Komisi Platform</p>
          </CardContent>
        </Card>
      </div>

      {/* Earnings list */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm">Detail Pendapatan</h3>
        {!earnings?.length && <p className="text-sm text-muted-foreground">Belum ada pendapatan.</p>}
        {earnings?.map((e) => (
          <Card key={e.id}>
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Rp {fmt(Number(e.net_earning))}</p>
                <p className="text-[10px] text-muted-foreground">
                  Tarif Rp {fmt(Number(e.gross_fare))} • Komisi {(Number(e.commission_rate) * 100).toFixed(0)}%
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(e.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
