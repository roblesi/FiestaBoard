# Home Assistant Entity Picker - Updated Implementation

## Changes Made

Updated the Home Assistant entity picker to use a **click-to-open** approach instead of auto-triggering on typing.

### What Changed

**Before:**
- Typing `{{home_assistant.` in the template editor would auto-trigger the modal
- Required typing specific syntax to open the picker

**After:**
- Click the "Home Assistant" section in the Variable Picker sidebar
- Opens a modal to browse and select entities
- Selected variable is inserted into the active template line

## User Experience Flow

1. **Open Page Builder** and edit a page
2. **Look at the Variable Picker** sidebar (right side on desktop, bottom sheet on mobile)
3. **Expand "Home Assistant"** section in the Data Variables list
4. **Click "Select Entity"** button
5. **Modal opens** with searchable entity list
6. **Search and select** an entity (e.g., "Living Room Temperature")
7. **Choose an attribute** (e.g., "state", "temperature", "media_title")
8. **Click Insert** - variable is added to the current template line

## Implementation Details

### Variable Picker Component (`web/src/components/variable-picker.tsx`)

Added special handling for the `home_assistant` category:

```tsx
if (category === "home_assistant") {
  return (
    <CollapsibleSection key={category} title="Home Assistant" defaultOpen={false}>
      <div className="space-y-2">
        <button
          onClick={() => setShowEntityPicker(true)}
          className="w-full text-left p-3 rounded-md border border-dashed..."
        >
          <div className="flex items-center gap-2">
            <Home className="h-4 w-4 text-primary" />
            <div>
              <div className="font-medium text-sm">Select Entity</div>
              <div className="text-xs text-muted-foreground">
                Click to choose an entity and attribute
              </div>
            </div>
          </div>
        </button>
      </div>
    </CollapsibleSection>
  );
}
```

The modal is integrated into the VariablePicker component and uses the existing `onInsert` callback to add the selected variable to the template.

### Template Line Editor (`web/src/components/template-line-editor.tsx`)

Removed:
- Auto-trigger detection for `{{home_assistant.`
- Modal state management
- Entity selection handler

The template editor is now simpler and doesn't need to know about the Home Assistant entity picker.

## Benefits of This Approach

1. **More Discoverable** - Users can see the Home Assistant option in the sidebar
2. **Consistent UX** - Matches the pattern used for BayWheels and Muni (click to expand/select)
3. **Less Magic** - No hidden keyboard shortcuts or typing patterns to remember
4. **Mobile Friendly** - Works well on mobile where typing triggers are harder
5. **Simpler Code** - Template editor doesn't need special logic for Home Assistant

## Testing

To test the updated feature:

1. Ensure Home Assistant is configured in feature settings
2. Open the Page Builder at http://localhost:3000/pages
3. Create or edit a page
4. Look at the Variable Picker sidebar (right side)
5. Expand the "Home Assistant" section
6. Click the "Select Entity" button
7. Modal should open with entity list
8. Select an entity and attribute
9. Variable should be inserted into the template line

## Technical Notes

- The modal is now part of the VariablePicker component
- Uses the same `onInsert` callback as other variables
- Entity picker state is managed within VariablePicker
- Template editor remains simple and focused on editing



