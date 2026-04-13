import { supabase } from "@/integrations/supabase/client";

export interface DriverWithStats {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  status: string;
  registration_status: string;
  rating: number;
  avatar_url: string | null;
  created_at: string;
  license_number: string | null;
  gender: string | null;
  ktp_url: string | null;
  sim_url: string | null;
  vehicle_stnk_url: string | null;
  vehicles?: any[];
  rides?: any[];
  total_rides?: number;
  total_earnings?: number;
}

export interface DriverStatistics {
  total_drivers: number;
  active_drivers: number;
  pending_verification: number;
  rejected_drivers: number;
  average_rating: number;
  total_completed_rides: number;
  total_earnings: number;
}

export interface DriverFilters {
  status?: string;
  registration_status?: string;
  search?: string;
  sortBy?: "created_at" | "rating" | "name";
  limit?: number;
  offset?: number;
}

/**
 * Service for admin-specific driver operations
 * Handles queries, statistics, and management operations
 */
export class DriverAdminService {
  /**
   * Get all drivers with filters and pagination
   */
  static async getDriversWithFilters(filters: DriverFilters) {
    const {
      status,
      registration_status,
      search,
      sortBy = "created_at",
      limit = 20,
      offset = 0,
    } = filters;

    let query = supabase.from("drivers").select(
      `
      id, full_name, phone, email, avatar_url, status, is_verified, rating, 
      created_at, registration_status, ktp_url, sim_url, vehicle_stnk_url, 
      rejection_reason, gender, license_number,
      vehicles(count),
      rides(count)
      `,
      { count: "exact" }
    );

    // Apply filters
    if (status) query = query.eq("status", status as any);
    if (registration_status) query = query.eq("registration_status", registration_status as any);

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Apply sorting
    if (sortBy === "rating") {
      query = query.order("rating", { ascending: false });
    } else if (sortBy === "name") {
      query = query.order("full_name", { ascending: true });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) throw new Error(`Failed to fetch drivers: ${error.message}`);

    return {
      drivers: (data || []) as unknown as DriverWithStats[],
      total: count || 0,
      hasMore: (count || 0) > offset + limit,
    };
  }

  /**
   * Get comprehensive driver statistics
   */
  static async getDriverStatistics(): Promise<DriverStatistics> {
    const [totalRes, statusRes, ratingRes, ridesRes] = await Promise.all([
      supabase.from("drivers").select("id", { count: "exact" }),
      supabase.from("drivers").select("status", { count: "exact" }),
      supabase.from("drivers").select("rating"),
      supabase.from("rides").select("id, fare", { count: "exact" }).eq("status", "completed"),
    ]);

    const activeCount = (await supabase.from("drivers").select("id", { count: "exact" }).in("status", ["available", "busy"] as any)).count || 0;
    const pendingCount = (await supabase.from("drivers").select("id", { count: "exact" }).eq("registration_status", "pending")).count || 0;
    const rejectedCount = (await supabase.from("drivers").select("id", { count: "exact" }).eq("registration_status", "rejected")).count || 0;

    const ratings = (ratingRes.data || []) as any[];
    const avgRating = ratings.length > 0 ? ratings.reduce((sum, d) => sum + (Number(d.rating) || 0), 0) / ratings.length : 0;

    const ridesFares = (ridesRes.data || []) as any[];
    const totalEarnings = ridesFares.reduce((sum, r) => sum + (Number(r.fare) || 0), 0);

    return {
      total_drivers: totalRes.count || 0,
      active_drivers: activeCount,
      pending_verification: pendingCount,
      rejected_drivers: rejectedCount,
      average_rating: Number(avgRating.toFixed(2)),
      total_completed_rides: ridesRes.count || 0,
      total_earnings: totalEarnings,
    };
  }

  /**
   * Get single driver with complete details
   */
  static async getDriverDetail(driverId: string) {
    const { data, error } = await supabase
      .from("drivers")
      .select(
        `
        id, full_name, phone, email, avatar_url, status, is_verified, rating, 
        created_at, updated_at, registration_status, ktp_url, sim_url, vehicle_stnk_url, 
        rejection_reason, gender, license_number, ktp_number,
        vehicles(*),
        rides(*)
        `
      )
      .eq("id", driverId)
      .single();

    if (error) throw new Error(`Failed to fetch driver: ${error.message}`);
    return data;
  }

