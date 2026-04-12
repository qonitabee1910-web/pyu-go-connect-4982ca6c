import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Calendar, Tag, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tables } from "@/integrations/supabase/types";

interface PromoCardProps {
  promo: Tables<"promos">;
  onClick?: (promo: Tables<"promos">) => void;
  className?: string;
}

/**
 * PromoCard Component
 * 
 * Displays an individual promo item with title, description, code, and validity period.
 * Optimized for accessibility and responsiveness.
 * 
 * @param promo - The promo data from Supabase
 * @param onClick - Callback for click tracking and interaction
 */
export function PromoCard({ promo, onClick, className }: PromoCardProps) {
  const isPercentage = promo.discount_type === "percentage";
  const discountDisplay = isPercentage 
    ? `${promo.discount_value}% OFF` 
    : `Rp ${promo.discount_value.toLocaleString("id-ID")} OFF`;

  return (
    <Card 
      className={cn(
        "group overflow-hidden border-none shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer bg-gradient-to-br from-card to-muted/30",
        className
      )}
      onClick={() => onClick?.(promo)}
      role="button"
      tabIndex={0}
      aria-label={`Promo: ${promo.title}. Code: ${promo.code}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onClick?.(promo);
        }
      }}
    >
      <CardContent className="p-0">
        <div className="relative aspect-[16/9] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 flex items-center justify-center">
            <Tag className="w-12 h-12 text-primary/40 group-hover:scale-110 transition-transform duration-500" />
          </div>
          
          <div className="absolute top-3 left-3">
            <Badge className="bg-primary text-primary-foreground font-bold px-3 py-1 shadow-lg">
              {discountDisplay}
            </Badge>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors line-clamp-1">
              {promo.title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {promo.description}
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              <span>Valid until {format(new Date(promo.end_date), "dd MMM yyyy")}</span>
            </div>
            
            <div className="flex items-center gap-1 text-primary font-bold text-sm">
              <span>Use Code</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-2 flex items-center justify-between border border-dashed border-muted-foreground/30">
            <code className="text-primary font-mono font-bold tracking-wider">{promo.code}</code>
            <Badge variant="outline" className="text-[10px] uppercase font-semibold">
              {promo.target_service === 'all' ? 'Universal' : promo.target_service}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
