import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Car, Bus, Users, UserCog, CreditCard, Building2, Settings, Mail, ArrowLeft, Send, LogOut, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSessionManager } from "@/hooks/useSessionManager";
import { toast } from "sonner";

const adminNav = [
  { to: "/admin", icon: LayoutDashboard, label: "Overview", end: true },
  { to: "/admin/rides", icon: Car, label: "Rides" },
  { to: "/admin/shuttles", icon: Bus, label: "Shuttles" },
  { to: "/admin/hotels", icon: Building2, label: "Hotels" },
  { to: "/admin/drivers", icon: UserCog, label: "Drivers" },
  { to: "/admin/users", icon: Users, label: "Users" },
  { to: "/admin/payments", icon: CreditCard, label: "Payments" },
  { to: "/admin/withdrawals", icon: Send, label: "Withdrawals" },
  { to: "/admin/car-builder", icon: Car, label: "Car Builder" },
  { to: "/admin/email-settings", icon: Mail, label: "Email Config" },
  { to: "/admin/email-templates", icon: Mail, label: "Email Templates" },
  { to: "/admin/email-webhook-tracking", icon: Bell, label: "Webhook Events" },
  { to: "/admin/settings", icon: Settings, label: "Settings" },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const { logout: sessionLogout } = useSessionManager({ autoInitialize: false });
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      // Use sessionLogout for proper logout flow with session cleanup
      await sessionLogout();
    } catch (error) {
      toast.error("Logout gagal");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top bar */}
      <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <img src="/pyu_go_icon.png" alt="PYU GO" className="w-7 h-7 rounded-lg" />
          <h1 className="font-bold text-sm">PYU GO Admin</h1>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleLogout}
          disabled={loggingOut}
          className="gap-2"
        >
          <LogOut className="w-4 h-4" />
          {loggingOut ? "Logging out..." : "Logout"}
        </Button>
      </header>

      <div className="flex">
        {/* Sidebar - desktop */}
        <aside className="hidden md:flex flex-col w-56 border-r border-border bg-card min-h-[calc(100vh-52px)] p-3 gap-1">
          {adminNav.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
                )
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </aside>

        {/* Mobile nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 flex justify-around h-14">
          {adminNav.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn("flex flex-col items-center justify-center gap-0.5 w-16 h-full text-[10px]", isActive ? "text-primary" : "text-muted-foreground")
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Content */}
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
