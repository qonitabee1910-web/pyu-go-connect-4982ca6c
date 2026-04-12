import React from "react";
import { cn } from "@/lib/utils";
import { Armchair, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type SeatStatus = "available" | "reserved" | "booked" | "selected" | "driver";

export interface SeatInfo {
  id: string;
  number: string;
  status: SeatStatus;
}

interface SeatLayoutProps {
  vehicleType: "SUV" | "MiniCar" | "Hiace";
  seats: SeatInfo[];
  onSeatSelect: (seat: SeatInfo) => void;
  selectedSeats: string[];
}

/**
 * SeatLayout Component
 * 
 * Visualizes the vehicle seat layout (SUV, MiniCar, Hiace) based on user's 
 * requirements from provided image.
 */
export function SeatLayout({ vehicleType, seats, onSeatSelect, selectedSeats }: SeatLayoutProps) {
  
  const renderSeat = (seatNumber: string, isDriver: boolean = false) => {
    const seatData = seats.find(s => s.number === seatNumber);
    const isSelected = selectedSeats.includes(seatNumber);
    const status = isDriver ? "driver" : (isSelected ? "selected" : (seatData?.status || "available"));

    return (
      <TooltipProvider key={seatNumber}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              disabled={status === "booked" || status === "reserved" || status === "driver"}
              onClick={() => seatData && onSeatSelect(seatData)}
              className={cn(
                "w-12 h-12 rounded-lg flex flex-col items-center justify-center transition-all duration-200 border-2 relative",
                status === "available" && "bg-background border-muted hover:border-primary hover:bg-primary/5",
                status === "selected" && "bg-primary border-primary text-primary-foreground scale-105 shadow-md",
                status === "booked" && "bg-muted border-muted-foreground/20 cursor-not-allowed opacity-60",
                status === "reserved" && "bg-yellow-100 border-yellow-400 text-yellow-700 cursor-not-allowed",
                status === "driver" && "bg-secondary/40 border-secondary text-secondary-foreground cursor-not-allowed"
              )}
            >
              <Armchair className={cn("w-6 h-6", status === "driver" && "opacity-50")} />
              <span className="text-[10px] font-bold mt-0.5">{isDriver ? "DRV" : seatNumber}</span>
              {status === "booked" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-lg">
                  <div className="w-full h-0.5 bg-red-500/50 rotate-45" />
                </div>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs font-semibold capitalize">
              {isDriver ? "Driver Seat" : `Seat ${seatNumber}: ${status}`}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const renderLayout = () => {
    switch (vehicleType) {
      case "SUV":
        return (
          <div className="flex flex-col gap-6 items-center p-6 bg-accent/30 rounded-3xl border-4 border-accent max-w-[280px] mx-auto relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-4 bg-accent/50 rounded-t-full" />
            {/* Front Row */}
            <div className="flex justify-between w-full px-4">
              {renderSeat("1")}
              {renderSeat("D", true)}
            </div>
            {/* Middle Row */}
            <div className="flex justify-between w-full px-2">
              {renderSeat("2")}
              {renderSeat("3")}
              {renderSeat("4")}
            </div>
            {/* Back Row */}
            <div className="flex justify-between w-full px-4">
              {renderSeat("5")}
              <div className="w-12" /> {/* Space */}
              {renderSeat("6")}
            </div>
            <div className="w-full h-2 bg-accent/50 rounded-full mt-2" />
          </div>
        );
      case "MiniCar":
        return (
          <div className="flex flex-col gap-6 items-center p-6 bg-accent/30 rounded-3xl border-4 border-accent max-w-[240px] mx-auto relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-4 bg-accent/50 rounded-t-full" />
            {/* Front Row */}
            <div className="flex justify-between w-full px-4">
              <div className="w-12 h-12 flex items-center justify-center text-[10px] text-muted-foreground font-bold">DASH</div>
              {renderSeat("D", true)}
            </div>
            {/* Middle Row */}
            <div className="flex justify-between w-full px-2">
              {renderSeat("1")}
              <div className="w-12" /> {/* Space */}
              {renderSeat("2")}
            </div>
            {/* Back Row (Baggage Area in image) */}
            <div className="w-full py-4 bg-accent/50 rounded-xl flex items-center justify-center border-2 border-dashed border-accent">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Bagasi</span>
            </div>
          </div>
        );
      case "Hiace":
        return (
          <div className="flex flex-col gap-4 items-center p-6 bg-accent/30 rounded-3xl border-4 border-accent max-w-[320px] mx-auto relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-4 bg-accent/50 rounded-t-full" />
            {/* Front Row */}
            <div className="flex justify-between w-full px-4 mb-2">
              {renderSeat("1")}
              {renderSeat("D", true)}
            </div>
            {/* Row 2 */}
            <div className="flex justify-between w-full px-2">
              {renderSeat("2")}
              {renderSeat("3")}
              {renderSeat("4")}
            </div>
            {/* Row 3 */}
            <div className="flex justify-between w-full px-2">
              {renderSeat("5")}
              {renderSeat("6")}
              {renderSeat("7")}
            </div>
            {/* Row 4 */}
            <div className="flex justify-between w-full px-2">
              {renderSeat("8")}
              {renderSeat("9")}
              {renderSeat("10")}
            </div>
            <div className="w-full py-2 bg-accent/50 rounded-b-xl flex items-center justify-center">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Bagasi</span>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="w-full py-8 bg-card rounded-2xl shadow-inner border">
      <div className="flex items-center justify-center gap-6 mb-8 px-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-background border border-muted" />
          <span className="text-[10px] font-medium uppercase tracking-tighter">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-primary" />
          <span className="text-[10px] font-medium uppercase tracking-tighter">Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-muted opacity-60" />
          <span className="text-[10px] font-medium uppercase tracking-tighter">Booked</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-secondary/40 border border-secondary" />
          <span className="text-[10px] font-medium uppercase tracking-tighter">Driver</span>
        </div>
      </div>
      
      {renderLayout()}
      
      <div className="mt-8 px-6 py-3 bg-primary/5 border-y border-primary/10 flex items-start gap-3">
        <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Pilih kursi yang tersedia. Kursi yang Anda pilih akan <span className="text-primary font-bold">terkunci selama 10 menit</span> untuk proses pembayaran.
        </p>
      </div>
    </div>
  );
}
