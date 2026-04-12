import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRBAC } from "@/hooks/useRBAC";
import { Permission, Role } from "@/lib/rbac";

interface ProtectedRouteProps {
  requiredRole?: Role;
  requiredPermission?: Permission | Permission[];
}

export function ProtectedRoute({ requiredRole, requiredPermission }: ProtectedRouteProps) {
  const { user, isLoading: authLoading, role } = useAuth();
  const { checkPermission, checkAnyPermission } = useRBAC();
  const location = useLocation();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    const loginPath = location.pathname.startsWith("/driver") ? "/driver/auth" : "/auth";
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // Check role if required
  if (requiredRole && role !== requiredRole && role !== "admin") {
    return <Navigate to="/forbidden" replace />;
  }

  // Check permission if required
  if (requiredPermission) {
    const isAllowed = Array.isArray(requiredPermission)
      ? checkAnyPermission(requiredPermission)
      : checkPermission(requiredPermission);

    if (!isAllowed) {
      return <Navigate to="/forbidden" replace />;
    }
  }

  return <Outlet />;
}
