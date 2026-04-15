# Shuttle Module API Documentation

This document describes the API endpoints and Supabase RPC functions used in the Shuttle module.

## 1. Database Tables

### `shuttle_routes`
Stores the main routes for the shuttle service.
- `id` (UUID, PK)
- `name` (TEXT): Name of the route.
- `origin` (TEXT): Starting point.
- `destination` (TEXT): Ending point.
- `base_fare` (NUMERIC): Starting price for the route.
- `distance_km` (NUMERIC): Estimated distance.
- `active` (BOOLEAN): Status of the route.

### `shuttle_service_types`
Defines different service levels for a route (e.g., Reguler, VIP).
- `id` (UUID, PK)
- `route_id` (FK -> shuttle_routes)
- `name` (TEXT)
- `description` (TEXT)

### `shuttle_pricing_rules` (Legacy: `fare_rules`)
Configures how prices are calculated for each service type.
- `id` (UUID, PK)
- `service_type_id` (FK -> shuttle_service_types)
- `base_fare_multiplier` (NUMERIC): Multiplier for route base fare.
- `distance_cost_per_km` (NUMERIC): Additional cost per kilometer.
- `peak_hours_multiplier` (NUMERIC): Multiplier during peak hours.
- `rayon_base_surcharge` (NUMERIC): Flat fee per rayon.

### `shuttle_distance_matrix` (New)
Point-to-point distance overrides.
- `origin_point_id` (FK -> shuttle_pickup_points)
- `destination_point_id` (FK -> shuttle_pickup_points)
- `distance_km` (NUMERIC): Override distance.

### `shuttle_pricing_tiers` (New)
Bulk booking discounts.
- `min_seats` (INTEGER)
- `max_seats` (INTEGER)
- `discount_multiplier` (NUMERIC): e.g., 0.9 for 10% discount.
- `surcharge_fixed` (NUMERIC)

### `shuttle_bookings`
Stores user bookings.
- `id` (UUID, PK)
- `schedule_id` (FK -> shuttle_schedules)
- `user_id` (FK -> auth.users)
- `status` (booking_status): confirmed, cancelled, completed.
- `total_fare` (NUMERIC): Total price paid.
- `payment_status` (TEXT): pending, paid, failed.

---

## 2. RPC Functions (Supabase)

### `calculate_shuttle_booking_price(...)`
Calculates price with A/B variation, Distance Matrix, and Pricing Tiers support.
Parameters:
- `p_schedule_id` (UUID)
- `p_service_type_id` (UUID)
- `p_rayon_id` (UUID)
- `p_seat_count` (INTEGER)
- `p_variation_id` (UUID, Optional)
- `p_pickup_point_id` (UUID, Optional)
- `p_destination_point_id` (UUID, Optional)

### `get_available_services_for_schedule(p_schedule_id UUID)`
Returns a list of available services (Service Type + Vehicle Type) for a given schedule, including calculated prices.

### `get_current_pricing_for_service(p_service_type_id UUID)`
Returns the active pricing rule for a specific service type.

### `create_shuttle_booking_atomic_v2(...)`
An atomic operation that:
1. Verifies price on the server.
2. Checks seat availability.
3. Locks seats.
4. Creates booking and booking details records.
5. Updates seat status to 'booked'.

---

## 3. Frontend Services (ShuttleService.ts)

### `calculatePrice(routeId, serviceTypeId, rayonId, seatCount)`
Recalculates the price on the client-side for UI display.

### `createBooking(userId, bookingRequest)`
Calls the `create_shuttle_booking_atomic_v2` RPC to finalize a booking.

### `getSchedulesWithServices(routeId, travelDate)`
Fetches all schedules for a route and date, including their available services and prices.
