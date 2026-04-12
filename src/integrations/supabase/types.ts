export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      drivers: {
        Row: {
          created_at: string
          current_lat: number | null
          current_lng: number | null
          full_name: string
          id: string
          license_number: string | null
          phone: string
          rating: number | null
          status: Database["public"]["Enums"]["driver_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          full_name: string
          id?: string
          license_number?: string | null
          phone: string
          rating?: number | null
          status?: Database["public"]["Enums"]["driver_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          full_name?: string
          id?: string
          license_number?: string | null
          phone?: string
          rating?: number | null
          status?: Database["public"]["Enums"]["driver_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      hotel_bookings: {
        Row: {
          booking_ref: string
          check_in: string
          check_out: string
          created_at: string
          guest_name: string | null
          guest_phone: string | null
          guests: number
          hotel_id: string
          id: string
          room_id: string
          special_requests: string | null
          status: Database["public"]["Enums"]["hotel_booking_status"]
          total_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_ref?: string
          check_in: string
          check_out: string
          created_at?: string
          guest_name?: string | null
          guest_phone?: string | null
          guests?: number
          hotel_id: string
          id?: string
          room_id: string
          special_requests?: string | null
          status?: Database["public"]["Enums"]["hotel_booking_status"]
          total_price?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_ref?: string
          check_in?: string
          check_out?: string
          created_at?: string
          guest_name?: string | null
          guest_phone?: string | null
          guests?: number
          hotel_id?: string
          id?: string
          room_id?: string
          special_requests?: string | null
          status?: Database["public"]["Enums"]["hotel_booking_status"]
          total_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_bookings_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_bookings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "hotel_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_rooms: {
        Row: {
          active: boolean
          amenities: string[] | null
          available_rooms: number
          created_at: string
          description: string | null
          hotel_id: string
          id: string
          image_url: string | null
          max_guests: number
          name: string
          price_per_night: number
          total_rooms: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          amenities?: string[] | null
          available_rooms?: number
          created_at?: string
          description?: string | null
          hotel_id: string
          id?: string
          image_url?: string | null
          max_guests?: number
          name: string
          price_per_night?: number
          total_rooms?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          amenities?: string[] | null
          available_rooms?: number
          created_at?: string
          description?: string | null
          hotel_id?: string
          id?: string
          image_url?: string | null
          max_guests?: number
          name?: string
          price_per_night?: number
          total_rooms?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_rooms_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      hotels: {
        Row: {
          active: boolean
          address: string
          amenities: string[] | null
          city: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          lat: number | null
          lng: number | null
          name: string
          rating: number | null
          star_rating: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          address: string
          amenities?: string[] | null
          city: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          lat?: number | null
          lng?: number | null
          name: string
          rating?: number | null
          star_rating?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string
          amenities?: string[] | null
          city?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          lat?: number | null
          lng?: number | null
          name?: string
          rating?: number | null
          star_rating?: number
          updated_at?: string
        }
        Relationships: []
      }
      payment_settings: {
        Row: {
          commission_rate: number
          config: Json
          created_at: string
          gateway: string
          id: string
          is_active: boolean
          is_default: boolean
          updated_at: string
        }
        Insert: {
          commission_rate?: number
          config?: Json
          created_at?: string
          gateway: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          updated_at?: string
        }
        Update: {
          commission_rate?: number
          config?: Json
          created_at?: string
          gateway?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rides: {
        Row: {
          created_at: string
          distance_km: number | null
          driver_id: string | null
          dropoff_address: string | null
          dropoff_lat: number
          dropoff_lng: number
          fare: number | null
          id: string
          pickup_address: string | null
          pickup_lat: number
          pickup_lng: number
          rider_id: string
          service_type: Database["public"]["Enums"]["ride_service_type"]
          status: Database["public"]["Enums"]["ride_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          distance_km?: number | null
          driver_id?: string | null
          dropoff_address?: string | null
          dropoff_lat: number
          dropoff_lng: number
          fare?: number | null
          id?: string
          pickup_address?: string | null
          pickup_lat: number
          pickup_lng: number
          rider_id: string
          service_type?: Database["public"]["Enums"]["ride_service_type"]
          status?: Database["public"]["Enums"]["ride_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          distance_km?: number | null
          driver_id?: string | null
          dropoff_address?: string | null
          dropoff_lat?: number
          dropoff_lng?: number
          fare?: number | null
          id?: string
          pickup_address?: string | null
          pickup_lat?: number
          pickup_lng?: number
          rider_id?: string
          service_type?: Database["public"]["Enums"]["ride_service_type"]
          status?: Database["public"]["Enums"]["ride_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rides_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      shuttle_bookings: {
        Row: {
          booking_ref: string
          created_at: string
          guest_name: string | null
          guest_phone: string | null
          id: string
          payment_method: string | null
          payment_status: string
          pickup_point_id: string | null
          rayon_id: string | null
          schedule_id: string
          seat_count: number
          status: Database["public"]["Enums"]["booking_status"]
          total_fare: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          booking_ref?: string
          created_at?: string
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          payment_method?: string | null
          payment_status?: string
          pickup_point_id?: string | null
          rayon_id?: string | null
          schedule_id: string
          seat_count?: number
          status?: Database["public"]["Enums"]["booking_status"]
          total_fare?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          booking_ref?: string
          created_at?: string
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          payment_method?: string | null
          payment_status?: string
          pickup_point_id?: string | null
          rayon_id?: string | null
          schedule_id?: string
          seat_count?: number
          status?: Database["public"]["Enums"]["booking_status"]
          total_fare?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shuttle_bookings_pickup_point_id_fkey"
            columns: ["pickup_point_id"]
            isOneToOne: false
            referencedRelation: "shuttle_pickup_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shuttle_bookings_rayon_id_fkey"
            columns: ["rayon_id"]
            isOneToOne: false
            referencedRelation: "shuttle_rayons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shuttle_bookings_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "shuttle_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      shuttle_pickup_points: {
        Row: {
          active: boolean
          created_at: string
          departure_time: string | null
          distance_meters: number
          fare: number
          id: string
          name: string
          rayon_id: string
          stop_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          departure_time?: string | null
          distance_meters?: number
          fare?: number
          id?: string
          name: string
          rayon_id: string
          stop_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          departure_time?: string | null
          distance_meters?: number
          fare?: number
          id?: string
          name?: string
          rayon_id?: string
          stop_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shuttle_pickup_points_rayon_id_fkey"
            columns: ["rayon_id"]
            isOneToOne: false
            referencedRelation: "shuttle_rayons"
            referencedColumns: ["id"]
          },
        ]
      }
      shuttle_rayons: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      shuttle_routes: {
        Row: {
          active: boolean
          base_fare: number
          created_at: string
          destination: string
          distance_km: number | null
          id: string
          name: string
          origin: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          base_fare?: number
          created_at?: string
          destination: string
          distance_km?: number | null
          id?: string
          name: string
          origin: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          base_fare?: number
          created_at?: string
          destination?: string
          distance_km?: number | null
          id?: string
          name?: string
          origin?: string
          updated_at?: string
        }
        Relationships: []
      }
      shuttle_schedules: {
        Row: {
          active: boolean
          arrival_time: string | null
          available_seats: number
          created_at: string
          departure_time: string
          id: string
          route_id: string
          total_seats: number
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          active?: boolean
          arrival_time?: string | null
          available_seats?: number
          created_at?: string
          departure_time: string
          id?: string
          route_id: string
          total_seats?: number
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          active?: boolean
          arrival_time?: string | null
          available_seats?: number
          created_at?: string
          departure_time?: string
          id?: string
          route_id?: string
          total_seats?: number
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shuttle_schedules_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "shuttle_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shuttle_schedules_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          capacity: number
          color: string | null
          created_at: string
          driver_id: string
          id: string
          model: string | null
          plate_number: string
          updated_at: string
          vehicle_type: string
        }
        Insert: {
          capacity?: number
          color?: string | null
          created_at?: string
          driver_id: string
          id?: string
          model?: string | null
          plate_number: string
          updated_at?: string
          vehicle_type?: string
        }
        Update: {
          capacity?: number
          color?: string | null
          created_at?: string
          driver_id?: string
          id?: string
          model?: string | null
          plate_number?: string
          updated_at?: string
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          description: string | null
          gateway_transaction_id: string | null
          id: string
          payment_gateway: string | null
          reference_id: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          wallet_id: string
        }
        Insert: {
          amount: number
          balance_after?: number
          created_at?: string
          description?: string | null
          gateway_transaction_id?: string | null
          id?: string
          payment_gateway?: string | null
          reference_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string | null
          gateway_transaction_id?: string | null
          id?: string
          payment_gateway?: string | null
          reference_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type?: Database["public"]["Enums"]["transaction_type"]
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
          wallet_type: Database["public"]["Enums"]["wallet_type"]
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          wallet_type?: Database["public"]["Enums"]["wallet_type"]
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          wallet_type?: Database["public"]["Enums"]["wallet_type"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      process_wallet_transaction: {
        Args: {
          p_amount: number
          p_description?: string
          p_gateway_transaction_id?: string
          p_payment_gateway?: string
          p_reference_id?: string
          p_status?: Database["public"]["Enums"]["transaction_status"]
          p_type: Database["public"]["Enums"]["transaction_type"]
          p_wallet_id: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      booking_status: "confirmed" | "cancelled" | "completed"
      driver_status: "available" | "busy" | "offline"
      hotel_booking_status: "pending" | "confirmed" | "cancelled" | "completed"
      ride_service_type: "bike" | "bike_women" | "car"
      ride_status:
        | "pending"
        | "accepted"
        | "in_progress"
        | "completed"
        | "cancelled"
      transaction_status: "pending" | "completed" | "failed"
      transaction_type:
        | "top_up"
        | "ride_payment"
        | "ride_earning"
        | "withdrawal"
        | "refund"
        | "admin_adjustment"
      wallet_type: "user" | "driver"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      booking_status: ["confirmed", "cancelled", "completed"],
      driver_status: ["available", "busy", "offline"],
      hotel_booking_status: ["pending", "confirmed", "cancelled", "completed"],
      ride_service_type: ["bike", "bike_women", "car"],
      ride_status: [
        "pending",
        "accepted",
        "in_progress",
        "completed",
        "cancelled",
      ],
      transaction_status: ["pending", "completed", "failed"],
      transaction_type: [
        "top_up",
        "ride_payment",
        "ride_earning",
        "withdrawal",
        "refund",
        "admin_adjustment",
      ],
      wallet_type: ["user", "driver"],
    },
  },
} as const
