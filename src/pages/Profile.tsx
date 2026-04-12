import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User, LogOut, Shield, ChevronRight, Car, Bus, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: rideCount } = useQuery({
    queryKey: ["ride-count", user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("rides")
        .select("*", { count: "exact", head: true })
        .eq("rider_id", user!.id);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user,
  });

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("role", "admin")
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!user,
  });

  const { data: isDriver } = useQuery({
    queryKey: ["is-driver", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-4">
        <User className="w-16 h-16 text-muted-foreground/30" />
        <h2 className="text-xl font-bold">Not signed in</h2>
        <p className="text-sm text-muted-foreground text-center">Sign in to manage your account and view ride history</p>
        <Button className="gradient-primary text-primary-foreground font-semibold" onClick={() => navigate("/auth")}>
          Sign In
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="gradient-primary px-6 pt-12 pb-8 rounded-b-3xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary-foreground/20 flex items-center justify-center">
            <User className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-primary-foreground">
              {profile?.full_name || user.user_metadata?.full_name || "User"}
            </h1>
            <p className="text-primary-foreground/70 text-sm">{user.email}</p>
            {profile?.phone && <p className="text-primary-foreground/60 text-xs">{profile.phone}</p>}
          </div>
        </div>
      </div>

      <div className="px-6 mt-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1 bg-card rounded-xl border border-border p-4 text-center">
            <Car className="w-5 h-5 mx-auto text-primary mb-1" />
            <p className="text-xl font-extrabold">{rideCount ?? 0}</p>
            <p className="text-xs text-muted-foreground">Rides</p>
          </div>
        </div>
      </div>

      <div className="px-6 space-y-2">
        <ProfileItem label="My Rides" icon={<ChevronRight className="w-4 h-4" />} onClick={() => {}} />
        <ProfileItem label="My Shuttle Bookings" icon={<ChevronRight className="w-4 h-4" />} onClick={() => {}} />
        {isDriver && (
          <ProfileItem label="Driver Mode" icon={<Truck className="w-4 h-4" />} onClick={() => navigate("/driver")} />
        )}
        {isAdmin && (
          <ProfileItem label="Admin Dashboard" icon={<Shield className="w-4 h-4" />} onClick={() => navigate("/admin")} />
        )}

        <Button variant="outline" className="w-full mt-8 text-destructive border-destructive/30" onClick={signOut}>
          <LogOut className="w-4 h-4 mr-2" /> Sign Out
        </Button>
      </div>
    </div>
  );
}

function ProfileItem({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:bg-accent/50 transition-colors">
      <span className="font-medium text-sm">{label}</span>
      {icon}
    </button>
  );
}