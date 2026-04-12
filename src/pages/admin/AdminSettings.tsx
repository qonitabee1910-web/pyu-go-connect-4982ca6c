import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Circle, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

type FareConfig = {
  base_fare: number;
  per_km: number;
  min_fare: number;
  surge_multiplier: number;
};

type ZoneConfig = {
  name: string;
  lat: number;
  lng: number;
  radius_km: number;
};

function useSetting(key: string) {
  return useQuery({
    queryKey: ["app-setting", key],
    queryFn: async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("*")
        .eq("key", key)
        .maybeSingle();
      return data;
    },
  });
}

function useSaveSetting(key: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (value: any) => {
      const { error } = await supabase
        .from("app_settings")
        .update({ value, updated_at: new Date().toISOString() })
        .eq("key", key);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["app-setting", key] });
      toast.success("Settings saved");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Ride Fares Tab ────────────────────────────
function RideFaresTab() {
  const { data: setting, isLoading } = useSetting("ride_fares");
  const save = useSaveSetting("ride_fares");
  const [fares, setFares] = useState<Record<string, FareConfig>>({});

  useEffect(() => {
    if (setting?.value) setFares(setting.value as Record<string, FareConfig>);
  }, [setting]);

  const update = (type: string, field: keyof FareConfig, val: string) => {
    setFares((prev) => ({
      ...prev,
      [type]: { ...prev[type], [field]: Number(val) },
    }));
  };

  if (isLoading) return <Loader2 className="w-5 h-5 animate-spin mx-auto mt-8" />;

  const labels: Record<string, string> = { car: "Car", bike: "Bike", bike_women: "Bike Women" };

  return (
    <div className="space-y-4">
      {Object.entries(fares).map(([type, cfg]) => (
        <Card key={type}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{labels[type] || type}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Base Fare (Rp)</Label>
                <Input type="number" value={cfg.base_fare} onChange={(e) => update(type, "base_fare", e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Per KM (Rp)</Label>
                <Input type="number" value={cfg.per_km} onChange={(e) => update(type, "per_km", e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Min Fare (Rp)</Label>
                <Input type="number" value={cfg.min_fare} onChange={(e) => update(type, "min_fare", e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Surge Multiplier</Label>
                <Input type="number" step="0.1" value={cfg.surge_multiplier} onChange={(e) => update(type, "surge_multiplier", e.target.value)} className="h-8 text-xs" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      <Button onClick={() => save.mutate(fares)} disabled={save.isPending} className="w-full md:w-auto">
        {save.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
        Save Ride Fares
      </Button>
    </div>
  );
}

// ─── Service Zones Tab ─────────────────────────
function ServiceZonesTab() {
  const { data: setting, isLoading } = useSetting("service_zones");
  const save = useSaveSetting("service_zones");
  const [zones, setZones] = useState<ZoneConfig[]>([]);

  useEffect(() => {
    if (setting?.value) setZones(setting.value as ZoneConfig[]);
  }, [setting]);

  const updateZone = (i: number, field: keyof ZoneConfig, val: string) => {
    setZones((prev) => prev.map((z, idx) => (idx === i ? { ...z, [field]: field === "name" ? val : Number(val) } : z)));
  };

  const addZone = () => setZones((prev) => [...prev, { name: "", lat: 0, lng: 0, radius_km: 10 }]);
  const removeZone = (i: number) => setZones((prev) => prev.filter((_, idx) => idx !== i));
  const validZones = useMemo(() => zones.filter((z) => z.lat !== 0 && z.lng !== 0 && z.radius_km > 0), [zones]);

  if (isLoading) return <Loader2 className="w-5 h-5 animate-spin mx-auto mt-8" />;

  return (
    <div className="space-y-4">
      {/* Map visualization */}
      {validZones.length > 0 && (
        <Card>
          <CardContent className="pt-4 p-0 overflow-hidden rounded-lg">
            <div className="h-[300px] md:h-[400px]">
              <MapContainer
                center={[validZones[0].lat, validZones[0].lng]}
                zoom={10}
                className="h-full w-full rounded-lg z-0"
                scrollWheelZoom
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <FitZones zones={validZones} />
                {validZones.map((z, i) => (
                  <Circle
                    key={`${i}-${z.lat}-${z.lng}-${z.radius_km}`}
                    center={[z.lat, z.lng]}
                    radius={z.radius_km * 1000}
                    pathOptions={{ color: "#10b981", fillColor: "#10b981", fillOpacity: 0.15, weight: 2 }}
                  >
                    <Popup>
                      <span className="font-semibold text-sm">{z.name || `Zone ${i + 1}`}</span>
                      <br />
                      <span className="text-xs text-muted-foreground">Radius: {z.radius_km} km</span>
                    </Popup>
                  </Circle>
                ))}
              </MapContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Zone cards */}
      {zones.map((z, i) => (
        <Card key={i}>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
              <div className="col-span-2 md:col-span-1">
                <Label className="text-xs">Zone Name</Label>
                <Input value={z.name} onChange={(e) => updateZone(i, "name", e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Latitude</Label>
                <Input type="number" step="0.0001" value={z.lat} onChange={(e) => updateZone(i, "lat", e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Longitude</Label>
                <Input type="number" step="0.0001" value={z.lng} onChange={(e) => updateZone(i, "lng", e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Radius (km)</Label>
                <Input type="number" value={z.radius_km} onChange={(e) => updateZone(i, "radius_km", e.target.value)} className="h-8 text-xs" />
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeZone(i)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={addZone}>
          <Plus className="w-4 h-4 mr-1" /> Add Zone
        </Button>
        <Button onClick={() => save.mutate(zones)} disabled={save.isPending} size="sm">
          {save.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          Save Zones
        </Button>
      </div>
    </div>
  );
}

// Helper to auto-fit map bounds to all zones
function FitZones({ zones }: { zones: ZoneConfig[] }) {
  const map = useMap();
  useEffect(() => {
    if (zones.length === 0) return;
    const L = (window as any).L;
    if (!L) return;
    const bounds = L.latLngBounds(zones.map((z: ZoneConfig) => [z.lat, z.lng]));
    // Pad bounds by largest radius
    const maxRadius = Math.max(...zones.map((z: ZoneConfig) => z.radius_km));
    const padDeg = maxRadius / 111; // rough km-to-degree
    bounds.extend([bounds.getSouth() - padDeg, bounds.getWest() - padDeg]);
    bounds.extend([bounds.getNorth() + padDeg, bounds.getEast() + padDeg]);
    map.fitBounds(bounds, { padding: [20, 20], maxZoom: 13 });
  }, [zones, map]);
  return null;
}

// ─── Payment Gateways Tab ──────────────────────
function PaymentGatewaysTab() {
  const qc = useQueryClient();

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ["admin-payment-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("payment_settings").select("*").order("gateway");
      return data || [];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("payment_settings").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-payment-settings"] }); toast.success("Gateway updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const setDefaultMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      await supabase.from("payment_settings").update({ is_default: false }).neq("id", id);
      const { error } = await supabase.from("payment_settings").update({ is_default: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-payment-settings"] }); toast.success("Default gateway updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const commissionMutation = useMutation({
    mutationFn: async ({ id, commission_rate }: { id: string; commission_rate: number }) => {
      const { error } = await supabase.from("payment_settings").update({ commission_rate }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-payment-settings"] }); toast.success("Commission updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <Loader2 className="w-5 h-5 animate-spin mx-auto mt-8" />;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {settings.map((gw: any) => (
        <GatewayCard
          key={gw.id}
          gw={gw}
          onToggle={(active) => toggleMutation.mutate({ id: gw.id, is_active: active })}
          onSetDefault={() => setDefaultMutation.mutate({ id: gw.id })}
          onCommissionChange={(rate) => commissionMutation.mutate({ id: gw.id, commission_rate: rate })}
        />
      ))}
      {!settings.length && <p className="text-sm text-muted-foreground col-span-2 text-center py-8">No payment gateways configured</p>}
    </div>
  );
}

function GatewayCard({ gw, onToggle, onSetDefault, onCommissionChange }: {
  gw: any; onToggle: (v: boolean) => void; onSetDefault: () => void; onCommissionChange: (r: number) => void;
}) {
  const [commission, setCommission] = useState(String((gw.commission_rate || 0.1) * 100));
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base capitalize flex items-center gap-2">
            {gw.gateway}
            {gw.is_default && <Badge className="text-[10px]">Default</Badge>}
          </CardTitle>
          <Switch checked={gw.is_active} onCheckedChange={onToggle} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Label className="text-xs shrink-0">Commission (%)</Label>
          <Input type="number" value={commission} onChange={(e) => setCommission(e.target.value)} className="h-8 w-20 text-xs" min="0" max="50" step="0.5" />
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => onCommissionChange(Number(commission) / 100)}>Save</Button>
        </div>
        {!gw.is_default && gw.is_active && (
          <Button size="sm" variant="ghost" className="text-xs" onClick={onSetDefault}>Set as Default</Button>
        )}
        <p className="text-[10px] text-muted-foreground">Environment: {gw.config?.environment || "sandbox"}</p>
      </CardContent>
    </Card>
  );
}

// ─── Main Settings Page ────────────────────────
export default function AdminSettings() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">App Settings</h1>
      <Tabs defaultValue="fares">
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="fares">Ride Fares</TabsTrigger>
          <TabsTrigger value="zones">Service Zones</TabsTrigger>
          <TabsTrigger value="gateways">Payment Gateways</TabsTrigger>
        </TabsList>
        <TabsContent value="fares"><RideFaresTab /></TabsContent>
        <TabsContent value="zones"><ServiceZonesTab /></TabsContent>
        <TabsContent value="gateways"><PaymentGatewaysTab /></TabsContent>
      </Tabs>
    </div>
  );
}
