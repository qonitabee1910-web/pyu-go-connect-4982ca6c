import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { Role } from "@/lib/rbac";

export function useAuth() {
  const { setSession, setLoading, setRole, user, session, isLoading, isGuest, role, permissions } = useAuthStore();

  const fetchUserRole = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (error || !data) {
      setRole("user"); // Default role
    } else {
      setRole(data.role as Role);
    }
  }, [setRole]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        await fetchUserRole(session.user.id);
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        await fetchUserRole(session.user.id);
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [setSession, setLoading, setRole, fetchUserRole]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string, options?: { phone?: string; license_number?: string; isDriver?: boolean }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { 
        data: { 
          full_name: fullName,
          phone: options?.phone,
        }, 
        emailRedirectTo: window.location.origin 
      },
    });

    if (!error && data.user && options?.isDriver) {
      // If it's a driver, we need to create an entry in the drivers table
      // Note: In production, this should ideally be handled by a database trigger or a secure Edge Function
      // to ensure data consistency and security.
      const { error: driverError } = await supabase.from("drivers").insert({
        user_id: data.user.id,
        full_name: fullName,
        phone: options.phone || "",
        license_number: options.license_number || "",
        status: "offline",
      });
      
      if (driverError) return { error: driverError };

      // Also assign 'moderator' role for now as a driver role placeholder
      await supabase.from("user_roles").insert({
        user_id: data.user.id,
        role: "moderator"
      });
    }

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    useAuthStore.getState().reset();
  };

  return { user, session, isLoading, isGuest, role, permissions, signIn, signUp, signOut };
}
