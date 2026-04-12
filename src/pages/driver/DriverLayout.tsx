import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Navigation, Wallet, History, User, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const driverNav = [
  { to: "/driver", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/driver/ride", icon: Navigation, label: "Ride Aktif" },
  { to: "/driver/earnings", icon: Wallet, label: "Pendapatan" },
  { to: "/driver/history", icon: History, label: "Riwayat" },
];

export default function DriverLayout() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-emerald-600 px-4 py-3 flex items-center gap-3 sticky top-0 z-50">
        <button onClick={() => navigate("/profile")} className="text-white/80 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-sm text-white">PYU GO Driver</h1>
      </header>

      <main className="pb-20">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 flex justify-around h-14">
        {driverNav.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn("flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px]", isActive ? "text-emerald-600" : "text-muted-foreground")
            }
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
