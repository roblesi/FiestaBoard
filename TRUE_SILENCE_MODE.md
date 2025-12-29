# TRUE SILENCE MODE - Critical Implementation for Sleep Protection

## ⚠️ CRITICAL REQUIREMENT

**Board updates during silence hours could wake people sleeping near the Vestaboard.**

Even subtle changes in brightness, text, or content can disrupt sleep. This implementation ensures **ZERO board updates** during configured silence hours, with only ONE exception: the initial "(snoozing)" indicator when silence mode activates.

## How It Works

### Silence Mode Activation (e.g., 8:00 PM)

```
7:59 PM - Normal operation
├─ Poll #1: Shows "Weather: 72°F"
└─ Board is updating normally

8:00 PM - Silence schedule activates
├─ Poll #2: Detects silence mode activated
├─ Sends ONE update: "Weather: 72°F ... (snoozing)"
├─ Sets _snoozing_message_sent = True
└─ 🔇 ALL FURTHER UPDATES BLOCKED

8:05 PM - Temperature changes to 68°F
├─ Poll #3: Detects content changed
├─ Checks: silence mode active + _snoozing_message_sent = True
└─ ❌ UPDATE BLOCKED - Board stays at "Weather: 72°F ... (snoozing)"

8:10 PM - Weather changes to "Rainy"
├─ Poll #4: Detects content changed
├─ Checks: silence mode active + _snoozing_message_sent = True
└─ ❌ UPDATE BLOCKED - Board still shows "Weather: 72°F ... (snoozing)"

...continues blocking ALL updates until silence ends...
```

### Silence Mode Deactivation (e.g., 7:00 AM)

```
6:59 AM - Still in silence mode
├─ Board frozen at: "Weather: 72°F ... (snoozing)"
└─ All updates blocked

7:00 AM - Silence schedule ends
├─ Poll #1: Detects silence mode deactivated
├─ Clears _snoozing_message_sent = False
├─ Sends update: "Weather: 65°F" (current data, no indicator)
└─ ▶️ NORMAL UPDATES RESUME

7:05 AM - Temperature changes to 66°F
├─ Poll #2: Normal operation
└─ ✅ UPDATE ALLOWED - Board shows "Weather: 66°F"
```

## Implementation Details

### State Tracking

**`src/main.py` - VestaboardDisplayService:**

```python
def __init__(self):
    self._last_silence_mode_active: bool = False
    self._snoozing_message_sent: bool = False  # Flag to block updates
    self._last_active_page_content: str = None  # Cached board content
```

### Smart Indicator Logic ⚡

The system intelligently determines whether to allow an update during silence mode:

```python
# Check if board currently has the snoozing indicator
board_has_indicator = self._last_active_page_content and "(snoozing)" in self._last_active_page_content

# If in silence mode BUT indicator missing → ALLOW one update
if silence_mode_active and not board_has_indicator:
    logger.info("🔄 Silence mode active but board missing indicator - allowing update")
    content_to_send = add_snoozing_indicator(content)
    send_to_board(content_to_send)  # ✅ ALLOWED
    # Subsequent updates will be blocked

# If in silence mode AND indicator present → BLOCK all updates  
elif silence_mode_active and board_has_indicator:
    logger.info("Blocking update - indicator already shown")
    return False  # ❌ BLOCKED
```

**Why This Matters**:
- **Power outages** → Indicator gets re-added automatically
- **Service restarts** → Indicator always appears when needed
- **Edge cases** → System self-heals to show indicator
- **No duplicates** → Once indicator present, updates blocked

### Update Decision Flow

```python
def check_and_send_active_page():
    # 1. Check silence mode state
    silence_mode_active = Config.is_silence_mode_active()
    entering_silence = silence_mode_active and not self._last_silence_mode_active
    exiting_silence = not silence_mode_active and self._last_silence_mode_active
    
    # 2. CRITICAL: Block ALL updates if in silence mode after initial message
    if silence_mode_active and self._snoozing_message_sent:
        logger.info("Silence mode active - blocking update to prevent wake-up")
        return False  # ❌ BLOCKED
    
    # 3. Handle entering silence mode - ONE update only
    if entering_silence:
        content_to_send = add_snoozing_indicator(content)
        send_to_board(content_to_send)
        self._snoozing_message_sent = True
        logger.info("🔇 Silence mode activated - ALL further updates blocked")
        return True
    
    # 4. Handle exiting silence mode - resume updates
    if exiting_silence:
        self._snoozing_message_sent = False
        send_to_board(content)  # No indicator
        logger.info("▶️ Silence mode ended - normal updates resumed")
        return True
    
    # 5. Normal mode - check if content changed
    if not silence_mode_active:
        if content_changed:
            send_to_board(content)
            return True
        return False  # Skip if unchanged
```

## Blocked Operations During Silence Mode

### 1. Automatic Polling Updates ❌

**Location**: `src/main.py:check_and_send_active_page()`

