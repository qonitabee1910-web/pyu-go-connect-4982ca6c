import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Loader2, Trash2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function AdminHotels() {
  const qc = useQueryClient();
  const [hotelDialog, setHotelDialog] = useState(false);
  const [roomDialog, setRoomDialog] = useState<string | null>(null);

  const { data: hotels, isLoading } = useQuery({
    queryKey: ["admin-hotels"],
    queryFn: async () => {
      const { data, error } = await supabase.from("hotels").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: bookings } = useQuery({
    queryKey: ["admin-hotel-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("hotel_bookings").select("*, hotels(name), hotel_rooms(name)").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });

  const handleAddHotel = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      const { error } = await supabase.from("hotels").insert({
        name: fd.get("name") as string,
        city: fd.get("city") as string,
        address: fd.get("address") as string,
        star_rating: Number(fd.get("star_rating")) || 3,
        description: fd.get("description") as string,
        image_url: fd.get("image_url") as string || null,
        amenities: (fd.get("amenities") as string).split(",").map((s) => s.trim()).filter(Boolean),
      });
      if (error) throw error;
      toast.success("Hotel added");
      setHotelDialog(false);
      qc.invalidateQueries({ queryKey: ["admin-hotels"] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAddRoom = async (e: React.FormEvent<HTMLFormElement>, hotelId: string) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      const { error } = await supabase.from("hotel_rooms").insert({
        hotel_id: hotelId,
        name: fd.get("name") as string,
        price_per_night: Number(fd.get("price_per_night")),
        max_guests: Number(fd.get("max_guests")) || 2,
        total_rooms: Number(fd.get("total_rooms")) || 1,
        available_rooms: Number(fd.get("total_rooms")) || 1,
        description: fd.get("description") as string,
        image_url: fd.get("image_url") as string || null,
        amenities: (fd.get("amenities") as string).split(",").map((s) => s.trim()).filter(Boolean),
      });
      if (error) throw error;
      toast.success("Room added");
      setRoomDialog(null);
      qc.invalidateQueries({ queryKey: ["admin-hotels"] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteHotel = async (id: string) => {
    if (!confirm("Delete this hotel?")) return;
    const { error } = await supabase.from("hotels").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-hotels"] }); }
  };

  const statusColor: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
    completed: "bg-blue-100 text-blue-800",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Hotel Management</h2>
        <Dialog open={hotelDialog} onOpenChange={setHotelDialog}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Hotel</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Hotel</DialogTitle></DialogHeader>
            <form onSubmit={handleAddHotel} className="space-y-3">
              <div><Label className="text-xs">Name</Label><Input name="name" required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">City</Label><Input name="city" required /></div>
                <div><Label className="text-xs">Stars (1-5)</Label><Input name="star_rating" type="number" min={1} max={5} defaultValue={3} /></div>
              </div>
              <div><Label className="text-xs">Address</Label><Input name="address" required /></div>
              <div><Label className="text-xs">Description</Label><Textarea name="description" rows={2} /></div>
              <div><Label className="text-xs">Image URL</Label><Input name="image_url" /></div>
              <div><Label className="text-xs">Amenities (comma-separated)</Label><Input name="amenities" placeholder="WiFi, Pool, Parking" /></div>
              <Button type="submit" className="w-full">Add Hotel</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="hotels">
        <TabsList>
          <TabsTrigger value="hotels">Hotels</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
        </TabsList>

        <TabsContent value="hotels">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : !hotels?.length ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground"><Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />No hotels yet</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {hotels.map((h) => (
                <Card key={h.id}>
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-sm">{h.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{h.city} • {"⭐".repeat(h.star_rating)}</p>
                      </div>
                      <div className="flex gap-2">
                        <Dialog open={roomDialog === h.id} onOpenChange={(open) => setRoomDialog(open ? h.id : null)}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="text-xs h-7"><Plus className="w-3 h-3 mr-1" />Room</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>Add Room to {h.name}</DialogTitle></DialogHeader>
                            <form onSubmit={(e) => handleAddRoom(e, h.id)} className="space-y-3">
                              <div><Label className="text-xs">Room Name</Label><Input name="name" required placeholder="Deluxe" /></div>
                              <div className="grid grid-cols-2 gap-3">
                                <div><Label className="text-xs">Price/Night (Rp)</Label><Input name="price_per_night" type="number" required /></div>
                                <div><Label className="text-xs">Max Guests</Label><Input name="max_guests" type="number" defaultValue={2} /></div>
                              </div>
                              <div><Label className="text-xs">Total Rooms</Label><Input name="total_rooms" type="number" defaultValue={1} /></div>
                              <div><Label className="text-xs">Description</Label><Textarea name="description" rows={2} /></div>
                              <div><Label className="text-xs">Image URL</Label><Input name="image_url" /></div>
                              <div><Label className="text-xs">Amenities (comma-separated)</Label><Input name="amenities" placeholder="AC, WiFi, TV" /></div>
                              <Button type="submit" className="w-full">Add Room</Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                        <Button size="sm" variant="ghost" className="text-destructive h-7 w-7 p-0" onClick={() => handleDeleteHotel(h.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="bookings">
          <Card>
            <CardHeader><CardTitle className="text-sm">All Hotel Bookings</CardTitle></CardHeader>
            <CardContent>
              {!bookings?.length ? (
                <p className="text-sm text-muted-foreground">No bookings yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="pb-2 font-medium">Ref</th>
                        <th className="pb-2 font-medium">Hotel</th>
                        <th className="pb-2 font-medium">Dates</th>
                        <th className="pb-2 font-medium">Total</th>
                        <th className="pb-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((b: any) => (
                        <tr key={b.id} className="border-b border-border/50">
                          <td className="py-2 text-xs font-mono">{b.booking_ref}</td>
                          <td className="py-2 text-xs">{b.hotels?.name ?? "—"}</td>
                          <td className="py-2 text-xs">{b.check_in} → {b.check_out}</td>
                          <td className="py-2 font-semibold text-xs">Rp {Number(b.total_price).toLocaleString("id-ID")}</td>
                          <td className="py-2"><Badge variant="outline" className={statusColor[b.status] ?? ""}>{b.status}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
