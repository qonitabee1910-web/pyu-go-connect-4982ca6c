import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DriverProfile } from "@/repositories/DriverProfileRepository";
import { DriverProfileService } from "@/services/DriverProfileService";
import { User, Upload, AlertCircle, Check } from "lucide-react";

interface DriverBasicInfoTabProps {
  profile: DriverProfile;
  driverId: string;
}

/**
 * Driver Basic Info Tab Component
 * Handles driver personal information and verification status
 */
export default function DriverBasicInfoTab({ profile, driverId }: DriverBasicInfoTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      full_name: profile.full_name || "",
      license_number: profile.license_number || "",
      sim_expiry_date: profile.sim_expiry_date || "",
      phone: profile.phone || "",
      gender: profile.gender || "",
      date_of_birth: profile.date_of_birth || "",
      address: profile.address || "",
      emergency_contact_name: profile.emergency_contact_name || "",
      emergency_contact_phone: profile.emergency_contact_phone || "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: Partial<DriverProfile>) =>
      DriverProfileService.updateBasicInfo(driverId, data),
    onSuccess: () => {
      toast({ title: "Success", description: "Profile updated" });
      queryClient.invalidateQueries({ queryKey: ["driver-profile"] });
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update",
        variant: "destructive",
      });
    },
  });

  const avatarUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // Use the repository method - needs to be implemented in service
      return DriverProfileService.updateProfileAvatar(driverId, file);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Avatar updated" });
      queryClient.invalidateQueries({ queryKey: ["driver-profile"] });
      setPreviewAvatar(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload",
        variant: "destructive",
      });
    },
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewAvatar(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    avatarUploadMutation.mutate(file);
  };

  const onSubmit = (data: any) => {
    updateProfileMutation.mutate(data);
  };

  const verificationStatus = (
    field: string | null | undefined,
    verifiedField: boolean | null | undefined
  ) => {
    if (!field) return null;
    if (verifiedField) return <Check className="w-4 h-4 text-green-600" />;
    return <AlertCircle className="w-4 h-4 text-yellow-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Avatar Section */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Photo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden">
              {previewAvatar || profile.avatar_url ? (
                <img
                  src={previewAvatar || profile.avatar_url}
                  alt="Driver"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-12 h-12 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <Label htmlFor="avatar" className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 w-fit">
                  <Upload className="w-4 h-4" />
                  Upload Photo
                </div>
              </Label>
              <input
                id="avatar"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                disabled={avatarUploadMutation.isPending}
                className="hidden"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>
            {isEditing ? "Edit your details" : "Your personal information"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Full Name */}
              <div>
                <Label>Full Name</Label>
                <Input
                  {...form.register("full_name")}
                  disabled={!isEditing}
                  className="mt-1"
                />
              </div>

              {/* Gender */}
              <div>
                <Label>Gender</Label>
                <Select
                  value={form.watch("gender")}
                  onValueChange={(value) => form.setValue("gender", value)}
                  disabled={!isEditing}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date of Birth */}
              <div>
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  {...form.register("date_of_birth")}
                  disabled={!isEditing}
                  className="mt-1"
                />
              </div>

              {/* Phone */}
              <div>
                <Label>Phone Number</Label>
                <Input
                  type="tel"
                  {...form.register("phone")}
                  disabled={!isEditing}
                  className="mt-1"
                />
              </div>

              {/* Address */}
              <div className="md:col-span-2">
                <Label>Address</Label>
                <Input
                  {...form.register("address")}
                  disabled={!isEditing}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end pt-4">
              {isEditing ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      form.reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                  >
                    Save Changes
                  </Button>
                </>
              ) : (
                <Button type="button" onClick={() => setIsEditing(true)}>
                  Edit Profile
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* License Information */}
      <Card>
        <CardHeader>
          <CardTitle>License Information</CardTitle>
          <CardDescription>SIM and license verification status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* License Number */}
              <div>
                <Label className="flex items-center gap-2">
                  License Number
                  {verificationStatus(profile.license_number, true)}
                </Label>
                <Input
                  {...form.register("license_number")}
                  disabled={!isEditing}
                  className="mt-1"
                />
              </div>

              {/* SIM Expiry */}
              <div>
                <Label className="flex items-center gap-2">
                  SIM Expiry Date
                  {profile.sim_expiry_date && new Date(profile.sim_expiry_date) > new Date() ? (
                    <Badge variant="outline" className="bg-green-50">
                      Valid
                    </Badge>
                  ) : (
                    <Badge variant="destructive">Expired</Badge>
                  )}
                </Label>
                <Input
                  type="date"
                  {...form.register("sim_expiry_date")}
                  disabled={!isEditing}
                  className="mt-1"
                />
              </div>
            </div>

            {isEditing && (
              <div className="flex gap-2 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                >
                  Save
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Emergency Contact */}
      <Card>
        <CardHeader>
          <CardTitle>Emergency Contact</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Contact Name</Label>
                <Input
                  {...form.register("emergency_contact_name")}
                  disabled={!isEditing}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Contact Phone</Label>
                <Input
                  type="tel"
                  {...form.register("emergency_contact_phone")}
                  disabled={!isEditing}
                  className="mt-1"
                />
              </div>
            </div>

            {isEditing && (
              <div className="flex gap-2 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                >
                  Save
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
