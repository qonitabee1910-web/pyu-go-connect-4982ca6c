
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { Loader2, Mail, Calendar, ShieldCheck, ShieldAlert, User, Smartphone, KeyRound } from "lucide-react";
import { format } from "date-fns";
import { otpService } from "@/utils/otp";

const formSchema = z.object({
  full_name: z.string().min(3, "Minimal 3 karakter").max(50, "Maksimal 50 karakter"),
  phone: z.string().regex(/^\+62[0-9]{9,13}$/, "Format harus +62xxx (9-13 digit)"),
});

interface BasicInfoFormProps {
  driver: any;
  onUpdate: () => void;
}

export function BasicInfoForm({ driver, onUpdate }: BasicInfoFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [pendingValues, setPendingValues] = useState<z.infer<typeof formSchema> | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: driver.full_name || "",
      phone: driver.phone || "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      // 1. Cek apakah nomor telepon sudah digunakan oleh driver lain
      if (values.phone !== driver.phone) {
        const { data: existingPhone } = await supabase
          .from("drivers")
          .select("id")
          .eq("phone", values.phone)
          .neq("id", driver.id)
          .maybeSingle();

        if (existingPhone) {
          throw new Error("Nomor telepon sudah digunakan oleh driver lain.");
        }

        // 2. Jika nomor berubah, kirim OTP
        setPendingValues(values);
        await otpService.requestOTP(driver.user_id, values.phone, 'phone');
        setOtpStep(true);
        toast.info("Kode OTP telah dikirim ke nomor baru Anda.");
        return;
      }

      // 3. Update tabel drivers (jika nama saja yang berubah)
      await updateDriverData(values);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!pendingValues || !otpCode) return;
    setLoading(true);
    try {
      const result = await otpService.verifyOTP(driver.user_id, pendingValues.phone, otpCode);
      if (!result.success) {
        throw new Error(result.message);
      }

      await updateDriverData(pendingValues);
      setOtpStep(false);
      setPendingValues(null);
      setOtpCode("");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateDriverData = async (values: z.infer<typeof formSchema>) => {
    const { error } = await (supabase
      .from("drivers") as any)
      .update({
        full_name: values.full_name,
        phone: values.phone,
        updated_at: new Date().toISOString(),
      })
      .eq("id", driver.id);

    if (error) throw error;

    toast.success("Informasi dasar berhasil diperbarui dan disinkronkan");
    setIsEditing(false);
    onUpdate();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-1">
        <h3 className="font-bold text-slate-800">Informasi Dasar</h3>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-emerald-600 font-bold hover:text-emerald-700 hover:bg-emerald-50"
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? "Batal" : "Edit"}
        </Button>
      </div>

      {isEditing ? (
        otpStep ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-emerald-600" />
              </div>
              <h4 className="font-bold text-slate-800">Verifikasi Nomor Baru</h4>
              <p className="text-xs text-slate-500">Masukkan 6 digit kode yang dikirim ke {pendingValues?.phone}</p>
            </div>
            
            <div className="space-y-2">
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="000000" 
                  className="pl-10 rounded-xl text-center tracking-[1em] font-bold text-lg" 
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                />
              </div>
              <Button 
                className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold"
                onClick={handleVerifyOtp}
                disabled={loading || otpCode.length !== 6}
              >
                {loading ? <Loader2 className="animate-spin" /> : "Verifikasi & Simpan"}
              </Button>
              <Button 
                variant="ghost" 
                className="w-full text-slate-500 text-xs"
                onClick={() => setOtpStep(false)}
              >
                Kembali ke Edit
              </Button>
            </div>
          </div>
        ) : (
          <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Lengkap</FormLabel>
                  <FormControl>
                    <Input {...field} className="rounded-xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nomor Telepon</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="+62xxx" className="rounded-xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold"
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" /> : "Simpan Perubahan"}
            </Button>
          </form>
        </Form>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <InfoItem 
              icon={<User className="w-4 h-4 text-emerald-600" />} 
              label="Nama Lengkap" 
              value={driver.full_name} 
            />
            <InfoItem 
              icon={<Mail className="w-4 h-4 text-emerald-600" />} 
              label="Email" 
              value={driver.email || "Email tidak tersedia"} 
            />
            <InfoItem 
              icon={<Calendar className="w-4 h-4 text-emerald-600" />} 
              label="Bergabung Sejak" 
              value={format(new Date(driver.created_at), "d MMMM yyyy")} 
            />
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100">
                  {driver.is_verified ? (
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                  )}
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Status Verifikasi</p>
                  <p className={`text-sm font-bold ${driver.is_verified ? "text-emerald-600" : "text-amber-600"}`}>
                    {driver.is_verified ? "Terverifikasi" : "Menunggu Verifikasi"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
      <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100">
        {icon}
      </div>
      <div>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{label}</p>
        <p className="text-sm font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}
