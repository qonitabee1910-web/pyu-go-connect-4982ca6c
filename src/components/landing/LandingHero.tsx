import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bus, Building2, MapPin, Calendar, Users, Search, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export function LandingHero() {
  const navigate = useNavigate();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [hotelDate, setHotelDate] = useState<Date | undefined>(new Date());

  return (
    <section className="relative min-h-[600px] flex flex-col items-center pt-32 pb-20 px-4 overflow-hidden">
      {/* Background Image & Overlay */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/60 via-primary/40 to-background/20 mix-blend-multiply z-10" />
        <img 
          src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=2070" 
          alt="Hero Background" 
          className="w-full h-full object-cover scale-105 animate-pulse-slow"
        />
      </div>

      <div className="container relative z-10 mx-auto text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 tracking-tight">
          Explore the World, <br className="hidden md:block" />
          <span className="text-primary-foreground">Stress-Free Booking.</span>
        </h1>
        <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto font-medium">
          Get the best deals on shuttle services and luxury hotels worldwide. 
          Simple, fast, and secure.
        </p>
      </div>

      <div className="container relative z-10 mx-auto max-w-5xl animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
        <Card className="p-1 md:p-2 bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl md:rounded-3xl border-none">
          <Tabs defaultValue="shuttle" className="w-full">
            <div className="px-4 md:px-6 pt-4">
              <TabsList className="bg-transparent gap-6 md:gap-10 h-auto p-0 mb-6 flex justify-start md:justify-center">
                <TabsTrigger 
                  value="shuttle" 
                  className="flex items-center gap-2 data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 text-base md:text-lg font-bold text-gray-500 transition-all border-b-2 border-transparent"
                >
                  <Bus className="w-5 h-5" />
                  Shuttle
                </TabsTrigger>
                <TabsTrigger 
                  value="hotel" 
                  className="flex items-center gap-2 data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 text-base md:text-lg font-bold text-gray-500 transition-all border-b-2 border-transparent"
                >
                  <Building2 className="w-5 h-5" />
                  Hotel
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="shuttle" className="mt-0 outline-none">
              <div className="p-4 md:p-6 space-y-4 md:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-2">
                  <div className="md:col-span-5 relative">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div className="space-y-1.5 group">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">From</label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary group-focus-within:text-primary transition-colors" />
                          <Input 
                            placeholder="Origin" 
                            className="pl-10 h-14 bg-gray-50/50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all text-base font-semibold"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5 group relative">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">To</label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary group-focus-within:text-primary transition-colors" />
                          <Input 
                            placeholder="Destination" 
                            className="pl-10 h-14 bg-gray-50/50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all text-base font-semibold"
                          />
                          <Button 
                            variant="secondary" 
                            size="icon" 
                            className="absolute -left-5 top-1/2 -translate-y-1/2 hidden md:flex rounded-full bg-white shadow-md border border-gray-100 hover:bg-gray-50 z-10 w-8 h-8"
                          >
                            <ArrowRightLeft className="w-4 h-4 text-primary" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-4 space-y-1.5 group">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">Departure Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full h-14 justify-start text-left font-semibold text-base pl-10 bg-gray-50/50 border-gray-200 hover:bg-white transition-all",
                            !date && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="absolute left-3 w-5 h-5 text-primary" />
                          {date ? format(date, "EEE, dd MMM yyyy") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={date}
                          onSelect={setDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="md:col-span-3 flex items-end">
                    <Button 
                      className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-bold text-lg rounded-xl md:rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                      onClick={() => navigate("/shuttle")}
                    >
                      <Search className="w-5 h-5 mr-2" />
                      Search Shuttle
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="hotel" className="mt-0 outline-none">
              <div className="p-4 md:p-6 space-y-4 md:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-2">
                  <div className="md:col-span-5 space-y-1.5 group">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">Destination or Hotel Name</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary group-focus-within:text-primary transition-colors" />
                      <Input 
                        placeholder="Where are you staying?" 
                        className="pl-10 h-14 bg-gray-50/50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all text-base font-semibold"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-4 space-y-1.5 group">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">Check-in Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full h-14 justify-start text-left font-semibold text-base pl-10 bg-gray-50/50 border-gray-200 hover:bg-white transition-all",
                            !hotelDate && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="absolute left-3 w-5 h-5 text-primary" />
                          {hotelDate ? format(hotelDate, "EEE, dd MMM yyyy") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={hotelDate}
                          onSelect={setHotelDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="md:col-span-3 flex items-end">
                    <Button 
                      className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-bold text-lg rounded-xl md:rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                      onClick={() => navigate("/hotel")}
                    >
                      <Search className="w-5 h-5 mr-2" />
                      Search Hotel
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </section>
  );
}
