# PYU-GO Ride-Sharing Platform - Complete Architecture Analysis

**Analysis Date:** April 13, 2026  
**Platform Focus:** Multi-mode ride-sharing (bikes, cars, shuttles) with admin and driver management

---

## 1. FRONTEND STRUCTURE OVERVIEW

### 1.1 Tech Stack & Setup
- **Framework:** React 18 + TypeScript + Vite
- **State Management:** Zustand (for auth, driver, ride states)
- **Data Fetching:** TanStack React Query (@tanstack/react-query)
- **UI Components:** shadcn/ui (Radix UI + Tailwind CSS)
- **Routing:** React Router v6 with lazy code splitting
- **Maps:** Leaflet for real-time driver tracking
- **Forms:** React Hook Form + Zod validation
- **i18n:** i18next (localization support)
- **Build:** Vite with TypeScript configuration

### 1.2 Core Application Routes

#### User Routes (Authenticated Users, `role: user`)
- `/` - Home/Index page
- `/ride` - Ride booking interface
- `/shuttle` - Shuttle service browsing
- `/hotel` - Hotel listings
- `/hotel/:id` - Hotel details
- `/wallet` - Wallet/payment management
- `/profile` - User profile management

#### Driver Routes (Authenticated Users, `role: moderator` internally)
- `/driver` - Driver dashboard (main hub)
  - `/driver/ride` - Active ride display with real-time tracking
  - `/driver/shuttle` - Shuttle assignments and schedule
  - `/driver/earnings` - Daily/monthly earnings summary
  - `/driver/wallet` - Driver wallet and withdrawal
  - `/driver/history` - Completed rides history
  - `/driver/profile` - Driver profile management

#### Admin Routes (`role: admin`)
- `/admin` - Admin overview/dashboard
  - `/admin/drivers` - Driver management & verification
  - `/admin/rides` - Ride management & monitoring
  - `/admin/shuttles` - Shuttle operations management
  - `/admin/hotels` - Hotel partner management
  - `/admin/users` - User account management
  - `/admin/payments` - Payment tracking & reconciliation
  - `/admin/withdrawals` - Driver withdrawal requests
  - `/admin/settings` - System configuration

#### Public Routes
- `/auth` - User authentication (OTP-based)
- `/driver/auth` - Driver-specific authentication
- `/forbidden` - Authorization error page
- `*` - 404 Not Found page

### 1.3 Component Structure

#### Admin Components
```
src/components/admin/
├── AdminPagination.tsx          # Reusable pagination component
└── shuttle/                      # Shuttle-related admin components
    └── [shuttle admin UI components]
```

#### Driver Components
```
src/components/driver/
└── profile/
    ├── BasicInfoForm.tsx         # License, phone, personal details
    ├── DocumentVerification.tsx   # KTP, SIM, STNK upload/status
    ├── ProfilePhoto.tsx          # Avatar upload & cropping
    ├── SecuritySettings.tsx       # Password/PIN management
    ├── ServiceSettings.tsx        # Working hours, area, preferences
    └── VehicleInfo.tsx           # Vehicle add/edit/delete
```

#### Layout Components
- `AppLayout` - Main user app wrapper with navigation
- `ProtectedRoute` - Auth guard for admin/driver routes
- `AdminLayout` - Admin dashboard wrapper
- `DriverLayout` - Driver dashboard wrapper

#### Common UI Components (shadcn/ui based)
- Card, Button, Badge, Dialog, Tabs, Forms, etc.

### 1.4 Authentication & RBAC Implementation

#### Roles Defined in `src/lib/rbac.ts`
```typescript
type Role = "admin" | "moderator" | "user";
type Permission = (
  | "ride:create|read|update|delete"
  | "shuttle:create|read|update|delete"
  | "hotel:create|read|update|delete"
  | "driver:status:toggle|location:update"
  | "wallet:view|topup|pay"
  | "admin:dashboard:view|user:manage|driver:manage|payment:manage|settings:manage"
);

ROLE_PERMISSIONS:
  admin    → All permissions
  moderator (Driver) → Ride/shuttle read+update, driver status/location, wallet
  user     → Ride create, read, wallet, hotel read, shuttle read
```

#### Auth Flow via `useAuth()` Hook
1. **Authentication Storage:** Zustand store (`src/stores/authStore.ts`)
   - `user` - Supabase auth.user object
   - `session` - Auth session
   - `role` - Current user role (retrieved from `user_roles` table)
   - `permissions` - Derived from role
   - `isLoading` - Async state
   - `isGuest` - Anonymous access flag

2. **Session Persistence:** Auto-restored from Supabase session

3. **Permission Checking:** 
   - `hasPermission(role, permission)` - Single permission check
   - `hasAnyPermission(role, [permissions])` - Multiple OR check
   - `<Can permission="">` - React component for conditional rendering

### 1.5 State Management (Zustand Stores)

#### `authStore.ts` - Global Authentication
```typescript
{
  user: User | null,           // Supabase auth.user
  session: Session | null,     // Auth session
  role: Role | null,           // "admin" | "moderator" | "user"
  permissions: Permission[],   // Derived from role
  isLoading: boolean,
  isGuest: boolean,
  setUser, setSession, setRole, setLoading, setGuest, reset
}
```

#### `driverStore.ts` - Driver-Specific State
```typescript
{
  isOnline: boolean,           // Driver availability status
  driverId: string | null,     // UUID of driver record
  currentRideId: string | null,// Active ride UUID
  locationWatchId: number,     // Geolocation watch handle
  setOnline, setDriverId, setCurrentRideId, setLocationWatchId, reset
}
```

#### `rideStore.ts` - Ride Booking State
```typescript
{
  pickup: LatLng | null,       // Start coordinates {lat, lng}
  dropoff: LatLng | null,      // End coordinates
  pickupAddress: string,       // Human-readable address
  dropoffAddress: string,
  serviceType: "bike"|"bike_women"|"car",
  fare: number | null,         // Calculated fare in IDR
  rideStatus: (idle|selecting_pickup|selecting_dropoff|
               selecting_service|confirming|searching|
               accepted|in_progress|completed|cancelled),
  currentRideId: string | null,
  setPickup, setDropoff, setServiceType, setFare, setRideStatus, etc.
}
```

### 1.6 Custom Hooks

#### `useAuth()` - Authentication context
- Manages login/logout
- Returns: `user`, `isLoading`, `signOut()`, `login()`, `role`

#### `useRBAC()` - Role-based access control
- `<Can permission="ride:create">` - Conditional component rendering
- Returns: `hasPermission(permission)`, `can(permission)`

#### `useDriverLocation()` - GPS tracking
- Watches driver's current position
- Auto-updates to `drivers.current_lat`, `drivers.current_lng`
- Handles permission requests

#### `useDriverTracking()` - Real-time available drivers map
- Subscribes to Realtime channel: `driver-locations`
- Filters: `status = 'available'` + valid coordinates
- Returns: List of `DriverLocation[]` for map display

#### `useIncomingRide()` - Real-time ride notifications
- Listens to `rides` table changes filtered by `driver_id`
- On new ride: triggers sound, browser notification, toast
- Manages notification permissions

#### `useMobile()` - Responsive design helper
- Detects mobile/tablet viewport
- Used to adapt UI layouts

---

## 2. DATABASE SCHEMA ARCHITECTURE

### 2.1 Core Database Types & Enums

```sql
-- Role enum (matches RBAC)
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Ride lifecycle
CREATE TYPE public.ride_status AS ENUM 
  ('pending', 'accepted', 'in_progress', 'completed', 'cancelled');

-- Shuttle booking state
CREATE TYPE public.booking_status AS ENUM 
  ('confirmed', 'cancelled', 'completed');

-- Driver online status (real-time)
CREATE TYPE public.driver_status AS ENUM 
  ('available', 'busy', 'offline');

-- Gender classification
CREATE TYPE public.gender_type AS ENUM ('male', 'female');

-- Wallet type (user vs driver wallet)
CREATE TYPE public.wallet_type AS ENUM ('user', 'driver');

-- Transaction operations
CREATE TYPE public.transaction_type AS ENUM 
  ('top_up', 'ride_payment', 'ride_earning', 'withdrawal', 'refund', 'admin_adjustment');

-- Transaction state
CREATE TYPE public.transaction_status AS ENUM 
  ('pending', 'completed', 'failed');

-- Driver registration state
CREATE TYPE public.registration_status AS ENUM 
  ('pending', 'approved', 'rejected');
```

### 2.2 Key Tables & Relationships

#### **Profiles Table** (`profiles`)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | Sequential ID |
| user_id | UUID UK | Unique reference to auth.users |
| full_name | TEXT | User's name |
| phone | TEXT | Contact number |
| avatar_url | TEXT | Profile picture URL |
| gender | gender_type | "male" \| "female" |
| created_at | TIMESTAMPTZ | Auto-insert |
| updated_at | TIMESTAMPTZ | Auto-update trigger |

**Auto-created on:** `auth.users` INSERT  
**RLS:** Users can only read/update own profile

