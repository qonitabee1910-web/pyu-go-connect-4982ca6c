/**
 * SessionRecoveryWrapper - Handles session expiration with recovery flow
 * Wraps protected routes to show SessionExpiredPage when session expires
 */

import { Outlet, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRBAC } from "@/hooks/useRBAC";
import { useSessionManager } from "@/hooks/useSessionManager";
import { SessionExpiredPage } from "@/pages/auth/SessionExpiredPage";
import { Permission, Role } from "@/lib/rbac";

interface SessionRecoveryWrapperProps {
  requiredRole?: Role;
  requiredPermission?: Permission | Permission[];
}

export function SessionRecoveryWrapper({
  requiredRole,
  requiredPermission,
}: SessionRecoveryWrapperProps) {
  const { user, isLoading: authLoading, role } = useAuth();
  const { checkPermission, checkAnyPermission } = useRBAC();
  const location = useLocation();
  const navigate = useNavigate();

  // Session management with recovery flow
  const {
    isSessionValid,
    isSessionExpired,
    sessionExpiredTime,
    recoverSession,
    logout,
  } = useSessionManager({
    autoInitialize: true,
  });

  // If session is expired, show recovery page
  if (isSessionExpired) {
    return (
      <SessionExpiredPage
        expiryTime={sessionExpiredTime || undefined}
        autoRedirectSeconds={60}
        onRecover={async () => {
          const success = await recoverSession();
          if (success) {
            // Stay on current page after recovery
            navigate(location.pathname, { replace: true });
          }
        }}
        onLogout={() => {
          logout();
          navigate("/auth", { replace: true });
        }}
      />
    );
  }

  // If session is invalid (not expired but invalid), redirect to login
  if (!isSessionValid && user) {
    const loginPath = location.pathname.startsWith("/driver")
      ? "/driver/auth"
      : "/auth";
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // If not authenticated and not loading, redirect to login
  if (!user && !authLoading) {
    const loginPath = location.pathname.startsWith("/driver")
      ? "/driver/auth"
      : "/auth";
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // If still loading and no user yet, show loading spinner
  if (authLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="space-y-4 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-slate-600">Loading your session...</p>
        </div>
      </div>
    );
  }

  // Wait for role to be loaded before checking permissions
  // This fixes the race condition where role is undefined during refresh
  if (user && !role && authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="space-y-4 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-slate-600">Verifying permissions...</p>
        </div>
      </div>
    );
  }

  // User is authenticated - check role (only after role is loaded)
  if (user && role && requiredRole && role !== requiredRole && role !== "admin") {
    return <Navigate to="/forbidden" state={{ from: location }} replace />;
  }

  // Check permission if required
  if (requiredPermission) {
    const isAllowed = Array.isArray(requiredPermission)
      ? checkAnyPermission(requiredPermission)
      : checkPermission(requiredPermission);

    if (!isAllowed) {
      return <Navigate to="/forbidden" state={{ from: location }} replace />;
    }
  }

  // All checks passed - render nested routes
  return <Outlet />;
}
