
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, Upload, CheckCircle2, AlertCircle, Loader2, Eye, ShieldCheck, ShieldAlert, ShieldQuestion
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png"];

interface DocumentVerificationProps {
  driver: any;
  onUpdate: () => void;
}

export function DocumentVerification({ driver, onUpdate }: DocumentVerificationProps) {
  const [uploading, setUploading] = useState<string | null>(null);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'ktp_url' | 'sim_url' | 'vehicle_stnk_url') => {
    try {
      setUploading(type);
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error("Format file harus JPG atau PNG");
        return;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error("Ukuran file maksimal 5MB");
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${driver.user_id}/${type}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      const { error: updateError } = await (supabase
        .from('drivers') as any)
        .update({ [type]: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', driver.id);

      if (updateError) throw updateError;

      toast.success("Dokumen berhasil diunggah");
      onUpdate();
    } catch (error: any) {
      toast.error("Gagal mengunggah dokumen: " + error.message);
    } finally {
      setUploading(null);
    }
  };

  const getStatusBadge = () => {
    const status = driver.registration_status || 'pending';
    switch (status) {
      case 'approved':
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-3 py-1 rounded-full flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Terverifikasi</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none px-3 py-1 rounded-full flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5" /> Ditolak</Badge>;
      default:
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none px-3 py-1 rounded-full flex items-center gap-1.5"><ShieldQuestion className="w-3.5 h-3.5" /> Menunggu Verifikasi</Badge>;
    }
  };

  return (
    <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden">
      <CardContent className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              Verifikasi Dokumen
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Status Akun</p>
          </div>
          {getStatusBadge()}
        </div>

        {driver.registration_status === 'rejected' && driver.rejection_reason && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <div>
              <p className="text-sm font-bold text-red-700">Alasan Penolakan:</p>
              <p className="text-xs text-red-600 mt-0.5">{driver.rejection_reason}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DocItem 
            label="KTP (Kartu Tanda Penduduk)" 
            url={driver.ktp_url} 
            loading={uploading === 'ktp_url'}
            onUpload={(e) => handleUpload(e, 'ktp_url')}
          />
          <DocItem 
            label="SIM (Surat Izin Mengemudi)" 
            url={driver.sim_url} 
            loading={uploading === 'sim_url'}
            onUpload={(e) => handleUpload(e, 'sim_url')}
          />
          <DocItem 
            label="STNK Kendaraan" 
            url={driver.vehicle_stnk_url} 
            loading={uploading === 'vehicle_stnk_url'}
            onUpload={(e) => handleUpload(e, 'vehicle_stnk_url')}
          />
        </div>

        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
          <div className="flex gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-emerald-800">Keamanan Data Terjamin</p>
              <p className="text-[11px] text-emerald-700 leading-relaxed">
                Dokumen Anda dienkripsi dan hanya digunakan untuk keperluan verifikasi identitas pengemudi. Format: JPG/PNG, maks. 5MB.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DocItem({ label, url, loading, onUpload }: { label: string, url: string | null, loading: boolean, onUpload: (e: any) => void }) {
  return (
    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-3">
      <div className="flex justify-between items-start">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{label}</p>
        {url ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        ) : (
          <AlertCircle className="w-4 h-4 text-amber-500" />
        )}
      </div>
      
      {url ? (
        <div className="relative group rounded-xl overflow-hidden aspect-video bg-white border border-slate-200">
          <img src={url} alt={label} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button size="sm" variant="secondary" className="h-8 text-xs rounded-lg" asChild>
              <a href={url} target="_blank" rel="noreferrer"><Eye className="w-3.5 h-3.5 mr-1" /> Lihat</a>
            </Button>
            <label className="cursor-pointer">
              <div className="bg-white text-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm hover:bg-slate-50 transition-colors">
                <Upload className="w-3.5 h-3.5" /> Ganti
              </div>
              <input type="file" className="hidden" accept="image/jpeg,image/png" onChange={onUpload} />
            </label>
          </div>
        </div>
      ) : (
        <label className="cursor-pointer block">
          <div className="h-24 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-emerald-300 hover:bg-emerald-50 transition-all">
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
            ) : (
              <>
                <Upload className="w-6 h-6 text-slate-400" />
                <p className="text-[11px] font-bold text-slate-400 uppercase">Unggah Dokumen</p>
              </>
            )}
          </div>
          <input type="file" className="hidden" accept="image/jpeg,image/png" onChange={onUpload} disabled={loading} />
        </label>
      )}
    </div>
  );
}
