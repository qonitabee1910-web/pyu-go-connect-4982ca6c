import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Loader2, Zap, Users } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ServiceVehicleType {
  id: string;
  service_type_id: string;
  vehicle_type: string;
  vehicle_name: string;
  capacity: number;
  facilities: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface ServiceType {
  id: string;
  name: string;
  description: string;
  active: boolean;
}

export default function ServiceTypesTab() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceVehicleType | null>(null);
  const [formData, setFormData] = useState({
    service_id: '',
    vehicle_type: '',
    vehicle_name: '',
    capacity: 1,
    facilities: '',
  });
  const queryClient = useQueryClient();

  // Query service types
  const { data: serviceTypes = [] } = useQuery({
    queryKey: ['admin-service-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shuttle_service_types')
        .select('*')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Query service-vehicle mappings
  const { data: mappings = [], isLoading } = useQuery({
    queryKey: ['admin-service-vehicle-mappings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shuttle_service_vehicle_types')
        .select('*')
        .order('vehicle_type');
      if (error) throw error;
      return data || [];
    },
  });

  // Add mapping mutation
  const addMutation = useMutation({
    mutationFn: async (newMapping: any) => {
      const { error } = await supabase
        .from('shuttle_service_vehicle_types')
        .insert([newMapping]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-service-vehicle-mappings'] });
      toast.success('Service-Vehicle mapping added');
      setFormData({
        service_id: '',
        vehicle_type: '',
        vehicle_name: '',
        capacity: 1,
        facilities: '',
      });
      setIsAddOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add mapping');
    },
  });

  // Update mapping mutation
  const updateMutation = useMutation({
    mutationFn: async (updated: any) => {
      const { error } = await supabase
        .from('shuttle_service_vehicle_types')
        .update(updated)
        .eq('id', selectedService?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-service-vehicle-mappings'] });
      toast.success('Service-Vehicle mapping updated');
      setIsEditOpen(false);
      setSelectedService(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update mapping');
    },
  });

  // Delete mapping mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('shuttle_service_vehicle_types')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-service-vehicle-mappings'] });
      toast.success('Service-Vehicle mapping deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete mapping');
    },
  });

  const handleAddSubmit = () => {
    if (!formData.service_id || !formData.vehicle_type || !formData.vehicle_name) {
      toast.error('Please fill in all required fields');
      return;
    }

    const facilitiesArray = formData.facilities
      .split(',')
      .map((f) => f.trim())
      .filter((f) => f);

    addMutation.mutate({
      service_type_id: formData.service_id,
      vehicle_type: formData.vehicle_type,
      vehicle_name: formData.vehicle_name,
      capacity: formData.capacity,
      facilities: facilitiesArray,
      active: true,
    });
  };

  const handleEditSubmit = () => {
    if (!selectedService) return;

    const facilitiesArray = formData.facilities
      .split(',')
      .map((f) => f.trim())
      .filter((f) => f);

    updateMutation.mutate({
      service_type_id: formData.service_id,
      vehicle_type: formData.vehicle_type,
      vehicle_name: formData.vehicle_name,
      capacity: formData.capacity,
      facilities: facilitiesArray,
    });
  };

  const handleEdit = (mapping: ServiceVehicleType) => {
    setSelectedService(mapping);
    setFormData({
      service_id: mapping.service_type_id,
      vehicle_type: mapping.vehicle_type,
      vehicle_name: mapping.vehicle_name,
      capacity: mapping.capacity,
      facilities: mapping.facilities.join(', '),
    });
    setIsEditOpen(true);
  };

  const getServiceName = (serviceId: string) => {
    return serviceTypes.find((s: any) => s.id === serviceId)?.name || 'Unknown';
  };

  // Group vehicles by service type
  const groupedByService = (serviceTypes || []).map((service: any) => ({
    service,
    vehicles: mappings.filter((m: any) => m.service_type_id === service.id),
  }));

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Service Types & Vehicles</CardTitle>
          <CardDescription>
            Manage which vehicle types are available for each service. Each schedule automatically gets all configured service options.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Service-Vehicle Summary Cards */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Available Vehicles by Service</h3>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 gradient-primary text-primary-foreground">
                <Plus className="w-4 h-4" />
                Add Vehicle
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Service-Vehicle Mapping</DialogTitle>
                <DialogDescription>
                  Link a vehicle type to a service type
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* Service Type Select */}
                <div>
                  <label className="text-sm font-medium">Service Type *</label>
                  <select
                    value={formData.service_id}
                    onChange={(e) =>
                      setFormData({ ...formData, service_id: e.target.value })
                    }
                    className="w-full border rounded-md p-2 mt-1"
                  >
                    <option value="">Select Service Type</option>
                    {serviceTypes.map((st: any) => (
                      <option key={st.id} value={st.id}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Vehicle Type */}
                <div>
                  <label className="text-sm font-medium">Vehicle Type Code *</label>
                  <Input
                    placeholder="e.g., mini-car, suv, hiace"
                    value={formData.vehicle_type}
                    onChange={(e) =>
                      setFormData({ ...formData, vehicle_type: e.target.value })
                    }
                  />
                </div>

                {/* Vehicle Name */}
                <div>
                  <label className="text-sm font-medium">Vehicle Name *</label>
                  <Input
                    placeholder="e.g., Mini Car, SUV, Hiace"
                    value={formData.vehicle_name}
                    onChange={(e) =>
                      setFormData({ ...formData, vehicle_name: e.target.value })
                    }
                  />
                </div>

                {/* Capacity */}
                <div>
                  <label className="text-sm font-medium">Capacity (seats) *</label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.capacity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        capacity: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                </div>

                {/* Facilities */}
                <div>
                  <label className="text-sm font-medium">Facilities</label>
                  <Input
                    placeholder="e.g., AC, Radio, WiFi (comma-separated)"
                    value={formData.facilities}
                    onChange={(e) =>
                      setFormData({ ...formData, facilities: e.target.value })
                    }
                  />
                </div>

                <Button
                  onClick={handleAddSubmit}
                  disabled={addMutation.isPending}
                  className="w-full"
                >
                  {addMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Vehicle'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Loading vehicles...
          </div>
        ) : groupedByService.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No services configured yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {groupedByService.map(({ service, vehicles }) => (
              <Card key={service.id} className="border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{service.name}</CardTitle>
                      {service.description && (
                        <CardDescription className="text-sm mt-1">
                          {service.description}
                        </CardDescription>
                      )}
                    </div>
                    <Badge variant="outline" className="ml-2">
                      {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {vehicles.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No vehicles configured for this service.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {vehicles.map((vehicle: ServiceVehicleType) => (
                        <div
                          key={vehicle.id}
                          className="flex items-start justify-between p-3 border rounded-lg hover:bg-accent transition"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-sm">{vehicle.vehicle_name}</h4>
                              {vehicle.active && (
                                <Badge variant="default" className="bg-green-600 text-xs">
                                  Active
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground space-y-1">
                              <p>
                                <span className="font-medium">Type:</span> {vehicle.vehicle_type}
                              </p>
                              <p>
                                <Users className="w-3 h-3 inline mr-1" />
                                <span className="font-medium">Capacity:</span> {vehicle.capacity} seats
                              </p>
                              {vehicle.facilities && vehicle.facilities.length > 0 && (
                                <div>
                                  <p className="font-medium mb-1">Facilities:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {vehicle.facilities.map((facility) => (
                                      <Badge
                                        key={facility}
                                        variant="secondary"
                                        className="text-xs"
                                      >
                                        {facility}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 ml-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(vehicle)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteMutation.mutate(vehicle.id)}
                              disabled={deleteMutation.isPending}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Service-Vehicle Mapping</DialogTitle>
            <DialogDescription>Update the vehicle mapping details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Service Type Select */}
            <div>
              <label className="text-sm font-medium">Service Type *</label>
              <select
                value={formData.service_id}
                onChange={(e) =>
                  setFormData({ ...formData, service_id: e.target.value })
                }
                className="w-full border rounded-md p-2 mt-1"
              >
                <option value="">Select Service Type</option>
                {serviceTypes.map((st: any) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Vehicle Type */}
            <div>
              <label className="text-sm font-medium">Vehicle Type Code *</label>
              <Input
                placeholder="e.g., mini-car, suv, hiace"
                value={formData.vehicle_type}
                onChange={(e) =>
                  setFormData({ ...formData, vehicle_type: e.target.value })
                }
              />
            </div>

            {/* Vehicle Name */}
            <div>
              <label className="text-sm font-medium">Vehicle Name *</label>
              <Input
                placeholder="e.g., Mini Car, SUV, Hiace"
                value={formData.vehicle_name}
                onChange={(e) =>
                  setFormData({ ...formData, vehicle_name: e.target.value })
                }
              />
            </div>

            {/* Capacity */}
            <div>
              <label className="text-sm font-medium">Capacity (seats) *</label>
              <Input
                type="number"
                min="1"
                value={formData.capacity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    capacity: parseInt(e.target.value) || 1,
                  })
                }
              />
            </div>

            {/* Facilities */}
            <div>
              <label className="text-sm font-medium">Facilities</label>
              <Input
                placeholder="e.g., AC, Radio, WiFi (comma-separated)"
                value={formData.facilities}
                onChange={(e) =>
                  setFormData({ ...formData, facilities: e.target.value })
                }
              />
            </div>

            <Button
              onClick={handleEditSubmit}
              disabled={updateMutation.isPending}
              className="w-full"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Mapping'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
