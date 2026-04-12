import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, ShieldCheck, ShieldAlert, Eye, FileText, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const statusStyle: Record<string, string> = {
  available: "text-green-600 border-green-300",
  busy: "text-blue-600 border-blue-300",
  offline: "text-muted-foreground",
};

const registrationStatusStyle: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

export default function AdminDrivers() {
  const queryClient = useQueryClient();
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const { data: drivers, isLoading } = useQuery({
    queryKey: ["admin-drivers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select("id, full_name, phone, avatar_url, status, is_verified, rating, created_at, registration_status, ktp_url, sim_url, rejection_reason, gender, vehicles(plate_number, model, vehicle_type)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: 'approved' | 'rejected'; reason?: string }) => {
      const updateData: any = { 
        registration_status: status,
        is_verified: status === 'approved',
        updated_at: new Date().toISOString()
      };
      if (reason) updateData.rejection_reason = reason;
      
      const { error } = await (supabase.from("drivers") as any).update(updateData).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-drivers"] });
      toast.success("Status verifikasi driver diperbarui");
      setSelectedDriver(null);
      setShowRejectDialog(false);
      setRejectionReason("");
    },
    onError: (err: any) => {
      toast.error("Gagal memperbarui verifikasi: " + err.message);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Manajemen Driver</h2>
        <Button size="sm" className="gradient-primary text-primary-foreground">
          <Plus className="w-4 h-4 mr-1" /> Tambah Driver
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : !drivers?.length ? (
        <p className="text-sm text-muted-foreground">Belum ada driver terdaftar.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drivers.map((d) => (
            <Card key={d.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedDriver(d)}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                      {d.avatar_url ? (
                        <img src={d.avatar_url} alt={d.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">
                          {d.full_name[0]}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-sm leading-tight">{d.full_name}</p>
                      <p className="text-[10px] text-muted-foreground">{d.phone}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={`${registrationStatusStyle[d.registration_status || 'pending']} border-none capitalize`}>
                    {d.registration_status || 'pending'}
                  </Badge>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Dokumen: {d.ktp_url && d.sim_url ? "Lengkap" : "Belum Lengkap"}</span>
                  </div>
                  {d.vehicles && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{(d.vehicles as any).model} ({(d.vehicles as any).plate_number})</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1 text-xs font-bold text-slate-700">
                    ★ {Number(d.rating || 0).toFixed(1)}
                  </div>
                  <Badge variant="outline" className={statusStyle[d.status] ?? ""}>
                    {d.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Driver Detail & Verification Dialog */}
      <Dialog open={!!selectedDriver} onOpenChange={(open) => !open && setSelectedDriver(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Verifikasi Driver</DialogTitle>
          </DialogHeader>
          
          {selectedDriver && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Nama Lengkap</p>
                  <p className="font-bold">{selectedDriver.full_name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Nomor Telepon</p>
                  <p className="font-bold">{selectedDriver.phone}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Nomor SIM</p>
                  <p className="font-bold">{selectedDriver.license_number || "-"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Nomor KTP</p>
                  <p className="font-bold">{selectedDriver.ktp_number || "-"}</p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Dokumen Pendukung</p>
                <div className="grid grid-cols-2 gap-4">
                  <DocumentPreview label="KTP" url={selectedDriver.ktp_url} />
                  <DocumentPreview label="SIM" url={selectedDriver.sim_url} />
                  <DocumentPreview label="STNK" url={selectedDriver.vehicle_stnk_url} />
                </div>
              </div>

              {selectedDriver.registration_status === 'pending' && (
                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <Button 
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 font-bold"
                    onClick={() => verifyMutation.mutate({ id: selectedDriver.id, status: 'approved' })}
                    disabled={verifyMutation.isPending}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" /> Setujui Pendaftaran
                  </Button>
                  <Button 
                    variant="destructive"
                    className="flex-1 font-bold"
                    onClick={() => setShowRejectDialog(true)}
                    disabled={verifyMutation.isPending}
                  >
                    <XCircle className="w-4 h-4 mr-2" /> Tolak
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rejection Reason Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alasan Penolakan</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea 
              placeholder="Berikan alasan mengapa pendaftaran ditolak (misal: Foto SIM tidak terbaca)"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowRejectDialog(false)}>Batal</Button>
            <Button 
              variant="destructive" 
              onClick={() => verifyMutation.mutate({ 
                id: selectedDriver.id, 
                status: 'rejected', 
                reason: rejectionReason 
              })}
              disabled={!rejectionReason || verifyMutation.isPending}
            >
              Kirim Penolakan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DocumentPreview({ label, url }: { label: string, url: string | null }) {
  if (!url) return (
    <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{label}</p>
      <p className="text-xs text-slate-400">Belum diunggah</p>
    </div>
  );

  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
      <div className="relative group aspect-video rounded-xl overflow-hidden border border-slate-200">
        <img src={url} alt={label} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button size="sm" variant="secondary" className="h-7 text-[10px] rounded-lg" asChild>
            <a href={url} target="_blank" rel="noreferrer"><Eye className="w-3 h-3 mr-1" /> Lihat Full</a>
          </Button>
        </div>
      </div>
    </div>
  );
}