import { create } from "zustand";

interface DriverState {
  isOnline: boolean;
  driverId: string | null;
  currentRideId: string | null;
  locationWatchId: number | null;
  setOnline: (online: boolean) => void;
  setDriverId: (id: string | null) => void;
  setCurrentRideId: (id: string | null) => void;
  setLocationWatchId: (id: number | null) => void;
  reset: () => void;
}

export const useDriverStore = create<DriverState>((set) => ({
  isOnline: false,
  driverId: null,
  currentRideId: null,
  locationWatchId: null,
  setOnline: (online) => set({ isOnline: online }),
  setDriverId: (id) => set({ driverId: id }),
  setCurrentRideId: (id) => set({ currentRideId: id }),
  setLocationWatchId: (id) => set({ locationWatchId: id }),
  reset: () => set({ isOnline: false, driverId: null, currentRideId: null, locationWatchId: null }),
}));
