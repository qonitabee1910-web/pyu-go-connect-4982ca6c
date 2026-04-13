import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { UserSettings } from "@/repositories/UserProfileRepository";
import { UserProfileService } from "@/services/UserProfileService";
import { Bell, Lock, Eye, BarChart3 } from "lucide-react";

interface UserSettingsTabProps {
  settings: UserSettings | null;
  userId: string;
}

/**
 * User Settings Tab Component
 * Handles user preferences, notifications, privacy, and security settings
 */
export default function UserSettingsTab({ settings, userId }: UserSettingsTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const form = useForm({
    defaultValues: {
      language: settings?.language || "en",
      currency: settings?.currency || "IDR",
      theme: settings?.theme || "light",
      notification_email: settings?.notification_email ?? true,
      notification_push: settings?.notification_push ?? true,
      notification_sms: settings?.notification_sms ?? false,
      notification_promotions: settings?.notification_promotions ?? true,
      notification_ride_updates: settings?.notification_ride_updates ?? true,
      privacy_show_profile: settings?.privacy_show_profile ?? true,
      privacy_show_location: settings?.privacy_show_location ?? false,
      two_factor_enabled: settings?.two_factor_enabled ?? false,
      data_sharing_analytics: settings?.data_sharing_analytics ?? true,
    },
  });

  const passwordForm = useForm({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (data: Partial<UserSettings>) =>
      UserProfileService.updateSettings(userId, data),
    onSuccess: () => {
      toast({ title: "Success", description: "Settings updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["user-profile", userId] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: any) => {
      if (data.newPassword !== data.confirmPassword) {
        throw new Error("Passwords do not match");
      }
      return UserProfileService.changePassword(data.currentPassword, data.newPassword);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Password changed successfully" });
      setShowPasswordForm(false);
      passwordForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to change password",
        variant: "destructive",
      });
    },
  });

  const handleSettingChange = (key: string, value: any) => {
    form.setValue(key as any, value);
    updateSettingsMutation.mutate({ [key]: value } as Partial<UserSettings>);
  };

  const onPasswordSubmit = (data: any) => {
    changePasswordMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      {/* Language & Display Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Language & Display</CardTitle>
          <CardDescription>Customize your experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Language */}
            <div>
              <Label>Language</Label>
              <Select
                value={form.watch("language")}
                onValueChange={(value) => handleSettingChange("language", value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="id">Indonesian</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Currency */}
            <div>
              <Label>Currency</Label>
              <Select
                value={form.watch("currency")}
                onValueChange={(value) => handleSettingChange("currency", value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IDR">IDR (Rupiah)</SelectItem>
                  <SelectItem value="USD">USD (Dollar)</SelectItem>
                  <SelectItem value="SGD">SGD (Singapore Dollar)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Theme */}
            <div className="md:col-span-2">
              <Label>Theme</Label>
              <Select
                value={form.watch("theme")}
                onValueChange={(value) => handleSettingChange("theme", value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="auto">Auto (System)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </CardTitle>
          <CardDescription>Manage how you receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {[
              {
                key: "notification_email",
                label: "Email Notifications",
                desc: "Receive updates via email",
              },
              {
                key: "notification_push",
                label: "Push Notifications",
                desc: "Receive app notifications",
              },
              {
                key: "notification_sms",
                label: "SMS Notifications",
                desc: "Receive updates via SMS",
              },
              {
                key: "notification_promotions",
                label: "Promotional Messages",
                desc: "Receive special offers and promotions",
              },
              {
                key: "notification_ride_updates",
                label: "Ride Updates",
                desc: "Get notified about ride status changes",
              },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
                <Switch
                  checked={form.watch(item.key as any)}
                  onCheckedChange={(value) =>
                    handleSettingChange(item.key, value)
                  }
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Privacy
          </CardTitle>
          <CardDescription>Control your privacy preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {[
              {
                key: "privacy_show_profile",
                label: "Show My Profile",
                desc: "Allow others to view your public profile",
              },
              {
                key: "privacy_show_location",
                label: "Share Location",
                desc: "Allow drivers to see your location",
              },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
                <Switch
                  checked={form.watch(item.key as any)}
                  onCheckedChange={(value) =>
                    handleSettingChange(item.key, value)
                  }
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Security
          </CardTitle>
          <CardDescription>Manage your account security</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">Change Password</p>
              <p className="text-sm text-muted-foreground">
                Update your password regularly
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowPasswordForm(!showPasswordForm)}
            >
              {showPasswordForm ? "Cancel" : "Change"}
            </Button>
          </div>

          {showPasswordForm && (
            <form
              onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
              className="space-y-3 border-t pt-4"
            >
              <div>
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  {...passwordForm.register("currentPassword", {
                    required: true,
                  })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  {...passwordForm.register("newPassword", {
                    required: true,
                  })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  {...passwordForm.register("confirmPassword", {
                    required: true,
                  })}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowPasswordForm(false);
                    passwordForm.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                >
                  {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
                </Button>
              </div>
            </form>
          )}

          <div className="border-t pt-4 flex items-center justify-between">
            <div>
              <p className="font-medium">Two-Factor Authentication</p>
              <p className="text-sm text-muted-foreground">
                Add an extra layer of security
              </p>
            </div>
            <Switch
              checked={form.watch("two_factor_enabled")}
              onCheckedChange={(value) =>
                handleSettingChange("two_factor_enabled", value)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Data & Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Data & Analytics
          </CardTitle>
          <CardDescription>Help us improve your experience</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">Share Analytics Data</p>
              <p className="text-sm text-muted-foreground">
                Help improve our service by sharing usage data
              </p>
            </div>
            <Switch
              checked={form.watch("data_sharing_analytics")}
              onCheckedChange={(value) =>
                handleSettingChange("data_sharing_analytics", value)
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
