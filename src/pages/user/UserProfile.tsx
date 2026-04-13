import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import UserBasicInfoTab from "./tabs/UserBasicInfoTab";
import UserSettingsTab from "./tabs/UserSettingsTab";
import { UserProfileService } from "@/services/UserProfileService";

/**
 * User Profile Component
 * Main container for user profile with two tabs: Basic Info and Settings
 */
export default function UserProfile() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("basic");

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Please log in to view your profile</p>
        </div>
      </div>
    );
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ["user-profile", user.id],
    queryFn: () => UserProfileService.getUserProfileWithSettings(user.id),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">Error loading profile</p>
        </div>
      </div>
    );
  }

  if (!data?.profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Profile data not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold mb-6">My Profile</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            <UserBasicInfoTab profile={data.profile} userId={user.id} />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <UserSettingsTab
              settings={data.settings}
              userId={user.id}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
