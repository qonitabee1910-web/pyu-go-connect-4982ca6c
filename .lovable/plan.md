

# Driver Module — Integrated with PYU GO Web App

## Overview
Build a complete Driver module within the existing web app (not the separate Flutter app). This gives drivers a dedicated portal to manage their status, receive ride requests, navigate to passengers, track earnings, and view ride history — all integrated with the existing ride, wallet, dispatch, and admin systems.

## Architecture

```text
┌──────────────────────────────────────────────┐
│                  PYU GO Web App               │
├──────────┬───────────┬───────────┬────────────┤
│  Rider   │  Shuttle  │  Hotel    │  DRIVER    │
│  Module  │  Module   │  Module   │  MODULE    │
├──────────┴───────────┴───────────┴────────────┤
│  Shared: Auth, Wallet, MapView, Supabase      │
└──────────────────────────────────────────────────┘

Driver Flow:
  Login → /driver → Dashboard (toggle online/offline)
                   → Incoming ride (realtime) → Accept/Reject
                   → Active ride (navigate, pickup, complete)
                   → Earnings & History
```

## Database Changes (Migration)

1. **Link `drivers.user_id` properly** — ensure drivers can authenticate with existing auth and map to the `drivers` table
2. **Add `driver_earnings` table** — track per-ride earnings with commission deductions
3. **Add RLS policies** so drivers can only update their own record (status, location) and view their own rides/earnings
4. **Enable realtime** on `rides` table for driver-side listening

```sql
-- driver_earnings table
CREATE TABLE public.driver_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  ride_id uuid NOT NULL REFERENCES public.rides(id),
  gross_fare numeric NOT NULL DEFAULT 0,
  commission_rate numeric NOT NULL DEFAULT 0.2,
  commission_amount numeric NOT NULL DEFAULT 0,
  net_earning numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending', -- pending, paid, withdrawn
  created_at timestamptz DEFAULT now()
);

-- RLS: drivers read/update own record
CREATE POLICY "Drivers can view own profile"
  ON public.drivers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Drivers can update own status/location"
  ON public.drivers FOR UPDATE USING (auth.uid() = user_id);

-- RLS: driver_earnings
CREATE POLICY "Drivers can view own earnings"
  ON public.driver_earnings FOR SELECT USING (
    driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
  );

-- RLS: drivers can view rides assigned to them
CREATE POLICY "Drivers can view assigned rides"
  ON public.rides FOR SELECT USING (
    driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
  );
CREATE POLICY "Drivers can update assigned rides"
  ON public.rides FOR UPDATE USING (
    driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
  );

-- Enable realtime for rides (driver listens for new assignments)
ALTER PUBLICATION supabase_realtime ADD TABLE public.rides;
```

## New Pages & Components

### 1. Driver Dashboard — `src/pages/driver/DriverDashboard.tsx`
- **Status toggle** (online/offline) — updates `drivers.status` and starts GPS tracking
- **Live map** showing driver's current position (reuses `MapView`)
- **Stats cards**: today's rides, today's earnings, rating
- **Incoming ride notification** (realtime subscription on `rides` where `driver_id = me` and `status = accepted`)

### 2. Active Ride View — `src/pages/driver/DriverActiveRide.tsx`
- Shows pickup/dropoff on map with route polyline
- Rider info (name, phone)
- Action buttons: "Arrived at Pickup" → "Start Ride" → "Complete Ride"
- Updates `rides.status` through the flow: `accepted → in_progress → completed`
- On complete: creates `driver_earnings` record, marks driver as `available`

### 3. Earnings Page — `src/pages/driver/DriverEarnings.tsx`
- Summary: total earnings (daily/weekly/monthly)
- List of ride earnings with commission breakdown
- Withdraw to wallet button (transfers net earning to driver's wallet)

### 4. Ride History — `src/pages/driver/DriverHistory.tsx`
- Paginated list of completed rides
- Each entry: route, fare, earning, date, rider rating

### 5. Driver Layout — `src/pages/driver/DriverLayout.tsx`
- Separate layout (like AdminLayout) with bottom nav: Dashboard, Active Ride, Earnings, History, Profile
- Green-themed header to distinguish from rider app

## New Stores & Hooks

### `src/stores/driverStore.ts`
- `isOnline`, `currentRideId`, `driverProfile`, location tracking state

### `src/hooks/useDriverLocation.ts`
- Uses browser Geolocation API to track position
- Pushes updates to `drivers.current_lat/current_lng` every 10 seconds when online

### `src/hooks/useIncomingRide.ts`
- Realtime subscription on `rides` table filtered by driver_id
- Triggers notification when a new ride is assigned

## Edge Function Updates

### Update `dispatch-driver/index.ts`
- After assigning driver, the ride status change triggers realtime → driver app picks it up automatically (no change needed, already works)

### New: `complete-ride/index.ts`
- Validates ride completion
- Calculates commission from `app_settings` (ride_fares → commission rate)
- Creates `driver_earnings` record
- Marks driver as `available`
- Optionally processes wallet payment

## Routing Updates (`App.tsx`)

```text
/driver              → DriverLayout
  /driver             → DriverDashboard (index)
  /driver/ride        → DriverActiveRide
  /driver/earnings    → DriverEarnings
  /driver/history     → DriverHistory
```

## Integration Points

| Feature | Integration |
|---------|-------------|
| **Ride dispatch** | Existing `dispatch-driver` assigns rides → driver sees via realtime |
| **Ride status** | Driver updates status → rider's `Ride.tsx` receives via existing realtime subscription |
| **Wallet** | Driver earnings can be transferred to their wallet (existing `process_wallet_transaction`) |
| **Admin** | Existing `AdminDrivers` page already lists drivers; earnings data visible there too |
| **MapView** | Reuses existing `MapView` component with route polyline |
| **Auth** | Uses existing auth system; driver role checked via `drivers.user_id` match |
| **Settings** | Commission rate from `app_settings` ride_fares config |

## Profile Page Update
- Add "Driver Mode" button on Profile page if user has a linked driver record
- Navigates to `/driver` dashboard

## Implementation Order
1. Database migration (driver_earnings table, RLS policies, realtime)
2. Create `driverStore.ts` and hooks (`useDriverLocation`, `useIncomingRide`)
3. Create `DriverLayout` with routing
4. Build `DriverDashboard` (status toggle, map, stats)
5. Build `DriverActiveRide` (ride flow with map)
6. Create `complete-ride` edge function
7. Build `DriverEarnings` and `DriverHistory` pages
8. Update Profile page with "Driver Mode" link
9. Update `App.tsx` routes

