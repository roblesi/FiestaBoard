# Traffic Feature: Travel Mode Support

## Summary

Added support for multiple transportation modes in the Traffic feature, allowing users to compare travel times for different modes (driving, biking, transit, walking) to the same destination.

## Changes Made

### Backend Changes

#### 1. Fixed API Validation Endpoint (`src/api_server.py`)
- **Issue**: The `validate_traffic_route` endpoint was passing individual parameters (`origin`, `destination`, `destination_name`) to `TrafficSource.__init__()`, but the class expects a `routes` list parameter.
- **Fix**: Updated to pass routes as a list of dictionaries:
```python
routes = [{
    "origin": origin,
    "destination": destination,
    "destination_name": destination_name,
    "travel_mode": request.get("travel_mode", "DRIVE")
}]

traffic_source = TrafficSource(
    api_key=api_key,
    routes=routes
)
```

#### 2. Added Travel Mode Support (`src/data_sources/traffic.py`)
- Added `travel_mode` parameter to route dictionaries (default: "DRIVE")
- Updated `_fetch_single_route()` to accept and validate travel mode
- Supported modes: `DRIVE`, `BICYCLE`, `TRANSIT`, `WALK`, `TWO_WHEELER`
- Travel mode is validated and passed to Google Routes API
- Travel mode is included in the response data for each route

**Key Changes:**
- Route dictionaries now include optional `travel_mode` field
- API request body uses the specified `travelMode` instead of hardcoded "DRIVE"
- Response includes `travel_mode` field for template access

### Frontend Changes

#### 1. Added Select Component (`web/src/components/ui/select.tsx`)
- Created new Radix UI-based Select component for the UI library
- Follows shadcn/ui patterns for consistency
- Added `@radix-ui/react-select` dependency to `package.json`

#### 2. Updated Traffic Route Planner (`web/src/components/feature-settings/traffic-route-planner.tsx`)
- Added travel mode selector with icons for each mode:
  - 🚗 Drive
  - 🚴 Bicycle
  - 🚇 Transit
  - 👣 Walk
- Travel mode is now part of the route configuration
- Routes display their travel mode with a badge
- Updated `TrafficRoute` interface to include `travel_mode` field

#### 3. Updated API Client (`web/src/lib/api.ts`)
- Added `travel_mode` parameter to `validateTrafficRoute()` function
- Defaults to "DRIVE" if not specified

#### 4. Updated Feature Card (`web/src/components/feature-settings/feature-card.tsx`)
- Handles `travel_mode` field when migrating from old single-route format

### Documentation Updates

#### README.md
- Updated Traffic feature description to mention multiple transportation modes
- Changed from "Drive time" to "Travel time" to be more inclusive

## Usage

### In the UI

1. Navigate to Settings → Features → Traffic
2. Click "Add Route"
3. Enter origin and destination
4. **Select a travel mode** from the dropdown (Drive, Bicycle, Transit, Walk)
5. Click "Validate Route"
6. Click "Add Route"
7. Repeat to add multiple routes with different modes

### Comparing Modes

You can add the same route multiple times with different travel modes to compare:

**Example:**
- Route 1: Home → Work (Drive)
- Route 2: Home → Work (Bicycle)
- Route 3: Home → Work (Transit)

Then use template variables to display all three:
```
WORK COMMUTE
DRIVE: {traffic.routes.0.duration_minutes}m
BIKE: {traffic.routes.1.duration_minutes}m
TRAIN: {traffic.routes.2.duration_minutes}m
```

### Template Variables

Each route includes a `travel_mode` field:
- `traffic.routes.0.travel_mode` - Returns "DRIVE", "BICYCLE", "TRANSIT", or "WALK"
- `traffic.routes.0.duration_minutes` - Travel time in minutes
- `traffic.routes.0.delay_minutes` - Delay due to traffic/conditions
- `traffic.routes.0.destination_name` - Display name for the route

## Technical Details

### Google Routes API

The feature uses Google's Routes API (v2) which supports multiple travel modes:
- **DRIVE**: Car/driving directions
- **BICYCLE**: Bicycle directions
- **TRANSIT**: Public transportation
- **WALK**: Walking directions
- **TWO_WHEELER**: Motorcycle/scooter (also supported)

The API returns:
- `duration`: Current travel time with traffic/conditions
- `staticDuration`: Normal travel time without traffic
- Traffic index calculated as `duration / staticDuration`

### Data Flow

1. User selects travel mode in UI
2. Route validation sends mode to backend
3. Backend passes mode to Google Routes API
4. API returns travel time for that specific mode
5. Data is cached and made available to templates
6. Templates can display times for different modes side-by-side

## Benefits

- **Compare commute options**: See if biking is faster than driving during rush hour
- **Multi-modal planning**: Check train vs car vs bike for different times of day
- **Flexibility**: Add up to 20 routes with any combination of modes
- **Real-time data**: All modes use live traffic/transit data from Google

## Future Enhancements

Possible future additions:
- Mode-specific icons in template output
- Automatic "best mode" detection
- Time-of-day mode recommendations
- Carbon footprint comparison
- Cost comparison (gas vs transit fare)

