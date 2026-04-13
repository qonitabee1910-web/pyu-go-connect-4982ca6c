import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { DriverSettings } from "@/repositories/DriverProfileRepository";
import { DriverProfileService } from "@/services/DriverProfileService";
import { Clock, MapPin, CreditCard, AlertCircle } from "lucide-react";

interface DriverSettingsTabProps {
  settings: DriverSettings | null;
  driverId: string;
}

/**
 * Driver Settings Tab Component
 * Manages working hours, service area, auto-accept settings
 */
export default function DriverSettingsTab({
  settings,
  driverId,
}: DriverSettingsTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm({
    defaultValues: {
      working_hours_enabled: settings?.working_hours_enabled ?? false,
      working_hours_start: settings?.working_hours_start || "08:00",
      working_hours_end: settings?.working_hours_end || "20:00",
      available_monday: settings?.available_monday ?? false,
      available_tuesday: settings?.available_tuesday ?? false,
      available_wednesday: settings?.available_wednesday ?? false,
      available_thursday: settings?.available_thursday ?? false,
      available_friday: settings?.available_friday ?? false,
      available_saturday: settings?.available_saturday ?? false,
      available_sunday: settings?.available_sunday ?? false,
      service_area_radius_km: settings?.service_area_radius_km ?? 50,
      auto_accept_rides: settings?.auto_accept_rides ?? false,
      preferred_payment_method: settings?.preferred_payment_method || "cash",
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (data: Partial<DriverSettings>) =>
      DriverProfileService.updateSettings(driverId, data),
    onSuccess: () => {
      toast({ title: "Success", description: "Settings updated" });
      queryClient.invalidateQueries({ queryKey: ["driver-profile"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update",
        variant: "destructive",
      });
    },
  });

  const handleSettingChange = (key: string, value: any) => {
    form.setValue(key as any, value);
    updateSettingsMutation.mutate({ [key]: value } as Partial<DriverSettings>);
  };

  const onSubmit = (data: any) => {
    updateSettingsMutation.mutate(data);
  };

  const days = [
    { key: "available_monday", label: "Monday" },
    { key: "available_tuesday", label: "Tuesday" },
    { key: "available_wednesday", label: "Wednesday" },
    { key: "available_thursday", label: "Thursday" },
    { key: "available_friday", label: "Friday" },
    { key: "available_saturday", label: "Saturday" },
    { key: "available_sunday", label: "Sunday" },
  ];

  return (
    <div className="space-y-6">
      {/* Working Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Working Hours
          </CardTitle>
          <CardDescription>Set your available working hours</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">Enable Working Hours</p>
              <p className="text-sm text-muted-foreground">
                Restrict availability to specific times
              </p>
            </div>
            <Switch
              checked={form.watch("working_hours_enabled")}
              onCheckedChange={(value) =>
                handleSettingChange("working_hours_enabled", value)
              }
            />
          </div>

          {form.watch("working_hours_enabled") && (
            <div className="border-t pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-time">Start Time</Label>
                  <Input
                    id="start-time"
                    type="time"
                    {...form.register("working_hours_start")}
                    onChange={(e) => {
                      form.setValue("working_hours_start", e.target.value);
                    }}
                    onBlur={() => {
                      const startTime = form.getValues("working_hours_start");
                      const endTime = form.getValues("working_hours_end");
                      if (startTime >= endTime) {
                        toast({
                          description: "Start time must be before end time",
                          variant: "destructive",
                        });
                      } else {
                        updateSettingsMutation.mutate({
                          working_hours_start: startTime,
                        });
                      }
                    }}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="end-time">End Time</Label>
                  <Input
                    id="end-time"
                    type="time"
                    {...form.register("working_hours_end")}
                    onChange={(e) => {
                      form.setValue("working_hours_end", e.target.value);
                    }}
                    onBlur={() => {
                      const startTime = form.getValues("working_hours_start");
                      const endTime = form.getValues("working_hours_end");
                      if (startTime >= endTime) {
                        toast({
                          description: "End time must be after start time",
                          variant: "destructive",
                        });
                      } else {
                        updateSettingsMutation.mutate({
                          working_hours_end: endTime,
                        });
                      }
                    }}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Days Availability */}
      <Card>
        <CardHeader>
          <CardTitle>Days Availability</CardTitle>
          <CardDescription>Select which days you work</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {days.map((day) => (
              <div key={day.key} className="flex items-center justify-between py-2">
                <Label>{day.label}</Label>
                <Switch
                  checked={form.watch(day.key as any)}
                  onCheckedChange={(value) =>
                    handleSettingChange(day.key, value)
                  }
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Service Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Service Area
          </CardTitle>
          <CardDescription>Set your preferred service radius</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="flex items-center justify-between mb-4">
              <span>Service Radius</span>
              <span className="text-lg font-semibold">
                {form.watch("service_area_radius_km")} km
              </span>
            </Label>
            <div className="px-2">
              <Slider
                value={[form.watch("service_area_radius_km")]}
                onValueChange={(value) => {
                  handleSettingChange("service_area_radius_km", value[0]);
                }}
                min={5}
                max={100}
                step={5}
                className="w-full"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              You will only receive ride requests within this radius from your location
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Auto-Accept Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Ride Preferences</CardTitle>
          <CardDescription>Manage how you receive ride requests</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between py-2">
            <div>
              <p className="font-medium">Auto-Accept Rides</p>
              <p className="text-sm text-muted-foreground">
                Automatically accept ride requests (beta)
              </p>
            </div>
            <Switch
              checked={form.watch("auto_accept_rides")}
              onCheckedChange={(value) =>
                handleSettingChange("auto_accept_rides", value)
              }
            />
          </div>

          {form.watch("auto_accept_rides") && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800">
                When enabled, ride requests matching your criteria will be accepted automatically
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Preferences
          </CardTitle>
          <CardDescription>Choose your preferred payment method</CardDescription>
        </CardHeader>
        <CardContent>
          <Label>Preferred Payment Method</Label>
          <Select
            value={form.watch("preferred_payment_method")}
            onValueChange={(value) =>
              handleSettingChange("preferred_payment_method", value)
            }
          >
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="digital_wallet">Digital Wallet</SelectItem>
              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-3">
            Earnings will be transferred to your preferred method
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
