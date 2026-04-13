import {
  DriverProfileRepository,
  DriverProfile,
  DriverSettings,
  Vehicle,
} from "@/repositories/DriverProfileRepository";

/**
 * Service layer for driver profile operations
 * Encapsulates business logic and validation
 */
export class DriverProfileService {
  /**
   * Get complete driver profile with settings and vehicles
   */
  static async getDriverComplete(userId: string) {
    const profile = await DriverProfileRepository.getProfileByUserId(userId);
    if (!profile) throw new Error("Driver profile not found");

    const [settings, vehicles, documents] = await Promise.all([
      DriverProfileRepository.getSettings(profile.id),
      DriverProfileRepository.getVehicles(profile.id),
      DriverProfileRepository.getDocuments(profile.id),
    ]);

    // Auto-initialize settings if they don't exist
    let finalSettings = settings;
    if (!settings) {
      try {
        finalSettings = await DriverProfileRepository.initializeSettings(profile.id);
      } catch (error) {
        // Settings table might not exist yet - return default values
        finalSettings = {
          id: 'temp',
          driver_id: profile.id,
          working_hours_enabled: false,
          working_hours_start: '08:00',
          working_hours_end: '20:00',
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
          preferred_payment_method: 'cash',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
    }

    return { profile, settings: finalSettings, vehicles, documents };
  }

  /**
   * Update driver basic information with validation
   */
  static async updateBasicInfo(driverId: string, data: Partial<DriverProfile>) {
    // Validate license number
    if (data.license_number && !this.isValidLicenseNumber(data.license_number)) {
      throw new Error("Invalid license number format");
    }

    // Validate SIM expiry is in the future
    if (data.sim_expiry_date) {
      const expiryDate = new Date(data.sim_expiry_date);
      if (expiryDate < new Date()) {
        throw new Error("SIM expiry date must be in the future");
      }
    }

    // Validate age
    if (data.date_of_birth) {
      const age = this.calculateAge(new Date(data.date_of_birth));
      if (age < 18) {
        throw new Error("Driver must be at least 18 years old");
      }
    }

    return DriverProfileRepository.updateProfile(driverId, data);
  }

  /**
   * Update driver settings with validation
   */
  static async updateSettings(driverId: string, data: Partial<DriverSettings>) {
    // Validate working hours
    if (data.working_hours_start && data.working_hours_end) {
      if (data.working_hours_start >= data.working_hours_end) {
        throw new Error("End time must be after start time");
      }
    }

    // Validate service area radius
    if (data.service_area_radius_km && data.service_area_radius_km <= 0) {
      throw new Error("Service area radius must be greater than 0");
    }

    // Validate payment method
    const validPaymentMethods = ["cash", "wallet", "card"];
    if (
      data.preferred_payment_method &&
      !validPaymentMethods.includes(data.preferred_payment_method)
    ) {
      throw new Error("Invalid payment method");
    }

    return DriverProfileRepository.updateSettings(driverId, data);
  }

  /**
   * Create a new vehicle for the driver
   */
  static async createVehicle(driverId: string, vehicle: Partial<Vehicle>) {
    // Validate plate number format
    if (!vehicle.plate_number || !this.isValidPlateNumber(vehicle.plate_number)) {
      throw new Error("Invalid plate number format");
    }

    // Validate year
    if (vehicle.year) {
      const currentYear = new Date().getFullYear();
      if (vehicle.year < 1900 || vehicle.year > currentYear + 1) {
        throw new Error("Invalid vehicle year");
      }
    }

    // Validate capacity
    if (vehicle.capacity && vehicle.capacity <= 0) {
      throw new Error("Capacity must be greater than 0");
    }

    return DriverProfileRepository.createVehicle({
      ...vehicle,
      driver_id: driverId,
    });
  }

  /**
   * Update vehicle information
   */
  static async updateVehicle(vehicleId: string, vehicle: Partial<Vehicle>) {
    if (vehicle.plate_number && !this.isValidPlateNumber(vehicle.plate_number)) {
      throw new Error("Invalid plate number format");
    }

    if (vehicle.capacity && vehicle.capacity <= 0) {
      throw new Error("Capacity must be greater than 0");
    }

    return DriverProfileRepository.updateVehicle(vehicleId, vehicle);
  }

  /**
   * Upload document with validation
   */
  static async uploadDocument(
    driverId: string,
    documentType: string,
    file: File,
    expiryDate?: string
  ) {
    // Validate file type
    const validMimeTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!validMimeTypes.includes(file.type)) {
      throw new Error("File must be PDF or image (JPEG/PNG)");
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error("File size exceeds 10MB limit");
    }

    // Validate expiry date if provided
    if (expiryDate) {
      const expiry = new Date(expiryDate);
      if (expiry < new Date()) {
        throw new Error("Expiry date must be in the future");
      }
    }

    return DriverProfileRepository.uploadDocument(
      driverId,
      documentType,
      file,
      expiryDate
    );
  }

  /**
   * Initialize driver settings
   */
  static async initializeSettings(driverId: string) {
    try {
      const existingSettings = await DriverProfileRepository.getSettings(driverId);
      if (existingSettings) {
        return existingSettings;
      }
    } catch (error) {
      // Settings don't exist, create them
    }

    return DriverProfileRepository.initializeSettings(driverId);
  }

  /**
   * Get document verification status
   */
  static async getDocumentStatus(driverId: string, documentType: string) {
    return DriverProfileRepository.getDocumentStatus(driverId, documentType);
  }

  /**
   * Delete a vehicle
   */
  static async deleteVehicle(vehicleId: string) {
    return DriverProfileRepository.deleteVehicle(vehicleId);
  }

  /**
   * Upload vehicle image
   */
  static async uploadVehicleImage(vehicleId: string, file: File) {
    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      throw new Error("Invalid file type. Only JPEG, PNG, and WebP are allowed");
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error("File size exceeds 5MB limit");
    }

    const { url } = await DriverProfileRepository.uploadVehicleImage(vehicleId, file);
    return DriverProfileRepository.updateVehicle(vehicleId, { image_url: url });
  }

  /**
   * Upload driver avatar/profile photo
   */
  static async updateProfileAvatar(driverId: string, file: File) {
    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      throw new Error("Invalid file type. Only JPEG, PNG, and WebP are allowed");
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error("File size exceeds 5MB limit");
    }

    const { url } = await DriverProfileRepository.uploadDriverAvatar(driverId, file);
    return DriverProfileRepository.updateProfile(driverId, { avatar_url: url });
  }

  /**
   * Validation helpers
   */
  private static isValidLicenseNumber(licenseNumber: string): boolean {
    // Indonesian SIM format: 10-12 digits
    return /^\d{10,12}$/.test(licenseNumber);
  }

  private static isValidPlateNumber(plateNumber: string): boolean {
    // Indonesian plate format: e.g., B XXXX XXX
    return /^[A-Z]\s\d{1,4}\s[A-Z]{1,3}$/.test(plateNumber);
  }

  private static calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  }
}