---

#### **Drivers Table** (`drivers`)
| Column | Type | Key Notes |
|--------|------|-----------|
| id | UUID PK | Driver identifier |
| user_id | UUID FK | Reference to auth.users (nullable for test data) |
| full_name | TEXT | Driver name |
| phone | TEXT | Driver contact |
| license_number | TEXT | License ID |
| gender | gender_type | Classifications for ride preferences |
| status | driver_status | ENUM: available\|busy\|offline |
| current_lat | DOUBLE PRECISION | Last known latitude |
| current_lng | DOUBLE PRECISION | Last known longitude |
| current_vehicle_id | UUID FK | Currently active vehicle |
| avatar_url | TEXT | Driver profile photo |
| rating | NUMERIC(2,1) | Average rating (0.0-5.0) |
| is_verified | BOOLEAN | Document verification status |
| registration_status | registration_status | pending\|approved\|rejected |
| **Document Fields:** | | |
| ktp_number | TEXT | Indonesian ID number |
| ktp_url | TEXT | Document storage URL |
| sim_url | TEXT | Driver license photo |
| vehicle_stnk_url | TEXT | Vehicle registration photo |
| rejection_reason | TEXT | Why registration was rejected |
| **Profile Preferences:** | | |
| avatar_url | TEXT | Profile photo |
| pin_hash | TEXT | Encrypted PIN for security |
| prefers_bike | BOOLEAN | Service type preferences |
| prefers_bike_women | BOOLEAN | |
| prefers_car | BOOLEAN | |
| created_at | TIMESTAMPTZ | Record creation |
| updated_at | TIMESTAMPTZ | Last modification |

**RLS:** Everyone can view; admins can manage

---

#### **Vehicles Table** (`vehicles`)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | Vehicle ID |
| driver_id | UUID FK | CASCADE delete |
| plate_number | TEXT NK | Indonesia plate format |
| vehicle_type | TEXT | "bike" \| "car" |
| model | TEXT | e.g., "Honda CB150R" |
| color | TEXT | Vehicle color |
| capacity | INT | Passenger capacity (default 4) |
| year | INT | Manufacturing year |
| image_url | TEXT | Vehicle photo |
| is_verified | BOOLEAN | Verification by admin |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Relationship:** One driver → Many vehicles (1:N)

---

#### **User Roles Table** (`user_roles`)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK | auth.users |
| role | app_role | admin \| moderator \| user |
| created_at | TIMESTAMPTZ | |

**Unique:** (user_id, role)  
**RLS:** Users view own; admins manage all  
**Helper Function:** `has_role(user_id, role)` - SECURITY DEFINER for RLS checks

---

#### **Rides Table** (`rides`)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | Ride identifier |
| rider_id | UUID FK | User booking the ride |
| driver_id | UUID FK | Assigned driver (nullable = unassigned) |
| pickup_lat | DOUBLE PRECISION NK | Start location |
| pickup_lng | DOUBLE PRECISION | |
| pickup_address | TEXT | Human-readable address |
| dropoff_lat | DOUBLE PRECISION NK | End location |
| dropoff_lng | DOUBLE PRECISION | |
| dropoff_address | TEXT | |
| fare | NUMERIC(12,2) | Price in IDR |
| distance_km | NUMERIC(8,2) | Calculated distance |
| status | ride_status | pending → accepted → in_progress → completed \| cancelled |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**RLS:**
- Users see own rides
- Admins see all
- Users can create; admins can update

**Realtime:** Published for live tracking (`ALTER PUBLICATION supabase_realtime ADD TABLE rides`)

---

#### **Ride Ratings Table** (`ride_ratings`)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| ride_id | UUID FK | CASCADE delete |
| rider_id | UUID FK | Who rated (constraint for rider only) |
| driver_id | UUID FK | Who was rated |
| rating | INTEGER | 1-5 star rating |
| comment | TEXT | Optional review |
| created_at | TIMESTAMPTZ | |

**Unique:** (ride_id) - only one rating per ride  
**RLS:** Riders rate own rides; drivers view their ratings

**Trigger:** `update_driver_average_rating()` - averages all driver's ratings and updates `drivers.rating`

---

#### **Shuttle Routes Table** (`shuttle_routes`)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | Route identifier |
| name | TEXT NK | "Jakarta-Bogor Express" |
| origin | TEXT | Starting point |
| destination | TEXT | Ending point |
| base_fare | NUMERIC(12,2) | Base price per seat |
| distance_km | NUMERIC(8,2) | Route distance |
| active | BOOLEAN | Operating status |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

---

#### **Shuttle Schedules Table** (`shuttle_schedules`)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | Schedule instance |
| route_id | UUID FK | Which route |
| driver_id | UUID FK | Assigned driver |
| departure_time | TIMESTAMPTZ | Scheduled time |
| arrival_time | TIMESTAMPTZ | ETA |
| vehicle_id | UUID FK | Assigned vehicle |
| total_seats | INT | Capacity |
| available_seats | INT | Current open seats |
| active | BOOLEAN | Operating |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

---

#### **Shuttle Seats Table** (`shuttle_seats`) - Atomic Booking
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | Seat identifier |
| schedule_id | UUID FK | Which schedule |
| seat_number | TEXT | "1A", "2B", etc. |
| status | TEXT | available \| reserved \| booked |
| reserved_by_session | TEXT | Browser session for timeout |
| reserved_at | TIMESTAMPTZ | When reserved |
| created_at | TIMESTAMPTZ | |

**Realtime:** Published for live seat updates  
**Purpose:** Support reservation timeout and atomic bookings

---

#### **Shuttle Bookings Table** (`shuttle_bookings`)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | Booking ID |
| schedule_id | UUID FK | Which shuttle |
| user_id | UUID FK | Passenger (nullable for guests) |
| guest_name | TEXT | Name if not logged in |
| guest_phone | TEXT | Guest contact |
| seat_count | INT | Number of seats |
| booking_ref | TEXT UK | Confirmation reference |
| rayon_id | UUID FK | Pickup district |
| pickup_point_id | UUID FK | Specific location |
| status | booking_status | confirmed \| cancelled \| completed |
| total_fare | NUMERIC(12,2) | Total price |
| payment_method | TEXT | cash \| card \| wallet |
| payment_status | TEXT | pending \| completed \| failed |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

---

#### **Shuttle Booking Seats** (`shuttle_booking_seats`) - M:N mapping
| Column | Type | Notes |
|--------|------|-------|
| booking_id | UUID FK | Which booking |
| seat_id | UUID FK | Which seat |
| PRIMARY KEY | (booking_id, seat_id) | |

---

#### **Wallets Table** (`wallets`)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | Wallet ID |
| user_id | UUID UK FK | One wallet per user |
| balance | NUMERIC | Current balance (IDR) |
| wallet_type | wallet_type | user \| driver |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**RLS:** Users see own; admins see all; admins can update  
**Auto-created:** When user first tops up

---

#### **Wallet Transactions** (`wallet_transactions`)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | Transaction ID |
| wallet_id | UUID FK | CASCADE delete |
| type | transaction_type | top_up \| ride_payment \| ride_earning \| withdrawal \| refund \| admin_adjustment |
| amount | NUMERIC | Amount in IDR (can be negative) |
| balance_after | NUMERIC | Running balance |
| reference_id | TEXT | ride_id \| booking_id \| etc. |
| description | TEXT | Human description |
| status | transaction_status | pending \| completed \| failed |
| payment_gateway | TEXT | "midtrans" \| "xendit" \| etc. |
| gateway_transaction_id | TEXT | External txn ID |
| created_at | TIMESTAMPTZ | |

**Indexes:**
- wallet_id (FK lookups)
- status (filtering pending/completed)
- gateway_transaction_id (webhook reconciliation)

---

#### **Payment Settings** (`payment_settings`)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| gateway | TEXT NK | "midtrans" \| "xendit" |
| is_active | BOOLEAN | Whether to accept payments |
| is_default | BOOLEAN | Primary gateway |
| commission_rate | NUMERIC | Fee % (0.1 = 10%) |
| config | JSONB | Gateway-specific config |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**RLS:** Public read; admins manage

---

#### **Payment Gateway Configs** (`payment_gateway_configs`) - Secure
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| gateway | TEXT | "midtrans" \| "xendit" |
| environment | TEXT NK | "sandbox" \| "production" |
| client_key | TEXT | Client-side key |
| server_key_encrypted | TEXT | Encrypted server key (stored only for ref) |
| is_active | BOOLEAN | Live or not |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Unique:** (gateway, environment)  
**RLS:** Admins only  
**Security:** Server keys handled by Edge Functions, never stored plain

---

