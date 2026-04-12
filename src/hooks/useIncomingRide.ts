import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDriverStore } from "@/stores/driverStore";
import { toast } from "sonner";

export function useIncomingRide() {
  const { driverId, isOnline, setCurrentRideId } = useDriverStore();

  useEffect(() => {
    if (!driverId || !isOnline) return;

    const channel = supabase
      .channel(`driver-rides-${driverId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rides",
          filter: `driver_id=eq.${driverId}`,
        },
        (payload) => {
          const ride = payload.new as any;
          if (ride.status === "accepted") {
            setCurrentRideId(ride.id);
            toast.info("Ride baru masuk!", { description: `Dari ${ride.pickup_address || "lokasi pickup"}` });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverId, isOnline, setCurrentRideId]);
}
