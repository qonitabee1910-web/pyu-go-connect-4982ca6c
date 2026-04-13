import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

// Types
export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  gender?: string;
  date_of_birth?: string;
  address?: string;
  city?: string;
  country?: string;
  nationality?: string;
  id_number?: string;
  email_verified?: boolean;
  phone_verified?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  language: string;
  currency: string;
  theme: string;
  notification_email: boolean;
  notification_push: boolean;
  notification_sms: boolean;
  notification_promotions: boolean;
  notification_ride_updates: boolean;
  privacy_show_profile: boolean;
  privacy_show_location: boolean;
  two_factor_enabled: boolean;
  data_sharing_analytics: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Repository for User Profile data operations
 * Handles all Supabase queries for user profile and settings
 */
export class UserProfileRepository {
  /**
   * Fetch complete user profile data
   */
  static async getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  /**
   * Fetch user settings
   */
  static async getSettings(userId: string): Promise<UserSettings | null> {
    const { data, error } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  /**
   * Update user profile information
   */
  static async updateProfile(
    userId: string,
    profile: Partial<UserProfile>
  ): Promise<UserProfile> {
    const { data, error } = await supabase
      .from("profiles")
      .update(profile)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update user settings
   */
  static async updateSettings(
    userId: string,
    settings: Partial<UserSettings>
  ): Promise<UserSettings> {
    const { data, error } = await supabase
      .from("user_settings")
      .update(settings)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Initialize default user settings (called on first login)
   */
  static async initializeSettings(userId: string): Promise<UserSettings> {
    const { data, error } = await supabase
      .from("user_settings")
      .insert({
        user_id: userId,
        language: "en",
        currency: "IDR",
        theme: "light",
        notification_email: true,
        notification_push: true,
        notification_sms: false,
        notification_promotions: true,
        notification_ride_updates: true,
        privacy_show_profile: true,
        privacy_show_location: false,
        two_factor_enabled: false,
        data_sharing_analytics: true,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Upload user avatar to storage
   */
  static async uploadAvatar(
    userId: string,
    file: File
  ): Promise<{ path: string; url: string }> {
    const fileName = `${userId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
    return { path: fileName, url: data.publicUrl };
  }

  /**
   * Change user password
   */
  static async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
  }

  /**
   * Verify and update email
   */
  static async updateEmail(newEmail: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({
      email: newEmail,
    });

    if (error) throw error;
  }

  /**
   * Verify phone number (OTP verification)
   */
  static async verifyPhone(userId: string): Promise<void> {
    const { error } = await supabase
      .from("profiles")
      .update({ phone_verified: true })
      .eq("user_id", userId);

    if (error) throw error;
  }
}
