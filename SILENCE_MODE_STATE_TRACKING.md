# Silence Mode State Tracking Implementation

## Overview

This document explains how the polling interval properly tracks and responds to silence mode state changes, ensuring the "(snoozing)" indicator appears/disappears correctly even when page content is unchanged.

## The Problem

**Original Implementation Issue:**

The initial implementation only checked silence mode **after** verifying that content had changed:

```python
# Check if content changed
if content == last_content:
    return False  # Exit early!

# Check silence mode (never reached if content unchanged)
if Config.is_silence_mode_active():
    add_snoozing_indicator()
```

**Failure Scenario:**

1. Board showing "Weather: 72°F" (no indicator)
2. Silence schedule becomes active (e.g., 8:00 PM hits)
3. Polling runs → content unchanged → exits early
4. **Silence mode never checked** → no indicator added
5. Board continues showing normal content without "(snoozing)"

This meant the indicator would only appear when the actual page content changed, not when silence mode activated!

## The Solution

**State Tracking Approach:**

Track silence mode as part of the board state, separate from content:

```python
class VestaboardDisplayService:
    def __init__(self):
        self._last_active_page_content = None
        self._last_silence_mode_active = False  # NEW: Track silence state
```

**Change Detection Logic:**

Check **both** content changes and silence mode state changes:

```python
# Always check current silence mode state
silence_mode_active = Config.is_silence_mode_active()
silence_state_changed = silence_mode_active != self._last_silence_mode_active

# Apply indicator if needed
content_to_send = current_content
if silence_mode_active:
    content_to_send = add_snoozing_indicator(current_content)

# Update if EITHER content changed OR silence state changed
if (content_to_send == self._last_active_page_content and 
    not silence_state_changed):
    return False  # Nothing changed

# Something changed, update the board
send_to_board(content_to_send)
self._last_silence_mode_active = silence_mode_active
```

## How It Works

### Scenario 1: Entering Silence Mode

**Timeline:**

```
7:59 PM - Poll #1
├─ Content: "Weather: 72°F"
├─ Silence: False
├─ Sent: "Weather: 72°F"
└─ State: content="Weather: 72°F", silence=False

8:00 PM - Silence schedule activates

8:01 PM - Poll #2
├─ Content: "Weather: 72°F" (unchanged)
├─ Silence: True (CHANGED!)
├─ Detect: silence_state_changed = True
├─ Apply indicator: "Weather: 72°F ... (snoozing)"
├─ Sent: "Weather: 72°F ... (snoozing)"
└─ State: content="Weather: 72°F ... (snoozing)", silence=True
```

**Result:** ✅ Indicator appears immediately when silence mode activates

### Scenario 2: Exiting Silence Mode

**Timeline:**

```
6:59 AM - Poll #1
├─ Content: "Weather: 65°F"
├─ Silence: True
├─ Sent: "Weather: 65°F ... (snoozing)"
└─ State: content="Weather: 65°F ... (snoozing)", silence=True

7:00 AM - Silence schedule ends

7:01 AM - Poll #2
├─ Content: "Weather: 65°F" (unchanged)
├─ Silence: False (CHANGED!)
├─ Detect: silence_state_changed = True
├─ No indicator: "Weather: 65°F"
├─ Sent: "Weather: 65°F"
└─ State: content="Weather: 65°F", silence=False
```

**Result:** ✅ Indicator removed immediately when silence mode ends

### Scenario 3: Content Changes During Silence Mode

**Timeline:**

```
10:00 PM - Poll #1 (in silence)
├─ Content: "Weather: 72°F"
├─ Silence: True
├─ Sent: "Weather: 72°F ... (snoozing)"
└─ State: content="Weather: 72°F ... (snoozing)", silence=True

10:05 PM - Temperature changes

10:05 PM - Poll #2 (still in silence)
├─ Content: "Weather: 68°F" (CHANGED!)
├─ Silence: True (unchanged)
├─ Detect: content changed
├─ Apply indicator: "Weather: 68°F ... (snoozing)"
├─ Sent: "Weather: 68°F ... (snoozing)"
└─ State: content="Weather: 68°F ... (snoozing)", silence=True
```

**Result:** ✅ Content updates with indicator maintained

### Scenario 4: No Changes

**Timeline:**

```
11:00 PM - Poll #1 (in silence)
├─ Content: "Weather: 72°F"
├─ Silence: True
├─ Sent: "Weather: 72°F ... (snoozing)"
└─ State: content="Weather: 72°F ... (snoozing)", silence=True

11:05 PM - Poll #2 (still in silence)
├─ Content: "Weather: 72°F" (unchanged)
├─ Silence: True (unchanged)
├─ Detect: nothing changed
├─ Skip send (early return)
└─ State: (unchanged)
```

**Result:** ✅ No unnecessary updates when nothing changed

## Implementation Details

### Modified Files

**`src/main.py`:**

1. **Added state tracking** (line 38):
   ```python
   self._last_silence_mode_active: bool = False
   ```

