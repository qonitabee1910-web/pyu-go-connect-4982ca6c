import { useNavigate } from "react-router-dom";
import { Car, Bus, Building2, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

export default function Index() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: recentRides } = useQuery({
    queryKey: ["recent-rides", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rides")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero */}
      <div className="gradient-primary px-6 pt-12 pb-8 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-6">
          <img src="/pyu_go_icon.png" alt="PYU GO" className="w-10 h-10 rounded-xl" />
          <h1 className="text-2xl font-extrabold text-primary-foreground">PYU GO</h1>
        </div>
        <p className="text-primary-foreground/80 text-sm mb-6">
          {user ? `Welcome back, ${user.user_metadata?.full_name ?? "rider"}!` : "Your super app for rides & shuttles"}
        </p>

        <button
          onClick={() => navigate("/ride")}
          className="w-full flex items-center gap-3 bg-card/90 backdrop-blur rounded-xl px-4 py-3 shadow-lg text-left"
        >
          <MapPin className="w-5 h-5 text-primary shrink-0" />
          <span className="text-muted-foreground text-sm">Where are you going?</span>
        </button>
      </div>

      {/* Services Grid */}
      <div className="px-6 -mt-2">
        <div className="grid grid-cols-3 gap-3 mt-6">
          <ServiceCard icon={<Car className="w-7 h-7" />} title="Ride" description="On-demand" onClick={() => navigate("/ride")} color="text-primary" />
          <ServiceCard icon={<Bus className="w-7 h-7" />} title="Shuttle" description="Book seats" onClick={() => navigate("/shuttle")} color="text-secondary" />
          <ServiceCard icon={<Building2 className="w-7 h-7" />} title="Hotel" description="Book rooms" onClick={() => navigate("/hotel")} color="text-accent-foreground" />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="px-6 mt-8 flex-1">
        <h2 className="text-lg font-bold mb-3">Recent Activity</h2>
        {(!user || !recentRides || recentRides.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Clock className="w-10 h-10 mb-2 opacity-40" />
            <p className="text-sm">{user ? "No recent rides" : "Sign in to see activity"}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentRides.map((ride) => (
              <div key={ride.id} className="flex items-center justify-between p-3 rounded-xl bg-card border border-border">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{ride.pickup_address ?? "Pickup"} → {ride.dropoff_address ?? "Dropoff"}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(ride.created_at), "dd MMM, HH:mm")}</p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-sm font-bold">Rp {(ride.fare ?? 0).toLocaleString("id-ID")}</p>
                  <p className="text-xs text-muted-foreground capitalize">{ride.status.replace("_", " ")}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!user && (
        <div className="px-6 pb-6">
          <Button className="w-full gradient-primary text-primary-foreground font-semibold" size="lg" onClick={() => navigate("/auth")}>
            Sign in to get started
          </Button>
        </div>
      )}
    </div>
  );
}

function ServiceCard({ icon, title, description, onClick, color }: { icon: React.ReactNode; title: string; description: string; onClick: () => void; color: string }) {
  return (
    <button onClick={onClick} className="flex flex-col items-start gap-2 p-5 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
      <div className={color}>{icon}</div>
      <div>
        <p className="font-bold text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}