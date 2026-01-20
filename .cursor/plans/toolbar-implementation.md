# Toolbar Implementation Plan for TipTap RCE Editor

## Overview
Convert the template variable slide-out drawer (`VariablePicker`) into a toolbar format at the top of the RCE editor. This will make variables, colors, and formatting more accessible without requiring a separate drawer/sidebar.

## Goals
1. Add a toolbar above the TipTap editor
2. Convert VariablePicker content into toolbar-friendly components (dropdowns, popovers)
3. Maintain all existing functionality (variables, colors, formatting, filters)
4. Improve accessibility and ease of use
5. Support both desktop and mobile layouts

## Current Architecture

### Components Involved
- **TipTapTemplateEditor** (`web/src/components/tiptap-template-editor/TipTapTemplateEditor.tsx`)
  - Main 6-line editor component
  - Currently has alignment controls below the editor
  - No toolbar at the top

- **VariablePicker** (`web/src/components/variable-picker.tsx`)
  - Slide-out drawer/sidebar component
  - Contains:
    - Template variables organized by category (baywheels, muni, traffic, weather, stocks, sports_scores, nearby_aircraft, home_assistant, datetime, etc.)
    - Colors section (red, orange, yellow, green, blue, violet, white, black)
    - Formatting section (fill_space, etc.)
    - Filters section (pad, wrap, etc.)
  - Uses collapsible sections with accordions for nested data
  - Supports drag-and-drop and click-to-insert

- **page-builder.tsx**
  - Uses TipTapTemplateEditor
  - Has VariablePicker as sidebar (desktop) or sheet (mobile)
  - Uses `insertAtEnd()` function to append variables to active line

### Variable Insertion Mechanism
- Variables are inserted as template strings: `{{plugin.field}}`, `{color}`, `{symbol}`, etc.
- TipTap editor uses `parseTemplate()` to convert template strings to JSONContent
- Can use `editor.commands.insertContent()` to insert parsed content at cursor position
- Current `insertAtEnd()` appends to the end of the active line (not ideal for toolbar)

## Implementation Plan

### Phase 1: Create Toolbar Component Structure

#### 1.1 Create `TemplateEditorToolbar.tsx`
**Location**: `web/src/components/tiptap-template-editor/components/TemplateEditorToolbar.tsx`

**Props**:
```typescript
interface TemplateEditorToolbarProps {
  editor: Editor | null;
  onInsertVariable?: (variable: string) => void; // Fallback if editor not available
}
```

**Structure**:
- Horizontal toolbar bar with grouped buttons
- Groups: Variables, Colors, Formatting, Filters, Alignment
- Use Popover/DropdownMenu components from shadcn/ui for expandable content
- Responsive: Collapse to icons-only on mobile, show labels on desktop

#### 1.2 Toolbar Layout
```
[Variables ▼] [Colors ▼] [Formatting ▼] [Filters ▼] | [Align Left] [Align Center] [Align Right]
```

Each dropdown/popover contains the relevant content from VariablePicker.

### Phase 2: Extract VariablePicker Logic into Reusable Components

#### 2.1 Create `VariablePickerContent.tsx`
**Location**: `web/src/components/tiptap-template-editor/components/VariablePickerContent.tsx`

**Purpose**: Extract the variable rendering logic from VariablePicker into a reusable component that can be used in both the drawer and toolbar.

**Features**:
- Render variables by category
- Handle special cases (BayWheels stations, MUNI stops, Traffic routes, etc.)
- Support click-to-insert
- Support drag-and-drop (optional for toolbar)

#### 2.2 Create `ColorPickerContent.tsx`
**Location**: `web/src/components/tiptap-template-editor/components/ColorPickerContent.tsx`

**Purpose**: Extract color selection UI into a compact grid/palette format for toolbar.

**Features**:
- Grid of color swatches
- Click to insert color token
- Visual preview matching board colors

#### 2.3 Create `FormattingPickerContent.tsx`
**Location**: `web/src/components/tiptap-template-editor/components/FormattingPickerContent.tsx`

**Purpose**: Extract formatting options (fill_space, etc.) into toolbar format.

