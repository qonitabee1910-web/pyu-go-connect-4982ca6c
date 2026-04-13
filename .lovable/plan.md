

# Simplify Shuttle Flow: Remove Dropoff Step

## Current vs Desired Flow

```text
Current:  Routes → Date → Service → Vehicle → Schedule → Pickup → Dropoff → Seats → Guest → Payment → Confirm
Desired:  Routes → Date → Service → Vehicle → Schedule → Pickup → Seats → Guest → Payment → Confirm
```

The "dropoff" step is unnecessary — the route destination already defines where the passenger goes. Removing it simplifies the booking to 10 clean steps.

## Changes

### 1. `src/pages/Shuttle.tsx`
- Remove `"dropoff"` from the `Step` type
- Remove `selectedDropoffPoint` state, `handleSelectDropoffPoint`, `handleSkipDropoff`
- Change `handleSelectPickupPoint` to go directly to `"seats"` instead of `"dropoff"`
- Remove the dropoff rendering block and `DropoffSelector` import
- Update `goBack` logic: from `"seats"` go back to `"pickup"` (or `"schedule"` if no rayons)
- Remove `dropoffPointName` from `ShuttleTicket` props

### 2. `src/components/shuttle/ShuttleTicket.tsx`
- Remove `dropoffPointName` prop (route destination is already shown)

### 3. Delete `src/components/shuttle/DropoffSelector.tsx`
- No longer needed

No database changes required.

## Files

| File | Change |
|------|--------|
| `src/pages/Shuttle.tsx` | Remove dropoff step, simplify flow |
| `src/components/shuttle/ShuttleTicket.tsx` | Remove dropoffPointName prop |
| `src/components/shuttle/DropoffSelector.tsx` | Delete file |

