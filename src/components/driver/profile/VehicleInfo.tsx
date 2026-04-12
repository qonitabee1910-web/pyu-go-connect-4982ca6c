
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Car, Hash, Calendar, Palette, 
  ShieldCheck, ShieldAlert, Edit2, Plus, 
  Image as ImageIcon, Loader2
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function VehicleInfo({ vehicles, currentVehicleId, onUpdate }: any) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [model, setModel] = useState("");
  const [plate, setPlate] = useState("");
  const [year, setYear] = useState("");
  const [color, setColor] = useState("");

  const handleEdit = (v: any) => {
    setEditingVehicle(v);
    setModel(v.model || "");
    setPlate(v.plate_number || "");
    setYear(v.year?.toString() || "");
    setColor(v.color || "");
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!model || !plate) {
      toast.error("Model dan Nomor Polisi wajib diisi");
      return;
    }

    setLoading(true);
    try {
      const { error } = await (supabase
        .from("vehicles") as any)
        .update({
          model,
          plate_number: plate,
          year: parseInt(year) || null,
          color,
        })
        .eq("id", editingVehicle.id);

      if (error) throw error;

      toast.success("Informasi kendaraan diperbarui");
      setIsModalOpen(false);
      onUpdate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-1">
        <h3 className="font-bold text-slate-800">Informasi Kendaraan</h3>
        <Button variant="ghost" size="sm" className="text-emerald-600 font-bold gap-1">
          <Plus className="w-4 h-4" /> Tambah
        </Button>
      </div>

      {vehicles && vehicles.length > 0 ? (
        <div className="space-y-3">
          {vehicles.map((v: any) => (
            <Card key={v.id} className={`rounded-[2rem] border-none shadow-md overflow-hidden ${v.id === currentVehicleId ? "ring-2 ring-emerald-500" : ""}`}>
              <CardContent className="p-0">
                <div className="flex flex-col">
                  {/* Vehicle Image Placeholder */}
                  <div className="h-32 bg-slate-100 flex items-center justify-center relative">
                    {v.image_url ? (
                      <img src={v.image_url} alt={v.model} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-12 h-12 text-slate-300" />
                    )}
                    {v.id === currentVehicleId && (
                      <Badge className="absolute top-3 left-3 bg-emerald-600">Aktif</Badge>
                    )}
                  </div>
                  
                  <div className="p-5 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-extrabold text-slate-900 text-lg">{v.model}</p>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{v.vehicle_type}</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="rounded-full border-slate-200"
                        onClick={() => handleEdit(v)}
                      >
                        <Edit2 className="w-4 h-4 text-slate-600" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <VehicleDetail icon={<Hash className="w-3 h-3" />} label="No. Polisi" value={v.plate_number} />
                      <VehicleDetail icon={<Calendar className="w-3 h-3" />} label="Tahun" value={v.year || "-"} />
                      <VehicleDetail icon={<Palette className="w-3 h-3" />} label="Warna" value={v.color || "-"} />
                      <div className="flex items-center gap-2">
                        {v.is_verified ? (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                            <ShieldCheck className="w-3 h-3" /> VERIFIED
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                            <ShieldAlert className="w-3 h-3" /> PENDING
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-white rounded-3xl border-2 border-dashed border-slate-200">
          <Car className="w-12 h-12 text-slate-200 mx-auto mb-2" />
          <p className="text-slate-400 text-sm font-medium">Belum ada kendaraan terdaftar</p>
        </div>
      )}

      {/* Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="rounded-3xl border-none">
          <DialogHeader>
            <DialogTitle>Edit Kendaraan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Model Kendaraan</Label>
              <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Contoh: Toyota Avanza" className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Nomor Polisi</Label>
              <Input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="Contoh: B 1234 ABC" className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tahun</Label>
                <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2022" className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Warna</Label>
                <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Hitam" className="rounded-xl" />
              </div>
            </div>
          </div>
          <div className="pt-2">
            <Button className="w-full h-12 rounded-xl bg-emerald-600 font-bold" onClick={handleSave} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : "Simpan Perubahan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VehicleDetail({ icon, label, value }: any) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        {icon} {label}
      </div>
      <p className="text-sm font-bold text-slate-700">{value}</p>
    </div>
  );
}

function Badge({ children, className }: any) {
  return (
    <span className={`px-2 py-1 rounded text-[10px] font-bold text-white ${className}`}>
      {children}
    </span>
  );
}
