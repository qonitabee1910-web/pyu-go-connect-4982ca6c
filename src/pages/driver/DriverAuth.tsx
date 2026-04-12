import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Car, ArrowLeft } from "lucide-react";

export default function DriverAuth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast.success("Welcome back, Captain!");
        navigate("/driver");
      } else {
        const { error } = await signUp(email, password, fullName, {
          phone,
          license_number: licenseNumber,
          isDriver: true,
        });
        if (error) throw error;
        toast.success("Registration successful! Check your email to confirm.");
        setIsLogin(true);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <div className="bg-emerald-600 px-6 pt-12 pb-8 rounded-b-[2.5rem] shadow-lg relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] opacity-10">
          <Car size={200} />
        </div>
        
        <button 
          onClick={() => navigate("/")} 
          className="mb-6 text-white/80 hover:text-white flex items-center gap-1 text-sm font-medium"
        >
          <ArrowLeft size={16} /> Kembali ke User App
        </button>

        <div className="flex items-center gap-3 mb-4 relative z-10">
          <div className="bg-white p-2 rounded-xl shadow-inner">
            <Car className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">PYU DRIVER</h1>
        </div>
        <p className="text-emerald-50/90 text-sm font-medium relative z-10">
          {isLogin ? "Masuk ke Dashboard Driver" : "Daftar sebagai Driver Partner"}
        </p>
      </div>

      <div className="flex-1 px-6 -mt-4 pb-10">
        <form 
          onSubmit={handleSubmit} 
          className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 space-y-5"
        >
          {!isLogin && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-slate-700 font-semibold ml-1">Nama Lengkap</Label>
                <Input 
                  id="fullName" 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                  placeholder="Nama sesuai KTP" 
                  className="rounded-xl border-slate-200 focus:ring-emerald-500 focus:border-emerald-500" 
                  required 
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-slate-700 font-semibold ml-1">Nomor Telepon</Label>
                <Input 
                  id="phone" 
                  type="tel"
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  placeholder="0812xxxx" 
                  className="rounded-xl border-slate-200 focus:ring-emerald-500 focus:border-emerald-500" 
                  required 
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="licenseNumber" className="text-slate-700 font-semibold ml-1">Nomor SIM</Label>
                <Input 
                  id="licenseNumber" 
                  value={licenseNumber} 
                  onChange={(e) => setLicenseNumber(e.target.value)} 
                  placeholder="Nomor SIM aktif" 
                  className="rounded-xl border-slate-200 focus:ring-emerald-500 focus:border-emerald-500" 
                  required 
                />
              </div>
            </>
          )}
          
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-slate-700 font-semibold ml-1">Email</Label>
            <Input 
              id="email" 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="driver@email.com" 
              className="rounded-xl border-slate-200 focus:ring-emerald-500 focus:border-emerald-500" 
              required 
            />
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-slate-700 font-semibold ml-1">Password</Label>
            <Input 
              id="password" 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••" 
              className="rounded-xl border-slate-200 focus:ring-emerald-500 focus:border-emerald-500" 
              required 
              minLength={6} 
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl shadow-md transition-all active:scale-[0.98]" 
            disabled={loading}
          >
            {loading ? "Memproses..." : isLogin ? "Masuk Sekarang" : "Daftar Driver"}
          </Button>

          <div className="text-center pt-2">
            <p className="text-sm text-slate-500">
              {isLogin ? "Belum jadi partner?" : "Sudah punya akun?"}{" "}
              <button 
                type="button" 
                onClick={() => setIsLogin(!isLogin)} 
                className="text-emerald-600 font-bold hover:underline"
              >
                {isLogin ? "Daftar Driver" : "Masuk"}
              </button>
            </p>
          </div>
        </form>
        
        <div className="mt-8 text-center px-4">
          <p className="text-xs text-slate-400 leading-relaxed">
            Dengan mendaftar, Anda menyetujui Syarat & Ketentuan serta Kebijakan Privasi PYU Partner.
          </p>
        </div>
      </div>
    </div>
  );
}