#### **Driver Settings** (`driver_settings`)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| driver_id | UUID UK FK | One settings record per driver |
| working_hours_enabled | BOOLEAN | Use time restrictions |
| working_hours_start | TIME | "08:00" |
| working_hours_end | TIME | "20:00" |
| available_monday-sunday | BOOLEAN[] | Day availability |
| service_area_radius_km | NUMERIC | Max distance from home |
| auto_accept_rides | BOOLEAN | Accept without confirmation |
| auto_accept_timeout_seconds | INT | Time before auto-reject |
| preferred_payment_method | TEXT | cash \| card \| wallet |
| emergency_contact_name | TEXT | ICE |
| emergency_contact_phone | TEXT | |
| emergency_contact_relationship | TEXT | "sibling" \| "spouse" \| etc. |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

---

#### **OTP Verifications** (`otp_verifications`)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK | CASCADE |
| type | TEXT | "email" \| "phone" |
| target | TEXT | Email or phone number |
| code | TEXT | OTP code |
| expires_at | TIMESTAMPTZ | Expiry timing |
| created_at | TIMESTAMPTZ | |
| verified_at | TIMESTAMPTZ | When verified (null = pending) |

**RLS:** Users manage own OTPs

---

#### **App Settings** (`app_settings`) - Configuration
| Column | Type | Notes |
|--------|------|-------|
| key | TEXT PK NK | "ride_fares" \| "service_zones" |
| value | JSONB | Config data |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Example Values:**
```json
// ride_fares
{
  "bike": { "base_fare": 5000, "per_km": 2500, "min_fare": 8000, "surge_multiplier": 1.0 },
  "bike_women": { "base_fare": 5000, "per_km": 2500, "min_fare": 8000, "surge_multiplier": 1.0 },
  "car": { "base_fare": 10000, "per_km": 4000, "min_fare": 15000, "surge_multiplier": 1.0 }
}

// service_zones
[
  { "name": "Jakarta Pusat", "lat": -6.2088, "lng": 106.8456, "radius_km": 25 },
  { "name": "Bogor", "lat": -6.5971, "lng": 106.8060, "radius_km": 30 }
]
```

---

### 2.3 Audit & Versioning Tables

#### **Payment Config Audit Logs** (`payment_config_audit_logs`)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| gateway | TEXT | Which gateway was changed |
| environment | TEXT | sandbox \| production |
| action | TEXT | update \| toggle_active \| toggle_environment |
| changed_by | UUID FK | Which admin |
| old_values | JSONB | Before state |
| new_values | JSONB | After state |
| created_at | TIMESTAMPTZ | |

---

### 2.4 Storage Buckets (Supabase Storage)

#### **avatars/** - Driver/User Profile Photos
- Public access for image display
- Owner can upload/update own avatar
- Path: `avatars/{user_id}/profile.jpg`

#### **documents/** - Private Driver Documents
- Private bucket (not publicly accessible)
- Documents: KTP, SIM, STNK, Insurance
- Path: `documents/{driver_id}/{doc_type}.jpg`
- Owner can upload own documents
- Admins can view all documents

---

### 2.5 Core Views & Computed Fields

#### **Driver Performance Materialized View** (Optional, future)
For analytics dashboard:
- Drivers with: total_rides, avg_rating, total_earnings, this_month_earnings

#### **Monthly Revenue** (Optional, future)
- By driver: earnings - commission
- By service type: rides, shuttles

---

### 2.6 Row Level Security (RLS) Summary

| Table | Select | Insert | Update | Delete |
|-------|--------|--------|--------|--------|
| profiles | Everyone | Own only | Own only | - |
| drivers | Everyone | Admins | Admins | - |
| vehicles | Everyone | Admins | Admins | - |
| user_roles | Own + Admins | Admins | Admins | Admins |
| rides | Own + Admins | Own only | Admins | - |
| ride_ratings | Own + Driver's | Own only | Own only | - |
| wallets | Own + Admins | Own on insert | Admins | - |
| wallet_transactions | Own + Admins | System only | - | - |
| shuttle_* | Everyone | Admins | Admins | - |
| payment_settings | Everyone | Admins | Admins | - |
| payment_gateway_configs | - | - | Admins | - |
| driver_settings | Own + Admins | - | Own + Admins | - |

---

## 3. BACKEND LOGIC & EDGE FUNCTIONS

### 3.1 Edge Functions Overview

Located in `supabase/functions/`:

| Function | Purpose | Trigger |
|----------|---------|---------|
| **calculate-fare** | Compute ride cost based on distance, surge, service type | Ride creation, estimate request |
| **complete-ride** | Mark ride done, update balances, create payment | Driver action |
| **create-shuttle-payment** | Process shuttle booking payment | Booking confirmation |
| **create-topup** | Initialize wallet top-up transaction | User action |
| **dispatch-driver** | Assign driver to ride (auto or manual) | Ride in pending status |
| **manage-gateway-keys** | Update payment gateway secrets (admin) | Admin console |
| **payment-webhook** | Handle gateway callbacks (Midtrans, Xendit) | Payment gateway |
| **process-ride-payment** | Debit rider, credit driver wallet | Ride completion |
| **withdraw-earnings** | Process driver cash withdrawal | Driver request |
| **withdraw-to-bank** | Transfer to driver's bank account | After withdrawal approval |

---

### 3.2 Key Business Logic Functions (PL/pgSQL)

#### **Atomic Seat Reservation** - `reserve_shuttle_seats()`
```sql
Purpose: Prevent double-booking in concurrent scenarios
Inputs:
  - schedule_id (UUID)
  - seat_numbers (TEXT[])
  - session_id (TEXT) - Browser session identifier
Logic:
  1. Lock rows: SELECT ... FOR UPDATE
  2. Check if any seats NOT available
  3. Update seats status to 'reserved' with session ID
  4. Return TRUE if success
Concurrency: Row-level locks ensure atomicity
```

#### **Atomic Booking Creation** - `create_shuttle_booking_atomic()`
```sql
Purpose: Create booking with seat mapping in single transaction
Inputs:
  - schedule_id, user_id, guest details
  - seat_numbers, fare, payment details
  - rayon_id, pickup_point_id, booking_ref
Logic:
  1. Create booking record → returns booking_id
  2. For each seat: UPDATE to 'booked', CREATE seat mapping
  3. Decrement schedule.available_seats
  4. Return booking_id (all or nothing)
Failure: Rollback entire transaction
```

#### **Driver Rating Update** - `update_driver_average_rating()`
```sql
Trigger: AFTER INSERT on ride_ratings
Logic:
  1. Calculate AVG(rating) for driver_id
  2. ROUND to 1 decimal place
  3. Update drivers.rating
Used by: Ride rating form submission
```

#### **Wallet Transaction Processing** - `process_wallet_transaction()`
```sql
Purpose: Ensure balance consistency during transfers
Inputs:
  - wallet_id, transaction_type, amount
  - description, reference_id (uuid or "ride-123")
  - payment_gateway, gateway_transaction_id
  - status
Logic:
  1. Lock wallet: SELECT balance FOR UPDATE
  2. Calculate new_balance = current + amount
  3. Validate minimum balance (for payments)
  4. CREATE wallet_transactions record
  5. UPDATE wallet.balance
  6. RETURN transaction_id
Failure: RAISE EXCEPTION, automatic rollback
```

#### **User Profile Auto-Creation** - `handle_new_user()`
```sql
Trigger: AFTER INSERT on auth.users (Supabase managed)
Logic:
  1. Extract full_name from raw_user_meta_data
  2. INSERT into profiles (user_id, full_name)
Auto-runs: Every new signup
```

---

### 3.3 Services Layer (TypeScript)

#### **DriverProfileService** - Business logic for driver management
Located: `src/services/DriverProfileService.ts`

**Key Methods:**
```typescript
getDriverComplete(userId: string)
  → { profile, settings, vehicles, documents }
  → Auto-initialize settings if not exist

updateBasicInfo(driverId, data: Partial<DriverProfile>)
  → Validates: license format, SIM expiry > now(), age >= 18

updateSettings(driverId, data: Partial<DriverSettings>)
  → Validates: working_hours_end > start, radius > 0

uploadDocument(driverId, docType, file)
  → Save to storage.objects (documents bucket)
  → Create driver_documents record with status='pending'

approveDriver(driverId)
  → Set registration_status = 'approved', is_verified = true

rejectDriver(driverId, reason)
  → Set registration_status = 'rejected'
  → Store rejection_reason for driver feedback
```

#### **UserProfileService** - User management
```typescript
getCompleteProfile(userId)
  → { profile, wallet, settings }

updateProfile(userId, data)
  → Validates phone, email formats

topupWallet(userId, amount, gateway)
  → Create pending transaction
  → Initialize payment gateway call
```

---

### 3.4 Repositories (Data Access)

#### **DriverProfileRepository** - Data layer
Located: `src/repositories/DriverProfileRepository.ts`

**Methods:**
```typescript
// Read
getProfileByUserId(userId)     → DriverProfile | null
getSettings(driverId)          → DriverSettings | null
getVehicles(driverId)          → Vehicle[]
getDocuments(driverId)         → DriverDocument[]

// Write
updateProfile(driverId, data)  → Promise<DriverProfile>
updateSettings(driverId, data) → Promise<DriverSettings>
initializeSettings(driverId)   → Creates default settings
createVehicle(driverId, data)  → Promise<Vehicle>
updateVehicle(vehicleId, data) → Promise<Vehicle>
deleteVehicle(vehicleId)       → void

// Document upload/verification
uploadDocument(driverId, type, url)
verifyDocument(driverId, type) → { status, verified_at }
```

