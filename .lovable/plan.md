

# Driver Module — Review & Refinement

## Issues Found

### 1. Bottom Navigation Overflow (7 items on 390px)
The `DriverLayout` has 7 nav items (Dashboard, Ride Aktif, Shuttle, Pendapatan, Dompet, Profil, Riwayat) crammed into a single row. On a 390px viewport, each item gets ~55px — text will truncate and icons will overlap.

**Fix**: Reduce to 5 primary nav items. Merge "Pendapatan" into "Dompet" (earnings withdrawal already lives there). Move "Riwayat" into a sub-section of Dashboard or Earnings. Keep: Dashboard, Ride Aktif, Shuttle, Dompet, Profil.

### 2. Vehicle Query Returns Single Object, Not Array
`DriverDashboard` line 162-167: `driver.vehicles` is fetched via `select("*, vehicles(*)")` which returns a single object (not array) when using a foreign key relationship. The code wraps it in `[(driver.vehicles as any)]` as a workaround, but this breaks if there are multiple vehicles.

**Fix**: Query vehicles separately with `.from("vehicles").select("*").eq("driver_id", driver.id)` to get a proper array.

### 3. `DriverHistory` — Redundant Driver Query
Line 14-18: Fetches `drivers` table by `id = driverId` just to get the `id` back — completely unnecessary since `driverId` is already the driver's ID.

**Fix**: Remove the redundant query, use `driverId` directly.

### 4. Missing Error Handling in `useDriverLocation`
The geolocation update silently fails if the Supabase `update` call errors out. No user feedback.

**Fix**: Add error logging and optional toast for persistent failures.

### 5. Duplicate Wallet Icon in Nav
Both "Pendapatan" and "Dompet" use the same `Wallet` icon — confusing for users.

**Fix**: Use `BadgeDollarSign` or `Coins` for Pendapatan to differentiate (if kept separate).

### 6. `complete-ride` Edge Function Missing Auth Verification
The function checks for `Authorization` header existence but never verifies the JWT or checks that the caller is the driver assigned to the ride. Anyone with a valid token could complete any ride.

**Fix**: Verify the JWT, get the user, confirm the user matches the ride's driver via `drivers.user_id`.

### 7. Profile Insert Race Condition in `signUp`
The `handle_new_user` trigger already inserts into `profiles` on auth signup. The `signUp` function also manually inserts — causing a duplicate key error.

**Fix**: Remove the manual `profiles.insert` from `signUp`, let the trigger handle it. Or use `.upsert()`.

### 8. Driver Registration Inserts Without RLS Permission
During signup, the newly created user tries to insert into `drivers` table. But the `drivers` table has no INSERT policy for authenticated users (only admin ALL policy). The insert will fail due to RLS.

**Fix**: Add an RLS INSERT policy for `drivers`: `WITH CHECK (auth.uid() = user_id)`. Same issue with `user_roles` — no INSERT for non-admin users.

### 9. `useIncomingRide` Listens for `UPDATE` but Dispatch Sets `driver_id` on Insert/Update
The realtime subscription filters `driver_id=eq.${driverId}`, but the initial dispatch might set `driver_id` via UPDATE (from null to the driver's ID). The filter `driver_id=eq.${driverId}` only matches AFTER the update, so it should work — but the status check for `"accepted"` may not match if dispatch sets status differently.

**Fix**: Verify the dispatch-driver function sets status to `"accepted"` when assigning. Review and align status values.

### 10. No Loading State for `DriverDashboard` Initial Load
When `driver` is null during loading, it shows "Akun driver tidak ditemukan" instead of a loading spinner, creating a flash of error state.

**Fix**: Check `isLoading` from the query before showing the "not found" message.

## Implementation Plan

### Step 1: Database Migration
- Add INSERT policy on `drivers` for `auth.uid() = user_id`
- Add INSERT policy on `user_roles` for authenticated users (for self-registration)

### Step 2: Fix `complete-ride` Edge Function Security
- Verify JWT, extract user ID, confirm driver ownership of the ride

### Step 3: Fix `signUp` Profile Duplicate
- Remove manual `profiles.insert` (trigger handles it), or switch to upsert

### Step 4: Refactor `DriverLayout` Navigation
- Reduce to 5 items: Dashboard, Ride, Shuttle, Dompet, Profil
- Merge earnings summary into DriverWallet page
- Add history as a tab/section within DriverWallet or Dashboard

### Step 5: Fix `DriverDashboard`
- Add `isLoading` check before showing "not found"
- Fix vehicle query to return proper array

### Step 6: Fix `DriverHistory`
- Remove redundant driver query

### Step 7: Fix `useDriverLocation` Error Handling
- Add error logging for failed Supabase updates

