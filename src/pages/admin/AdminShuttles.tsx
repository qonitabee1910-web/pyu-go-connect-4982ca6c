import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Trash2, Edit, ChevronDown, ChevronUp, ArrowUp, ArrowDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import ShuttleTicket from "@/components/shuttle/ShuttleTicket";

// ---- ROUTES TAB (existing) ----
function RoutesTab() {
  const { data: routes, isLoading } = useQuery({
    queryKey: ["admin-shuttle-routes"],
    queryFn: async () => {
      const { data: routesData, error: rErr } = await supabase.from("shuttle_routes").select("*").order("name");
      if (rErr) throw rErr;
      const { data: schedulesData } = await supabase.from("shuttle_schedules").select("route_id");
      const { data: bookingsData } = await supabase.from("shuttle_bookings").select("schedule_id, payment_status, shuttle_schedules!inner(route_id)").eq("status", "confirmed");
      return routesData.map((r) => {
        const routeBookings = (bookingsData ?? []).filter((b: any) => b.shuttle_schedules?.route_id === r.id);
        return {
          ...r,
          scheduleCount: (schedulesData ?? []).filter((s) => s.route_id === r.id).length,
          bookingCount: routeBookings.length,
          paidCount: routeBookings.filter((b: any) => b.payment_status === "paid").length,
          unpaidCount: routeBookings.filter((b: any) => b.payment_status === "unpaid" || !b.payment_status).length,
        };
      });
    },
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!routes?.length) return <p className="text-sm text-muted-foreground">No shuttle routes yet.</p>;

  return (
    <div className="space-y-3">
      {routes.map((r) => (
        <Card key={r.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{r.name}</CardTitle>
            <p className="text-xs text-muted-foreground">{r.origin} → {r.destination}</p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span>{r.scheduleCount} schedules</span>
            <span>{r.bookingCount} bookings</span>
            <Badge variant="secondary" className="text-xs">{r.paidCount} paid</Badge>
            <Badge variant="outline" className="text-xs">{r.unpaidCount} unpaid</Badge>
            <span>Rp {r.base_fare.toLocaleString("id-ID")}/seat</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---- RAYONS TAB ----
interface PickupPoint {
  id?: string;
  stop_order: number;
  name: string;
  departure_time: string;
  distance_meters: number;
  fare: number;
  active: boolean;
}

function RayonForm({ rayon, onClose }: { rayon?: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(rayon?.name ?? "");
  const [description, setDescription] = useState(rayon?.description ?? "");
  const [points, setPoints] = useState<PickupPoint[]>(rayon?.pickup_points ?? []);
  const [saving, setSaving] = useState(false);

  const addPoint = () => {
    setPoints([...points, { stop_order: points.length + 1, name: "", departure_time: "", distance_meters: 0, fare: 0, active: true }]);
  };

  const updatePoint = (idx: number, field: string, value: any) => {
    const updated = [...points];
    (updated[idx] as any)[field] = value;
    setPoints(updated);
  };

  const removePoint = (idx: number) => {
    setPoints(points.filter((_, i) => i !== idx).map((p, i) => ({ ...p, stop_order: i + 1 })));
  };

  const movePoint = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= points.length) return;
    const updated = [...points];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    setPoints(updated.map((p, i) => ({ ...p, stop_order: i + 1 })));
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Nama rayon wajib diisi"); return; }
    setSaving(true);
    try {
      let rayonId = rayon?.id;
      if (rayonId) {
        const { error } = await supabase.from("shuttle_rayons").update({ name, description } as any).eq("id", rayonId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("shuttle_rayons").insert({ name, description } as any).select("id").single();
        if (error) throw error;
        rayonId = data.id;
      }

      // Delete existing points and re-insert
      if (rayon?.id) {
        await supabase.from("shuttle_pickup_points").delete().eq("rayon_id", rayon.id);
      }
      if (points.length > 0) {
        const { error: pErr } = await supabase.from("shuttle_pickup_points").insert(
          points.map((p) => ({
            rayon_id: rayonId,
            stop_order: p.stop_order,
            name: p.name,
            departure_time: p.departure_time,
            distance_meters: p.distance_meters,
            fare: p.fare,
            active: p.active,
          } as any))
        );
        if (pErr) throw pErr;
      }

      toast.success(rayon ? "Rayon diperbarui" : "Rayon ditambahkan");
      qc.invalidateQueries({ queryKey: ["admin-rayons"] });
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto">
      <div className="space-y-2">
        <Label>Nama Rayon</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="RAYON A" />
      </div>
      <div className="space-y-2">
        <Label>Deskripsi</Label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Keterangan rayon" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Titik Jemput</Label>
          <Button size="sm" variant="outline" onClick={addPoint}><Plus className="w-3 h-3 mr-1" />Tambah</Button>
        </div>

        {points.length === 0 && <p className="text-xs text-muted-foreground">Belum ada titik jemput</p>}

        <div className="space-y-2">
          {points.map((p, idx) => (
            <div key={idx} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary">J{p.stop_order}</span>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => movePoint(idx, -1)} disabled={idx === 0}>
                    <ArrowUp className="w-3 h-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => movePoint(idx, 1)} disabled={idx === points.length - 1}>
                    <ArrowDown className="w-3 h-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removePoint(idx)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Nama</Label>
                  <Input className="h-8 text-xs" value={p.name} onChange={(e) => updatePoint(idx, "name", e.target.value)} placeholder="Hermes Palace" />
                </div>
                <div>
                  <Label className="text-xs">Waktu</Label>
                  <Input className="h-8 text-xs" value={p.departure_time} onChange={(e) => updatePoint(idx, "departure_time", e.target.value)} placeholder="06.00" />
                </div>
                <div>
                  <Label className="text-xs">Jarak (Mtr)</Label>
                  <Input className="h-8 text-xs" type="number" value={p.distance_meters} onChange={(e) => updatePoint(idx, "distance_meters", Number(e.target.value))} />
                </div>
                <div>
                  <Label className="text-xs">Tarif (Rp)</Label>
                  <Input className="h-8 text-xs" type="number" value={p.fare} onChange={(e) => updatePoint(idx, "fare", Number(e.target.value))} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Button className="w-full gradient-primary text-primary-foreground" onClick={handleSave} disabled={saving}>
        {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
        {rayon ? "Simpan Perubahan" : "Tambah Rayon"}
      </Button>
    </div>
  );
}

function RayonsTab() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRayon, setEditRayon] = useState<any>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: rayons, isLoading } = useQuery({
    queryKey: ["admin-rayons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("shuttle_rayons").select("*").order("name");
      if (error) throw error;
      const { data: points } = await supabase.from("shuttle_pickup_points").select("*").order("stop_order");
      return data.map((r) => ({
        ...r,
        pickup_points: (points ?? []).filter((p) => p.rayon_id === r.id),
      }));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("shuttle_rayons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-rayons"] }); toast.success("Rayon dihapus"); },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (r: any) => { setEditRayon(r); setDialogOpen(true); };
  const openAdd = () => { setEditRayon(null); setDialogOpen(true); };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Button size="sm" className="gradient-primary text-primary-foreground" onClick={openAdd}>
          <Plus className="w-4 h-4 mr-1" />Tambah Rayon
        </Button>
      </div>

      {!rayons?.length ? (
        <p className="text-sm text-muted-foreground">Belum ada rayon.</p>
      ) : (
        <div className="space-y-3">
          {rayons.map((r) => (
            <Card key={r.id}>
              <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm">{r.name}</CardTitle>
                    {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="text-xs">{r.pickup_points.length} titik</Badge>
                    {expandedId === r.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </CardHeader>
              {expandedId === r.id && (
                <CardContent className="space-y-2">
                  {r.pickup_points.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Tidak ada titik jemput</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-muted-foreground border-b">
                            <th className="text-left py-1 pr-2">Order</th>
                            <th className="text-left py-1 pr-2">Nama</th>
                            <th className="text-left py-1 pr-2">Waktu</th>
                            <th className="text-right py-1 pr-2">Jarak</th>
                            <th className="text-right py-1">Tarif</th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.pickup_points.map((p: any) => (
                            <tr key={p.id} className="border-b border-border/50">
                              <td className="py-1 pr-2 font-bold text-primary">J{p.stop_order}</td>
                              <td className="py-1 pr-2">{p.name}</td>
                              <td className="py-1 pr-2">{p.departure_time || "-"}</td>
                              <td className="py-1 pr-2 text-right">{p.distance_meters} m</td>
                              <td className="py-1 text-right font-medium">Rp {Number(p.fare).toLocaleString("id-ID")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(r)}><Edit className="w-3 h-3 mr-1" />Edit</Button>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => deleteMutation.mutate(r.id)}>
                      <Trash2 className="w-3 h-3 mr-1" />Hapus
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editRayon ? "Edit Rayon" : "Tambah Rayon"}</DialogTitle>
          </DialogHeader>
          <RayonForm rayon={editRayon} onClose={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---- BOOKINGS TAB ----
function BookingsTab() {
  const [filter, setFilter] = useState<string>("all");
  const [ticketBooking, setTicketBooking] = useState<any>(null);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["admin-shuttle-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shuttle_bookings")
        .select("*, shuttle_schedules!inner(departure_time, route_id, shuttle_routes:route_id(name, origin, destination)), shuttle_pickup_points(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = bookings?.filter((b: any) => filter === "all" || b.payment_status === filter) ?? [];

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {["all", "paid", "pending", "unpaid"].map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="text-xs capitalize">
            {f === "all" ? "Semua" : f}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Tidak ada booking.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((b: any) => {
            const route = b.shuttle_schedules?.shuttle_routes;
            return (
              <Card key={b.id}>
                <CardContent className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-mono font-bold text-xs text-primary">{b.booking_ref}</p>
                    <p className="text-xs text-muted-foreground">{b.guest_name} • {b.seat_count} kursi</p>
                    <p className="text-xs text-muted-foreground">{route?.name ?? "-"}</p>
                    {b.shuttle_pickup_points?.name && <p className="text-xs text-muted-foreground">📍 {b.shuttle_pickup_points.name}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={b.payment_status === "paid" ? "default" : "outline"} className="text-xs">{b.payment_status}</Badge>
                    <Button size="sm" variant="ghost" className="text-xs" onClick={() => setTicketBooking(b)}>Tiket</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!ticketBooking} onOpenChange={() => setTicketBooking(null)}>
        <DialogContent className="max-w-sm">
          {ticketBooking && (
            <ShuttleTicket
              bookingRef={ticketBooking.booking_ref}
              routeName={ticketBooking.shuttle_schedules?.shuttle_routes?.name ?? ""}
              origin={ticketBooking.shuttle_schedules?.shuttle_routes?.origin ?? ""}
              destination={ticketBooking.shuttle_schedules?.shuttle_routes?.destination ?? ""}
              departure={ticketBooking.shuttle_schedules?.departure_time ? format(new Date(ticketBooking.shuttle_schedules.departure_time), "dd MMM yyyy, HH:mm") : ""}
              seatCount={ticketBooking.seat_count}
              guestName={ticketBooking.guest_name ?? ""}
              guestPhone={ticketBooking.guest_phone ?? ""}
              totalFare={ticketBooking.total_fare}
              paymentStatus={ticketBooking.payment_status}
              pickupPointName={ticketBooking.shuttle_pickup_points?.name}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---- MAIN ----
export default function AdminShuttles() {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Shuttle Management</h2>
      <Tabs defaultValue="routes">
        <TabsList className="mb-4">
          <TabsTrigger value="routes">Routes</TabsTrigger>
          <TabsTrigger value="rayons">Rayons</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
        </TabsList>
        <TabsContent value="routes"><RoutesTab /></TabsContent>
        <TabsContent value="rayons"><RayonsTab /></TabsContent>
        <TabsContent value="bookings"><BookingsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
