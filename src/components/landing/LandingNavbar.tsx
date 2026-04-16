import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X, Globe, User, LogIn, ChevronDown, Wallet, Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LandingNavbar() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { permission, requestPermission } = usePushNotifications();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Wallet balance fetching
  const { data: wallet, refetch: refetchWallet } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      
      if (!data) {
        // Auto-create wallet if not exists
        const { data: newWallet, error: insertError } = await supabase
          .from("wallets")
          .insert({ user_id: user.id, wallet_type: "user" })
          .select("*")
          .single();
        if (insertError) throw insertError;
        return newWallet;
      }
      return data;
    },
    enabled: !!user,
  });

  // Realtime subscription for wallet balance updates
  useEffect(() => {
    if (!user || !wallet?.id) return;
    
    const channel = supabase
      .channel(`wallet-updates-${wallet.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "wallets",
          filter: `id=eq.${wallet.id}`,
        },
        () => {
          refetchWallet();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, wallet?.id, refetchWallet]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-white shadow-md py-3" : "bg-transparent py-5"
      }`}
    >
      <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
        {/* Logo */}
        <div 
          className="flex items-center gap-2 cursor-pointer" 
          onClick={() => navigate("/")}
        >
          <img src="/pyu_go_icon.png" alt="PYU GO" className="w-8 h-8 rounded-lg" />
          <span className={`text-xl font-bold ${isScrolled ? "text-primary" : "text-white"}`}>
            PYU GO
          </span>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8">
          <NavLink href="/shuttle" isScrolled={isScrolled}>Shuttle</NavLink>
          <NavLink href="/hotel" isScrolled={isScrolled}>Hotel</NavLink>
          <NavLink href="/ride" isScrolled={isScrolled}>Ride</NavLink>
          <NavLink href="/promo" isScrolled={isScrolled}>Promo</NavLink>
          <NavLink href="/order-status" isScrolled={isScrolled}>Order Status</NavLink>
        </div>

        {/* Right Actions */}
        <div className="hidden md:flex items-center gap-4">
          <div className={`flex items-center gap-1 cursor-pointer ${isScrolled ? "text-gray-700" : "text-white/90"}`}>
            <Globe className="w-4 h-4" />
            <span className="text-sm font-medium uppercase">EN</span>
            <ChevronDown className="w-3 h-3" />
          </div>

          {user ? (
            <div className="flex items-center gap-3">
              {permission !== 'granted' && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={requestPermission}
                  className={isScrolled ? "text-gray-700 hover:bg-gray-100" : "text-white hover:bg-white/20"}
                  title="Enable Notifications"
                >
                  <BellOff className="w-5 h-5" />
                </Button>
              )}
              {permission === 'granted' && (
                <div className={isScrolled ? "text-primary" : "text-white/80"}>
                  <Bell className="w-5 h-5" />
                </div>
              )}

              <Button 
                variant="ghost" 
                onClick={() => navigate("/wallet")}
                className={`flex items-center gap-2 ${isScrolled ? "text-gray-700 bg-gray-100/50" : "text-white bg-white/20 hover:bg-white/30"}`}
              >
                <Wallet className="w-4 h-4" />
                <span className="text-sm font-bold">
                  Rp {(wallet?.balance || 0).toLocaleString("id-ID")}
                </span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className={`flex items-center gap-2 ${isScrolled ? "text-gray-700" : "text-white hover:bg-white/20"}`}>
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary-foreground border border-white/20">
                      {user.user_metadata?.full_name?.charAt(0) || <User className="w-4 h-4" />}
                    </div>
                    <span className="text-sm font-medium">{user.user_metadata?.full_name || "Account"}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5 text-sm font-medium text-gray-500">
                    Signed in as <br />
                    <span className="text-gray-900 truncate block">{user.email}</span>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/profile")}>Profile</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/wallet")}>Wallet & Top-up</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/ride")}>My Rides</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/shuttle")}>My Shuttles</DropdownMenuItem>
                  {user.user_metadata?.role === 'admin' && (
                    <DropdownMenuItem onClick={() => navigate("/admin")}>Admin Dashboard</DropdownMenuItem>
                  )}
                  {user.user_metadata?.role === 'driver' && (
                    <DropdownMenuItem onClick={() => navigate("/driver")}>Driver Dashboard</DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()} className="text-red-500">Logout</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                className={isScrolled ? "text-gray-700" : "text-white hover:bg-white/20"}
                onClick={() => navigate("/auth")}
              >
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </Button>
              <Button 
                className="bg-primary hover:bg-primary/90 text-white border-none shadow-sm"
                onClick={() => navigate("/auth?mode=signup")}
              >
                Sign Up
              </Button>
            </div>
          )}
        </div>

        {/* Mobile Toggle */}
        <button 
          className="md:hidden"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? (
            <X className={`w-6 h-6 ${isScrolled ? "text-gray-900" : "text-white"}`} />
          ) : (
            <Menu className={`w-6 h-6 ${isScrolled ? "text-gray-900" : "text-white"}`} />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white shadow-xl animate-in slide-in-from-top duration-300">
          <div className="flex flex-col p-4 gap-4">
            <MobileNavLink href="/shuttle" onClick={() => setIsMobileMenuOpen(false)}>Shuttle</MobileNavLink>
            <MobileNavLink href="/hotel" onClick={() => setIsMobileMenuOpen(false)}>Hotel</MobileNavLink>
            <MobileNavLink href="/ride" onClick={() => setIsMobileMenuOpen(false)}>Ride</MobileNavLink>
            <MobileNavLink href="/promo" onClick={() => setIsMobileMenuOpen(false)}>Promo</MobileNavLink>
            <MobileNavLink href="/order-status" onClick={() => setIsMobileMenuOpen(false)}>Order Status</MobileNavLink>
            <hr className="border-gray-100" />
            {user ? (
              <>
                <MobileNavLink href="/profile">Profile</MobileNavLink>
                <MobileNavLink href="/wallet">Wallet</MobileNavLink>
                <Button onClick={() => signOut()} variant="outline" className="w-full justify-start">Logout</Button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => navigate("/auth")}>Sign In</Button>
                <Button onClick={() => navigate("/auth?mode=signup")}>Sign Up</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

function NavLink({ href, children, isScrolled }: { href: string; children: React.ReactNode; isScrolled: boolean }) {
  return (
    <a
      href={href}
      className={`text-sm font-semibold transition-colors ${
        isScrolled ? "text-gray-700 hover:text-primary" : "text-white/90 hover:text-white"
      }`}
    >
      {children}
    </a>
  );
}

function MobileNavLink({ href, children, onClick }: { href: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <a
      href={href}
      onClick={onClick}
      className="text-base font-semibold text-gray-800 hover:text-primary transition-colors py-2"
    >
      {children}
    </a>
  );
}
