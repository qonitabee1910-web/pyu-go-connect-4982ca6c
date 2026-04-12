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
    // 1. Validasi awal untuk mencegah pendaftaran ganda berdasarkan phone atau license_number jika isDriver
    if (options?.isDriver) {
      if (options.phone) {
        const { data: existingPhone } = await supabase
          .from("drivers")
          .select("id")
          .eq("phone", options.phone)
          .maybeSingle();
        
        if (existingPhone) {
          return { error: new Error("Nomor telepon sudah terdaftar sebagai driver.") };
        }
      }

      if (options.license_number) {
        const { data: existingLicense } = await supabase
          .from("drivers")
          .select("id")
          .eq("license_number", options.license_number)
          .maybeSingle();
        
        if (existingLicense) {
          return { error: new Error("Nomor SIM sudah terdaftar.") };
        }
      }
    }

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

    if (error) return { error };

    if (data.user) {
      // Profile is created by handle_new_user trigger, update with phone if needed
      if (options?.phone) {
        await supabase.from("profiles").update({ phone: options.phone }).eq("user_id", data.user.id);
      }

      // Jika driver, inisialisasi tabel drivers
      if (options?.isDriver) {
        const { error: driverError } = await supabase.from("drivers").insert({
          user_id: data.user.id,
          full_name: fullName,
          phone: options.phone || "",
          license_number: options.license_number || "",
          status: "offline",
          is_verified: false, // Default false, requires admin verification
        });
        
        if (driverError) {
          console.error("Error creating driver profile:", driverError);
          return { error: driverError };
        }

        // 4. Assign role 'moderator' (sebagai placeholder driver)
        const { error: roleError } = await supabase.from("user_roles").insert({
          user_id: data.user.id,
          role: "moderator"
        });

        if (roleError) {
          console.error("Error assigning role:", roleError);
        }
      } else {
        // Default role 'user'
        await supabase.from("user_roles").insert({
          user_id: data.user.id,
          role: "user"
        });
      }
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    useAuthStore.getState().reset();
  };

  return { user, session, isLoading, isGuest, role, permissions, signIn, signUp, signOut };
}