#### 2.4 Create `FilterPickerContent.tsx`
**Location**: `web/src/components/tiptap-template-editor/components/FilterPickerContent.tsx`

**Purpose**: Extract filter options (pad, wrap, etc.) into toolbar format.

### Phase 3: Implement Variable Insertion at Cursor

#### 3.1 Create `insertTemplateContent()` utility
**Location**: `web/src/components/tiptap-template-editor/utils/insertion.ts`

**Function**:
```typescript
export function insertTemplateContent(
  editor: Editor,
  templateString: string
): void {
  // Parse the template string into TipTap nodes
  const parsed = parseLineContent(templateString);
  
  // Insert at current cursor position
  editor.commands.insertContent(parsed);
}
```

**Usage**: When user clicks a variable/color/formatting option in toolbar, insert at cursor position instead of appending to end of line.

#### 3.2 Update TipTapTemplateEditor
- Expose editor instance via ref or callback
- Pass editor to toolbar component
- Handle insertion at cursor position

### Phase 4: Integrate Toolbar into TipTapTemplateEditor

#### 4.1 Update TipTapTemplateEditor Component
- Add toolbar above the editor
- Move alignment controls into toolbar (right side)
- Make toolbar optional via prop (for backward compatibility)

**New Props**:
```typescript
interface TipTapTemplateEditorProps {
  // ... existing props
  showToolbar?: boolean; // Default: true
  toolbarPosition?: 'top' | 'bottom'; // Default: 'top'
}
```

#### 4.2 Toolbar Integration Points
- Toolbar should be positioned above the editor container
- Use border/divider to separate toolbar from editor
- Match existing design system (shadcn/ui components)

### Phase 5: Organize Toolbar Content

#### 5.1 Variables Dropdown
- Use DropdownMenu or Popover component
- Show categories in a scrollable list
- For categories with nested data (BayWheels stations, MUNI stops):
  - Show category name with count badge
  - Expand to show nested items on click
  - Use nested menu or accordion within popover
- For simple categories: Show all variables as clickable items

**Layout Options**:
- Option A: Single dropdown with all categories (scrollable)
- Option B: Separate dropdowns per major category (Variables, Home Assistant, etc.)
- **Recommendation**: Option A with smart grouping

#### 5.2 Colors Popover
- Compact grid: 2 rows × 4 columns
- Each color shows as a swatch with label
- Click to insert `{colorName}` token
- Tooltip on hover showing color name

#### 5.3 Formatting Popover
- List of formatting options (fill_space, etc.)
- Each option shows name and syntax preview
- Click to insert

#### 5.4 Filters Popover
- List of available filters
- Show syntax example: `|pad:3`, `|wrap`
- Click to insert filter (requires variable context - may need special handling)
- **Note**: Filters are typically applied to variables, so this might need to:
  - Insert as `|filterName` if cursor is after a variable
  - Or show a helper message explaining usage

### Phase 6: Mobile Responsiveness

#### 6.1 Mobile Toolbar Layout
- Collapse to icon-only buttons
- Use Sheet/Drawer for mobile variable picker (keep existing mobile sheet)
- Or: Use compact horizontal scrollable toolbar
- **Recommendation**: Keep mobile sheet for variables (too complex for toolbar), but add quick-access buttons for colors/formatting

#### 6.2 Responsive Breakpoints
- Desktop (lg+): Full toolbar with labels
- Tablet (md): Icons with tooltips
- Mobile (sm): Icon-only, use sheet for complex content

### Phase 7: Update page-builder.tsx

#### 7.1 Integration
- Remove or hide desktop VariablePicker sidebar when toolbar is enabled
- Keep mobile sheet for now (or integrate into toolbar)
- Update `insertAtEnd()` to use cursor-based insertion when editor is available

#### 7.2 Backward Compatibility
- Make toolbar optional (prop: `showToolbar={true}`)
- Keep VariablePicker available as fallback
- Allow both to coexist during transition period

## Technical Details

### TipTap Editor Integration

