

# Fix Loading States — Sub 3-Second Target

## Problems Found

### 1. No Lazy Loading (Critical)
All 20+ pages are eagerly imported in `App.tsx` — only `Ride` uses `lazy()`. The initial JS bundle includes every page (admin, driver, shuttle, hotel, wallet) even if the user only visits the home page. This is the single biggest contributor to slow load times.

### 2. No QueryClient Optimization
`QueryClient` is created with default settings — no `staleTime`, no `gcTime`. Every navigation triggers fresh network requests even for data fetched seconds ago (wallet, promos, ads).

### 3. Waterfall Auth Check
`useAuth` fetches session, then fetches `user_roles` sequentially. Every protected page waits for both before rendering anything useful.

### 4. Missing Skeleton/Loading States
- **Index page**: No loading state for wallet balance or recent rides — content pops in abruptly.
- **Profile page**: No loading skeleton — shows user data with no intermediate state.
- **DriverDashboard**: Shows "Memuat..." plain text instead of a skeleton layout.
- **DriverActiveRide**: Same plain text loading.
- **DriverHistory**: Same plain text loading.
- **DriverEarnings**: No loading state at all — empty content while fetching.

### 5. Unnecessary Queries on Every Mount
- `AdsBanner` tracks ad views inside `queryFn` — fires on every cache miss and refocus.
- `Profile` page makes 4 parallel queries (profile, rideCount, isAdmin, isDriver) that could be consolidated or cached longer.
- `Hotel` page fetches all hotels + all rooms in the same queryFn — two sequential DB calls.

### 6. Debug Artifacts
- `Profile.tsx` has a leftover "Test Button" and `console.log` in the sign-out handler.

## Implementation Plan

### Step 1: Lazy Load All Routes
Convert all page imports in `App.tsx` to `lazy()` imports. Group them:
- **Core** (eagerly loaded): `Index`, `Auth`, `AppLayout`
- **Lazy**: Everything else (Shuttle, Wallet, Profile, Hotel, HotelDetail, all Admin pages, all Driver pages, DriverAuth, Forbidden, NotFound)

Add a shared `Suspense` fallback skeleton component.

### Step 2: Configure QueryClient for Performance
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,  // 2 minutes
      gcTime: 1000 * 60 * 5,     // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```
This prevents redundant refetches on tab switch and navigation.

### Step 3: Add Skeleton Loading States
Replace all "Memuat..." text with proper skeleton layouts that match the final content shape:
- **DriverDashboard**: Card skeleton for status + 3 stat cards + map placeholder
- **DriverActiveRide**: Map placeholder + card skeleton
- **DriverHistory**: List of card skeletons
- **DriverEarnings**: Card skeletons for summary + list
- **Profile**: Header skeleton + list items
- **Index**: Skeleton for wallet badge + recent rides

### Step 4: Fix AdsBanner View Tracking Side Effect
Move ad view tracking out of `queryFn` into a separate `useEffect` to prevent re-tracking on cache hits.

### Step 5: Consolidate Hotel Query
Use a single query with a join or run both hotel and room queries in `Promise.all` instead of sequentially.

### Step 6: Clean Up Profile Page
Remove the debug "Test Button" and `console.log` from `Profile.tsx`.

### Step 7: Prefetch Critical Data
On `Index` mount, prefetch wallet and profile data so navigating to `/wallet` or `/profile` is instant.

## Files to Modify
- `src/App.tsx` — lazy imports, QueryClient config
- `src/pages/Index.tsx` — skeleton states, prefetching
- `src/pages/Profile.tsx` — skeleton, cleanup
- `src/pages/Hotel.tsx` — parallel queries
- `src/pages/driver/DriverDashboard.tsx` — skeleton loading
- `src/pages/driver/DriverActiveRide.tsx` — skeleton loading
- `src/pages/driver/DriverHistory.tsx` — skeleton loading
- `src/pages/driver/DriverEarnings.tsx` — skeleton loading
- `src/pages/driver/DriverWallet.tsx` — skeleton loading
- `src/pages/Wallet.tsx` — skeleton loading
- `src/components/home/AdsBanner.tsx` — fix side effect

## New Files
- `src/components/ui/page-skeleton.tsx` — reusable skeleton components for consistent loading states

