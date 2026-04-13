import { UserProfileRepository, UserProfile, UserSettings } from "@/repositories/UserProfileRepository";

/**
 * Service layer for user profile operations
 * Encapsulates business logic and validation
 */
export class UserProfileService {
  /**
   * Get complete user profile with settings
   */
  static async getUserProfileWithSettings(userId: string) {
    const [profile, settings] = await Promise.all([
      UserProfileRepository.getProfile(userId),
      UserProfileRepository.getSettings(userId),
    ]);

    return { profile, settings };
  }

  /**
   * Update basic user profile with validation
   */
  static async updateBasicInfo(userId: string, data: Partial<UserProfile>) {
    // Validation
    if (data.email && !this.isValidEmail(data.email)) {
      throw new Error("Invalid email format");
    }

    if (data.phone && !this.isValidPhone(data.phone)) {
      throw new Error("Invalid phone format");
    }

    if (data.date_of_birth) {
      const age = this.calculateAge(new Date(data.date_of_birth));
      if (age < 13) {
        throw new Error("Must be at least 13 years old");
      }
    }

    return UserProfileRepository.updateProfile(userId, data);
  }

  /**
   * Update user settings with validation
   */
  static async updateSettings(userId: string, data: Partial<UserSettings>) {
    // Validate language
    const validLanguages = ["en", "id", "es", "fr"];
    if (data.language && !validLanguages.includes(data.language)) {
      throw new Error("Invalid language");
    }

    // Validate currency
    const validCurrencies = ["IDR", "USD", "SGD"];
    if (data.currency && !validCurrencies.includes(data.currency)) {
      throw new Error("Invalid currency");
    }

    // Validate theme
    const validThemes = ["light", "dark", "auto"];
    if (data.theme && !validThemes.includes(data.theme)) {
      throw new Error("Invalid theme");
    }

    return UserProfileRepository.updateSettings(userId, data);
  }

  /**
   * Upload and update user avatar
   */
  static async updateAvatar(userId: string, file: File) {
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

    const { url } = await UserProfileRepository.uploadAvatar(userId, file);
    return UserProfileRepository.updateProfile(userId, { avatar_url: url });
  }

  /**
   * Change password with validation
   */
  static async changePassword(currentPassword: string, newPassword: string) {
    if (!newPassword || newPassword.length < 8) {
      throw new Error("Password must be at least 8 characters long");
    }

    if (!/[A-Z]/.test(newPassword)) {
      throw new Error("Password must contain at least one uppercase letter");
    }

    if (!/[0-9]/.test(newPassword)) {
      throw new Error("Password must contain at least one number");
    }

    return UserProfileRepository.changePassword(currentPassword, newPassword);
  }

  /**
   * Initialize settings for new user
   */
  static async initializeSettings(userId: string) {
    try {
      const existingSettings = await UserProfileRepository.getSettings(userId);
      if (existingSettings) {
        return existingSettings;
      }
    } catch (error) {
      // Settings don't exist, create them
    }

    return UserProfileRepository.initializeSettings(userId);
  }

  /**
   * Validation helpers
   */
  private static isValidEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  private static isValidPhone(phone: string): boolean {
    const re = /^(\+\d{1,3}[- ]?)?\d{9,15}$/;
    return re.test(phone);
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
