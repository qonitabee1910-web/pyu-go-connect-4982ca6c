import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DriverLocation {
  id: string;
  full_name: string;
  current_lat: number;
  current_lng: number;
  status: string;
}

export function useDriverTracking(enabled: boolean = true) {
  const [drivers, setDrivers] = useState<DriverLocation[]>([]);

  useEffect(() => {
    if (!enabled) return;

    // Fetch initial available drivers with locations
    const fetchDrivers = async () => {
      const { data } = await supabase
        .from("drivers")
        .select("id, full_name, current_lat, current_lng, status")
        .eq("status", "available")
        .not("current_lat", "is", null)
        .not("current_lng", "is", null);
      if (data) {
        setDrivers(data as DriverLocation[]);
      }
    };
    fetchDrivers();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("driver-locations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "drivers" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setDrivers((prev) => prev.filter((d) => d.id !== payload.old.id));
            return;
          }

          const driver = payload.new as DriverLocation;

          // Only show available drivers with valid coordinates
          if (driver.status !== "available" || !driver.current_lat || !driver.current_lng) {
            setDrivers((prev) => prev.filter((d) => d.id !== driver.id));
            return;
          }

          setDrivers((prev) => {
            const idx = prev.findIndex((d) => d.id === driver.id);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = driver;
              return updated;
            }
            return [...prev, driver];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled]);

  return drivers;
}
