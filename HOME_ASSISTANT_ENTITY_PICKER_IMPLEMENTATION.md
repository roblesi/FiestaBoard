# Home Assistant Entity Picker Implementation Summary

## Overview

Successfully implemented a modal-based UI for selecting Home Assistant entities and their attributes when creating templates. Users can now type `{{home_assistant.` in the template editor to trigger a searchable entity picker modal.

## Implementation Details

### Backend Changes

#### 1. New API Endpoint (`src/api_server.py`)
- Added `GET /home-assistant/entities` endpoint
- Fetches all entities from Home Assistant with their states and attributes
- Returns simplified format for UI consumption

#### 2. Home Assistant Source Enhancement (`src/data_sources/home_assistant.py`)
- Added `get_all_entities_for_context()` method
- Fetches all entity states and transforms them into a dict keyed by entity_id
- Used by template engine to resolve entity_id.attribute lookups

#### 3. Template Engine Updates (`src/templates/engine.py`)
- Enhanced `_get_variable_value()` to support entity_id based syntax
- Converts underscores to dots in entity_id (e.g., `sensor_temperature` → `sensor.temperature`)
- Supports accessing both `state` and any attribute from Home Assistant entities
- Updated `_build_context()` to fetch all Home Assistant entities for template rendering

### Frontend Changes

#### 4. TypeScript Types (`web/src/lib/api.ts`)
- Added `HomeAssistantEntity` interface
- Added `HomeAssistantEntitiesResponse` interface
- Added `getHomeAssistantEntities()` API method

#### 5. Entity Picker Modal Component (`web/src/components/home-assistant-entity-picker.tsx`)
- New component with searchable entity list
- Two-step selection: first entity, then attribute
- Shows current values for preview
- Converts entity_id dots to underscores for template syntax
- Displays preview of final template variable

#### 6. Template Line Editor Integration (`web/src/components/template-line-editor.tsx`)
- Detects when user types `{{home_assistant.`
- Automatically opens entity picker modal
- Replaces trigger text with selected variable on insert

## Usage

### For Users

1. **Open Page Builder** and start editing a template line
2. **Type** `{{home_assistant.` - the entity picker modal will open automatically
3. **Search** for your entity (e.g., "temperature sensor", "living room light")
4. **Select** the entity from the list
5. **Choose** an attribute (state, media_title, temperature, etc.)
6. **Click Insert** - the complete variable is added to your template

### Template Variable Syntax

```
{{home_assistant.ENTITY_ID.ATTRIBUTE}}
```

**Examples:**
- `{{home_assistant.sensor_temperature.state}}` - Current state of sensor.temperature
- `{{home_assistant.media_player_living_room.media_title}}` - Currently playing media title
- `{{home_assistant.light_bedroom.brightness}}` - Brightness attribute of light.bedroom

**Note:** Entity IDs use underscores in templates instead of dots (dots are reserved for syntax separation).

## Technical Details

### Entity ID Conversion

- **Home Assistant format:** `sensor.temperature` (with dot)
- **Template format:** `sensor_temperature` (with underscore)
- **Conversion:** First underscore is replaced with dot during template rendering

### Data Flow

```
User types {{home_assistant.
  ↓
Modal opens, fetches entities from /home-assistant/entities
  ↓
User selects entity and attribute
  ↓
Variable inserted: {{home_assistant.sensor_temperature.state}}
  ↓
Template engine renders:
  - Converts sensor_temperature → sensor.temperature
  - Fetches entity data from Home Assistant
  - Returns state or attribute value
```

### Supported Attributes

All attributes from Home Assistant entities are available, including:
- `state` - The current state value
- `friendly_name` - Display name
- `media_title`, `media_artist`, `media_album_name` - For media players
- `temperature`, `humidity` - For sensors
- `brightness`, `rgb_color` - For lights
- And any other entity-specific attributes

## Testing

To test the implementation:

1. **Ensure Home Assistant is configured** in feature settings
2. **Create or edit a page** in the page builder
3. **Type** `{{home_assistant.` in any template line
4. **Verify** the modal opens with a list of entities
5. **Select** an entity and attribute
6. **Verify** the variable is inserted correctly
7. **Preview** the page to see the actual value rendered

## Future Enhancements

- Cache entities list to reduce API calls
- Group entities by domain (sensor, switch, light, etc.)
- Show entity icons/device_class
- Add favorites/recently used entities
- Support attribute filtering by data type
- Add color rule suggestions based on attribute type