---

### 3.5 API Integration Points

#### **Payment Gateways Supported**
- **Midtrans (PT Midtrans Teknologi Indonesia)**
  - Snap (checkout page)
  - Core API (custom flow)
  - Webhook reconciliation

- **Xendit**
  - Invoice API
  - Virtual account transfers
  - Webhook reconciliation

#### **Configuration Storage**
- `payment_gateway_configs` - Store API keys (encrypted)
- `payment_settings` - Active gateway, commission rate
- Edge Functions handle secret decryption

#### **Payment Webhook Flow**
```
Payment Gateway (Midtrans/Xendit)
    ↓ (HTTPS POST to /webhook)
Edge Function: payment-webhook
    ↓ (Validate signature)
    ↓ (Look up transaction by gateway_transaction_id)
wallet_transactions table
    ↓
UPDATE transactions SET status='completed', balance_after=X
    ↓
Trigger: notify client (Realtime if needed)
```

---

## 4. DRIVER FEATURES - CURRENT STATE

### 4.1 Driver Authentication & Onboarding

✅ **Implemented:**
- OTP-based sign up (`/driver/auth`)
- Phone number verification
- Role assignment (`moderator` role)
- Auto-profile creation on signup

⚙️ **Workflow:**
1. Driver enters phone → OTP sent
2. Enters OTP → Account created in `auth.users`
3. `handle_new_user()` trigger creates `profiles` record
4. Admin must set `user_roles` record (moderator)
5. Driver can then upload documents

---

### 4.2 Driver Profile Management

✅ **Implemented (`/driver/profile`):**
- **Basic Info Tab:** Name, phone, gender, license number, DOB, address
- **Vehicles Tab:** Add/edit vehicles (plate, type, model, capacity, color, year, photo)
- **Document Verification Tab:**
  - KTP (Indonesian ID) upload
  - SIM (Driver license) with expiry tracking
  - STNK (Vehicle registration) upload
  - Document status: pending → verified \| rejected
  - Rejection reasons displayed
  - Auto-validate: expiry dates must be future
- **Security Settings Tab:** PIN/password management
- **Service Settings Tab:**
  - Working hours enable/disable
  - Daily availability (Mon-Sun toggle)
  - Service radius in km
  - Auto-accept rides + timeout
  - Preferred payment method (cash/card/wallet)
  - Emergency contact details
- **Profile Photo:** Avatar upload & crop

**Storage Integration:**
- Avatars stored in public `avatars/` bucket
- Documents stored in private `documents/` bucket
- URLs saved in driver record

---

### 4.3 Vehicle Management

✅ **Implemented:**
- Add multiple vehicles per driver
- Link to current active vehicle
- Vehicle verification by admin
- Vehicle capacity for matching rides

**Uses:**
- Ride dispatch considers vehicle capacity
- Driver can switch active vehicle (updates `current_vehicle_id`)
- Shuttle assignment uses vehicle info

---

### 4.4 Real-Time Driver Dashboard

✅ **Implemented (`/driver`):**
- **Status Toggle:** Online/Offline switch
  - Updates `drivers.status` to "available" / "offline"
  - Realtime publication triggers client updates

- **Current Ride Display:**
  - Live map showing pickup → dropoff route
  - Leaflet map with driver location marker
  - Pickup/dropoff addresses
  - Passenger name (if available)

- **Statistics Cards:**
  - Today's earnings (sum of completed rides)
  - Rating (avg from `ride_ratings`)
  - Active vehicle display
  - Total rides (this period)

- **Vehicle Selector:** Switch active vehicle on-the-fly

- **Location Tracking:** 
  - GPS watch active when `isOnline = true`
  - Updates `drivers.current_lat/lng` every location change
  - Realtime broadcasts to other clients (map updates)

---

### 4.5 Real-Time Ride Management

✅ **Implemented (`/driver/ride`):**
- **Incoming Ride Notifications:**
  - Real-time Realtime subscription: `rides` table for `driver_id = ?`
  - Browser notification + in-app toast + audio alert on new ride
  - Shows pickup address, passenger name

- **Active Ride Display:**
  - Map with live route (pickup → dropoff)
  - Estimated time of arrival (ETA)
  - Distance remaining
  - Passenger contact details
  - Buttons: Accept → Start → Complete

- **Ride Acceptance:**
  - Auto-assigned or driver accepts
  - Updates `rides.status` to "accepted"

- **In Progress:**
  - Updates to "in_progress"
  - Continuous location sharing to rider

- **Completion:**
  - Driver marks complete
  - Triggers `complete-ride` edge function
  - Calculates payment, updates wallets
  - Rider can rate driver (creates `ride_ratings` record)

**Real-Time Subscriptions:**
```typescript
// useIncomingRide hook
supabase.channel(`driver-rides-${driverId}`)
  .on('postgres_changes', 
    { event: 'UPDATE', table: 'rides', filter: `driver_id=eq.${driverId}` },
    handleRideUpdate
  )
  .subscribe()
```

---

### 4.6 Shuttle Operations

✅ **Implemented (`/driver/shuttle`):**
- View assigned shuttle schedules
- Display route (origin → destination)
- Departure/arrival times
- Seat availability
- Passenger manifest

**Data Model:**
- Shuttle schedule with vehicle + driver
- Seats in `shuttle_seats` (status: booked/reserved/available)
- Passenger list from `shuttle_bookings`

---

### 4.7 Earnings & Wallet

✅ **Implemented:**

**Earnings Tab (`/driver/earnings`):**
- Daily earnings breakdown
- Weekly summary
- Monthly total
- By service type (bike vs car)
- Filtering by date range
- CSV export (optional)

**Wallet Tab (`/driver/wallet`):**
- Current balance display
- Recent transactions list
  - Type: ride_earning, withdrawal, refund
  - Amount, status, date
- Withdrawal request form
  - Minimum amount default (1000000 IDR = $60 USD approx)
  - Bank account details form
  - Submit for admin approval
- Top-up option (not typical for drivers, but available)

**Transactions Flow:**
```
Ride Completed
  ↓
complete-ride edge function
  ↓
process_wallet_transaction(driver_wallet, 'ride_earning', amount)
  ↓
INSERT wallet_transactions (type='ride_earning', reference_id=ride_id)
  ↓
UPDATE drivers.rating (from ride_ratings if any)
```

---

### 4.8 History & Analytics

✅ **Implemented (`/driver/history`):**
- List of completed rides
- Columns: Date, Passenger, Route, Duration, Fare, Rating
- Sortable & filterable
- Search by passenger name or route
- Date range picker

---

## 5. ADMIN FEATURES - CURRENT STATE

### 5.1 Admin Dashboard Overview

✅ **Implemented (`/admin`):**
- **Overview/Analytics:**
  - Total active drivers
  - Today's revenue
  - Active rides in progress
  - Pending driver registrations (notification badge)
  - Recent transactions

- **Quick Stats:**
  - Rides completed today
  - Average ride rating
  - Total users
  - Wallet top-ups today

- **Status Indicators:**
  - Online drivers count
  - Rides in queue
  - Pending shuttles

---

### 5.2 Driver Management

✅ **Implemented (`/admin/drivers`):**

**Driver List View:**
- Paginated list (12 per page, customizable)
- Columns:
  - Name, Phone
  - Avatar
  - Status (available/busy/offline) with badge color
  - Rating (⭐ stars)
  - Registration Status (Menunggu/Disetujui/Ditolak)
  - Verification Status (checkmark icon)
  - Vehicle (attached vehicles list)
  - Created date

**Driver Verification Workflow:**
- Filter: pending registrations
- Click driver row → Opens details modal
- View uploaded documents:
  - KTP photo
  - SIM photo
  - Vehicle STNK photo
  - Rejection reason (if any)
- Actions:
  - ✅ Approve → `registration_status='approved'`, `is_verified=true`
  - ❌ Reject → Dialog for reason input → `registration_status='rejected'`, save reason
  - 👁️ View details → Full profile modal with all fields
  - 📄 View documents → Document viewer

**Quick Actions:**
- Toggle driver status (online/offline)
- View earnings summary
- Message driver (future)
- Suspend/activate account

---

### 5.3 Ride Management

✅ **Implemented (`/admin/rides`):**

**Ride Monitoring:**
- All rides list, paginated
- Columns: ID, Rider, Driver, Pickup, Dropoff, Status, Fare, Distance, Created Date
- Status badges: pending (amber), accepted (blue), in_progress (green), completed (emerald), cancelled (red)
- Sortable: by date, fare, distance, status
- Filterable: by status, date range, driver, service type

**Ride Operations:**
- Click ride → Details modal
  - Full route (map + coordinates)
  - Rider info + contact
  - Driver info + vehicle
  - Fare breakdown (base + per-km + surge)
  - Timeline (created → accepted → started → completed)
  - Payment status (pending/completed/failed)
