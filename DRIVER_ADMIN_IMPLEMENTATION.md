# PYU-GO Driver Admin Dashboard - Technical Implementation Guide

## Overview
This document describes the complete implementation of the enhanced Driver Management Dashboard for the PYU-GO admin panel. The implementation follows senior-level engineering practices with proper architecture, type safety, and scalability.

## Architecture Overview

### Component Hierarchy
```
AdminDrivers (Main Page)
├── Statistics Cards (4x)
├── Filters & Search Card
├── Data Table with Pagination
└── Driver Detail Modal (Dialog)
    ├── Overview Tab
    ├── Documents Tab
    ├── Vehicles Tab (DriverVehicleManagement Component)
    ├── Earnings Tab (DriverEarningsAnalytics Component)
    └── Activity Tab (DriverActivityLog Component)
```

### Service Layer
- **DriverAdminService**: Centralized service for all driver-related operations
  - Query building with filters and pagination
  - Statistics aggregation
  - CRUD operations for driver management
  - Activity and earnings calculations

## File Details

### 1. AdminDrivers.tsx (Main Component)
**Location**: `src/pages/admin/AdminDrivers.tsx`

**Key Features**:
- **Statistics Queries**: Real-time aggregation of driver counts, ratings, active status
- **Dynamic Filtering**: Filters by status and registration status
- **Smart Search**: Searches across name, phone, and email fields
- **Sorting Options**: Sort by creation date, rating, or name
- **Pagination**: 20 rows per page with offset-based pagination
- **Detail Modal**: 5-tab interface for comprehensive driver management

**State Management**:
```typescript
- currentPage: For pagination
- searchTerm: For dynamic search
- filterStatus: For status filtering
- filterRegistration: For registration status filtering
- sortBy: For sorting options
- selectedDriver: Current driver being viewed
- detailTab: Active tab in detail modal
- rejectionReason: For rejection workflow
```

**Key Hooks**:
- `useQuery`: Fetch drivers, statistics with React Query
- `useMutation`: Verify, suspend, reactivate drivers
- `useQueryClient`: Invalidate queries on mutations
- `useMemo`: Optimize filtered driver list

### 2. DriverAdminService.ts (Service Layer)
**Location**: `src/services/DriverAdminService.ts`

**Key Methods**:

#### `getDriversWithFilters(filters: DriverFilters)`
- Supports: status, registration_status, search, sortBy, limit, offset
- Returns: drivers array, total count, hasMore flag
- Handles pagination and filtering at query level

#### `getDriverStatistics()`
- Counts: total drivers, active drivers, pending verification, rejected
- Aggregates: average rating, completed rides, total earnings
- Returns: DriverStatistics interface

#### `getDriverDetail(driverId: string)`
- Fetches complete driver profile with:
  - Personal info
  - All vehicles
  - All rides (relationship data)

#### `getDriverEarnings(driverId: string)`
- Total earnings calculation
- Completed ride count
- Daily earnings breakdown (object keyed by date)
- Recent rides list

#### `getDriverActivityLog(driverId: string, limit)`
- Recent rides with status filtering
- Includes: pickup/dropoff address, fare, distance, timestamps

#### Verification Operations
- `updateVerificationStatus()`: Approve or reject with optional reason
- `suspendDriver()`: Set status to offline
- `reactivateDriver()`: Set status to available

### 3. DriverEarningsAnalytics.tsx (Component)
**Location**: `src/components/admin/DriverEarningsAnalytics.tsx`

**Features**:
- Summary cards for key metrics
- Recharts LineChart for daily earnings visualization
- Recent rides table (last 10)
- Currency formatting with Indonesian locale

**Data Visualization**:
```typescript
- Total earnings (from rides)
- Average earnings per ride
- Active days (unique dates with rides)
- Daily breakdown with timestamps
```

### 4. DriverActivityLog.tsx (Component)
**Location**: `src/components/admin/DriverActivityLog.tsx`

**Features**:
- Activity cards with status color coding
- Support for: completed, cancelled, pending, accepted statuses
- Ride details: locations, distance, fare, timestamp
- Scrollable history (max-height: 500px)
- Shows last 30 activities by default

**Status Styling**:
```typescript
- completed: emerald (green)
- cancelled: red
- pending: amber (yellow)
- accepted: blue
```

### 5. DriverVehicleManagement.tsx (Component)
**Location**: `src/components/admin/DriverVehicleManagement.tsx`

