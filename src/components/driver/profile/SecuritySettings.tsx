
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Key, Mail, Phone, 
  ChevronRight, Loader2
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function SecuritySettings({ driver, onUpdate }: { driver: any, onUpdate: () => void }) {
  const [activeModal, setActiveModal] = useState<"pin" | "email" | "phone" | null>(null);
  const [loading, setLoading] = useState(false);
  
  // PIN states
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const handleUpdatePin = async () => {
    if (newPin.length !== 6 || !/^\d+$/.test(newPin)) {
      toast.error("PIN baru harus 6 digit angka");
      return;
    }
    if (newPin !== confirmPin) {
      toast.error("Konfirmasi PIN tidak cocok");
      return;
    }

    setLoading(true);
    try {
      // Verify old PIN if one exists
      if (driver.pin_hash) {
        const oldHash = await hashPin(oldPin);
        if (oldHash !== driver.pin_hash) {
          toast.error("PIN lama salah");
          return;
        }
      }

      const hashedPin = await hashPin(newPin);

      const { error } = await (supabase
        .from("drivers") as any)
        .update({ pin_hash: hashedPin })
        .eq("id", driver.id);

      if (error) throw error;

      toast.success("PIN berhasil diperbarui");
      setActiveModal(null);
      setOldPin("");
      setNewPin("");
      setConfirmPin("");
      onUpdate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-slate-800 ml-1">Keamanan & Akun</h3>
      
      <div className="space-y-3">
        <SecurityItem 
          icon={<Key className="w-5 h-5 text-amber-500" />}
          label="Ganti PIN Transaksi"
          description="Amankan transaksi dompet Anda"
          onClick={() => setActiveModal("pin")}
        />
        <SecurityItem 
          icon={<Mail className="w-5 h-5 text-blue-500" />}
          label="Ganti Email"
          description={driver.email || "Atur alamat email Anda"}
          onClick={() => setActiveModal("email")}
        />
        <SecurityItem 
          icon={<Phone className="w-5 h-5 text-emerald-500" />}
          label="Ganti Nomor Telepon"
          description={driver.phone || "Nomor aktif untuk koordinasi"}
          onClick={() => setActiveModal("phone")}
        />
      </div>

      {/* PIN Modal */}
      <Dialog open={activeModal === "pin"} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="rounded-3xl border-none">
          <DialogHeader>
            <DialogTitle>Ganti PIN</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {driver.pin_hash && (
              <div className="space-y-2">
                <Label>PIN Lama</Label>
                <Input 
                  type="password" 
                  maxLength={6} 
                  value={oldPin} 
                  onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ""))} 
                  placeholder="••••••"
                  className="text-center text-2xl tracking-[1em] h-14 rounded-2xl"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>PIN Baru (6 Digit)</Label>
              <Input 
                type="password" 
                maxLength={6} 
                value={newPin} 
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))} 
                placeholder="••••••"
                className="text-center text-2xl tracking-[1em] h-14 rounded-2xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Konfirmasi PIN Baru</Label>
              <Input 
                type="password" 
                maxLength={6} 
                value={confirmPin} 
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))} 
                placeholder="••••••"
                className="text-center text-2xl tracking-[1em] h-14 rounded-2xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              className="w-full h-12 rounded-xl bg-emerald-600 font-bold" 
              onClick={handleUpdatePin}
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" /> : "Simpan PIN"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SecurityItem({ icon, label, description, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-slate-50 hover:bg-slate-50 transition-all active:scale-[0.98]"
    >
      <div className="flex items-center gap-4">
        <div className="bg-slate-50 p-3 rounded-2xl">
          {icon}
        </div>
        <div className="text-left">
          <p className="font-bold text-slate-800 text-sm">{label}</p>
          <p className="text-xs text-slate-400 font-medium">{description}</p>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-slate-300" />
    </button>
  );
}
