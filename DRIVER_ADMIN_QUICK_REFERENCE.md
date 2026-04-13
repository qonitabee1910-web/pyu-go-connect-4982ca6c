# Driver Admin Dashboard - Quick Reference

## Components Added

### 1. AdminDrivers.tsx ⭐ Main Component
```typescript
import AdminDrivers from '@/pages/admin/AdminDrivers'
// Features: Table view, filtering, pagination, detail modal
// Tab support: Overview, Documents, Vehicles, Earnings, Activity
```

### 2. DriverEarningsAnalytics
```typescript
import { DriverEarningsAnalytics } from '@/components/admin/DriverEarningsAnalytics'

// Usage in modal:
<TabsContent value="earnings">
  <DriverEarningsAnalytics driverId={selectedDriver.id} />
</TabsContent>

// Shows: Earnings summary, daily chart, ride history
```

### 3. DriverActivityLog
```typescript
import { DriverActivityLog } from '@/components/admin/DriverActivityLog'

// Usage in modal:
<TabsContent value="activity">
  <DriverActivityLog driverId={selectedDriver.id} />
</TabsContent>

// Shows: Recent rides, statuses, locations, fare
```

### 4. DriverVehicleManagement
```typescript
import { DriverVehicleManagement } from '@/components/admin/DriverVehicleManagement'

// Usage in modal:
<TabsContent value="vehicles">
  <DriverVehicleManagement driverId={selectedDriver.id} />
</TabsContent>

// Features: Add, Edit, Delete vehicles with CRUD modal
```

## Service Layer

### DriverAdminService
```typescript
import { DriverAdminService } from '@/services/DriverAdminService'

// Key methods:
await DriverAdminService.getDriversWithFilters(filters)
await DriverAdminService.getDriverStatistics()
await DriverAdminService.getDriverDetail(driverId)
await DriverAdminService.getDriverEarnings(driverId)
await DriverAdminService.getDriverActivityLog(driverId)
await DriverAdminService.updateVerificationStatus(driverId, status, reason)
await DriverAdminService.suspendDriver(driverId)
await DriverAdminService.reactivateDriver(driverId)
```

## Usage Examples

### Fetching Drivers with Filters
```typescript
const { drivers, total } = await DriverAdminService.getDriversWithFilters({
  status: 'available',
  registration_status: 'approved',
  search: 'John',
  sortBy: 'rating',
  limit: 20,
  offset: 0
})
```

### Getting Driver Statistics
```typescript
const stats = await DriverAdminService.getDriverStatistics()
// Returns: {
//   total_drivers: 150,
//   active_drivers: 45,
//   pending_verification: 12,
//   rejected_drivers: 3,
//   average_rating: 4.7,
//   total_completed_rides: 1250,
//   total_earnings: 25000000
// }
```

### Getting Driver Earnings
```typescript
const earnings = await DriverAdminService.getDriverEarnings(driverId)
// Returns: {
//   totalEarnings: 5000000,
//   completedRides: 125,
//   dailyEarnings: {
//     '2026-04-13': 125000,
//     '2026-04-12': 245000,
//     ...
//   },
//   rides: [...]
// }
```

### Verify Driver
```typescript
await DriverAdminService.updateVerificationStatus(
  driverId, 
  'approved' // or 'rejected'
)

// With rejection reason:
await DriverAdminService.updateVerificationStatus(
  driverId,
  'rejected',
  'Foto SIM tidak jelas'
)
```

## UI Features

### Statistics Cards
```
┌─────────────────────────────────────────────────────┐
│ Total Driver │ Driver Aktif │ Verifikasi │ Rating   │
│     150      │      45      │     12     │   4.7    │
└─────────────────────────────────────────────────────┘
```

### Filters
- Status: All/Available/Busy/Offline/On Ride
- Verification: All/Pending/Approved/Rejected
- Search: By name, phone, email
- Sort: By date (newest), rating, name (A-Z)

