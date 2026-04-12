import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PromoCard } from "./PromoCard";
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselNext, 
  CarouselPrevious 
} from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { getExperimentVariant, trackExperimentConversion } from "@/lib/ab-test";

/**
 * PromoSection Component
 * 
 * Fetches and displays active promos in a responsive carousel for mobile
 * and a grid/carousel hybrid for desktop.
 * Includes click tracking analytics and error handling.
 */
export function PromoSection() {
  const variant = getExperimentVariant('promo_heading_text', ['Offers', 'Deals']);

  const { data: promos, isLoading, error } = useQuery({
    queryKey: ["active-promos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promos")
        .select("*")
        .eq("is_active", true)
        .gte("end_date", new Date().toISOString())
        .lte("start_date", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Tables<"promos">[];
    },
  });

  const handlePromoClick = async (promo: Tables<"promos">) => {
    // In a real scenario, we'd have a separate table or RPC for promo clicks
    // For now, we'll log it or use the generic ad metric if applicable
    console.log(`Promo clicked: ${promo.code}`, promo.id);
    
    // A/B Test tracking
    trackExperimentConversion('promo_heading_text', 'promo_click');
    
    // Copy code to clipboard for better UX
    try {
      await navigator.clipboard.writeText(promo.code);
      toast.success("Promo code copied!", {
        description: `Code ${promo.code} is ready to use.`,
      });
    } catch (err) {
      console.error("Failed to copy code", err);
    }

    // A/B Testing Foundation: Log variant info if implemented
    // window.analytics.track('Promo Clicked', { promoId: promo.id, variant: 'A' });
  };

  if (isLoading) {
    return (
      <div className="px-6 mt-8 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-[280px] w-full min-w-[300px] rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !promos || promos.length === 0) {
    return null; // Don't show anything if no promos
  }

  return (
    <section className="px-6 mt-8" aria-labelledby="promo-heading">
      <div className="flex items-center justify-between mb-4">
        <h2 id="promo-heading" className="text-xl font-extrabold tracking-tight">
          Special {variant === 'Offers' ? 'Offers' : 'Deals'}
        </h2>
        <span className="text-xs font-medium text-primary hover:underline cursor-pointer">
          View All
        </span>
      </div>

      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        className="w-full relative group/carousel"
      >
        <CarouselContent className="-ml-4">
          {promos.map((promo) => (
            <CarouselItem key={promo.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
              <PromoCard 
                promo={promo} 
                onClick={handlePromoClick}
                className="h-full"
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        
        {/* Navigation arrows visible on hover for desktop */}
        <div className="hidden md:block">
          <CarouselPrevious className="absolute -left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover/carousel:opacity-100 transition-opacity bg-background/80 backdrop-blur" />
          <CarouselNext className="absolute -right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover/carousel:opacity-100 transition-opacity bg-background/80 backdrop-blur" />
        </div>

        {/* Mobile indicators could be added here if needed */}
      </Carousel>
    </section>
  );
}
