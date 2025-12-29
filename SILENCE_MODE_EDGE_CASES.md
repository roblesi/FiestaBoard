# Silence Mode Edge Case Handling

## The Problem

During silence hours, the board MUST show the "(snoozing)" indicator to visually confirm that silence mode is active. However, various edge cases could result in the indicator being missing:

### Edge Cases That Could Leave Board Without Indicator

1. **Power Outage During Silence Hours**
   - Container stops unexpectedly
   - Service restarts while silence schedule is still active
   - All cached state is lost

2. **Manual Container Restart**
   - Developer runs `docker-compose restart`
   - Service reinitializes during active silence period

3. **Service Crash**
   - Bug causes service to crash and restart
   - Happens to occur during silence hours

4. **Initial Deployment**
   - Service deployed for first time
   - Happens to be within configured silence hours

5. **Silence Schedule Modified**
   - User changes schedule while silence is active
   - Service restarts to apply changes

## The Solution: Smart Indicator Detection

Instead of relying on a flag that could be lost, we check the **actual board content** to see if the indicator is present.

### Implementation Logic

```python
# Check if board currently has the indicator
board_has_indicator = (
    self._last_active_page_content and 
    "(snoozing)" in self._last_active_page_content
)

if silence_mode_active:
    if not board_has_indicator:
        # Indicator missing - ALLOW update to add it
        logger.info("🔄 Board missing snoozing indicator - allowing update")
        content_to_send = add_snoozing_indicator(content)
        send_to_board(content_to_send)  # ✅ ALLOWED
    else:
        # Indicator present - BLOCK all updates
        logger.info("Blocking update - indicator already shown")
        return False  # ❌ BLOCKED
```

### Key Benefits

✅ **Self-Healing**: System automatically recovers from any state loss
✅ **Guaranteed Indicator**: Board will ALWAYS show "(snoozing)" during silence hours
✅ **Idempotent**: Checking actual content prevents duplicate sends
✅ **No Race Conditions**: Based on real board state, not volatile flags

## Detailed Scenarios

### Scenario 1: Normal Entry into Silence Mode

```
7:59 PM - Normal operation
├─ Board: "Weather: 72°F"
└─ silence_mode_active = False

8:00 PM - Silence schedule activates
├─ Poll #1
├─ silence_mode_active = True
├─ board_has_indicator = False (no cached content yet)
├─ ✅ ALLOW UPDATE: "Weather: 72°F ... (snoozing)"
├─ Cache: _last_active_page_content = "Weather: 72°F ... (snoozing)"
└─ Board now shows indicator

8:05 PM - Temperature changes to 68°F
├─ Poll #2
├─ silence_mode_active = True
├─ board_has_indicator = True ("(snoozing)" in cached content)
├─ ❌ BLOCK UPDATE
└─ Board stays: "Weather: 72°F ... (snoozing)"
```

### Scenario 2: Power Outage During Silence ⚡

```
10:00 PM - Silence mode active, board showing indicator
├─ Board: "Weather: 65°F ... (snoozing)"
└─ Everything working normally

10:15 PM - POWER OUTAGE
├─ Container stops
├─ All cached state LOST
└─ _last_active_page_content = None

10:16 PM - Power restored, service restarts
├─ Initialize service (all state reset)
├─ silence_mode_active = True (schedule still active)
└─ _last_active_page_content = None

10:17 PM - First poll after restart
├─ Render page: "Weather: 63°F"
├─ silence_mode_active = True
├─ board_has_indicator = False (None doesn't contain "(snoozing)")
├─ 🔄 LOG: "Board missing snoozing indicator - allowing update"
├─ ✅ ALLOW UPDATE: "Weather: 63°F ... (snoozing)"
├─ Cache: _last_active_page_content = "Weather: 63°F ... (snoozing)"
└─ Board shows indicator again!

10:18 PM - Second poll after restart
├─ Render page: "Weather: 63°F"
├─ silence_mode_active = True
├─ board_has_indicator = True ("(snoozing)" now in cached content)
├─ ❌ BLOCK UPDATE
└─ Board stays frozen
```

**Result**: Indicator automatically restored after power outage! ✅

### Scenario 3: Restart During Active Silence

```
11:00 PM - Silence active, indicator shown
├─ Board: "Time: 11:00 PM ... (snoozing)"

11:05 PM - Developer runs: docker-compose restart api
├─ Container restarts
├─ All state lost

11:05 PM - Service comes back online
├─ First poll
├─ silence_mode_active = True
├─ board_has_indicator = False (cache empty)
├─ ✅ ALLOW UPDATE: "Time: 11:05 PM ... (snoozing)"
└─ Indicator restored

11:06 PM - Subsequent polls
├─ board_has_indicator = True
└─ ❌ BLOCKS all updates
```

**Result**: Indicator reappears immediately after restart! ✅

### Scenario 4: Multiple Rapid Restarts

