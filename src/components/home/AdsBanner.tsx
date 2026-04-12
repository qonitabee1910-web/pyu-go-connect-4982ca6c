import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Tables, Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type AdPlacement = Database["public"]["Enums"]["ad_placement"];

/**
 * AdsBanner Component
 * 
 * Displays active advertisements based on placement.
 * Includes automatic view and click tracking via Supabase RPC.
 */
export function AdsBanner({ placement = "dashboard_banner" }: { placement?: AdPlacement }) {
  const { data: ads, isLoading } = useQuery({
    queryKey: ["active-ads", placement],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ads")
        .select("*")
        .eq("is_active", true)
        .eq("placement", placement)
        .gte("end_date", new Date().toISOString())
        .lte("start_date", new Date().toISOString())
        .order("display_order", { ascending: true });

      if (error) throw error;

      // Track views for each ad
      if (data && data.length > 0) {
        data.forEach(async (ad) => {
          const { error: rpcError } = await supabase.rpc('increment_ad_metric', { p_ad_id: ad.id, p_type: 'view' });
          if (rpcError) console.error("Error incrementing ad metric:", rpcError);
        });
      }

      return data as Tables<"ads">[];
    },
  });

  const handleAdClick = async (ad: Tables<"ads">) => {
    // Track click
    const { error: rpcError } = await supabase.rpc('increment_ad_metric', { p_ad_id: ad.id, p_type: 'click' });
    if (rpcError) console.error("Error incrementing ad metric:", rpcError);
    
    if (ad.link_url) {
      if (ad.link_url.startsWith('http')) {
        window.open(ad.link_url, '_blank', 'noopener,noreferrer');
      } else {
        // Handle internal routing if link_url is a path
        window.location.href = ad.link_url;
      }
    }
  };

  if (isLoading) {
    return <div className="px-6 mt-6"><Skeleton className="h-40 w-full rounded-2xl" /></div>;
  }

  if (!ads || ads.length === 0) return null;

  return (
    <div className="px-6 mt-6 space-y-4">
      {ads.map((ad) => (
        <div 
          key={ad.id}
          className={cn(
            "relative overflow-hidden rounded-2xl cursor-pointer group shadow-sm hover:shadow-md transition-all",
            "aspect-[21/9] md:aspect-[3/1]"
          )}
          onClick={() => handleAdClick(ad)}
          role="complementary"
          aria-label={`Advertisement: ${ad.title}`}
        >
          <img 
            src={ad.image_url} 
            alt={ad.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-4">
            <h3 className="text-white font-bold text-lg leading-tight">{ad.title}</h3>
            {ad.description && <p className="text-white/80 text-xs line-clamp-1">{ad.description}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
