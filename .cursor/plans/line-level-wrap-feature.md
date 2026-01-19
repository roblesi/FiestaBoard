# Line-Level Wrap Feature Enhancement Plan

## Overview
Transform wrap from a variable-level filter to a line-level setting that intelligently wraps content down, shifting subsequent lines while preventing bottom truncation.

## Current State
- Wrap is currently a filter applied to individual variables: `{{variable|wrap}}`
- Backend template engine handles wrap by detecting `|wrap` filter and using empty lines below for overflow
- Editor has 6 fixed lines (matching FiestaBoard hardware)

## Goals
1. **Line-Level Wrap Setting**: Each line can have a "wrap enabled" toggle
2. **Dynamic Line Shifting**: When a line wraps, content shifts down automatically
3. **Smart Truncation**: Content only wraps as far as available lines allow, preventing bottom truncation
4. **Visual Feedback**: Clear indication of which lines will wrap and how many lines they'll use

## Technical Design

### 1. Data Model Changes

#### TemplateParagraph Extension
- Add `wrapEnabled: boolean` attribute (default: false)
- Store wrap state per line in `lineAlignments` array pattern
- Serialize as `{wrap}Line content` prefix (similar to `{center}`, `{right}`)

#### Backend Template Engine
- Extend `_extract_alignment()` to also extract `{wrap}` prefix
- When `{wrap}` is detected, treat entire line as wrappable
- Use all available empty lines below (up to line 6) for wrapping
- Calculate available space: count empty lines from current line to line 6

### 2. Editor UI Changes

#### Toolbar
- Add wrap toggle button (icon: WrapText) that toggles wrap for current line
- Show active state when current line has wrap enabled
- Tooltip: "Enable wrap for this line"

#### Visual Indicators
- Add wrap indicator (similar to alignment L/C/R labels) in left margin
- Show "W" badge when wrap is enabled for a line
- Optional: Show estimated wrap lines (e.g., "W(3)" if will wrap to 3 lines)

#### Line Management
- When wrap is enabled, visually indicate which lines will be used
- Show preview of how content will flow across lines
- Disable wrap on lines that would cause truncation

### 3. Backend Logic Enhancement

#### Wrap Calculation
```python
def _calculate_wrap_capacity(self, line_index: int, lines: List[str]) -> int:
    """Calculate how many lines this line can wrap into.
    
    Returns the number of empty lines available below (including current line).
    """
    empty_count = 0
    for i in range(line_index, 6):  # Lines 0-5 (6 total)
        _, content = self._extract_alignment(lines[i])
        if content.strip() == "":
            empty_count += 1
        else:
            break  # Stop at first non-empty line
    return empty_count

def _render_with_wrap(self, content: str, context: Dict, max_lines: int) -> List[str]:
    """Render content with wrap, splitting across max_lines."""
    # Current implementation already handles this
    # Need to ensure it respects max_lines parameter
    pass
```

#### Line Rendering Logic
```python
def render_lines(self, template_lines: List[str], context: Optional[Dict] = None) -> str:
    rendered = [''] * 6
    skip_until = -1
    
    for i, line in enumerate(lines):
        if i <= skip_until:
            continue  # Already processed by wrap overflow
        
        alignment, wrap_enabled, content = self._extract_line_directives(line)
        
        if wrap_enabled:
            # Calculate available wrap capacity
            capacity = self._calculate_wrap_capacity(i, lines)
            
            # Render with wrap, respecting capacity
            wrapped_lines = self._render_with_wrap(content, context, max_lines=capacity)
            
            # Fill in the lines
            for k, wrapped_line in enumerate(wrapped_lines):
                if i + k < 6:
                    processed = self._process_fill_space(wrapped_line, width=22)
                    rendered[i + k] = self._apply_alignment(processed, alignment, width=22)
            
            skip_until = i + len(wrapped_lines) - 1
        else:
            # Normal rendering (existing logic)
            rendered_line = self.render(content, context)
            processed = self._process_fill_space(rendered_line, width=22)
            rendered[i] = self._apply_alignment(processed, alignment, width=22)
    
    return '\n'.join(rendered)
```

