import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { Role } from "@/lib/rbac";

export function useAuth() {
  const navigate = useNavigate();
  const { setSession, setLoading, setRole, user, session, isLoading, isGuest, role, permissions } = useAuthStore();

  const fetchUserRole = useCallback(async (userId: string) => {
    try {
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
    } catch (err) {
      console.error("Failed to fetch user role:", err);
      setRole("user");
    }
  }, [setRole]);

  const handleAuthError = useCallback(async (error: any) => {
    if (error?.message?.includes("Invalid Refresh Token") || error?.message?.includes("Refresh Token Not Found")) {
      console.warn("Refresh token invalid, signing out user");
      await supabase.auth.signOut();
      useAuthStore.getState().reset();
      navigate("/auth");
    }
  }, [navigate]);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Attempt to recover session from URL (after OAuth redirect)
        const { data: { session: urlSession } } = await supabase.auth.getSession();
        
        if (mounted) {
          setSession(urlSession);
          if (urlSession?.user) {
            await fetchUserRole(urlSession.user.id);
          } else {
            setRole(null);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to initialize auth:", err);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, sessionData) => {
      if (!mounted) return;

      if (event === "SIGNED_OUT") {
        setSession(null);
        setRole(null);
      } else if (sessionData) {
        setSession(sessionData);
        try {
          await fetchUserRole(sessionData.user.id);
        } catch (err) {
          console.error("Failed to fetch role on auth state change:", err);
        }
      }
      
      setLoading(false);
    });

    // Set up periodic token refresh to prevent expiration
    const refreshInterval = setInterval(async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.refreshSession();
        if (error) {
          handleAuthError(error);
        }
      } catch (err) {
        handleAuthError(err);
      }
    }, 1000 * 60 * 50); // Refresh every 50 minutes

    return () => {
      mounted = false;
      subscription?.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, [setSession, setLoading, setRole, fetchUserRole, handleAuthError]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        handleAuthError(error);
      }
      return { error };
    } catch (err) {
      handleAuthError(err);
      return { error: err };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, options?: { phone?: string; license_number?: string; isDriver?: boolean }) => {
    try {
      // Validasi duplikasi driver sebelum signup
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

      // Signup — handle_new_user trigger creates profile, role, and driver record automatically
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: options?.phone,
            license_number: options?.license_number,
            is_driver: options?.isDriver || false,
          },
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        handleAuthError(error);
        return { error };
      }
      return { error: null };
    } catch (err) {
      handleAuthError(err);
      return { error: err };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      useAuthStore.getState().reset();
      navigate("/auth");
    } catch (err) {
      console.error("Sign out error:", err);
      useAuthStore.getState().reset();
      navigate("/auth");
    }
  };

  // Manual refresh function for explicit token refresh
  const refreshToken = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        handleAuthError(error);
        return { success: false, error };
      }
      return { success: true, session: data.session };
    } catch (err) {
      handleAuthError(err);
      return { success: false, error: err };
    }
  };

  return { user, session, isLoading, isGuest, role, permissions, signIn, signUp, signOut, refreshToken };
}
