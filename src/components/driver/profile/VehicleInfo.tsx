
import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Car, Hash, Calendar, Palette, 
  ShieldCheck, ShieldAlert, Edit2, Plus, 
  Image as ImageIcon, Loader2, CheckCircle2,
  Users, Trash2, Camera
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export function VehicleInfo({ driverId, vehicles, currentVehicleId, onUpdate }: any) {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [model, setModel] = useState("");
  const [plate, setPlate] = useState("");
  const [year, setYear] = useState("");
  const [color, setColor] = useState("");
  const [type, setType] = useState("car");
  const [capacity, setCapacity] = useState("4");
  const [imageUrl, setImageUrl] = useState("");

  const resetForm = () => {
    setEditingVehicle(null);
    setModel("");
    setPlate("");
    setYear("");
    setColor("");
    setType("car");
    setCapacity("4");
    setImageUrl("");
  };

  const handleAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEdit = (v: any) => {
    setEditingVehicle(v);
    setModel(v.model || "");
    setPlate(v.plate_number || "");
    setYear(v.year?.toString() || "");
    setColor(v.color || "");
    setType(v.vehicle_type || "car");
    setCapacity(v.capacity?.toString() || "4");
    setImageUrl(v.image_url || "");
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran gambar maksimal 2MB");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = `vehicle-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('vehicles')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('vehicles')
        .getPublicUrl(filePath);

      setImageUrl(publicUrl);
      toast.success("Foto berhasil diunggah");
    } catch (err: any) {
      toast.error("Gagal mengunggah foto: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!model || !plate) {
      toast.error("Model dan Nomor Polisi wajib diisi");
      return;
    }

    setLoading(true);
    try {
      const vehicleData = {
        driver_id: driverId,
        model,
        plate_number: plate,
        year: parseInt(year) || null,
        color,
        vehicle_type: type,
        capacity: parseInt(capacity) || 4,
        image_url: imageUrl,
      };

      if (editingVehicle) {
        const { error } = await (supabase
          .from("vehicles") as any)
          .update(vehicleData)
          .eq("id", editingVehicle.id);
        if (error) throw error;
        toast.success("Informasi kendaraan diperbarui");
      } else {
        const { error } = await (supabase
          .from("vehicles") as any)
          .insert([vehicleData]);
        if (error) throw error;
        toast.success("Kendaraan baru ditambahkan");
      }

      setIsModalOpen(false);
      onUpdate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Hapus kendaraan ini?")) return;
    
    try {
      const { error } = await (supabase
        .from("vehicles") as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Kendaraan dihapus");
      onUpdate();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSetActive = async (id: string) => {
    try {
      const { error } = await (supabase
        .from("drivers") as any)
        .update({ current_vehicle_id: id })
        .eq("id", driverId);
      if (error) throw error;
      toast.success("Kendaraan aktif diperbarui");
      onUpdate();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-1">
        <h3 className="font-bold text-slate-800">Informasi Kendaraan</h3>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-emerald-600 font-bold gap-1 hover:bg-emerald-50"
          onClick={handleAdd}
        >
          <Plus className="w-4 h-4" /> Tambah
        </Button>
      </div>

      {vehicles && vehicles.length > 0 ? (
        <div className="space-y-4">
          {vehicles.map((v: any) => (
            <Card key={v.id} className={`rounded-[2rem] border-none shadow-md overflow-hidden transition-all ${v.id === currentVehicleId ? "ring-4 ring-emerald-500/30" : ""}`}>
              <CardContent className="p-0">
                <div className="flex flex-col">
                  <div className="h-40 bg-slate-100 flex items-center justify-center relative group">
                    {v.image_url ? (
                      <img src={v.image_url} alt={v.model} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-300">
                        <ImageIcon className="w-12 h-12" />
                        <span className="text-[10px] font-bold uppercase">Tanpa Foto</span>
                      </div>
                    )}
                    
                    {v.id === currentVehicleId && (
                      <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-full text-[10px] font-black shadow-lg">
                        <CheckCircle2 className="w-3 h-3" /> AKTIF
                      </div>
                    )}

                    <div className="absolute top-4 right-4 flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-full w-8 h-8 shadow-md bg-white"
                        onClick={() => handleEdit(v)}
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-full w-8 h-8 shadow-md bg-white hover:text-red-600"
                        onClick={() => handleDelete(v.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="p-6 space-y-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-black text-slate-900 text-xl leading-none">{v.model}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                            {v.vehicle_type}
                          </span>
                          {v.is_verified ? (
                            <div className="flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                              <ShieldCheck className="w-2.5 h-2.5" /> VERIFIED
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                              <ShieldAlert className="w-2.5 h-2.5" /> PENDING
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <VehicleDetail icon={<Hash className="w-3.5 h-3.5" />} label="No. Polisi" value={v.plate_number} />
                      <VehicleDetail icon={<Calendar className="w-3.5 h-3.5" />} label="Tahun" value={v.year || "-"} />
                      <VehicleDetail icon={<Palette className="w-3.5 h-3.5" />} label="Warna" value={v.color || "-"} />
                      <VehicleDetail icon={<Users className="w-3.5 h-3.5" />} label="Kapasitas" value={`${v.capacity} Penumpang`} />
                    </div>

                    {v.id !== currentVehicleId && (
                      <Button 
                        variant="outline" 
                        className="w-full h-11 rounded-xl font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        onClick={() => handleSetActive(v.id)}
                      >
                        Gunakan Kendaraan Ini
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 shadow-sm">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Car className="w-10 h-10 text-slate-200" />
          </div>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Belum ada kendaraan</p>
          <Button 
            variant="link" 
            className="text-emerald-600 font-bold mt-2"
            onClick={handleAdd}
          >
            Klik untuk menambah
          </Button>
        </div>
      )}

      {/* Form Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="rounded-3xl border-none max-w-[95%] sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900">
              {editingVehicle ? "Edit Kendaraan" : "Tambah Kendaraan"}
            </DialogTitle>
            <DialogDescription className="font-medium text-slate-500">
              Pastikan data sesuai dengan STNK asli kendaraan Anda.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-5 py-4">
            {/* Image Upload Area */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Foto Kendaraan</Label>
              <div 
                className="h-40 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {imageUrl ? (
                  <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Camera className="w-8 h-8" />
                    <span className="text-[10px] font-black">UNGGAH FOTO</span>
                  </div>
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Model Kendaraan</Label>
              <Input 
                value={model} 
                onChange={(e) => setModel(e.target.value)} 
                placeholder="Toyota Avanza / Honda Vario" 
                className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500" 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Nomor Polisi</Label>
                <Input 
                  value={plate} 
                  onChange={(e) => setPlate(e.target.value.toUpperCase())} 
                  placeholder="B 1234 ABC" 
                  className="h-12 rounded-xl bg-slate-50 border-slate-200" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Tipe</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Pilih Tipe" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-none shadow-xl">
                    <SelectItem value="car">Mobil (Car)</SelectItem>
                    <SelectItem value="bike">Motor (Bike)</SelectItem>
                    <SelectItem value="suv">SUV / MPV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Tahun</Label>
                <Input 
                  type="number" 
                  value={year} 
                  onChange={(e) => setYear(e.target.value)} 
                  placeholder="2022" 
                  className="h-12 rounded-xl bg-slate-50 border-slate-200" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Kapasitas</Label>
                <Input 
                  type="number" 
                  value={capacity} 
                  onChange={(e) => setCapacity(e.target.value)} 
                  placeholder="4" 
                  className="h-12 rounded-xl bg-slate-50 border-slate-200" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Warna</Label>
              <Input 
                value={color} 
                onChange={(e) => setColor(e.target.value)} 
                placeholder="Hitam Metalik" 
                className="h-12 rounded-xl bg-slate-50 border-slate-200" 
              />
            </div>
          </div>

          <DialogFooter className="pt-2 flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              className="w-full h-12 rounded-xl font-bold"
              onClick={() => setIsModalOpen(false)}
            >
              Batal
            </Button>
            <Button 
              className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold shadow-lg shadow-emerald-200" 
              onClick={handleSave} 
              disabled={loading || uploading}
            >
              {loading ? <Loader2 className="animate-spin" /> : editingVehicle ? "Simpan Perubahan" : "Tambah Kendaraan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VehicleDetail({ icon, label, value }: any) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
        {icon} {label}
      </div>
      <p className="text-xs font-bold text-slate-700">{value}</p>
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