### 4. Serialization Changes

#### Frontend Serialization
- Add `{wrap}` prefix to line content when wrap is enabled
- Example: `{wrap}{center}Long text that will wrap`
- Parse `{wrap}` prefix similar to alignment prefixes

#### Template String Format
```
Line 1: {wrap}This is a very long line that will wrap
Line 2: {center}This line is centered
Line 3: (empty - will be used by wrap from line 1)
Line 4: (empty - will be used by wrap from line 1)
Line 5: Normal line
Line 6: Another line
```

### 5. User Experience Flow

1. **Enable Wrap on Line**:
   - User clicks wrap button in toolbar
   - Current line gets wrap enabled
   - Visual indicator (W badge) appears
   - Editor shows preview of how many lines will be used

2. **Content Wrapping**:
   - User types/edits content on wrapped line
   - Editor shows real-time preview of wrap behavior
   - Shows which lines below will be used

3. **Line Conflicts**:
   - If enabling wrap would cause truncation, show warning
   - Disable wrap option if insufficient space
   - Show tooltip explaining why wrap can't be enabled

4. **Disable Wrap**:
   - Click wrap button again to disable
   - Content collapses back to single line (truncated if needed)
   - Lines below become available again

## Implementation Phases

### Phase 1: Basic Line-Level Wrap
- [ ] Add `wrapEnabled` attribute to TemplateParagraph
- [ ] Add wrap toggle button to toolbar
- [ ] Update serialization to include `{wrap}` prefix
- [ ] Update backend to parse `{wrap}` prefix
- [ ] Add visual indicator (W badge) in left margin

### Phase 2: Dynamic Line Calculation
- [ ] Implement `_calculate_wrap_capacity()` in backend
- [ ] Update `render_lines()` to use capacity calculation
- [ ] Ensure wrap respects available lines
- [ ] Add validation to prevent wrap when insufficient space

### Phase 3: Visual Feedback
- [ ] Show preview of wrap behavior in editor
- [ ] Highlight lines that will be used by wrap
- [ ] Show estimated line count (W(3))
- [ ] Add warnings for potential truncation

### Phase 4: Advanced Features
- [ ] Real-time wrap preview as user types
- [ ] Auto-disable wrap when content would truncate
- [ ] Smart wrap suggestions based on content length
- [ ] Wrap statistics/metrics

## Edge Cases

1. **Wrap on Last Line**: Can only wrap to itself (no effect)
2. **Multiple Wrapped Lines**: Each calculates capacity independently
3. **Wrap with Fill Space**: Fill space should work within wrapped content
4. **Wrap with Alignment**: Alignment applies to each wrapped line
5. **Empty Lines**: Empty lines are considered "available" for wrap
6. **Wrap Disabled**: Content truncates normally if wrap is disabled

## Testing Considerations

1. **Unit Tests**:
   - Test `_calculate_wrap_capacity()` with various line configurations
   - Test wrap with different content lengths
   - Test wrap with alignment combinations
   - Test wrap with fill_space

2. **Integration Tests**:
   - Test full 6-line template with multiple wrapped lines
   - Test wrap behavior when lines are added/removed
   - Test serialization/deserialization of wrap state

3. **UI Tests**:
   - Test wrap toggle button
   - Test visual indicators
   - Test wrap preview
   - Test validation/warnings

## Migration Path

1. **Backward Compatibility**: 
   - Keep `|wrap` filter on variables for existing templates
   - New templates use line-level wrap
   - Migration script to convert `|wrap` filters to line-level wrap

2. **Gradual Rollout**:
   - Phase 1 can be deployed independently
   - Each phase builds on previous
   - Can disable feature if issues arise

## Open Questions

1. Should wrap be mutually exclusive with certain features?
2. How to handle wrap when user manually adds content to "reserved" lines?
3. Should there be a "smart wrap" that auto-enables based on content length?
4. How to show wrap preview without cluttering the UI?
