# BayWheels UI Update - Station Accordion

## Summary
Updated the template variable picker in the page editor to show BayWheels stations in an accordion format with live data and individual station stats.

## Changes Made

### 1. Fixed BayWheels API Integration (`src/data_sources/baywheels.py`)
- Updated to support new BayWheels API format (as of late 2024)
- Now uses `num_ebikes_available` field with fallback to old `vehicle_types_available` format
- All 26 tests passing ✅

### 2. Added Accordion UI Component (`web/src/components/ui/accordion.tsx`)
- Created new accordion component using Radix UI primitives
- Added accordion animations to `globals.css`
- Updated `package.json` to include `@radix-ui/react-accordion`

### 3. Enhanced Variable Picker (`web/src/components/variable-picker.tsx`)
- Added live BayWheels station data fetching (refreshes every 30 seconds)
- Created accordion UI for stations with:
  - Station name and location
  - Live status emoji (🟢 green >5, 🟡 yellow 2-5, 🔴 red <2)
  - Electric bikes (⚡) and classic bikes (🚲) counts
  - Station index for template references
  - Individual variable pills for each station field:
    - `electric_bikes`
    - `classic_bikes`
    - `num_bikes_available`
    - `status_color`
    - `is_renting`
    - `station_name`

### 4. Features
- **Collapsible Sections**: Each station is in its own accordion item
- **Live Data**: Updates automatically every 30 seconds
- **Visual Status**: Color-coded emoji indicators for bike availability
- **Easy Template Access**: Click or drag station variables into templates
- **Index Reference**: Shows station index for template usage (e.g., `{{baywheels.stations.0.electric_bikes}}`)

## Next Steps
1. Rebuild Docker containers to install new npm packages:
   ```bash
   docker-compose -f docker-compose.dev.yml down
   docker-compose -f docker-compose.dev.yml build --no-cache web
   docker-compose -f docker-compose.dev.yml up
   ```

2. Test the UI:
   - Navigate to Pages → Edit a page
   - Look at the right sidebar "Template Variables"
   - Expand the "baywheels" section
   - See stations listed with live data in accordion format
   - Click to expand/collapse individual stations
   - Click variable pills to insert into template

## Example Template Usage
```
Station 1: {{baywheels.stations.0.station_name}}
E-bikes: {{baywheels.stations.0.electric_bikes}}
Status: {{baywheels.stations.0.status_color}}

Station 2: {{baywheels.stations.1.station_name}}
E-bikes: {{baywheels.stations.1.electric_bikes}}
```

## Technical Details
- Uses React Query for data fetching with automatic refresh
- Radix UI Accordion for accessible, keyboard-navigable UI
- Maintains backward compatibility with existing templates
- Follows existing UI patterns from the codebase
