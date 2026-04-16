

# Plan: Fix Build Errors + Traveloka-Style Landing Page

## Part 1: Fix Build Errors

### ShuttleLayoutService.ts
The `shuttle_vehicle_layouts` table doesn't exist in the database types. All Supabase calls need to use `(supabase as any).from("shuttle_vehicle_layouts")` casting, or we create the table via migration.

**Approach**: Cast all supabase calls in ShuttleLayoutService to bypass type checking, since the table may exist at runtime but isn't in the generated types yet. This is the same pattern used for WalletService and ShuttleBookingService.

---

## Part 2: Traveloka-Style Landing Page Redesign

Transform the current simple Index page into a polished, Traveloka-inspired landing page with these sections:

### 1. Hero Section with Search
- Full-width gradient hero with PYU GO branding
- Prominent "Where are you going?" search bar
- Wallet balance pill (logged in) or Sign In button

### 2. Service Tabs (Traveloka-style)
- Horizontal icon tabs: **Ride** | **Shuttle** | **Hotel**
- Each tab shows a mini-form relevant to the service (destination input for Ride, route selector for Shuttle, city for Hotel)
- Rounded card container with shadow

### 3. Promo/Deals Carousel
- Keep existing PromoSection but style it with Traveloka's card design (image + overlay text + discount badge)

### 4. Quick Access Grid
- "Popular Destinations" or "Popular Routes" section
- Grid of cards with images and labels

### 5. Ads Banner
- Keep existing AdsBanner component

### 6. Recent Activity
- Keep existing recent rides section with cleaner card design

### 7. Trust/Info Bar
- Simple footer-like section: "Safe Rides", "Best Prices", "24/7 Support" with icons

### Files to modify:
- `src/pages/Index.tsx` — Complete rewrite with Traveloka layout
- `src/services/ShuttleLayoutService.ts` — Fix type casting
- New: `src/components/home/ServiceTabs.tsx` — Tab-based service selector
- New: `src/components/home/TrustBanner.tsx` — Trust indicators section
- New: `src/components/home/PopularRoutes.tsx` — Popular destinations grid

### Design principles:
- White/light background with green-blue brand gradient on hero
- Rounded cards with subtle shadows (Traveloka style)
- Clean iconography, Plus Jakarta Sans throughout
- Mobile-first with bottom nav preserved