#### Inserting Content at Cursor
```typescript
// Get current editor instance
const editor = useEditor({ ... });

// Insert template content at cursor
function insertVariable(variableString: string) {
  if (!editor) return;
  
  // Parse the template string
  const nodes = parseLineContent(variableString);
  
  // Insert at current selection
  editor.chain().focus().insertContent(nodes).run();
}
```

#### Handling Multi-line Templates
- Variables are single-line, so `parseLineContent()` is sufficient
- Don't need full `parseTemplate()` for insertion

### Component Structure

```
TemplateEditorToolbar/
├── TemplateEditorToolbar.tsx (main component)
├── VariablePickerContent.tsx (variables dropdown content)
├── ColorPickerContent.tsx (colors popover content)
├── FormattingPickerContent.tsx (formatting popover content)
├── FilterPickerContent.tsx (filters popover content)
└── ToolbarButton.tsx (reusable toolbar button component)
```

### Data Fetching
- Reuse existing `useQuery` hooks from VariablePicker
- Share data between toolbar and drawer (if both exist)
- Cache template variables data

## UI/UX Considerations

### Toolbar Design
- Match existing design system (shadcn/ui)
- Use consistent spacing and sizing
- Icons from lucide-react
- Hover states and tooltips
- Active state for open dropdowns

### Accessibility
- Keyboard navigation for dropdowns
- ARIA labels for all buttons
- Focus management
- Screen reader support

### Performance
- Lazy load variable data (already done via React Query)
- Virtual scrolling for long variable lists
- Memoize expensive renders

## Migration Strategy

### Phase 1: Add Toolbar (Parallel)
- Add toolbar as optional feature
- Keep VariablePicker working
- Users can choose which to use

### Phase 2: Make Toolbar Default
- Set `showToolbar={true}` by default
- Hide VariablePicker sidebar on desktop
- Keep mobile sheet

### Phase 3: Remove VariablePicker (Optional)
- If toolbar works well, remove VariablePicker
- Or keep as fallback/alternative UI

## Testing Checklist

- [ ] Variables insert at cursor position (not end of line)
- [ ] Colors insert correctly
- [ ] Formatting options work
- [ ] Filters insert correctly (with variable context)
- [ ] Alignment controls work in toolbar
- [ ] Mobile layout is usable
- [ ] Keyboard navigation works
- [ ] Drag-and-drop still works (if kept)
- [ ] All variable categories render correctly
- [ ] Nested data (stations, stops, routes) accessible
- [ ] Home Assistant entity picker integration
- [ ] Performance is acceptable with many variables

## Files to Create/Modify

### New Files
1. `web/src/components/tiptap-template-editor/components/TemplateEditorToolbar.tsx`
2. `web/src/components/tiptap-template-editor/components/VariablePickerContent.tsx`
3. `web/src/components/tiptap-template-editor/components/ColorPickerContent.tsx`
4. `web/src/components/tiptap-template-editor/components/FormattingPickerContent.tsx`
5. `web/src/components/tiptap-template-editor/components/FilterPickerContent.tsx`
6. `web/src/components/tiptap-template-editor/utils/insertion.ts`

### Modified Files
1. `web/src/components/tiptap-template-editor/TipTapTemplateEditor.tsx`
   - Add toolbar above editor
   - Expose editor instance
   - Add toolbar props

2. `web/src/components/page-builder.tsx`
   - Update to use toolbar
   - Optionally hide VariablePicker sidebar
   - Update insertion logic

3. `web/src/components/variable-picker.tsx` (optional)
   - Extract reusable components
   - Or keep as-is for mobile/fallback

## Estimated Effort

- **Phase 1-2**: 4-6 hours (component structure, extraction)
- **Phase 3**: 2-3 hours (insertion logic)
- **Phase 4**: 2-3 hours (integration)
- **Phase 5**: 4-6 hours (content organization)
- **Phase 6**: 2-3 hours (responsive design)
- **Phase 7**: 1-2 hours (page-builder updates)
- **Testing & Polish**: 3-4 hours

**Total**: ~18-27 hours

## Next Steps

1. Review and approve this plan
2. Start with Phase 1: Create toolbar component structure
3. Implement insertion utility (Phase 3) early to test approach
4. Iterate on UI/UX based on feedback
5. Test thoroughly before removing VariablePicker
