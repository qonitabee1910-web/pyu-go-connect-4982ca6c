import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

export default function PickupPointsTab() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [filterRayonId, setFilterRayonId] = useState<string>("all");
  const [form, setForm] = useState({
    name: "",
    rayon_id: "",
    stop_order: 1,
    fare: 0,
    distance_meters: 0,
    departure_time: "",
    point_type: "pickup",
    active: true,
  });

  const { data: rayons } = useQuery({
    queryKey: ["admin-rayons"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("shuttle_rayons").select("*, shuttle_routes(name)").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: points, isLoading } = useQuery({
    queryKey: ["admin-pickup-points", filterRayonId],
    queryFn: async () => {
      let query = (supabase as any).from("shuttle_pickup_points").select("*, shuttle_rayons(name, shuttle_routes(name))").order("stop_order");
      if (filterRayonId !== "all") query = query.eq("rayon_id", filterRayonId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editId) {
        const { error } = await (supabase as any).from("shuttle_pickup_points").update(data).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("shuttle_pickup_points").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pickup-points"] });
      toast.success(editId ? "Titik diperbarui" : "Titik ditambahkan");
      resetForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("shuttle_pickup_points").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pickup-points"] });
      toast.success("Titik dihapus");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const resetForm = () => {
    setForm({ name: "", rayon_id: "", stop_order: 1, fare: 0, distance_meters: 0, departure_time: "", point_type: "pickup", active: true });
    setEditId(null);
    setOpen(false);
  };

  const handleEdit = (p: any) => {
    setForm({
      name: p.name,
      rayon_id: p.rayon_id,
      stop_order: p.stop_order,
      fare: p.fare,
      distance_meters: p.distance_meters,
      departure_time: p.departure_time || "",
      point_type: p.point_type || "pickup",
      active: p.active,
    });
    setEditId(p.id);
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name || !form.rayon_id) {
      toast.error("Nama dan Rayon wajib diisi");
      return;
    }
    saveMutation.mutate({
      name: form.name,
      rayon_id: form.rayon_id,
      stop_order: form.stop_order,
      fare: form.fare,
      distance_meters: form.distance_meters,
      departure_time: form.departure_time || null,
      point_type: form.point_type,
      active: form.active,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Select value={filterRayonId} onValueChange={setFilterRayonId}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filter rayon" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Rayon</SelectItem>
            {rayons?.map((r: any) => (
              <SelectItem key={r.id} value={r.id}>{r.name} ({r.shuttle_routes?.name})</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Tambah Titik</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editId ? "Edit Titik" : "Tambah Titik Jemput/Turun"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Nama</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nama titik" />
              </div>
              <div>
                <Label>Rayon</Label>
                <Select value={form.rayon_id} onValueChange={v => setForm({ ...form, rayon_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih rayon" /></SelectTrigger>
                  <SelectContent>
                    {rayons?.map((r: any) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipe</Label>
                <Select value={form.point_type} onValueChange={v => setForm({ ...form, point_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pickup">Jemput (Pickup)</SelectItem>
                    <SelectItem value="dropoff">Turun (Dropoff)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Urutan</Label>
                  <Input type="number" value={form.stop_order} onChange={e => setForm({ ...form, stop_order: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Tarif (Rp)</Label>
                  <Input type="number" value={form.fare} onChange={e => setForm({ ...form, fare: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Jarak (m)</Label>
                  <Input type="number" value={form.distance_meters} onChange={e => setForm({ ...form, distance_meters: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Waktu berangkat</Label>
                  <Input value={form.departure_time} onChange={e => setForm({ ...form, departure_time: e.target.value })} placeholder="06:30" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.active} onCheckedChange={v => setForm({ ...form, active: v })} />
                <Label>Aktif</Label>
              </div>
              <Button className="w-full" onClick={handleSubmit} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Menyimpan..." : editId ? "Perbarui" : "Simpan"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Rayon</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Urutan</TableHead>
              <TableHead>Tarif</TableHead>
              <TableHead>Waktu</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8">Memuat...</TableCell></TableRow>
            ) : !points?.length ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Tidak ada data</TableCell></TableRow>
            ) : (
              points.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-xs">{p.shuttle_rayons?.name}</TableCell>
                  <TableCell>
                    <Badge variant={p.point_type === "dropoff" ? "secondary" : "default"} className="text-xs">
                      {p.point_type === "dropoff" ? "Turun" : "Jemput"}
                    </Badge>
                  </TableCell>
                  <TableCell>{p.stop_order}</TableCell>
                  <TableCell>Rp {Number(p.fare).toLocaleString("id-ID")}</TableCell>
                  <TableCell>{p.departure_time || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={p.active ? "default" : "outline"} className="text-xs">
                      {p.active ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(p)}><Pencil className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(p.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
