import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RoutesTab from "@/components/admin/shuttle/RoutesTab";
import RayonsTab from "@/components/admin/shuttle/RayonsTab";
import BookingsTab from "@/components/admin/shuttle/BookingsTab";
import PickupPointsTab from "@/components/admin/shuttle/PickupPointsTab";

export default function AdminShuttles() {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Shuttle Management</h2>
      <Tabs defaultValue="routes">
        <TabsList className="mb-4">
          <TabsTrigger value="routes">Routes</TabsTrigger>
          <TabsTrigger value="rayons">Rayons</TabsTrigger>
          <TabsTrigger value="points">Pickup Points</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
        </TabsList>
        <TabsContent value="routes"><RoutesTab /></TabsContent>
        <TabsContent value="rayons"><RayonsTab /></TabsContent>
        <TabsContent value="points"><PickupPointsTab /></TabsContent>
        <TabsContent value="bookings"><BookingsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