**Features**:
- Full CRUD operations for vehicles
- Add vehicle dialog with form validation
- Edit existing vehicles
- Delete with confirmation
- Vehicle type dropdown (car, motorcycle, truck, van)
- Capacity number input

**Form Fields**:
- plate_number (required)
- model (required)
- vehicle_type (dropdown)
- color (optional)
- capacity (required, must be > 0)

## Database Integration

### Tables Used
1. **drivers**: Profile, status, verification info
2. **vehicles**: Vehicle details, linked to drivers
3. **rides**: Transaction history for earnings/activity

### RLS Policies
All tables have:
- Public SELECT access for viewing
- Admin-only UPDATE/INSERT/DELETE

### Queries
All queries use:
- `eq()` for exact matches
- `or()` for multi-field search
- `in()` for array filtering
- `order()` for sorting
- `limit()` for pagination
- Count aggregations for statistics

## State Management Pattern

### Query Keys
```typescript
- ["admin-drivers", currentPage, searchTerm, filterStatus, filters, sortBy]
- ["driver-statistics"]
- ["driver-earnings", driverId]
- ["driver-activity", driverId]
- ["driver-vehicles", driverId]
```

### Mutation Patterns
```typescript
- verifyMutation: Update verification status
- suspendMutation: Suspend driver
- reactivateMutation: Reactivate driver
- vehicleMutation: Add/update vehicle
- deleteMutation: Delete vehicle
```

## UI/UX Patterns

### Loading States
- Skeleton loaders in components
- Spinner icon during operations
- Disabled buttons during mutations

### Error Handling
- Toast notifications for errors and success
- Error cards with helpful messages
- Graceful fallbacks for missing data

### Responsive Design
- Grid layout for cards (1 col mobile, 2 col tablet, 4 col desktop)
- Scrollable tables on mobile
- Modal dialogs with max-height and scroll

## Performance Optimizations

### Query Optimization
- Pagination limits results (20 per page)
- Filtered queries at database level
- Stale time settings to reduce re-fetches

### Component Optimization
- `useMemo` for filtered driver list
- Separate components for earnings/activity (lazy evaluation)
- Event delegation for large lists

### Caching Strategy
- React Query handles automatic caching
- Manual invalidation on mutations
- Stale time: 5 minutes for earnings, 2 minutes for activity

## Security Considerations

### RBAC
- Admin-only access to admin pages (enforced at routing level)
- Driver data publicly readable
- Only admins can update driver status/documents

### Data Access
- All queries filtered by auth context
- No sensitive data exposed in UI
- Private document storage with signed URLs

## Future Enhancements

### Immediate (High Priority)
1. Bulk driver operations (suspend multiple, export CSV)
2. Document re-upload request system
3. Driver break/pause mode management
4. Email notification system integration

### Medium-term (Medium Priority)
1. Advanced analytics dashboard with BI tools
2. Driver performance scorecards
3. Automated document expiry alerts
4. Driver tier/rating system

### Long-term (Nice-to-have)
1. AI-powered fraud detection
2. Predictive analytics for driver performance
3. Integration with external driver verification services
4. Advanced scheduling algorithms

## Testing Checklist

- [ ] Test all filter combinations
- [ ] Test search with special characters
- [ ] Test pagination (first, middle, last pages)
- [ ] Test verify/reject workflow with rejection reason
- [ ] Test suspend/reactivate status changes
- [ ] Test vehicle add/edit/delete operations
- [ ] Test earnings chart rendering
- [ ] Test activity log scrolling
- [ ] Mobile responsive testing
- [ ] Error state testing (network errors, etc)

## Deployment Notes

1. Ensure Supabase has latest migration files
2. Verify RLS policies are active
3. Test with admin account first
4. Monitor error logs for issues
5. Gradual rollout to admin users

## Troubleshooting

### Common Issues

**Drivers not appearing**:
- Check RLS policies on drivers table
- Verify user has admin role
- Check browser console for query errors

**Analytics numbers incorrect**:
- Verify rides table has correct driver_id relationships
- Check timestamps are in correct timezone
- Clear React Query cache and refresh

**Vehicle management not working**:
- Ensure vehicles table exists in database
- Check foreign key constraint on driver_id
- Verify capacity field is numeric

## References

- [Supabase Documentation](https://supabase.com/docs)
- [React Query Documentation](https://tanstack.com/query/latest)
- [TypeScript Best Practices](https://www.typescriptlang.org)
- [Component Structure Guide](../RBAC_GUIDE.md)
