import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Lock } from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
      setChecking(false);
    });

    // Also check hash for type=recovery
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    // Timeout fallback
    const timeout = setTimeout(() => setChecking(false), 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

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
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success("Password berhasil diubah! Silakan login dengan password baru.");
      setTimeout(() => navigate("/auth"), 2000);
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isRecovery) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-bold text-foreground">Link Tidak Valid</h2>
          <p className="text-muted-foreground text-sm">
            Link reset password ini tidak valid atau sudah kedaluwarsa.
          </p>
          <Button onClick={() => navigate("/forgot-password")} variant="outline">
            Minta Link Baru
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
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
        <p className="text-primary-foreground/80 text-sm">Buat Password Baru</p>
      </div>

      <form
        onSubmit={handleResetPassword}
        className="flex-1 px-6 pt-8 pb-8 max-w-md mx-auto w-full space-y-5"
      >
        <p className="text-muted-foreground text-sm">
          Buat password baru untuk akun Anda. Pastikan password yang kuat dan mudah diingat.
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
      </form>
    </div>
  );
}
