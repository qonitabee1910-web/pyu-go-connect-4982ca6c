

# Fix Build Errors + Add Missing Shuttle Pickup Features

## A. Build Error Fixes

### 1. `DriverEarningsAnalytics.tsx` (line 133)
Recharts `Tooltip` formatter receives `ValueType` (string | number). Fix: cast `value` to `Number()`.

### 2. `useAuth.ts` (line 69)
`USER_DELETED` is not a valid `AuthChangeEvent`. Remove it from the comparison — handle it under the `else` branch or just remove the check.

### 3. `AdminDrivers.tsx` (lines 115, 119)
Filter values are `string` but `.eq()` expects the enum type. Fix: cast with `as any` on the query or type the filter variables properly.

### 4. `DriverAdminService.ts` (lines 73-74, 94, 111)
- Lines 73-74: Same enum casting issue — add `as any` to `.eq()` calls.
- Line 94: `vehicles(count)` returns `{count: number}` not `any[]`. Fix the `DriverWithStats` interface to have `vehicles?: {count: number}` or cast through `unknown`.
- Line 111: `"on_ride"` is not in driver_status enum. Remove or change to `"busy"`.

## B. Shuttle Pickup Enhancements

### 1. Drop-off Point Selection
Currently only pickup points exist. Add a **drop-off selection step** after pickup, reusing the same `PickupSelector` component pattern but for destination points. This requires:
- New step `"dropoff"` in the flow
- Query drop-off points (can reuse `shuttle_pickup_points` with a `type` column, or use destination rayon's points)
- Show selected drop-off in ticket confirmation

### 2. Pickup Point Details Enhancement
- Show pickup point location on a mini map (Leaflet) in `PickupSelector`
- Add estimated pickup time calculation based on `departure_time` and `stop_order`

### 3. Pickup Status Tracking in History
The `shuttle_bookings` table already has `pickup_status` and `pickup_driver_name/plate` columns. Display these in the booking history cards with status badges (pending → picked_up → delivered).

### 4. Pickup Point Admin Management
Add pickup point CRUD in `AdminShuttles.tsx` under a new "Pickup Points" tab.

---

## Files to Change

| File | Changes |
|------|---------|
| `src/components/admin/DriverEarningsAnalytics.tsx` | Cast tooltip value to Number |
| `src/hooks/useAuth.ts` | Remove `USER_DELETED` check |
| `src/pages/admin/AdminDrivers.tsx` | Add `as any` to enum filter calls |
| `src/services/DriverAdminService.ts` | Fix types, remove `on_ride`, cast queries |
| `src/pages/Shuttle.tsx` | Add dropoff step, enhanced pickup flow |
| `src/components/shuttle/PickupSelector.tsx` | Add mini-map, ETA display |
| `src/components/shuttle/DropoffSelector.tsx` | New component for drop-off point selection |
| `src/components/shuttle/ShuttleTicket.tsx` | Show drop-off point name |
| `src/pages/admin/AdminShuttles.tsx` | Add "Pickup Points" tab |
| `src/components/admin/shuttle/PickupPointsTab.tsx` | New: CRUD for pickup points |

### Database Changes
- Add `point_type` column to `shuttle_pickup_points` (values: 'pickup', 'dropoff') with default 'pickup' — via migration
- Or simply reuse existing pickup points and let the drop-off be the route destination

