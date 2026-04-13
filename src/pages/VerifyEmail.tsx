import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, CheckCircle2 } from "lucide-react";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";
  
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [verified, setVerified] = useState(false);

  // Auto-verify if token in URL
  useEffect(() => {
    const token = searchParams.get("token");
    const type = searchParams.get("type");
    
    if (token && type === "email_confirm") {
      verifyWithToken(token);
    }
  }, [searchParams]);

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const verifyWithToken = async (token: string) => {
    try {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: "email",
      });
      
      if (error) throw error;
      
      setVerified(true);
      toast.success("Email berhasil diverifikasi!");
      
      setTimeout(() => {
        const from = sessionStorage.getItem("authRedirect") || "/auth";
        navigate(from);
      }, 2000);
    } catch (err: any) {
      toast.error("Verifikasi gagal: " + err.message);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error("Masukkan kode verifikasi");
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email,
        token: code,
        type: "email",
      });
      
      if (error) throw error;
      
      setVerified(true);
      toast.success("Email berhasil diverifikasi!");
      
      setTimeout(() => {
        const from = sessionStorage.getItem("authRedirect") || "/auth";
        navigate(from);
      }, 2000);
    } catch (err: any) {
      toast.error("Kode tidak valid: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
      });
      
      if (error) throw error;
      
      toast.success("Kode verifikasi dikirim ulang");
      setResendTimer(60); // 60 second cooldown
    } catch (err: any) {
      toast.error("Gagal mengirim: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (verified) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-10 rounded-3xl shadow-xl max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="bg-green-50 p-6 rounded-full">
              <CheckCircle2 className="w-16 h-16 text-green-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Terverifikasi!</h1>
          <p className="text-slate-500">Email Anda telah berhasil diverifikasi. Mengalihkan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-10 rounded-3xl shadow-xl max-w-md w-full space-y-6">
        <div className="flex justify-center">
          <div className="bg-blue-50 p-6 rounded-full">
            <Mail className="w-16 h-16 text-blue-600" />
          </div>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">Verifikasi Email</h1>
          <p className="text-slate-500 text-sm">
            Kami telah mengirim kode verifikasi ke:<br />
            <span className="font-semibold">{email}</span>
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-700">Kode Verifikasi</label>
            <Input
              type="text"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="mt-1 text-center text-2xl tracking-widest font-bold"
              disabled={loading}
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-12 rounded-lg"
            disabled={loading}
          >
            {loading ? "Memverifikasi..." : "Verifikasi Email"}
          </Button>
        </form>

        <div className="pt-4 border-t border-slate-100 text-center">
          <p className="text-sm text-slate-500 mb-2">Tidak menerima kode?</p>
          <Button
            type="button"
            variant="ghost"
            onClick={handleResend}
            disabled={resendTimer > 0 || loading}
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            {resendTimer > 0 ? `Kirim ulang dalam ${resendTimer}s` : "Kirim Ulang"}
          </Button>
        </div>

        <div className="text-xs text-slate-400 text-center">
          Tidak ada akun? <button onClick={() => navigate("/auth")} className="text-blue-600 hover:underline">Buat akun</button>
        </div>
      </div>
    </div>
  );
}