### Detail Modal Tabs
1. **Overview**: Personal info, verification controls
2. **Documents**: KTP, SIM, STNK with lightbox preview
3. **Vehicles**: Add/Edit/Delete vehicles CRUD
4. **Earnings**: Earnings analytics, charts, ride history
5. **Activity**: Recent rides, status, locations

## Database Queries

### Get Drivers (with filters)
```sql
SELECT 
  id, full_name, phone, email, avatar_url, status, rating,
  registration_status, is_verified, created_at,
  vehicles(count), rides(count)
FROM drivers
WHERE status = ? AND registration_status = ?
ORDER BY created_at DESC
LIMIT 20 OFFSET 0
```

### Get Statistics
```sql
SELECT 
  (SELECT count(*) FROM drivers) as total,
  (SELECT count(*) FROM drivers WHERE status IN ('available','on_ride')) as active,
  (SELECT count(*) FROM drivers WHERE registration_status = 'pending') as pending,
  (SELECT avg(rating) FROM drivers) as avg_rating
```

### Get Driver Earnings
```sql
SELECT 
  sum(fare) as total_earnings,
  count(*) as rides,
  date(created_at) as date
FROM rides
WHERE driver_id = ? AND status = 'completed'
GROUP BY date
ORDER BY date DESC
```

## State Management

### React Query Keys
```typescript
// Drivers list (paginated and filtered)
["admin-drivers", currentPage, searchTerm, filterStatus, sortBy]

// Driver statistics (cached for 5 min)
["driver-statistics"]

// Earnings for specific driver (cached for 5 min)
["driver-earnings", driverId]

// Activity log (cached for 2 min)
["driver-activity", driverId]

// Vehicles for specific driver
["driver-vehicles", driverId]
```

### Invalidation on Changes
```typescript
// When verification changed:
queryClient.invalidateQueries({ queryKey: ["admin-drivers"] })
queryClient.invalidateQueries({ queryKey: ["driver-statistics"] })

// When vehicle changed:
queryClient.invalidateQueries({ queryKey: ["driver-vehicles", driverId] })

// When driver status changed:
queryClient.invalidateQueries({ queryKey: ["admin-drivers"] })
queryClient.invalidateQueries({ queryKey: ["driver-activity", driverId] })
```

## Styling

### Badge Colors
```
Status: green (available), blue (busy), slate (offline), purple (on_ride)
Verification: amber (pending), emerald (approved), red (rejected)
Activity: emerald (completed), red (cancelled), amber (pending), blue (accepted)
```

### Responsive Breakpoints
```
Mobile: 1 column
Tablet (md): 2 columns
Desktop (lg): 3-4 columns
```

## Error Handling

All mutations include:
```typescript
onSuccess: () => {
  // Invalidate queries
  // Show success toast
  // Close dialogs
}
onError: (err: any) => {
  toast.error("Gagal: " + err.message)
}
```

## Performance Tips

1. **Pagination**: Always use ITEMS_PER_PAGE (20) to limit initial load
2. **Caching**: React Query caches queries automatically
3. **Filtering**: Apply filters client-side first, then server
4. **Charts**: Charts only render when tab is active
5. **Search**: Debounce search input for better UX

## Common Customizations

### Change pagination size:
```typescript
const ITEMS_PER_PAGE = 50 // was 20
```

### Change statistics cards layout:
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
  // was "grid-cols-1 md:grid-cols-4"
</div>
```

### Add more filter options:
```typescript
<Select value={filterCustom} onValueChange={setFilterCustom}>
  <SelectItem value="custom">Custom Filter</SelectItem>
</Select>
```

## Testing

### Test Filters
```
1. Apply all status filters - verify results change
2. Use search - verify matches name/phone/email
3. Change sort - verify order changes
4. Paginate - verify page numbers work
```

### Test Driver Detail
```
1. Click driver card - modal opens
2. Switch tabs - all tabs load correctly
3. Approve/Reject - status updates
4. Add vehicle - appears in list
5. View earnings - chart renders
6. View activity - recent rides show
```

---

**Last Updated**: April 13, 2026
**Status**: Production Ready
**Version**: 1.0.0
