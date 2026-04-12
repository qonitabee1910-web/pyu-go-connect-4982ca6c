import { Car, Bike, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RideServiceType } from "@/stores/rideStore";

interface ServiceOption {
  type: RideServiceType;
  label: string;
  description: string;
  icon: React.ReactNode;
  colorClass: string;
  estimate: string;
}

const services: ServiceOption[] = [
  {
    type: "bike",
    label: "Bike",
    description: "Motorcycle ride",
    icon: <Bike className="w-6 h-6" />,
    colorClass: "text-green-500 bg-green-500/10 border-green-500/30",
    estimate: "From Rp 5,000",
  },
  {
    type: "bike_women",
    label: "Bike Women",
    description: "Women-only driver",
    icon: (
      <div className="relative">
        <Bike className="w-6 h-6" />
        <ShieldCheck className="w-3 h-3 absolute -bottom-1 -right-1" />
      </div>
    ),
    colorClass: "text-pink-500 bg-pink-500/10 border-pink-500/30",
    estimate: "From Rp 5,500",
  },
  {
    type: "car",
    label: "Car",
    description: "Comfortable car ride",
    icon: <Car className="w-6 h-6" />,
    colorClass: "text-primary bg-primary/10 border-primary/30",
    estimate: "From Rp 7,000",
  },
];

interface ServiceSelectorProps {
  selected: RideServiceType;
  onSelect: (type: RideServiceType) => void;
  loading?: boolean;
}

export function ServiceSelector({ selected, onSelect, loading }: ServiceSelectorProps) {
  return (
    <div className="space-y-2">
      <h3 className="font-bold text-lg">Choose Service</h3>
      <div className="space-y-2">
        {services.map((s) => {
          const isActive = selected === s.type;
          return (
            <button
              key={s.type}
              onClick={() => onSelect(s.type)}
              disabled={loading}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left",
                isActive ? s.colorClass + " border-current" : "bg-card border-border hover:border-muted-foreground/30"
              )}
            >
              <div className={cn("shrink-0", isActive ? "" : "text-muted-foreground")}>{s.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.description}</p>
              </div>
              <p className="text-xs font-medium shrink-0">{s.estimate}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
