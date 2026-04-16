<<<<<<< Updated upstream
import { useNavigate } from "react-router-dom";
import { Wallet, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { PromoSection } from "@/components/home/PromoSection";
import { AdsBanner } from "@/components/home/AdsBanner";
import { ServiceTabs } from "@/components/home/ServiceTabs";
import { TrustBanner } from "@/components/home/TrustBanner";
import { PopularRoutes } from "@/components/home/PopularRoutes";
import { useEffect } from "react";

export default function Index() {
  const navigate = useNavigate();
  const { user } = useAuth();

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

  const { data: recentRides } = useQuery({
    queryKey: ["recent-rides", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rides")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Hero */}
      <div className="gradient-primary px-6 pt-10 pb-16 relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img src="/pyu_go_icon.png" alt="PYU GO" className="w-10 h-10 rounded-xl shadow-md" />
            <div>
              <h1 className="text-xl font-extrabold text-primary-foreground leading-tight">PYU GO</h1>
              <p className="text-primary-foreground/70 text-xs">Your super app for travel</p>
            </div>
          </div>

          {user ? (
            <button
              onClick={() => navigate("/wallet")}
              className="flex items-center gap-2 bg-primary-foreground/20 backdrop-blur-sm px-3.5 py-2 rounded-full text-primary-foreground hover:bg-primary-foreground/30 transition-all"
            >
              <Wallet className="w-4 h-4" />
              <span className="text-sm font-bold">
                Rp {(wallet?.balance || 0).toLocaleString("id-ID")}
              </span>
            </button>
          ) : (
            <Button
              onClick={() => navigate("/auth")}
              size="sm"
              variant="secondary"
              className="rounded-full font-semibold text-xs bg-primary-foreground/20 text-primary-foreground border-0 hover:bg-primary-foreground/30"
            >
              Sign In
            </Button>
          )}
        </div>

        <p className="text-primary-foreground/90 text-sm font-medium">
          {user ? `Welcome back, ${user.user_metadata?.full_name ?? "rider"}! 👋` : "Rides, shuttles & hotels — all in one app"}
        </p>
      </div>

      {/* Service Tabs Card */}
      <div className="px-4">
        <ServiceTabs />
      </div>

      {/* Ads Banner */}
      <div className="mt-4">
        <AdsBanner placement="dashboard_banner" />
      </div>

      {/* Popular Routes */}
      <div className="px-4 mt-6">
        <PopularRoutes />
      </div>

      {/* Promo Section */}
      <div className="mt-6">
        <PromoSection />
      </div>

      {/* Trust Banner */}
      <div className="px-4 mt-6">
        <TrustBanner />
      </div>

      {/* Recent Activity */}
      <div className="px-4 mt-6 flex-1 pb-4">
        <h2 className="text-lg font-bold mb-3 text-foreground">Recent Activity</h2>
        {(!user || !recentRides || recentRides.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground bg-card rounded-2xl border border-border">
            <Clock className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">{user ? "No recent rides" : "Sign in to see activity"}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentRides.map((ride) => (
              <div key={ride.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-card border border-border hover:shadow-sm transition-shadow">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate text-foreground">
                    {ride.pickup_address ?? "Pickup"} → {ride.dropoff_address ?? "Dropoff"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(ride.created_at), "dd MMM, HH:mm")}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-sm font-bold text-foreground">
                    Rp {(ride.fare ?? 0).toLocaleString("id-ID")}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">{ride.status.replace("_", " ")}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!user && (
        <div className="px-4 pb-6 sticky bottom-16">
          <Button className="w-full gradient-primary text-primary-foreground font-semibold shadow-lg" size="lg" onClick={() => navigate("/auth")}>
            Sign in to get started
          </Button>
        </div>
      )}
    </div>
  );
}
=======
import { Helmet } from "react-helmet-async";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { PromoSection } from "@/components/home/PromoSection";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Clock, Smartphone, Award, Bus, Building2, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50/30 flex flex-col">
      <Helmet>
        <title>PYU GO — Best Shuttle & Hotel Deals Worldwide</title>
        <meta name="description" content="Book your shuttle and hotel with the best deals and stress-free experience. PYU GO is your ultimate travel companion." />
        <link rel="canonical" href="https://pyugo.com/" />
      </Helmet>

      <LandingNavbar />
      
      <main className="flex-grow">
        <LandingHero />

        {/* Features / Why Choose Us */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4 md:px-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Why Choose PYU GO?</h2>
              <p className="text-gray-500 max-w-2xl mx-auto text-lg">
                We provide the best travel experience with modern technology and customer-first approach.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <FeatureCard 
                index={0}
                icon={<Shield className="w-10 h-10 text-primary" />}
                title="Secure Booking"
                description="Your data and transactions are always protected with our advanced security."
              />
              <FeatureCard 
                index={1}
                icon={<Clock className="w-10 h-10 text-primary" />}
                title="24/7 Support"
                description="Our team is ready to help you anytime, anywhere, in your local language."
              />
              <FeatureCard 
                index={2}
                icon={<Smartphone className="w-10 h-10 text-primary" />}
                title="PWA Support"
                description="Install our app directly to your device for offline access and notifications."
              />
              <FeatureCard 
                index={3}
                icon={<Award className="w-10 h-10 text-primary" />}
                title="Best Price"
                description="We offer competitive prices and exclusive daily promos for all travelers."
              />
            </div>
          </div>
        </section>

        {/* Promo Section */}
        <section className="py-20">
          <div className="container mx-auto px-4 md:px-6">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex items-center justify-between mb-10"
            >
              <h2 className="text-3xl font-extrabold text-gray-900">Exclusive Offers</h2>
              <Button variant="ghost" className="text-primary font-bold hover:text-primary/80" onClick={() => navigate("/promo")}>
                View All Promos
              </Button>
            </motion.div>
            <PromoSection />
          </div>
        </section>

        {/* Services Overview */}
        <section className="py-20 bg-gray-900 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-primary/10 blur-3xl rounded-full -mr-20 -mt-20" />
          <div className="container mx-auto px-4 md:px-6 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                <h2 className="text-4xl font-extrabold mb-8 leading-tight">
                  One App for All Your <br />
                  <span className="text-primary">Travel Needs.</span>
                </h2>
                <div className="space-y-6">
                  <ServiceItem 
                    icon={<Bus className="w-6 h-6" />}
                    title="Intercity Shuttle"
                    description="Travel between cities with our comfortable and punctual shuttle service."
                  />
                  <ServiceItem 
                    icon={<Building2 className="w-6 h-6" />}
                    title="Premium Hotels"
                    description="Stay at the best hotels with exclusive member-only discounts."
                  />
                  <ServiceItem 
                    icon={<Car className="w-6 h-6" />}
                    title="On-demand Rides"
                    description="Quick and reliable rides within your city at the touch of a button."
                  />
                </div>
                <Button 
                  className="mt-10 bg-primary hover:bg-primary/90 text-white font-bold h-12 px-8 rounded-xl"
                  onClick={() => navigate("/auth")}
                >
                  Get Started Now
                </Button>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="relative"
              >
                <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl rotate-3">
                  <img 
                    src="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=2070" 
                    alt="Travel" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <motion.div 
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: 0.3 }}
                  className="absolute -bottom-10 -left-10 aspect-square w-64 rounded-3xl overflow-hidden shadow-2xl -rotate-6 border-8 border-gray-900 hidden md:block"
                >
                  <img 
                    src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=2070" 
                    alt="Hotel" 
                    className="w-full h-full object-cover"
                  />
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Download App CTA */}
        <section className="py-24 bg-white">
          <div className="container mx-auto px-4 md:px-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <Card className="bg-primary/5 border-none rounded-[2rem] overflow-hidden">
                <CardContent className="p-10 md:p-20 flex flex-col md:flex-row items-center justify-between gap-12">
                  <div className="max-w-xl text-center md:text-left">
                    <h2 className="text-4xl font-extrabold text-gray-900 mb-6">Experience More with PYU GO App</h2>
                    <p className="text-gray-600 text-lg mb-8">
                      Download our app to get real-time notifications, manage your bookings easily, 
                      and access exclusive app-only deals.
                    </p>
                    <div className="flex flex-wrap justify-center md:justify-start gap-4">
                      <img src="https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us?size=250x83" alt="App Store" className="h-12 cursor-pointer hover:scale-105 transition-transform" />
                      <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Google Play" className="h-12 cursor-pointer hover:scale-105 transition-transform" />
                    </div>
                  </div>
                  <motion.div 
                    animate={{ y: [0, -20, 0] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    className="w-64 md:w-80 shrink-0"
                  >
                    <img 
                      src="/pyu_go_icon.png" 
                      alt="App" 
                      className="w-full h-full drop-shadow-2xl"
                    />
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}

function FeatureCard({ icon, title, description, index }: { icon: React.ReactNode; title: string; description: string; index: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="p-8 rounded-3xl bg-gray-50 border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all group"
    >
      <div className="mb-6 p-4 rounded-2xl bg-white shadow-sm w-fit group-hover:bg-primary group-hover:text-white transition-colors">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-500 leading-relaxed">{description}</p>
    </motion.div>
  );
}

function ServiceItem({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <motion.div 
      whileHover={{ x: 10 }}
      className="flex items-start gap-4 cursor-default"
    >
      <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0 text-primary">
        {icon}
      </div>
      <div>
        <h4 className="text-lg font-bold mb-1">{title}</h4>
        <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}

>>>>>>> Stashed changes
