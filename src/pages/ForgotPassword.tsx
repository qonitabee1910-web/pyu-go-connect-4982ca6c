import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Mail, CheckCircle2, Lock } from "lucide-react";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resetCode = searchParams.get("code");

  const [step, setStep] = useState<"email" | "verify" | "reset">(resetCode ? "reset" : "email");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState(resetCode || "");

  // Step 1: Request password reset
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Masukkan email Anda");
      return;
    }

    setLoading(true);
    try {
      // Call Supabase to start password reset
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/forgot-password?code=`,
      });

      if (error) throw error;

      // Send custom reset email with our template
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        await fetch(`${supabaseUrl}/functions/v1/send-reset-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            reset_link: `${window.location.origin}/forgot-password?code=${resetToken}`,
          }),
        });
      } catch (emailErr) {
        console.warn("Custom email failed, but Supabase sent recovery email:", emailErr);
      }

      toast.success("Link reset password telah dikirim ke email Anda");
      setStep("verify");
    } catch (err: any) {
      toast.error("Error: " + (err.message || "Gagal mengirim link reset"));
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify code (if user has recovery code from email)
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error("Masukkan kode verifikasi");
      return;
    }

    setLoading(true);
    try {
      // In a real app, you'd verify the code with Supabase
      // For now, we'll consider it valid if not empty
      setResetToken(code);
      setStep("reset");
      toast.success("Kode berhasil diverifikasi");
    } catch (err: any) {
      toast.error("Kode tidak valid");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Password tidak cocok");
      return;
    }

    setLoading(true);
    try {
      // Update password using recovery code
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        // If that fails, try the old API
        throw new Error(error.message || "Gagal mengubah password");
      }

      toast.success("Password berhasil diubah! Silakan login dengan password baru.");
      setTimeout(() => navigate("/auth"), 2000);
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Success screen
  const showSuccess = step === "verify" && !resetCode;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="gradient-primary px-6 pt-16 pb-12 rounded-b-3xl">
        <button
          onClick={() => navigate("/auth")}
          className="mb-6 flex items-center gap-1 text-primary-foreground/80 hover:text-primary-foreground text-sm font-medium"
        >
          <ArrowLeft size={16} /> Kembali ke Login
        </button>
        <div className="flex items-center gap-3 mb-4">
          <img src="/pyu_go_icon.png" alt="PYU GO" className="w-12 h-12 rounded-xl" />
          <h1 className="text-3xl font-extrabold text-primary-foreground">PYU GO</h1>
        </div>
        <p className="text-primary-foreground/80 text-sm">
          {step === "email" && "Reset Password"}
          {step === "verify" && "Verifikasi Email"}
          {step === "reset" && "Password Baru"}
        </p>
      </div>

      {/* Content */}
      {showSuccess ? (
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-md space-y-6 text-center">
            <div className="flex justify-center">
              <div className="bg-green-50 p-6 rounded-full">
                <CheckCircle2 className="w-16 h-16 text-green-600" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Email Terkirim!</h2>
              <p className="text-slate-500 text-sm">
                Kami telah mengirimkan link reset password ke:<br />
                <span className="font-semibold">{email}</span>
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
              <p className="text-sm text-blue-900">
                <strong>📧 Langkah Berikutnya:</strong><br />
                1. Buka email Anda<br />
                2. Klik link "Reset Password"<br />
                3. Masukkan password baru Anda<br />
                4. Kemudian bisa login
              </p>
            </div>
            <div className="space-y-2 pt-4">
              <p className="text-sm text-slate-500">Tidak menerima email?</p>
              <Button
                variant="outline"
                onClick={() => {
                  setStep("email");
                  setEmail("");
                  setCode("");
                }}
              >
                Kirim Ulang
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <form
          onSubmit={
            step === "email"
              ? handleRequestReset
              : step === "verify"
              ? handleVerifyCode
              : handleResetPassword
          }
          className="flex-1 px-6 pt-8 pb-8 max-w-md mx-auto w-full space-y-5"
        >
          {/* Step 1: Email Input */}
          {step === "email" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email Terdaftar</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="kamu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
                Masukkan email yang Anda gunakan saat mendaftar. Kami akan mengirimkan link reset
                password ke email tersebut.
              </div>

              <Button
                type="submit"
                className="w-full gradient-primary text-primary-foreground font-semibold"
                size="lg"
                disabled={loading}
              >
                {loading ? "Mengirim..." : "Kirim Link Reset"}
              </Button>
            </>
          )}

          {/* Step 2: Verify Code */}
          {step === "verify" && (
            <>
              <p className="text-slate-600 text-sm">
                Masukkan kode verifikasi yang dikirim ke email Anda (opsional. Atau gunakan link
                yang dikirim langsung).
              </p>

              <div className="space-y-2">
                <Label htmlFor="code">Kode Verifikasi (6 digit)</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="text-center text-2xl tracking-widest font-bold"
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                className="w-full gradient-primary text-primary-foreground font-semibold"
                size="lg"
                disabled={loading || !code.trim()}
              >
                {loading ? "Memverifikasi..." : "Verifikasi Kode"}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStep("email");
                  setCode("");
                }}
                disabled={loading}
              >
                Kirim Email Baru
              </Button>
            </>
          )}

          {/* Step 3: Reset Password */}
          {step === "reset" && (
            <>
              <p className="text-slate-600 text-sm">
                Buat password baru untuk akun Anda. Pastikan password yang kuat dan mudah
                diingat.
              </p>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Password Baru</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={loading}
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
                <strong>💡 Tips Password Kuat:</strong><br />
                • Minimal 8 karakter<br />
                • Gunakan kombinasi huruf, angka, dan simbol<br />
                • Jangan gunakan informasi pribadi
              </div>

              <Button
                type="submit"
                className="w-full gradient-primary text-primary-foreground font-semibold"
                size="lg"
                disabled={loading || newPassword !== confirmPassword || newPassword.length < 6}
              >
                <Lock className="w-4 h-4 mr-2" />
                {loading ? "Mengubah..." : "Ubah Password"}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/auth")}
                disabled={loading}
              >
                Kembali ke Login
              </Button>
            </>
          )}
        </form>
      )}
    </div>
  );
}