2. **Check silence mode early** (lines 167-170):
   ```python
   silence_mode_active = Config.is_silence_mode_active()
   silence_state_changed = silence_mode_active != self._last_silence_mode_active
   ```

3. **Apply indicator conditionally** (lines 175-178):
   ```python
   content_to_send = current_content
   if silence_mode_active:
       content_to_send = self._add_snoozing_indicator(current_content)
   ```

4. **Include state in change detection** (lines 181-184):
   ```python
   if (content_to_send == self._last_active_page_content and 
       not silence_state_changed):
       return False
   ```

5. **Track state after send** (line 209):
   ```python
   self._last_silence_mode_active = silence_mode_active
   ```

### Test Coverage

**`tests/test_snoozing_indicator.py`:**

Added comprehensive tests for state transitions:

1. **`test_silence_mode_activation_triggers_update`**
   - Verifies board updates when silence mode activates
   - Content unchanged, but indicator added

2. **`test_silence_mode_deactivation_triggers_update`**
   - Verifies board updates when silence mode deactivates
   - Content unchanged, but indicator removed

3. **`test_no_update_when_silence_mode_unchanged`**
   - Verifies no update when both content and state unchanged
   - Prevents unnecessary board writes

## Polling Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│  Polling Timer (every N seconds)                        │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  check_and_send_active_page()                           │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  1. Render page content                                 │
│     current_content = page_service.preview_page()       │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  2. Check silence mode                                  │
│     silence_mode_active = is_silence_mode_active()      │
│     silence_state_changed = (current != last)           │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  3. Apply indicator if in silence mode                  │
│     if silence_mode_active:                             │
│         content_to_send = add_indicator(content)        │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  4. Check if update needed                              │
│     if content_to_send == last_content AND              │
│        not silence_state_changed:                       │
│         return (skip update)                            │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  5. Send to board                                       │
│     vb_client.send_characters(content_to_send)          │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  6. Update state tracking                               │
│     last_content = content_to_send                      │
│     last_silence_mode_active = silence_mode_active      │
└─────────────────────────────────────────────────────────┘
```

## Benefits

### ✅ Immediate Response
- Indicator appears/disappears within one polling interval
- No waiting for content to change

### ✅ Correct State Tracking
- Always reflects current silence mode state
- No desync between schedule and display

### ✅ Efficient
- Still skips updates when nothing changed
- Only sends when necessary

### ✅ User Experience
- Clear visual feedback when silence mode activates
- Indicator removed immediately when schedule ends
- Debugging made easier

## Validation Checklist

To validate this implementation works correctly:

- [ ] **Activation Test**: Enable silence schedule that starts in 1 minute
  - Wait for schedule to activate
  - Verify "(snoozing)" appears within one polling interval
  - Check logs for "Silence mode entered" message

- [ ] **Deactivation Test**: Set silence schedule to end in 1 minute
  - Wait for schedule to end
  - Verify "(snoozing)" disappears within one polling interval
  - Check logs for "Silence mode exited" message

- [ ] **Content Update Test**: While in silence mode
  - Change page content (e.g., temperature changes)
  - Verify new content appears with "(snoozing)" indicator
  - Indicator should remain on updated content

- [ ] **No Change Test**: While in silence mode with stable content
  - Monitor logs during multiple polling intervals
  - Should see "content unchanged, skipping send" messages
  - No unnecessary board updates

## Related Documentation

- [`SNOOZING_INDICATOR_IMPLEMENTATION.md`](SNOOZING_INDICATOR_IMPLEMENTATION.md) - Overall feature implementation
- [`MANUAL_TESTING_SNOOZING.md`](MANUAL_TESTING_SNOOZING.md) - Comprehensive test scenarios
- [`IMPLEMENTATION_SUMMARY.md`](IMPLEMENTATION_SUMMARY.md) - Original silence schedule implementation

## Technical Notes

### Why Track State Separately?

We track `_last_silence_mode_active` separately from content because:

1. **Content includes indicator**: After applying the indicator, `content_to_send` already reflects the silence state
2. **Need original state**: We need to know the *previous* silence state to detect transitions
3. **Clean separation**: Silence mode is orthogonal to content - it's a display modifier

### Alternative Approaches Considered

**Option A: Always check silence, always update** ❌
- Would cause unnecessary board writes every polling interval
- Wears out board, wastes API calls
- No benefit if state unchanged

**Option B: Remove indicator from cached content** ❌
- Complex logic to strip indicator before comparison
- Error-prone (what if content contains "(snoozing)" legitimately?)
- Doesn't handle state transitions cleanly

**Option C: Current approach (state tracking)** ✅
- Clean separation of concerns
- Efficient (only updates when needed)
- Simple state machine: track last state, detect changes

## Conclusion

The state tracking implementation ensures the snoozing indicator correctly reflects the current silence mode state at all times, updating the board immediately when silence mode activates or deactivates, regardless of whether the underlying page content has changed.

