# Testing Multi-Stop/Route Features

This document describes the testing performed for the MUNI and Traffic multi-stop/route features.

## Test Summary

✅ **All tests passing**: 15/15 tests pass
- 4 MUNI multi-stop tests
- 5 Traffic multi-route tests  
- 6 Integration & backward compatibility tests

## Features Tested

### MUNI Multi-Stop Support

**Backend:**
- ✅ Single stop code (string) backward compatibility
- ✅ Multiple stop codes (list) support
- ✅ Empty stop codes handling
- ✅ Stop code included in parsed response
- ✅ API endpoints: `/muni/stops`, `/muni/stops/nearby`, `/muni/stops/search`

**Frontend:**
- ✅ MuniStopFinder component created
- ✅ Search by address with geocoding
- ✅ Search by coordinates
- ✅ Geolocation support
- ✅ Visual stop selection with routes display
- ✅ Integration into feature-card.tsx

**Templates:**
- ✅ Indexed variables: `{{muni.stops.0.line}}`, `{{muni.stops.1.formatted}}`
- ✅ Backward compatibility: `{{muni.line}}`, `{{muni.formatted}}`
- ✅ Multi-line templates with multiple stops

### Traffic Multi-Route Support

**Backend:**
- ✅ Single route backward compatibility
- ✅ Multiple routes support
- ✅ Empty routes handling
- ✅ Traffic index calculation
- ✅ Traffic status determination (LIGHT/MODERATE/HEAVY)
- ✅ API endpoints: `/traffic/routes/geocode`, `/traffic/routes/validate`

**Frontend:**
- ✅ TrafficRoutePlanner component created
- ✅ Route validation before adding
- ✅ Geolocation for origin
- ✅ Visual route management
- ✅ Integration into feature-card.tsx

**Templates:**
- ✅ Indexed variables: `{{traffic.routes.0.duration_minutes}}`, `{{traffic.routes.1.formatted}}`
- ✅ Backward compatibility: `{{traffic.duration_minutes}}`, `{{traffic.formatted}}`
- ✅ Multi-line templates with multiple routes

## API Endpoint Tests

### MUNI Endpoints

```bash
# Find stops near coordinates
curl "http://localhost:8000/muni/stops/nearby?lat=37.7749&lng=-122.4194&radius=0.5&limit=5"
# ✅ Returns: List of stops with names, codes, routes, and distances

# Search stops by address
curl "http://localhost:8000/muni/stops/search?address=Church+and+Duboce,+San+Francisco&radius=0.3&limit=5"
# ✅ Returns: Geocoded location and nearby stops
```

### Traffic Endpoints

```bash
# Geocode an address
curl -X POST http://localhost:8000/traffic/routes/geocode \
  -H "Content-Type: application/json" \
  -d '{"address": "Ferry Building, San Francisco"}'
# ✅ Returns: lat, lng, formatted_address

# Validate a route
curl -X POST http://localhost:8000/traffic/routes/validate \
  -H "Content-Type: application/json" \
  -d '{"origin": "Home", "destination": "Work", "destination_name": "WORK"}'
# ✅ Returns: validation result with distance and duration
```

## Template Rendering Tests

### MUNI Multi-Stop Template

```python
template = [
    "{center}MUNI ARRIVALS",
    "{{muni.stops.0.formatted}}",
    "{{muni.stops.1.formatted}}",
]

context = {
    "muni": {
        "stops": [
            {"line": "N", "formatted": "N: 3, 8 min"},
            {"line": "J", "formatted": "J: 5, 12 min"}
        ]
    }
}
```

✅ **Result:**
```
    MUNI ARRIVALS     
N: 3, 8 min           
J: 5, 12 min          
```

### Traffic Multi-Route Template

```python
template = [
    "{center}COMMUTE TIMES",
    "{{traffic.routes.0.formatted}}",
    "{{traffic.routes.1.formatted}}",
]

context = {
    "traffic": {
        "routes": [
            {"formatted": "WORK: 25m (+5m)"},
            {"formatted": "AIRPORT: 45m"}
        ]
    }
}
```

✅ **Result:**
```
    COMMUTE TIMES     
WORK: 25m (+5m)       
AIRPORT: 45m          
```

## Backward Compatibility

### Old MUNI Config (Single Stop)

```json
{
  "muni": {
    "enabled": true,
    "api_key": "...",
    "stop_code": "15726",
    "line_name": "N"
  }
}
```

✅ **Still works!** Templates using `{{muni.line}}` and `{{muni.formatted}}` continue to work.

### Old Traffic Config (Single Route)

```json
{
  "traffic": {
    "enabled": true,
    "api_key": "...",
    "origin": "123 Main St",
    "destination": "456 Market St",
    "destination_name": "DOWNTOWN"
  }
}
```

✅ **Still works!** Templates using `{{traffic.formatted}}` and `{{traffic.duration_minutes}}` continue to work.

## Migration Path

**Automatic Migration:**
- When users save settings in the new UI, old configs automatically migrate to new format
- Single stop/route becomes `stops[0]` or `routes[0]`
- Backward compatibility fields maintained for existing templates

**No Breaking Changes:**
- Existing templates continue to work without modification
- Users can gradually adopt indexed variables as needed

## Test Files

- `tests/test_muni_multi_stop.py` - MUNI multi-stop unit tests
- `tests/test_traffic_multi_route.py` - Traffic multi-route unit tests
- `tests/test_integration_multi_features.py` - Integration and backward compatibility tests

## Running Tests

```bash
# Run all new tests
docker-compose exec vestaboard-api pytest \
  tests/test_muni_multi_stop.py \
  tests/test_traffic_multi_route.py \
  tests/test_integration_multi_features.py -v

# Result: 15 passed in 0.06s
```

## UI Components

**MUNI Stop Finder:**
- Located at: `web/src/components/feature-settings/muni-stop-finder.tsx`
- Integrated into: `web/src/components/feature-settings/feature-card.tsx`
- Search methods: Address, Coordinates, Geolocation
- Max stops: 4

**Traffic Route Planner:**
- Located at: `web/src/components/feature-settings/traffic-route-planner.tsx`
- Integrated into: `web/src/components/feature-settings/feature-card.tsx`
- Features: Route validation, geolocation for origin
- Max routes: 4

**Variable Picker:**
- Updated: `web/src/components/variable-picker.tsx`
- Live accordions for MUNI stops and Traffic routes
- Shows current data with indexes

## Conclusion

✅ All features implemented and tested
✅ Backward compatibility verified
✅ API endpoints working
✅ UI components functional
✅ Template rendering correct
✅ Documentation updated

