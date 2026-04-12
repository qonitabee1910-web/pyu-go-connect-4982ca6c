import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

export default function Forbidden() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-10 rounded-3xl shadow-xl max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="bg-red-50 p-6 rounded-full">
            <ShieldAlert className="w-16 h-16 text-red-600" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">403</h1>
          <h2 className="text-2xl font-bold text-slate-800">Akses Ditolak</h2>
          <p className="text-slate-500">
            Maaf, Anda tidak memiliki izin yang cukup untuk mengakses halaman ini. 
            Silakan hubungi administrator jika Anda merasa ini adalah kesalahan.
          </p>
        </div>

        <div className="pt-4 flex flex-col gap-3">
          <Button 
            onClick={() => navigate(-1)} 
            variant="outline"
            className="rounded-xl h-12 border-slate-200"
          >
            Kembali
          </Button>
          <Button 
            onClick={() => navigate("/")} 
            className="rounded-xl h-12 bg-primary hover:bg-primary/90"
          >
            Halaman Utama
          </Button>
        </div>
      </div>
    </div>
  );
}
