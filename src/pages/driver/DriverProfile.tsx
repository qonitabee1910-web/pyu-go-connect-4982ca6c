
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  User, RefreshCw, LogOut
} from "lucide-react";
import { ProfilePhoto } from "@/components/driver/profile/ProfilePhoto.tsx";
import { BasicInfoForm } from "@/components/driver/profile/BasicInfoForm.tsx";
import { SecuritySettings } from "@/components/driver/profile/SecuritySettings.tsx";
import { ServiceSettings } from "@/components/driver/profile/ServiceSettings.tsx";
import { VehicleInfo } from "@/components/driver/profile/VehicleInfo.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";

export default function DriverProfile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const { data: driver, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["driver-profile-full", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("drivers") as any)
        .select("*, vehicles(*)")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleLogout = async () => {
    await signOut();
    toast.success("Successfully logged out");
    navigate("/driver/auth");
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-32 bg-slate-200 rounded-3xl" />
        <div className="h-64 bg-slate-200 rounded-3xl" />
        <div className="h-64 bg-slate-200 rounded-3xl" />
      </div>
    );
  }

  if (!driver) return <div className="p-10 text-center">Driver profile not found.</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-emerald-600 text-white px-6 pt-12 pb-16 rounded-b-[3rem] shadow-lg relative overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] opacity-10">
          <User size={200} />
        </div>
        
        <div className="flex justify-between items-start relative z-10">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Profil Saya</h1>
            <p className="text-emerald-50/80 text-sm font-medium mt-1">
              Kelola informasi dan pengaturan driver Anda
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/10 rounded-full"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`w-5 h-5 ${isRefetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="px-4 -mt-8 space-y-6">
        {/* Profile Photo & Basic Info */}
        <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-white p-6 space-y-6">
              <ProfilePhoto 
                url={driver.avatar_url} 
                onUpload={(url) => queryClient.invalidateQueries({ queryKey: ["driver-profile-full"] })}
              />
              <BasicInfoForm 
                driver={driver} 
                onUpdate={() => queryClient.invalidateQueries({ queryKey: ["driver-profile-full"] })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Service Settings */}
        <ServiceSettings 
          driver={driver}
          onUpdate={() => queryClient.invalidateQueries({ queryKey: ["driver-profile-full"] })}
        />

        {/* Vehicle Information */}
        <VehicleInfo 
          vehicles={driver.vehicles}
          currentVehicleId={driver.current_vehicle_id}
          onUpdate={() => queryClient.invalidateQueries({ queryKey: ["driver-profile-full"] })}
        />

        {/* Security & Account */}
        <SecuritySettings 
          driver={driver}
          onUpdate={() => queryClient.invalidateQueries({ queryKey: ["driver-profile-full"] })}
        />

        {/* Logout Button */}
        <div className="px-2">
          <Button 
            variant="destructive" 
            className="w-full h-14 rounded-2xl font-bold text-lg shadow-md gap-2"
            onClick={() => setShowLogoutConfirm(true)}
          >
            <LogOut className="w-5 h-5" /> Keluar Akun
          </Button>
        </div>
      </div>

      {/* Logout Confirmation */}
      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent className="rounded-3xl border-none">
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Keluar</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin keluar dari akun driver Anda? Anda tidak akan menerima pesanan baru sampai Anda masuk kembali.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 pt-2">
            <AlertDialogCancel className="flex-1 rounded-xl h-12 mt-0">Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleLogout}
              className="flex-1 rounded-xl h-12 bg-red-600 hover:bg-red-700"
            >
              Ya, Keluar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