```python
if silence_mode_active and self._snoozing_message_sent:
    logger.info("Silence mode active - blocking update to prevent wake-up")
    return False
```

**Effect**: 
- Content changes blocked
- Weather updates blocked
- Time updates blocked
- All data source changes blocked

### 2. Manual Message Sends ❌

**Location**: `src/api_server.py:send_message()`

```python
if Config.is_silence_mode_active():
    return {
        "status": "blocked",
        "message": "Manual sends blocked during silence mode"
    }
```

**Effect**:
- API `/send-message` calls rejected
- Returns error response
- NO board update occurs

### 3. Manual Page Sends ❌

**Location**: `src/api_server.py:send_page()`

```python
if Config.is_silence_mode_active():
    logger.info("Blocking manual page send to prevent wake-up")
    sent_to_board = False
```

**Effect**:
- API `/pages/{id}/send` calls blocked
- UI "Send to Board" button blocked
- NO board update occurs

## Allowed Operations During Silence Mode

### ✅ ONE Initial Update Only

When silence mode **first activates**, ONE update is allowed:

1. Adds "(snoozing)" indicator to current content
2. Sends to board
3. Sets blocking flag
4. All subsequent updates blocked

**Purpose**: Visual confirmation that silence mode is active

### ✅ Configuration Changes

- Silence schedule settings can be modified
- Other settings can be changed
- NO board updates triggered

### ✅ Preview/Read Operations

- Page previews work normally
- Data fetching continues
- Display queries work
- NO board updates triggered

## Log Messages

### Entering Silence Mode

```
⏸️  Entering silence mode - sending snoozing indicator (ONE TIME ONLY)
Active page sent to board: <page_id>
🔇 Silence mode fully activated - ALL further updates blocked until silence ends
```

### During Silence Mode (Blocking Updates)

```
Silence mode active - blocking update to prevent wake-up
```

### Exiting Silence Mode

```
▶️  Exiting silence mode - resuming normal updates
Active page sent to board: <page_id>
```

### Manual Sends Blocked

```
Silence mode is active - blocking manual message send to prevent wake-up
Silence mode is active - blocking manual page send to prevent wake-up
```

## Testing Scenarios

### Test 1: Entering Silence Mode

**Setup**: Set silence schedule to start in 2 minutes

**Expected**:
1. Before start: Normal updates occurring
2. At start time:
   - ONE update sent with "(snoozing)" indicator
   - Log: "🔇 Silence mode fully activated"
3. After start:
   - No further updates for any reason
   - Logs show "blocking update to prevent wake-up"

**Validation**:
```bash
docker-compose -f docker-compose.dev.yml logs -f api | grep -i "silence\|snoozing"
```

### Test 2: During Silence Mode with Content Changes

**Setup**: Silence mode active, content changes (weather, time, etc.)

**Expected**:
1. Polling continues (visible in logs)
2. Content changes detected
3. Updates blocked with log message
4. Board remains frozen on last pre-silence content + "(snoozing)"

**Validation**: Watch board - should not change at all

### Test 3: Exiting Silence Mode

**Setup**: Set silence schedule to end in 2 minutes

**Expected**:
1. Before end: Board frozen with "(snoozing)"
2. At end time:
   - ONE update sent with current content (no indicator)
   - Log: "▶️  Exiting silence mode"
3. After end:
   - Normal updates resume
   - Content updates as expected

**Validation**: Board should update once when schedule ends, then continue normally

### Test 4: Manual Sends Blocked

**Setup**: Silence mode active

**Test A - API Message**:
```bash
curl -X POST http://localhost:8000/send-message \
  -H "Content-Type: application/json" \
  -d '{"text": "Test message"}'
```

**Expected**: Response `{"status": "blocked", "silence_mode": true}`

**Test B - API Page Send**:
```bash
curl -X POST http://localhost:8000/pages/{page_id}/send
```

**Expected**: Response includes `"sent_to_board": false`

**Test C - UI Button**:
- Click "Send to Board" button on any page
- Expected: No board update, error message in logs

### Test 5: Power Outage / Restart Recovery ⚡

**Setup**: Silence mode is active (e.g., 10:00 PM)

**Steps**:
1. Verify board shows "(snoozing)" indicator
2. Restart the API container:
   ```bash
   docker-compose -f docker-compose.dev.yml restart api
   ```
3. Wait for service to initialize (~5 seconds)
4. Watch logs for next poll

**Expected**:
1. Log: "🔄 Silence mode active but board missing snoozing indicator - allowing update"
2. Board receives ONE update with "(snoozing)" indicator
3. Log: "🔇 Silence mode fully activated"
4. Subsequent polls blocked with "blocking update to prevent wake-up"

**Validation**:
```bash
# Watch for recovery
docker-compose -f docker-compose.dev.yml logs -f api | grep "🔄\|🔇"
```

**Critical**: This ensures that even after power outages or crashes during silence hours, the board ALWAYS shows the snoozing indicator as required.

