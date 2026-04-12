
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Bike, Car, UserRound, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function ServiceSettings({ driver, onUpdate }: { driver: any, onUpdate: () => void }) {
  const [updating, setUpdating] = useState<string | null>(null);

  const handleToggle = async (key: string, value: boolean) => {
    setUpdating(key);
    try {
      const { error } = await (supabase
        .from("drivers") as any)
        .update({ [key]: value })
        .eq("id", driver.id);

      if (error) throw error;
      
      toast.success("Pengaturan layanan diperbarui");
      onUpdate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-slate-800 ml-1">Pengaturan Layanan</h3>
      
      <Card className="rounded-[2rem] border-none shadow-md overflow-hidden">
        <CardContent className="p-2 space-y-1">
          <ServiceToggle 
            icon={<Bike className="w-5 h-5 text-emerald-600" />}
            label="Ride: Motor"
            description="Terima pesanan sepeda motor standar"
            checked={driver.prefers_bike}
            onCheckedChange={(val) => handleToggle("prefers_bike", val)}
            loading={updating === "prefers_bike"}
          />
          <ServiceToggle 
            icon={<UserRound className="w-5 h-5 text-pink-500" />}
            label="Ride: Motor Wanita"
            description="Khusus pengemudi wanita (untuk penumpang wanita)"
            checked={driver.prefers_bike_women}
            onCheckedChange={(val) => handleToggle("prefers_bike_women", val)}
            loading={updating === "prefers_bike_women"}
            disabled={driver.gender !== "female"}
          />
          <ServiceToggle 
            icon={<Car className="w-5 h-5 text-blue-600" />}
            label="Ride: Mobil"
            description="Terima pesanan mobil (Cars)"
            checked={driver.prefers_car}
            onCheckedChange={(val) => handleToggle("prefers_car", val)}
            loading={updating === "prefers_car"}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function ServiceToggle({ icon, label, description, checked, onCheckedChange, loading, disabled = false }: any) {
  return (
    <div className={`flex items-center justify-between p-4 rounded-2xl transition-colors ${disabled ? "opacity-50" : "hover:bg-slate-50"}`}>
      <div className="flex items-center gap-4">
        <div className="bg-slate-50 p-3 rounded-2xl">
          {icon}
        </div>
        <div>
          <p className="font-bold text-slate-800 text-sm">{label}</p>
          <p className="text-[10px] text-slate-400 font-medium">{description}</p>
        </div>
      </div>
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
      ) : (
        <Switch 
          checked={checked} 
          onCheckedChange={onCheckedChange} 
          disabled={disabled}
          className="data-[state=checked]:bg-emerald-600"
        />
      )}
    </div>
  );
}
