

# Shuttle Management: Rayon CRUD with Pickup Points & Fare Integration

## Overview

Transform the admin Shuttle Management into a tabbed interface with full CRUD for Rayons (route zones like RAYON A, B, C, D from the flow chart). Each Rayon has ordered pickup points (stops) with time and cumulative distance/fare. The fare from these pickup points integrates into ticket printing.

## Database Changes (Migration)

1. **`shuttle_rayons`** — Route zone groupings
   - `id` (uuid), `name` (text, e.g. "RAYON A"), `description` (text), `active` (boolean), `created_at`, `updated_at`
   - RLS: public read, admin write

2. **`shuttle_pickup_points`** — Ordered stops within a rayon
   - `id` (uuid), `rayon_id` (uuid, references shuttle_rayons), `stop_order` (integer, e.g. J1=1, J2=2), `name` (text, e.g. "Hermes Palace"), `departure_time` (text, e.g. "06.00"), `distance_meters` (integer, e.g. 700), `fare` (numeric, cumulative fare from origin), `active` (boolean), `created_at`, `updated_at`
   - RLS: public read, admin write

3. **Add `rayon_id` and `pickup_point_id` columns** to `shuttle_bookings` (nullable) to link bookings to specific pickup points for ticket printing.

## Admin UI Changes (`AdminShuttles.tsx`)

Rebuild into a **tabbed layout** with 3 tabs:

### Tab 1: Routes (existing)
- Current route list with schedules and bookings (already exists)

### Tab 2: Rayons
- List all rayons with CRUD (Add, Edit, Delete)
- Each rayon card expandable to show its pickup points table:
  - Columns: Order (J1, J2...), Name, Time (WIB), Distance (Mtr), Fare (Rp)
- Add/Edit/Delete pickup points inline or via dialog
- Reorder pickup points (drag or move up/down buttons)

### Tab 3: Bookings
- All shuttle bookings with payment status filters
- Print ticket action per booking

## Fare Calculation Integration

- When user books a shuttle, the fare is determined by their selected pickup point's `fare` value from `shuttle_pickup_points`
- Update `Shuttle.tsx` booking flow: after selecting a rayon/route, user picks their **pickup point** from the list, and the fare auto-populates from the pickup point data
- Ticket (`ShuttleTicket.tsx`) updated to show pickup point name and fare

## Updated Shuttle Booking Flow

Routes → **Select Pickup Point** (from rayon stops) → Seats → Guest Info → Payment → Ticket

## Frontend Components

1. **Updated `AdminShuttles.tsx`** — Tabs (Routes, Rayons, Bookings) with full Rayon CRUD
2. **`RayonForm`** dialog — Add/edit rayon name + pickup points table
3. **Updated `Shuttle.tsx`** — Pickup point selection step using rayon data
4. **Updated `ShuttleTicket.tsx`** — Show pickup point name on ticket

## Implementation Order

1. Database migration (create `shuttle_rayons`, `shuttle_pickup_points`, add columns to `shuttle_bookings`)
2. Build admin Rayon CRUD with pickup points management
3. Update shuttle booking flow with pickup point selection
4. Update ticket to show pickup point and calculated fare

