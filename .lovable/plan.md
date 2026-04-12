# Shuttle Route CRUD + Integrated User Booking Flow

## Current State

- **Admin**: Routes tab is read-only (no CRUD). Rayons tab has full CRUD. Bookings tab shows bookings.
- **User flow**: Browse routes → select schedule → pickup point → seats → guest info → payment → ticket. Works but routes/schedules must be manually inserted in DB since there's no admin CRUD for routes and schedules.

## What to Build

### 1. Admin Routes CRUD (in `AdminShuttles.tsx` RoutesTab)

Replace the read-only route list with full CRUD:

- **Add Route** dialog: name, origin, destination, base_fare, distance_km, active toggle
- **Edit Route** dialog: same fields, pre-populated
- **Delete Route** button with confirmation
- **Schedule management** per route (expandable):
  - Add Schedule: date, departure_time (datetime picker), arrival_time, total_seats
  - Edit/Delete schedules
  - Show available_seats vs total_seats

### 2. Update User Shuttle Flow (`Shuttle.tsx`)

Enhance the existing flow to better match admin data:

- **Step 1 - Browse Routes**: Show active routes with date filter (user picks a travel date)
- **Step 2 - Select Schedule**: Show schedules for selected route on that date, with departure time and available seats
- **Step 3 - Pickup Point**: Select from rayons/pickup points (already works)
- **Step 4 - Seats**: Choose seat count (already works)
- **Step 5 - Guest Info**: Name + phone (already works)
- **Step 6 - Payment**: Cash/Midtrans/Xendit (already works)
- **Step 7 - Confirmation + Download Ticket**: QR ticket (already works)

The main addition is a **date picker** before schedule selection so users see only schedules for their chosen date, and the pickup time shown comes from the pickup point's `departure_time` field.

### 3. No Database Changes Needed

All tables (`shuttle_routes`, `shuttle_schedules`, `shuttle_bookings`, `shuttle_rayons`, `shuttle_pickup_points`) already exist with the right schema.

## Technical Details

### Files to modify:

1. `**src/pages/admin/AdminShuttles.tsx**` — Replace `RoutesTab` with full CRUD:
  - `RouteForm` component (dialog for add/edit route)
  - `ScheduleForm` component (dialog for add/edit schedule within a route)
  - Delete route mutation, delete schedule mutation
  - Expandable route cards showing schedules with add/edit/delete
2. `**src/pages/Shuttle.tsx**` — Add date selection:
  - Add `selectedDate` state
  - After selecting a route, show a date picker to filter schedules
  - Filter schedules by selected date
  - Flow becomes: routes → date → schedule → pickup → seats → guest_info → payment → confirmation

## Implementation Order

1. Build admin Route CRUD (add/edit/delete routes)
2. Build admin Schedule CRUD within routes (add/edit/delete schedules)
3. Add date picker to user shuttle flow
4. Test end-to-end: create route in admin → add schedule → user books via /shuttle