## Safety Guarantees

### ✅ Guaranteed Behaviors

1. **Zero Updates After Initial Message**
   - Once snoozing message sent, board is 100% frozen
   - No polling, no manual sends, no API calls can update it

2. **Content Preserved**
   - Last content before silence + "(snoozing)" remains on screen
   - No flashing, no brightness changes, no movement

3. **Automatic Resumption**
   - Updates resume automatically when schedule ends
   - No manual intervention needed

4. **Fail-Safe**
   - If silence schedule misconfigured, worst case: board stays frozen
   - Better to block updates than risk wake-ups

### ❌ What Does NOT Happen During Silence

1. ❌ Board brightness changes
2. ❌ Text updates
3. ❌ Color changes
4. ❌ Animation/transitions
5. ❌ Content refreshes
6. ❌ Time updates
7. ❌ Weather updates
8. ❌ Any visual changes whatsoever

## Edge Cases Handled

### Power Loss During Silence Mode ⚡

**Scenario**: Container restarts while in silence mode

**Behavior**:
- Service initializes (all state reset)
- First poll detects silence mode active
- Checks: Board doesn't have "(snoozing)" indicator yet
- **Allows update** to add indicator: `board_has_indicator = False`
- Sends content with "(snoozing)"
- Sets blocking flag
- Blocks all subsequent updates

**Result**: ✅ Safe - indicator always gets added even after restart

**Example**:
```
10:00 PM - Power outage, service restarts
├─ Service starts up
├─ _last_active_page_content = None (no cached state)
├─ Poll #1: Detects silence mode active
├─ Checks: "(snoozing)" not in _last_active_page_content
├─ ✅ ALLOWS UPDATE: "Weather: 65°F ... (snoozing)"
├─ Board now has indicator
└─ All subsequent updates blocked

10:05 PM - Content changes
├─ Poll #2: Detects silence mode active
├─ Checks: "(snoozing)" IS in _last_active_page_content
└─ ❌ BLOCKS UPDATE: Board stays frozen
```

### Silence Schedule Changes During Active Silence

**Scenario**: User modifies schedule while silence is active

**Behavior**:
- Configuration changes saved
- `_snoozing_message_sent` flag remains set
- Updates continue to be blocked
- Schedule change takes effect on next poll

**Result**: ✅ Safe - updates remain blocked

### Multiple Rapid Polls

**Scenario**: Multiple polls occur in quick succession during silence

**Behavior**:
- First poll: Sends snoozing message, sets flag
- Subsequent polls: Check flag, block immediately
- No race conditions

**Result**: ✅ Safe - only one update sent

### Board Already Showing Snoozing

**Scenario**: Silence mode was active, deactivated, then reactivated

**Behavior**:
- Deactivation: Clears `_snoozing_message_sent` flag
- Reactivation: Sends new snoozing message, sets flag
- Blocks subsequent updates

**Result**: ✅ Safe - follows expected flow

## Comparison: Before vs After

### Before (UNSAFE)

```
8:00 PM - Silence activates
├─ Temperature: 72°F + (snoozing)  ← Update 1
8:05 PM - Temperature changes to 68°F
├─ Temperature: 68°F + (snoozing)  ← Update 2 💥 WAKES PEOPLE
8:10 PM - Weather changes
├─ Rainy 68°F + (snoozing)  ← Update 3 💥 WAKES PEOPLE
```

### After (SAFE) ✅

```
8:00 PM - Silence activates
├─ Temperature: 72°F + (snoozing)  ← Update 1
8:05 PM - Temperature changes to 68°F
├─ ❌ BLOCKED - Board stays at 72°F  ← No update
8:10 PM - Weather changes
├─ ❌ BLOCKED - Board stays at 72°F  ← No update
```

## Monitoring

### Real-Time Monitoring

```bash
# Watch for silence mode transitions
docker-compose -f docker-compose.dev.yml logs -f api | grep "🔇\|▶️\|⏸️"

# Watch for blocked updates
docker-compose -f docker-compose.dev.yml logs -f api | grep "blocking update"

# Check current silence status
curl http://localhost:8000/silence-status | jq
```

### Expected Log Patterns

**Normal Operation**: Regular "Active page sent to board" messages

**Entering Silence**: 
- "⏸️  Entering silence mode"
- ONE "Active page sent to board"
- "🔇 Silence mode fully activated"

**During Silence**: Repeated "blocking update to prevent wake-up"

**Exiting Silence**:
- "▶️  Exiting silence mode"
- "Active page sent to board"

## Summary

TRUE SILENCE MODE provides **absolute protection against sleep disruption** by:

✅ Blocking 100% of board updates during configured silence hours
✅ Allowing only ONE initial update to show snoozing status
✅ Preventing all automatic and manual update attempts
✅ Automatically resuming normal operation when schedule ends
✅ Providing clear logging for monitoring and debugging

**Result**: People can sleep soundly without any risk of the board waking them up.