  /**
   * Get driver earnings summary
   */
  static async getDriverEarnings(driverId: string) {
    const { data: rides, error } = await supabase
      .from("rides")
      .select("id, fare, created_at, status")
      .eq("driver_id", driverId)
      .eq("status", "completed")
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to fetch earnings: ${error.message}`);

    const totalEarnings = (rides || []).reduce((sum, ride) => sum + (Number(ride.fare) || 0), 0);
    const completedRides = rides?.length || 0;

    // Group by date for daily earnings
    const dailyEarnings: Record<string, number> = {};
    (rides || []).forEach((ride) => {
      const date = new Date(ride.created_at).toLocaleDateString("id-ID");
      dailyEarnings[date] = (dailyEarnings[date] || 0) + (Number(ride.fare) || 0);
    });

    return {
      totalEarnings,
      completedRides,
      dailyEarnings,
      rides: rides || [],
    };
  }

  /**
   * Get driver activity log / ride history
   */
  static async getDriverActivityLog(driverId: string, limit = 20) {
    const { data, error } = await supabase
      .from("rides")
      .select("id, pickup_address, dropoff_address, fare, distance_km, status, created_at, updated_at")
      .eq("driver_id", driverId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to fetch activity: ${error.message}`);
    return data || [];
  }

  /**
   * Update driver verification status
   */
  static async updateVerificationStatus(
    driverId: string,
    status: "approved" | "rejected",
    rejectionReason?: string
  ) {
    const updateData: any = {
      registration_status: status,
      is_verified: status === "approved",
      updated_at: new Date().toISOString(),
    };

    if (rejectionReason) {
      updateData.rejection_reason = rejectionReason;
    }

    const { error } = await (supabase.from("drivers") as any).update(updateData).eq("id", driverId);

    if (error) throw new Error(`Failed to update verification: ${error.message}`);
    return { success: true };
  }

  /**
   * Suspend driver (set status to offline)
   */
  static async suspendDriver(driverId: string) {
    const { error } = await (supabase.from("drivers") as any)
      .update({ status: "offline", updated_at: new Date().toISOString() })
      .eq("id", driverId);

    if (error) throw new Error(`Failed to suspend driver: ${error.message}`);
    return { success: true };
  }

  /**
   * Reactivate driver (set status to available)
   */
  static async reactivateDriver(driverId: string) {
    const { error } = await (supabase.from("drivers") as any)
      .update({ status: "available", updated_at: new Date().toISOString() })
      .eq("id", driverId);

    if (error) throw new Error(`Failed to reactivate driver: ${error.message}`);
    return { success: true };
  }

  /**
   * Get driver's vehicles
   */
  static async getDriverVehicles(driverId: string) {
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .eq("driver_id", driverId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to fetch vehicles: ${error.message}`);
    return data || [];
  }

  /**
   * Get driver's ratings and reviews
   */
  static async getDriverRatings(driverId: string, limit = 10) {
    // Note: Assuming there's a ratings table, adjust query based on actual schema
    const { data, error } = await supabase
      .from("rides")
      .select("id, rating, pickup_address, dropoff_address, created_at")
      .eq("driver_id", driverId)
      .not("rating", "is", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to fetch ratings: ${error.message}`);
    return data || [];
  }

  /**
   * Bulk update driver status
   */
  static async bulkUpdateDriverStatus(driverIds: string[], status: string) {
    const { error } = await (supabase.from("drivers") as any)
      .update({ status, updated_at: new Date().toISOString() })
      .in("id", driverIds);

    if (error) throw new Error(`Failed to bulk update drivers: ${error.message}`);
    return { success: true, count: driverIds.length };
  }

  /**
   * Export driver data (for analytics)
   */
  static async exportDriversData(filters?: DriverFilters) {
    const { drivers } = await this.getDriversWithFilters({
      ...filters,
      limit: 10000, // Get all drivers
      offset: 0,
    });

    return drivers.map((d) => ({
      id: d.id,
      name: d.full_name,
      phone: d.phone,
      email: d.email,
      status: d.status,
      verification: d.registration_status,
      rating: d.rating,
      licenseNumber: d.license_number,
      createdAt: new Date(d.created_at).toLocaleDateString("id-ID"),
    }));
  }
}