- Actions:
  - Force completion (for stuck rides)
  - Refund rider
  - View rider profile
  - View driver profile

---

### 5.4 Shuttle Operations

✅ **Implemented (`/admin/shuttles`):**

**Shuttle Management:**
- Route list: name, origin, destination, distance, base fare, status
- Actions: Edit route, view schedules, deactivate

**Schedule Management:**
- Create new schedule (route + date + time + vehicle + driver)
- Edit schedule (departure, arrival, vehicle, driver)
- View seat bookings
- Seat status overview (booked/reserved/available)
- Manual seat assignment (drag-n-drop optional)

**Booking Management:**
- List bookings for each schedule
- Passenger name, seats, fare, payment status
- Refund booking
- Manual check-in

---

### 5.5 Hotel Management

✅ **Implemented (`/admin/hotels`):**
- Partner hotel list
- Commission rate
- Active status
- Create/edit partner
- View bookings (if applicable)

---

### 5.6 User Management

✅ **Implemented (`/admin/users`):**
- User list paginated
- Columns: Name, Email, Phone, Created Date, Status
- Search by name/email/phone
- Actions:
  - View profile
  - View wallet balance
  - View transaction history
  - Deactivate account
  - Admin note

---

### 5.7 Payment Management

✅ **Implemented (`/admin/payments`):**

**Payment Gateway Configuration:**
- Table of configured gateways (Midtrans, Xendit)
- Columns: Gateway, Environment (sandbox/production), Active Status, Last Updated
- Actions:
  - Edit config (client key, server key via modal with encryption)
  - Toggle active
  - Test connection (make test transaction)
  - View audit log (change history)

**Transaction Reconciliation:**
- List all transactions (top-ups, ride payments, withdrawals)
- Columns: ID, User, Type, Amount, Status, Gateway, Created Date
- Filters: Status (pending/completed/failed), gateway, date range
- Search: by transaction ID or user
- Actions:
  - Mark as completed (manual reconciliation)
  - Refund transaction
  - View gateway response (JSON)

---

### 5.8 Withdrawal Requests

✅ **Implemented (`/admin/withdrawals`):**
- List pending driver withdrawals
- Columns: Driver, Amount, Bank, Account, Requested Date
- Status: pending, approved, processing, completed, rejected
- Actions:
  - View bank details
  - Approve (triggers `withdraw-to-bank` function)
  - Reject (with reason)
  - Mark processed
  - Download receipt

---

### 5.9 Admin Settings

✅ **Implemented (`/admin/settings`):**

**Configuration Sections:**
- **Ride Pricing:** 
  - Base fare, per-km rate, min fare for each service type
  - Surge multiplier zones
  - Edit in JSON or form

- **Payment Settings:**
  - Commission rate (% deducted from rides)
  - Default payment method
  - Wallet minimum balance rules

- **Service Zones:**
  - Define operational areas (latitude/longitude/radius)
  - Service zone names
  - Blacklist areas

- **Notification Settings:**
  - Email notifications for pending registrations
  - Alert thresholds
  - SMS notifications enabled/disabled

- **System Health:**
  - API uptime indicator
  - Recent errors
  - Database status

---

## 6. IDENTIFIED GAPS & MISSING FEATURES

### 6.1 Frontend Gaps

**Admin Dashboard:**
- ❌ Real-time ride map view (where all online drivers are)
- ❌ Heatmap of demand hotspots
- ❌ Driver performance insights (earnings trend, acceptance rate, cancellation rate)
- ❌ Customer support ticket system in admin panel
- ❌ Bulk driver import (CSV upload)
- ❌ Driver batch operations (disable multiple, update commissions)
- ❌ Advanced filtering & saved filters