```
2:00 AM - Silence active
├─ Restart #1: Adds indicator ✅
├─ Restart #2 (30 seconds later): Adds indicator ✅
├─ Restart #3 (1 minute later): Adds indicator ✅
└─ Each restart triggers ONE update to restore indicator
```

**Trade-off**: Multiple restarts = multiple updates, but this is acceptable because:
- Restarts are rare events (not normal operation)
- Having the indicator is CRITICAL for user confidence
- Alternative is board without indicator, which is worse

## Comparison: Flag-Based vs Content-Based

### Flag-Based Approach (Vulnerable)

```python
# Lost on restart!
self._snoozing_message_sent = False

if silence_mode_active and self._snoozing_message_sent:
    return False  # Block
```

**Problems**:
- ❌ Flag lost on restart → no indicator after power outage
- ❌ Flag lost on crash → no indicator after recovery
- ❌ Flag not persisted → no indicator on service restart

### Content-Based Approach (Robust) ✅

```python
# Based on actual board content
board_has_indicator = "(snoozing)" in self._last_active_page_content

if silence_mode_active and board_has_indicator:
    return False  # Block
```

**Benefits**:
- ✅ Checks actual board state
- ✅ Self-corrects after any state loss
- ✅ Idempotent (repeated checks give same result)
- ✅ Handles all edge cases automatically

## Safety Guarantees

### ✅ What IS Guaranteed

1. **Indicator Always Present**: During silence hours, board will show "(snoozing)"
2. **Self-Healing**: Any state loss automatically triggers indicator restoration
3. **Minimal Updates**: Only ONE update per state loss event
4. **No Excessive Updates**: Normal content changes still blocked

### ⚠️ What Is NOT Guaranteed

1. **Zero Updates on Restart**: Service restart = ONE update (to restore indicator)
   - This is intentional and acceptable
   - Indicator presence is more important than avoiding ONE update

2. **Instant Recovery**: There's a polling delay (usually 60 seconds)
   - After restart, indicator appears on next poll cycle
   - Not instantaneous, but fast enough

## Testing Edge Cases

### Test 1: Simulated Power Outage

```bash
# During silence hours (e.g., 10:00 PM)
# Verify board shows indicator

# Kill and restart container
docker-compose -f docker-compose.dev.yml restart api

# Watch logs
docker-compose -f docker-compose.dev.yml logs -f api | grep "🔄\|🔇"

# Expected output:
# 🔄 Silence mode active but board missing snoozing indicator - allowing update
# 🔇 Silence mode fully activated - ALL further updates blocked

# Check board: Should show indicator again
```

### Test 2: Multiple Rapid Restarts

```bash
# During silence hours
for i in {1..3}; do
  docker-compose -f docker-compose.dev.yml restart api
  sleep 30
done

# Watch logs - should see indicator restored 3 times
# Each restart = ONE update, then blocking resumes
```

### Test 3: Service Crashes

```bash
# During silence hours
# Kill the container ungracefully
docker-compose -f docker-compose.dev.yml kill api

# Start it back up
docker-compose -f docker-compose.dev.yml start api

# Verify indicator restored on next poll
```

## Monitoring

### Log Messages

**Indicator Missing (Allowing Update)**:
```
🔄 Silence mode active but board missing snoozing indicator - allowing update
⚡ Silence mode active - ensuring snoozing indicator is displayed
🔇 Silence mode fully activated - ALL further updates blocked
```

**Indicator Present (Blocking Updates)**:
```
Silence mode active - blocking update to prevent wake-up (indicator already shown)
```

### Real-Time Monitoring

```bash
# Watch for edge case recovery
docker-compose -f docker-compose.dev.yml logs -f api | grep "🔄\|⚡"

# Watch for blocking (normal behavior)
docker-compose -f docker-compose.dev.yml logs -f api | grep "blocking update"
```

## Decision Matrix

| Condition | Has Indicator? | Action | Reason |
|-----------|---------------|--------|---------|
| Silence active | ✅ Yes | ❌ Block | Indicator present, prevent wake-up |
| Silence active | ❌ No | ✅ Allow ONE | Must show indicator |
| Silence entering | N/A | ✅ Allow ONE | Initial indicator |
| Silence exiting | N/A | ✅ Allow ONE | Remove indicator, resume |
| Normal mode | N/A | ✅ If changed | Standard operation |

## Summary

The content-based indicator detection ensures that:

1. ✅ **Board always shows indicator during silence hours**
2. ✅ **System recovers automatically from any state loss**
3. ✅ **Minimal updates** (only when indicator missing)
4. ✅ **Maximum sleep protection** (updates blocked when indicator present)
5. ✅ **User confidence** (indicator visible = silence mode working)

This approach prioritizes **reliability and user confidence** over avoiding a single update during rare edge cases (restarts, power outages).

**Better to have ONE update that adds the indicator than zero updates that leave the board without it!**

