import { supabase } from "@/integrations/supabase/client";

// Types
export interface DriverProfile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  email?: string;
  license_number: string;
  sim_expiry_date?: string;
  gender?: "male" | "female";
  date_of_birth?: string;
  address?: string;
  status: "available" | "busy" | "offline";
  rating?: number;
  avatar_url?: string;
  background_check_status?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DriverSettings {
  id: string;
  driver_id: string;
  working_hours_enabled: boolean;
  working_hours_start?: string;
  working_hours_end?: string;
  available_monday: boolean;
  available_tuesday: boolean;
  available_wednesday: boolean;
  available_thursday: boolean;
  available_friday: boolean;
  available_saturday: boolean;
  available_sunday: boolean;
  service_area_radius_km: number;
  auto_accept_rides: boolean;
  auto_accept_timeout_seconds: number;
  preferred_payment_method: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  driver_id: string;
  plate_number: string;
  vehicle_type: string;
  model: string;
  color: string;
  capacity?: number;
  year?: number;
  image_url?: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface DriverDocument {
  id: string;
  driver_id: string;
  document_type: "sim" | "ktp" | "stnk" | "insurance" | "other";
  file_url: string;
  status: "pending" | "verified" | "rejected" | "expired";
  expiry_date?: string;
  submitted_at: string;
  verified_at?: string;
  rejection_reason?: string;
  rejected_at?: string;
  created_at: string;
  updated_at: string;
}

export interface VehicleDocument {
  id: string;
  vehicle_id: string;
  document_type: "stnk" | "insurance" | "tax_paid";
  file_url: string;
  status: "pending" | "verified" | "rejected" | "expired";
  expiry_date?: string;
  submitted_at: string;
  verified_at?: string;
  rejection_reason?: string;
  rejected_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Repository for Driver Profile data operations
 */
export class DriverProfileRepository {
  static async getProfileByUserId(userId: string): Promise<DriverProfile | null> {
    const { data, error } = await supabase
      .from("drivers")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data as DriverProfile | null;
  }

  static async getSettings(driverId: string): Promise<DriverSettings | null> {
    try {
      const { data, error } = await (supabase as any)
        .from("driver_settings")
        .select("*")
        .eq("driver_id", driverId)
        .maybeSingle();

      if (error) {
        // Table might not exist yet - return null to trigger initialization
        if (error.code === 'PGRST116' || error.code === '42P01') {
          return null;
        }
        throw error;
      }
      
      return data as DriverSettings | null;
    } catch (error) {
      // If table doesn't exist, return null - will be initialized on demand
      return null;
    }
  }

  static async updateProfile(
    driverId: string,
    profile: Partial<DriverProfile>
  ): Promise<DriverProfile> {
    const { data, error } = await supabase
      .from("drivers")
      .update(profile as any)
      .eq("id", driverId)
      .select()
      .single();

    if (error) throw error;
    return data as DriverProfile;
  }

  static async updateSettings(
    driverId: string,
    settings: Partial<DriverSettings>
  ): Promise<DriverSettings> {
    const { data, error } = await (supabase as any)
      .from("driver_settings")
      .update(settings)
      .eq("driver_id", driverId)
      .select()
      .single();

    if (error) throw error;
    return data as DriverSettings;
  }

  static async initializeSettings(driverId: string): Promise<DriverSettings> {
    const { data, error } = await (supabase as any)
      .from("driver_settings")
      .insert({
        driver_id: driverId,
        working_hours_enabled: false,
        available_monday: true,
        available_tuesday: true,
        available_wednesday: true,
        available_thursday: true,
        available_friday: true,
        available_saturday: true,
        available_sunday: false,
        service_area_radius_km: 50,
        auto_accept_rides: false,
        auto_accept_timeout_seconds: 10,
        preferred_payment_method: "cash",
      })
      .select()
      .single();

    if (error) throw error;
    return data as DriverSettings;
  }

  static async getVehicles(driverId: string): Promise<Vehicle[]> {
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .eq("driver_id", driverId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as Vehicle[];
  }

  static async createVehicle(vehicle: Partial<Vehicle>): Promise<Vehicle> {
    const { data, error } = await supabase
      .from("vehicles")
      .insert(vehicle as any)
      .select()
      .single();

    if (error) throw error;
    return data as Vehicle;
  }

  static async updateVehicle(
    vehicleId: string,
    vehicle: Partial<Vehicle>
  ): Promise<Vehicle> {
    const { data, error } = await supabase
      .from("vehicles")
      .update(vehicle as any)
      .eq("id", vehicleId)
      .select()
      .single();

    if (error) throw error;
    return data as Vehicle;
  }

  static async deleteVehicle(vehicleId: string): Promise<void> {
    const { error } = await supabase
      .from("vehicles")
      .delete()
      .eq("id", vehicleId);

    if (error) throw error;
  }

  static async uploadVehicleImage(vehicleId: string, file: File): Promise<{ url: string }> {
    const fileName = `vehicles/${vehicleId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("vehicles")
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("vehicles").getPublicUrl(fileName);
    return { url: data.publicUrl };
  }

  static async uploadDocument(
    driverId: string,
    documentType: string,
    file: File,
    expiryDate?: string
  ): Promise<DriverDocument> {
    const fileName = `drivers/${driverId}/${documentType}/${Date.now()}-${file.name}`;
    
    const { error: uploadError } = await supabase.storage
      .from("driver-documents")
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: storageData } = supabase.storage
      .from("driver-documents")
      .getPublicUrl(fileName);

    const { data, error } = await (supabase as any)
      .from("driver_documents")
      .upsert({
        driver_id: driverId,
        document_type: documentType,
        file_url: storageData.publicUrl,
        expiry_date: expiryDate || null,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;
    return data as DriverDocument;
  }

  static async getDocuments(driverId: string): Promise<DriverDocument[]> {
    const { data, error } = await (supabase as any)
      .from("driver_documents")
      .select("*")
      .eq("driver_id", driverId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as DriverDocument[];
  }

  static async getDocumentStatus(
    driverId: string,
    documentType: string
  ): Promise<DriverDocument | null> {
    const { data, error } = await (supabase as any)
      .from("driver_documents")
      .select("*")
      .eq("driver_id", driverId)
      .eq("document_type", documentType)
      .maybeSingle();

    if (error) throw error;
    return data as DriverDocument | null;
  }

  static async uploadVehicleDocument(
    vehicleId: string,
    documentType: string,
    file: File,
    expiryDate?: string
  ): Promise<VehicleDocument> {
    const fileName = `vehicles/${vehicleId}/${documentType}/${Date.now()}-${file.name}`;
    
    const { error: uploadError } = await supabase.storage
      .from("vehicle-documents")
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: storageData } = supabase.storage
      .from("vehicle-documents")
      .getPublicUrl(fileName);

    const { data, error } = await (supabase as any)
      .from("vehicle_documents")
      .upsert({
        vehicle_id: vehicleId,
        document_type: documentType,
        file_url: storageData.publicUrl,
        expiry_date: expiryDate || null,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;
    return data as VehicleDocument;
  }

  static async getVehicleDocuments(vehicleId: string): Promise<VehicleDocument[]> {
    const { data, error } = await (supabase as any)
      .from("vehicle_documents")
      .select("*")
      .eq("vehicle_id", vehicleId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as VehicleDocument[];
  }

  static async uploadDriverAvatar(driverId: string, file: File): Promise<{ url: string }> {
    const fileName = `drivers/${driverId}/avatar/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("driver-avatars")
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("driver-avatars").getPublicUrl(fileName);
    return { url: data.publicUrl };
  }
}
