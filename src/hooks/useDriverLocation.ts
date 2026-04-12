import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDriverStore } from "@/stores/driverStore";

export function useDriverLocation() {
  const { isOnline, driverId } = useDriverStore();
  const intervalRef = useRef<number | null>(null);
  const lastPos = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!isOnline || !driverId) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const updateLocation = () => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          if (lastPos.current?.lat === lat && lastPos.current?.lng === lng) return;
          lastPos.current = { lat, lng };
          await supabase
            .from("drivers")
            .update({ current_lat: lat, current_lng: lng })
            .eq("id", driverId);
        },
        (err) => console.error("Geolocation error:", err),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    };

    updateLocation();
    intervalRef.current = window.setInterval(updateLocation, 10000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isOnline, driverId]);
}