**Driver Features:**
- ❌ Driver stats dashboard (acceptance rate, cancellation rate, avg wait time)
- ❌ Weekly/monthly earnings reports (PDF export)
- ❌ Preferred passenger types (corporate, regular, VIP)
- ❌ Preferred pickup/dropoff zones
- ❌ Driver training module or certification program
- ❌ In-app support chat
- ❌ Damage/incident reporting system
- ❌ Break/pause mode (don't show new rides for X minutes)

**User Features:**
- ❌ Scheduled ride booking (future reservations)
- ❌ Ride preferences (petfriendly, quietcar, shorter route)
- ❌ Favorite drivers list
- ❌ Tip option at ride completion
- ❌ Package delivery add-on
- ❌ Group invite for shared rides

---

### 6.2 Database Schema Gaps

- ❌ Multi-language support table (not just i18next)
- ❌ Promotion/coupon codes table
- ❌ Driver documents table (currently just URLs in drivers table)
- ❌ Claim/dispute resolution table for ride issues
- ❌ Driver quality metrics table (on-time %, cancellation rate, etc.)
- ❌ Push notification token storage (for mobile apps)
- ❌ Audit log for user actions (separate from driver-specific logs)
- ❌ Blacklist/blocklist (drivers blocking passengers, passengers blocking drivers)

---

### 6.3 Backend/Business Logic Gaps

- ❌ Driver suspension logic (automatically if rating < 3.0)
- ❌ Dynamic surge pricing based on demand/time
- ❌ Automatic ride assignment algorithm (smart matching)
- ❌ Ride pooling / shared ride matching
- ❌ Estimated arrival time (ETA) calculation edge function
- ❌ Ride cancellation penalty system
- ❌ Auto-refund on driver cancellation
- ❌ Driver geo-fence check (are they in service zone?)
- ❌ Anti-fraud detection (suspicious transactions)
- ❌ Scheduled job for:
  - Auto-mark stale rides as completed
  - Clean up old reservations
  - Generate driver monthly reports
  - Calculate commission payouts

---

### 6.4 Operational Gaps

- ❌ Customer support queue / ticketing system
- ❌ SMS notification sending (currently just browser notifications)
- ❌ Email notification system (registration approval, withdrawal success, etc.)
- ❌ Analytics dashboard (Metabase/Superset integration)
- ❌ CSV export for accounting (rides, withdrawn amounts)
- ❌ Bulk SMS sending to drivers (campaigns)
- ❌ Rate limiting / abuse prevention
- ❌ API rate limiting for external integrations
- ❌ Webhook retry logic (currently assuming single attempt)

---

### 6.5 Security/Compliance Gaps

- ❌ Bank account verification (micro-deposits)
- ❌ KYC (Know Your Customer) verification
- ❌ Background check API integration
- ❌ Document expiry alerts (SIM, KTP)
- ❌ Data retention policy (GDPR)
- ❌ Audit trail for sensitive operations
- ❌ Rate limiting on OTP requests
- ❌ Suspicious location detection
- ❌ IP address whitelisting for admin APIs

---

## 7. DATA FLOW DIAGRAMS

### 7.1 User Ride Booking Flow
```
┌─────────────────────────────────────────────────────────────────────┐
│                       USER RIDE BOOKING FLOW                        │
└─────────────────────────────────────────────────────────────────────┘

USER INTERFACE (React)
    ↓
    │ 1. Select pickup/dropoff on map
    │    → rideStore.setPickup()
    │    → rideStore.setDropoff()
    ↓
    │ 2. Select service type (bike/car)
    │    → rideStore.setServiceType()
    ↓
    │ 3. Request fare calculation
    │    → Call Edge Function: calculate-fare
    │       Input: pickup_lat/lng, dropoff_lat/lng, service_type
    │       Output: fare_amount, distance_km, duration
    │    → rideStore.setFare()
    ↓
    │ 4. Confirm ride
    │    → INSERT INTO rides (rider_id, pickup_lat, ..., status='pending')
    │    → rideStore.setRideStatus('searching')
    │    → Setup realtime subscription to rides table
    ↓
    │ 5. Waiting for driver assignment
    │    → Call Edge Function: dispatch-driver
    │       Algorithm: Find available drivers near pickup, sort by distance/rating
    │       UPDATE rides SET driver_id = <selected_driver_id>, status='pending'
    │       Notify driver via Realtime
    ↓
    │ 6. Driver acceptance
    │    → Driver uses useIncomingRide hook, accepts ride
    │    → UPDATE rides SET status='accepted'
    │    → User realtime listener notifies: "Driver accepted"
    │    → Show driver location on map (useDriverTracking)
    ↓
    │ 7. Driver en route
    │    → Driver's useDriverLocation sends location updates
    │    → updates drivers.current_lat/lng → Realtime broadcast
    │    → User sees driver approaching in real-time
    ↓
    │ 8. Pickup
    │    → Driver marks "Arrived"
    │    → Status changes to 'in_progress'
    │    → Passenger gets in vehicle
    ↓
    │ 9. In transit
    │    → Location updates continue
    │    → Maps show live progress
    ↓
    │ 10. Dropoff
    │    → Driver marks "Arrived at destination"
    │    → Passenger confirms exit
    │    → UPDATE rides SET status='completed'
    ↓
    │ 11. Payment & Rating
    │    → Call Edge Function: process-ride-payment
    │       Debit rider wallet: amount, type='ride_payment', desc="Ride #123"
    │       Credit driver wallet: amount, type='ride_earning', desc="Ride #123"
    │       update_wallet_transaction() locks wallets, updates balances atomically
    │    → Rider can rate driver (INSERT ride_ratings)
    │    → Trigger: update_driver_average_rating() updates drivers.rating
    ↓
    │ 12. Receipt
    │    → Show fare breakdown, payment confirmation, rating form
    ↓
    END
```

---

### 7.2 Driver Registration & Verification Flow
```
┌──────────────────────────────────────────────────────────────────────┐
│            DRIVER REGISTRATION & ADMIN VERIFICATION FLOW             │
└──────────────────────────────────────────────────────────────────────┘

DRIVER SIGNUP
    ↓
    │ 1. Enter phone number on /driver/auth
    │    → Edge function sends OTP to phone
    │    → OTP stored in otp_verifications table with 5min expiry
    ↓
    │ 2. Verify OTP
    │    → Check otp_verifications.code matches & !expired
    │    → Create auth.users account
    │    → Trigger: handle_new_user() creates profiles record
    │    → Admin must set user_roles (moderator)
    ↓
    │ 3. Complete Profile (/driver/profile)
    │    → Fill basic info: name, license #, DOB, gender, address
    │    → SELECT users.id FROM auth.users WHERE phone='...' to get user_id
    │    → INSERT/UPDATE drivers record
    │    → vehicle info added: INSERT vehicles
    ↓
    │ 4. Upload Documents
    │    → KTP (Indonesian ID card)
    │       Upload to storage.objects bucket='documents'
    │       Path: documents/{driver_id}/ktp.jpg
    │       Update drivers.ktp_url, drivers.ktp_number
    │    → SIM (Driver license)
    │       Upload to storage
    │       Update drivers.sim_url
    │       Validate expiry_date > now()
    │    → STNK (Vehicle registration)
    │       Upload to storage
    │       Update drivers.vehicle_stnk_url
    │    → Set registration_status='pending' (awaiting admin review)
    ↓
    ADMIN REVIEW
    ↓
    │ 5. Admin views pending drivers (/admin/drivers)
    │    → Query: SELECT * FROM drivers WHERE registration_status='pending'
    │    → Click driver → View documents (fetch from storage)
    │    → Verify documents visually
    ↓
    │ 6a. APPROVE Driver
    │    → UPDATE drivers SET registration_status='approved', is_verified=true
    │    → Notification sent to driver (email/SMS)
    │    → Driver NOW appears in dispatch-driver algorithm
    │    → vehicles marked as is_verified=true
    ↓
    │ 6b. REJECT Driver
    │    → Modal asks for rejection reason
    │    → UPDATE drivers SET registration_status='rejected', rejection_reason='...'
    │    → Driver notified, told to resubmit documents
    │    → Can reupload and resubmit
    ↓
    │ 7. Driver Goes Live
    │    → Toggle "Go Online" on /driver dashboard
    │    → UPDATE drivers SET status='available'
    │    → Location tracking enabled: useDriverLocation
    │    → Appears in available drivers map: useDriverTracking
    │    → Realtime: drivers table published → all clients see online drivers
    ↓
    END
```

---

### 7.3 Shuttle Booking & Seat Reservation Flow
```
┌──────────────────────────────────────────────────────────────────────┐
│              SHUTTLE BOOKING WITH ATOMIC SEAT LOCKING                │
└──────────────────────────────────────────────────────────────────────┘

PASSENGER BROWSE & SELECT
    ↓
    │ 1. View shuttle routes
    │    → SELECT route_id, name, origin, destination, base_fare FROM shuttle_routes
    ↓
    │ 2. View schedules for route
    │    → SELECT * FROM shuttle_schedules
    │       WHERE route_id=? AND departure > now() AND active=true
    │    → Show: departure, available_seats, fare
    ↓
    │ 3. Select date & time
    │    → Pick a schedule_id
    │    → View seat map: SELECT seat_number, status FROM shuttle_seats
    │       WHERE schedule_id = ? ORDER BY seat_number
    │    → Display: green=available, yellow=reserved, gray=booked
    ↓
    SEAT LOCKING (Race Condition Prevention)
    ↓
    │ 4. Passenger selects seats (e.g., "1A", "1B")
    │    → Frontend generates session_id (UUID)
    │    → Browser stores in sessionStorage
    │    → Call: reserve_shuttle_seats(schedule_id, ["1A", "1B"], session_id)
    │    → Function logic:
    │       SELECT ... FROM shuttle_seats
    │         WHERE schedule_id = ? AND seat_number = ANY([...])
    │         FOR UPDATE (row-level lock)
    │       IF any seat status != 'available' → RETURN FALSE
    │       UPDATE shuttle_seats SET status='reserved', reserved_by_session=session_id
    │       RETURN TRUE
    │    → If FALSE: show "Seats taken, please refresh"
    │    → If TRUE: session_id + seat data stored in frontend state
    ↓
    │ 5. Passenger enters details (name, phone, pickup area)
    │    → Select rayon_id (district), pickup_point_id (specific location)
    ↓
    │ 6. Enter payment method (cash/card/wallet)
    │    → If cash: Skip payment, go to checkout
    │    → If card: Initialize payment gateway
    │    → If wallet: Check balance >= total_fare
    ↓
    │ 7. Review & Confirm Booking
    │    → Show: schedule, seats, total_fare, payment method
    │    → Passenger confirms
    ↓
    CREATE BOOKING (Atomic Transaction)
    ↓
    │ 8. Create booking
    │    → Generate booking_ref = "PYUGO-" + timestamp + random
    │    → Call: create_shuttle_booking_atomic(
    │       schedule_id, user_id, guest_name, guest_phone,
    │       seat_numbers, total_fare, payment_method, payment_status,
    │       rayon_id, pickup_point_id, booking_ref
    │    )
    │    → Function logic (ALL OR NOTHING):
    │       1. INSERT shuttle_bookings → returns booking_id
    │       2. FOR each seat:
    │          SELECT seat WHERE schedule_id & seat_number FOR UPDATE
    │          UPDATE seat SET status='booked', reserved_at=NULL
    │          INSERT shuttle_booking_seats (booking_id, seat_id)
    │       3. UPDATE shuttle_schedules SET available_seats -= count(seats)
    │       4. RETURN booking_id
    │    → On failure: ROLLBACK (seats unchanged, booking not created)
    │    → On success:
    │       - Booking created with status='confirmed'
    │       - Seats locked to passenger
    │       - available_seats decremented
    │       - Realtime broadcast updates seat map on all clients
    ↓
    │ 9. Process Payment
    │    → If payment_method='cash': payment_status='pending' (verify on vehicle)
    │    → If payment_method='card':
    │       Call Edge Function: create-shuttle-payment
    │       → Initialize Midtrans/Xendit checkout
    │       → Return payment URL or token
    │       → Passenger completes payment
    │       → Webhook: payment-webhook marks transaction='completed'
    │       → UPDATE shuttle_bookings SET payment_status='completed'
    │    → If payment_method='wallet':
    │       Direct: process_wallet_transaction(wallet_id, 'ride_payment', -amount)
    │       → Update balances
    │       → payment_status='completed'
    ↓
    │ 10. Confirmation
    │    → Show booking reference: PYUGO-XXXXXX
    │    → Show e-ticket with QR code (booking_ref)
    │    → Pickup location & time
    │    → Driver details
    │    → Email receipt sent to passenger
    ↓
    SHUTTLE OPERATIONS
    ↓
    │ 11. Driver receives assignment
    │    → Shuttle schedule.driver_id set (by admin or auto)
    │    → Driver accepts on /driver/shuttle
    │    → Updates status to 'in_progress'
    ↓
    │ 12. Pickup & Dropoff
    │    → Driver checks in passengers using booking_ref or QR scan
    │    → UPDATE shuttle_bookings SET status='completed'
    │    → If cash: collect payment at pickup
    │    → Monitor remaining seats in realtime
    ↓
    │ 13. Completion
    │    → Driver marks schedule as completed
    │    → Generate receipt for each passenger (auto-email if email provided)
    ↓
    END
```

---

### 7.4 Driver Earnings & Withdrawal Flow
```
┌──────────────────────────────────────────────────────────────────────┐
│              DRIVER EARNINGS ACCUMULATION & WITHDRAWAL                │
└──────────────────────────────────────────────────────────────────────┘

RIDE COMPLETION TO EARNING
    ↓
    │ 1. Ride marked complete by driver
    │    → UPDATE rides SET status='completed'
    │    → Edge Function: process-ride-payment triggered
    ↓
    │ 2. Payment calculation (process-ride-payment edge function)
    │    → fare_amount = get from rides.fare (already calculated)
    │    → commission = fare_amount * payment_settings.commission_rate
    │    → driver_earning = fare_amount - commission
    │    → Calculate:
    │       wallet_transactions:
    │         Rider side:
    │           INSERT (wallet_id=rider_wallet, type='ride_payment',
    │                   amount=-fare_amount, reference_id=ride_id)
    │           UPDATE wallets SET balance -= fare_amount
    │         Driver side:
    │           INSERT (wallet_id=driver_wallet, type='ride_earning',
    │                   amount=+driver_earning, reference_id=ride_id)
    │           UPDATE wallets SET balance += driver_earning
    │       Both use: process_wallet_transaction() for atomic updates
    ↓
    │ 3. Earnings accumulate in driver wallet
    │    → wallets.balance for driver_id continuously increases
    │    → Each transaction logged in wallet_transactions
    ↓
    DRIVER VIEWS EARNINGS
    ↓
    │ 4. Driver checks /driver/earnings
    │    → Query: SELECT SUM(amount) FROM wallet_transactions
    │       WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id=driver_id)
    │       AND DATE(created_at) = TODAY()
    │    → Group by: service_type (bike vs car)
    │    → Show: today total, this week, this month
    │    → Display: ride-by-ride breakdown with timestamp
    ↓
    WITHDRAWAL REQUEST
    ↓
    │ 5. Driver initiates withdrawal on /driver/wallet
    │    → Select amount: minimum 1000000 IDR
    │    → Verify balance >= amount
    │    → Enter bank details: 
    │       - Account holder name
    │       - Bank name
    │       - Account number
    │       - IBAN (optional)
    │    → Submit withdrawal request
    ↓
    │ 6. Create withdrawal record
    │    → INSERT INTO withdrawals (
    │       driver_id, amount, bank_name, account_number, account_holder,
    │       status='pending', requested_at=now()
    │      )
    │    → Insert pending transaction in wallet_transactions
    │       (type='withdrawal', amount=-amount, status='pending')
    │    → Notify admin: New withdrawal request waiting approval
    ↓
    ADMIN APPROVAL
    ↓
    │ 7. Admin reviews withdrawal (/admin/withdrawals)
    │    → List all pending withdrawals
    │    → View: driver name, amount, bank, requested date
    │    → Verify bank details valid
    │    → Check: amount <= current balance
    ↓
    │ 8a. APPROVE Withdrawal
    │    → UPDATE withdrawals SET status='approved'
    │    → Call Edge Function: withdraw-to-bank
    │       → Initiate bank transfer using 3rd party API
    │       → e.g., Wise, Stripe, or local bank API
    │       → Get transaction_id from bank
    │    → UPDATE withdrawals SET status='processing', bank_txn_id='...'
    │    → Driver notified: "Withdrawal in progress, expected 1-2 days"
    ↓
    │ 8b. REJECT Withdrawal
    │    → Modal: Reject reason
    │    → UPDATE withdrawals SET status='rejected', reason='...'
    │    → UPDATE wallet_transactions SET status='failed'
    │    → Refund: CREATE wallet_transactions (type='refund', amount=+amount)
    │    → Driver balance restored
    │    → Notification: Withdrawal rejected with reason
    ↓
    │ 9. Bank transfer completes
    │    → Bank sends webhook confirmation
    │    → UPDATE withdrawals SET status='completed', completed_at=now()
    │    → UPDATE wallet_transactions (status='completed')
    │    → Driver notified: "Withdrawal completed, check your account"
    ↓
    │ 10. Wallet reconciliation
    │    → Driver wallet balance reflects withdrawal:
    │       balance = previous_balance - withdrawal_amount
    │    → Transaction logged: receipt generated
    ↓
    END
```

---

### 7.5 Admin Driver Verification Flow (Detailed)
```
┌──────────────────────────────────────────────────────────────────────┐
│             ADMIN DRIVER VERIFICATION & DOCUMENT REVIEW               │
└──────────────────────────────────────────────────────────────────────┘

DATABASE STATE AT REGISTRATION
    ↓
    │ drivers.registration_status = 'pending'
    │ drivers.is_verified = false
    │ drivers.ktp_url, drivers.sim_url, drivers.vehicle_stnk_url = URLs
    │ vehicles.is_verified = false (for all attached vehicles)
    ↓
    ADMIN DASHBOARD
    ↓
    │ 1. Admin opens /admin/drivers
    │    → Query: SELECT * FROM drivers
    │       WHERE registration_status='pending'
    │       ORDER BY created_at DESC
    │    → Count: Display badge with pending count
    ↓
    │ 2. Click pending driver
    │    → Modal opens with driver details:
    │       - Name, phone, DOB, gender, address, license #
    │       - Avatar (avatar_url)
    │       - Status: Menunggu (amber badge)
    │    → Tabs: Overview | Documents | Vehicles | Verification
    ↓
    │ 3. Documents tab
    │    → Display 3 document cards:
    │       a) KTP (Indonesian ID)
    │          - Show image preview (fetch from storage.objects)
    │          - Show KTP number extracted
    │          - Verify: expiry > 2030 typical for ID cards
    │       b) SIM (Driver License)
    │          - Show image preview
    │          - Show license number
    │          - Verify: sim_expiry_date > today
    │       c) STNK (Vehicle Registration)
    │          - Show image preview
    │          - Match to vehicle in drivers.vehicles
    │          - Verify: STNK name matches driver name
    │    → Each document has: ✓ Verified | ✕ Issue | ? Unclear button
    ↓
    │ 4. Review documents
    │    → Inspect visually:
    │       - Photo is clear (not blurry)
    │       - Document not expired
    │       - Numbers are readable
    │       - All required fields filled
    │    → If issue: click ✕ Issue → note details for rejection
    ↓
    │ 5. Vehicles tab
    │    → List all vehicles attached to driver
    │    → For each: plate_number, model, color, capacity, year, photo
    │    → Verify:
    │       - Photo is legible
    │       - Capacity matches service type
    │       - Plate format is valid Indonesia
    │    → Set: is_verified checkboxes for each vehicle
    ↓
    │ 6. Make decision
    │    ↓
    │    Option A: APPROVE
    │       → Click "Approve" button
    │       → UPDATE drivers:
    │          registration_status = 'approved'
    │          is_verified = true
    │       → UPDATE vehicles: is_verified = true (where attached)
    │       → Send notification to driver:
    │          Email: "Your registration has been approved!"
    │          SMS: "Welcome driver, you're now live."
    │       → Driver now appears in dispatch algorithm
    │       → Driver can go online immediately
    │    ↓
    │    Option B: REJECT
    │       → Click "Reject" button
    │       → Modal: "Reason for rejection (shown to driver)"
    │       → Common reasons:
    │          - "SIM expired, renew and resubmit"
    │          - "KTP photo unclear, please reupload"
    │          - "Vehicle STNK doesn't match vehicle"
    │       → UPDATE drivers:
    │          registration_status = 'rejected'
    │          rejection_reason = 'reason text'
    │       → Send notification:
    │          Email: "Your registration was rejected. Reason: ..."
    │          SMS: "Driver registration rejected. Check app for details."
    │       → Driver inbox notification with reason
    │       → Driver can resubmit documents after fixing issues
    ↓
    │ 7. Resubmission (if rejected)
    │    → Driver re-uploads corrected documents on /driver/profile
    │    → Documents tab now accepts new uploads
    │    → registration_status still 'rejected' but allows update
    │    → Files overwrite old URLs in storage
    │    → Driver creates "New Submission"
    │    → Admin notification: "Driver submitted documents again"
    ↓
    │ 8. License issued
    │    → Once approved, driver.status can be changed:
    │       When driver goes online: UPDATE drivers SET status='available'
    │       When driver goes offline: UPDATE drivers SET status='offline'
    │    → Online drivers visible to riders on map
    │    → Ready for ride dispatch
    ↓
    END
```

---

## 8. ARCHITECTURE SUMMARY MATRIX

### Component Health Check
| Component | Status | Coverage | Notes |
|-----------|--------|----------|-------|
| **Frontend - User Ride Booking** | ✅ Complete | High | Works end-to-end |
| **Frontend - Admin Dashboard** | ✅ Complete | High | All CRUD operations present |
| **Frontend - Driver Profile** | ✅ Complete | High | Document upload, settings |
| **Frontend - Real-time Features** | ✅ Complete | High | Tracking, notifications functional |
| **Frontend - Shuttle Booking** | ✅ Complete | Medium | Atomic seat locking in place |
| **Database - Core Schema** | ✅ Complete | High | All major tables defined |
| **Database - RLS Policies** | ✅ Complete | High | Row-level security implemented |
| **Backend - Auth & RBAC** | ✅ Complete | High | Role-based access control working |
| **Backend - Payment Integration** | ✅ Partial | Medium | Framework built, gateways integrated |
| **Backend - Real-time Subscriptions** | ✅ Complete | High | Uses Supabase Realtime channels |
| **Backend - Edge Functions** | ✅ Complete | High | 9 functions covering ride/payment flow |
| **Backend - Document Storage** | ✅ Complete | High | Private/public buckets configured |
| **Backend - Atomic Transactions** | ✅ Complete | High | PL/pgSQL functions ensure consistency |
| **Analytics & Reporting** | ⚠️ Partial | Low | Basic SQL queries only, no BI tool |
| **Email/SMS Notifications** | ⚠️ Partial | Low | Code exists, not integrated end-to-end |
| **Fraud Detection** | ❌ Missing | - | Not implemented |
| **Scheduled Jobs** | ⚠️ Partial | Low | No cron/scheduler integrated |

---

## 9. RECOMMENDATIONS & NEXT STEPS

### High Priority (Critical for Production)
1. **Email/SMS Integration**
   - Wire up Twilio or Sendgrid for notifications
   - Test OTP delivery
   - Implement delivery confirmations

2. **Fraud Detection**
   - Implement velocity checks (too many rides too fast)
   - Flag suspicious payment patterns
   - Geographic anomalies (teleportation detection)

3. **Rate Limiting**
   - API rate limiting on edge functions
   - OTP request limiting (3 per 15 min)
   - Prevent abuse

4. **Scheduled Jobs**
   - Auto-mark stale rides completed (>4 hours)
   - Cleanup expired OTPs
   - Generate driver daily reports
   - Calculate commissions

5. **Metrics & Monitoring**
   - Sentry/BugSnag for error tracking
   - PostHog/Amplitude for usage analytics
   - Database performance monitoring

### Medium Priority (Production-Ready)
1. **Document Expiry Alerts**
   - Notify drivers when SIM/KTP expiring (30 days before)
   - Auto-suspend drivers with expired docs

2. **Advanced Admin Features**
   - Bulk driver operations
   - Driver performance insights
   - Revenue analytics dashboard

3. **Driver Experience**
   - Break/pause mode
   - Preferred zones
   - Weekly earnings reports (PDF)
   - Driver support chat

4. **Payment Enhancements**
   - Multiple payment methods per user
   - Saved cards
   - Split payment (multi-passenger)

### Low Priority (Nice-to-Have)
1. **Features**
   - Scheduled rides (future bookings)
   - Ride pooling / shared rides
   - Package delivery add-on
   - Loyalty/rewards program

2. **Analytics**
   - Metabase dashboard
   - Real-time demand heatmap
   - Driver utilization metrics

3. **Internationalization**
   - Multi-language UI (already i18n ready)
   - Multi-currency support
   - Regional customizations

---

## 10. FILE STRUCTURE REFERENCE

### Frontend Key Files
```
src/
├── App.tsx                           # Main routing
├── App.css                           # Global styles
├── main.tsx                          # Entry point
├── vite-env.d.ts                     # TypeScript types for Vite
│
├── components/
│   ├── admin/                        # Admin-specific components
│   │   ├── AdminPagination.tsx
│   │   └── shuttle/
│   ├── driver/                       # Driver-specific components
│   │   └── profile/
│   │       ├── BasicInfoForm.tsx
│   │       ├── DocumentVerification.tsx
│   │       ├── ProfilePhoto.tsx
│   │       ├── SecuritySettings.tsx
│   │       ├── ServiceSettings.tsx
│   │       └── VehicleInfo.tsx
│   ├── layout/                       # Layout components
│   │   ├── AppLayout.tsx
│   │   └── ProtectedRoute.tsx
│   ├── ui/                           # shadcn UI components
│   ├── ride/                         # Ride components
│   ├── shuttle/                      # Shuttle components
│   ├── map/                          # Map/location components
│   └── home/                         # Home page components
│
├── hooks/
│   ├── useAuth.ts                    # Auth context hook
│   ├── useRBAC.tsx                   # Role-based access control
│   ├── useDriverLocation.ts          # GPS tracking
│   ├── useDriverTracking.ts          # Real-time driver map
│   ├── useIncomingRide.ts            # Ride notifications
│   ├── use-mobile.tsx                # Responsive detection
│   └── use-toast.ts                  # Toast notifications
│
├── lib/
│   ├── rbac.ts                       # RBAC types & permissions
│   ├── utils.ts                      # Utility functions
│   ├── location.ts                   # Geolocation helpers
│   ├── i18n.ts                       # i18next configuration
│   └── ab-test.ts                    # A/B testing (if used)
│
├── pages/
│   ├── Index.tsx                     # Home page
│   ├── Auth.tsx                      # User authentication
│   ├── Ride.tsx                      # Ride booking
│   ├── Shuttle.tsx                   # Shuttle listing
│   ├── Hotel.tsx                     # Hotel listing
│   ├── HotelDetail.tsx               # Hotel details
│   ├── Profile.tsx                   # User profile
│   ├── Wallet.tsx                    # User wallet
│   ├── Forbidden.tsx                 # Auth error
│   ├── NotFound.tsx                  # 404 page
│   ├── admin/                        # Admin pages
│   │   ├── AdminLayout.tsx
│   │   ├── AdminOverview.tsx
│   │   ├── AdminDrivers.tsx
│   │   ├── AdminRides.tsx
│   │   ├── AdminShuttles.tsx
│   │   ├── AdminUsers.tsx
│   │   ├── AdminPayments.tsx
│   │   ├── AdminWithdrawals.tsx
│   │   ├── AdminHotels.tsx
│   │   └── AdminSettings.tsx
│   └── driver/                       # Driver pages
│       ├── DriverLayout.tsx
│       ├── DriverAuth.tsx
│       ├── DriverDashboard.tsx
│       ├── DriverActiveRide.tsx
│       ├── DriverShuttle.tsx
│       ├── DriverEarnings.tsx
│       ├── DriverWallet.tsx
│       ├── DriverHistory.tsx
│       ├── DriverProfile.tsx
│       └── tabs/
│
├── services/
│   ├── DriverProfileService.ts       # Driver business logic
│   └── UserProfileService.ts         # User business logic
│
├── repositories/
│   ├── DriverProfileRepository.ts    # Driver data access
│   └── UserProfileRepository.ts      # User data access
│
├── stores/
│   ├── authStore.ts                  # Auth state (Zustand)
│   ├── driverStore.ts                # Driver state
│   └── rideStore.ts                  # Ride booking state
│
├── integrations/
│   └── supabase/
│       └── client.ts                 # Supabase client initialization
│
└── test/
    ├── example.test.ts
    ├── setup.ts
    └── ...
```

### Backend/Database Files
```
supabase/
├── config.toml                       # Supabase project config
│
├── migrations/                       # Database migrations (sorted by timestamp)
│   ├── 20260412125708_...sql        # Initial schema (roles, profiles, drivers, rides)
│   ├── 20260412135552_...sql        # Wallets & payments
│   ├── 20260413150000_...sql        # Shuttle atomic booking
│   ├── 20260413180000_...sql        # Driver rating system
│   ├── 20260413200000_...sql        # Driver comprehensive profile
│   ├── 20260413220000_...sql        # Driver documents & verification
│   ├── 20260413230000_...sql        # Payment gateway configs
│   ├── 20260413240000_...sql        # Realtime shuttle seats
│   ├── 20260413250000_...sql        # Vehicle management
│   └── 20260413280000_...sql        # User/driver settings
│
└── functions/                        # Edge Functions (TypeScript/Deno)
    ├── calculate-fare/
    │   └── index.ts                 # Fare calculation logic
    ├── complete-ride/
    │   └── index.ts                 # Ride completion & payment
    ├── create-shuttle-payment/
    │   └── index.ts                 # Shuttle booking payment
    ├── create-topup/
    │   └── index.ts                 # Wallet top-up initialization
    ├── dispatch-driver/
    │   └── index.ts                 # Driver assignment algorithm
    ├── manage-gateway-keys/
    │   └── index.ts                 # Admin: manage payment gateway secrets
    ├── payment-webhook/
    │   └── index.ts                 # Payment gateway callbacks
    ├── process-ride-payment/
    │   └── index.ts                 # Atomic wallet transactions
    ├── withdraw-earnings/
    │   └── index.ts                 # Withdrawal request processing
    └── withdraw-to-bank/
        └── index.ts                 # Bank transfer execution
```

---

## 11. CONCLUSION

The **PYU-GO** ride-sharing platform has a **solid, well-structured architecture** with:

✅ **Strengths:**
- Complete frontend with all major pages and components
- Comprehensive database schema with atomic transactions & RLS
- Robust auth system with role-based access control
- Real-time capabilities (Realtime subscriptions)
- Document verification workflow
- Atomic seat booking with concurrency handling
- Payment gateway integration framework
- Clear separation of concerns (services, repositories, hooks)

⚠️ **Areas for Enhancement:**
- Replace test data with production drivers
- Complete email/SMS notification integration
- Implement fraud detection & risk mitigation
- Add scheduled job processing
- Enhance analytics & reporting
- Expand driver/admin feature sets

🚀 **Ready for:** Beta launch with 200-500 drivers in controlled market (e.g., single city or district).

---

**Generated:** 2026-04-13  
**Architecture Version:** 1.0-beta  
**Last Updated:** Migration 20260413280000_create_user_and_driver_settings.sql
