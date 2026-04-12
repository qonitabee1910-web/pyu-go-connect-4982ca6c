import { create } from "zustand";
import type { User, Session } from "@supabase/supabase-js";
import { Role, Permission, ROLE_PERMISSIONS } from "@/lib/rbac";

interface AuthState {
  user: User | null;
  session: Session | null;
  role: Role | null;
  permissions: Permission[];
  isLoading: boolean;
  isGuest: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setRole: (role: Role | null) => void;
  setLoading: (loading: boolean) => void;
  setGuest: (guest: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  role: null,
  permissions: [],
  isLoading: true,
  isGuest: false,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setRole: (role) => set({ role, permissions: role ? ROLE_PERMISSIONS[role] : [] }),
  setLoading: (isLoading) => set({ isLoading }),
  setGuest: (isGuest) => set({ isGuest }),
  reset: () => set({ user: null, session: null, role: null, permissions: [], isLoading: false, isGuest: false }),
}));
