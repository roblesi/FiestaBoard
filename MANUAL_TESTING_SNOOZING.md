# Manual Testing Guide: Snoozing Indicator & Timezone Handling

This guide provides step-by-step instructions for manually testing the snoozing indicator feature and timezone handling.

## Prerequisites

- Docker containers running (`/start` command or `docker-compose -f docker-compose.dev.yml up`)
- Access to the web UI (typically http://localhost:3000)
- Access to the API (typically http://localhost:8000)

## Part 1: Timezone Handling Validation

### Test 1: UI Timezone Conversion (Local → UTC)

**Objective**: Verify that times entered in the UI are correctly converted to UTC for storage.

**Steps**:
1. Open the web UI and navigate to Settings
2. Set timezone to "America/Los_Angeles" (PST/PDT)
3. Enable Silence Schedule
4. Set start time: `20:00` (8:00 PM PST)
5. Set end time: `07:00` (7:00 AM PST)
6. Click "Save Changes"
7. Check the backend config file:
   ```bash
   cat data/config.json | grep -A 5 silence_schedule
   ```

**Expected Result**:
- During PST (winter): `start_time: "04:00+00:00"`, `end_time: "15:00+00:00"`
- During PDT (summer): `start_time: "03:00+00:00"`, `end_time: "14:00+00:00"`

### Test 2: UI Timezone Conversion (UTC → Local)

**Objective**: Verify that UTC times are correctly displayed in the user's local timezone.

**Steps**:
1. Manually edit `data/config.json` to set:
   ```json
   "silence_schedule": {
     "enabled": true,
     "start_time": "04:00+00:00",
     "end_time": "15:00+00:00"
   }
   ```
2. Set general timezone to "America/Los_Angeles"
3. Restart the API server (or reload config)
4. Open the web UI Settings page
5. Check the displayed times in the Silence Schedule section

**Expected Result**:
- Start time displays as: `20:00` (8:00 PM PST)
- End time displays as: `07:00` (7:00 AM PST)

### Test 3: Timezone Change Impact

**Objective**: Verify that changing timezone updates the silence schedule display correctly.

**Steps**:
1. Set timezone to "America/Los_Angeles" with silence schedule `20:00-07:00`
2. Note the UTC times in `data/config.json`
3. Change timezone to "America/New_York" in the UI
4. Save changes
5. Check that the silence schedule times update in the UI

**Expected Result**:
- Times should remain the same in UTC storage
- Times should display differently in the UI (3 hours ahead for EST)
- Example: `20:00 PST` → `23:00 EST` (both are `04:00+00:00` UTC)

## Part 2: Silence Mode Window Testing

### Test 4: Midnight-Spanning Window

**Objective**: Verify that silence windows spanning midnight work correctly.

**Setup**:
- Set silence schedule: `20:00-07:00` (8 PM to 7 AM)
- Timezone: America/Los_Angeles

**Test Times** (use system time or mock):

| Local Time | Expected Silence Mode | Reason |
|------------|----------------------|---------|
| 19:59 PST  | ❌ Not active        | Before start |
| 20:00 PST  | ✅ Active            | At start time |
| 23:00 PST  | ✅ Active            | Before midnight |
| 00:30 PST  | ✅ Active            | After midnight |
| 06:59 PST  | ✅ Active            | Before end |
| 07:00 PST  | ❌ Not active        | At end time |
| 12:00 PST  | ❌ Not active        | Midday |

**Verification Method**:
```bash
# Check API endpoint
curl http://localhost:8000/silence-status

# Check logs
docker-compose -f docker-compose.dev.yml logs -f api | grep -i silence
```

### Test 5: Same-Day Window

**Objective**: Verify that silence windows within the same day work correctly.

**Setup**:
- Set silence schedule: `09:00-17:00` (9 AM to 5 PM)
- Timezone: America/Los_Angeles

**Test Times**:

| Local Time | Expected Silence Mode | Reason |
|------------|----------------------|---------|
| 08:59 PST  | ❌ Not active        | Before start |
| 09:00 PST  | ✅ Active            | At start time |
| 13:00 PST  | ✅ Active            | Midday |
| 17:00 PST  | ✅ Active            | At end time |
| 17:01 PST  | ❌ Not active        | After end |

## Part 3: Snoozing Indicator Testing

### Test 6: Indicator Appears During Silence Mode

**Objective**: Verify that "(snoozing)" appears in the bottom right when silence mode is active.

**Steps**:
1. Set silence schedule to be currently active (e.g., if it's 10 PM, set `20:00-07:00`)
2. Enable silence schedule
3. Create or update a page with content
4. Send the page to the board (via UI or API)
5. Check the board display (or preview in dev mode)

**Expected Result**:
- Content displays normally
- Bottom right corner shows "(snoozing)"
- Example:
  ```
  Weather: Sunny
  Temp: 72F
  Humidity: 45%
  
  
            (snoozing)
  ```

### Test 7: Indicator Does Not Appear Outside Silence Mode

**Objective**: Verify that "(snoozing)" does NOT appear when silence mode is inactive.

**Steps**:
1. Set silence schedule to be currently inactive (e.g., if it's 10 AM, set `20:00-07:00`)
2. Enable silence schedule
3. Send a page to the board
4. Check the board display

**Expected Result**:
- Content displays normally
- NO "(snoozing)" indicator appears

### Test 8: Indicator with Short Content

**Objective**: Verify indicator placement when last line is short.

**Steps**:
1. Activate silence mode
2. Create a page with short content:
   ```
   Hello
   World
   
   
   
   End
   ```
3. Send to board

**Expected Result**:
- Last line should show: `End         (snoozing)` (with spacing)

### Test 9: Indicator with Long Content

**Objective**: Verify that long content is truncated to make room for indicator.

**Steps**:
1. Activate silence mode
2. Create a page with long last line:
   ```
   Line 1
   Line 2
   Line 3
   Line 4
   Line 5
   This is a very long line that exceeds the limit
   ```
3. Send to board

**Expected Result**:
- Last line should be truncated: `This is a (snoozing)`
- Total line length should not exceed 22 characters

### Test 10: Indicator Across Different Endpoints

**Objective**: Verify indicator appears from all sending methods.

**Test each endpoint**:

1. **Active Page Polling** (automatic):
   - Set active page
   - Wait for polling interval
   - Check board

2. **Manual Page Send** (via UI):
   - Click "Send to Board" button on a page
   - Check board

3. **API Send Message**:
   ```bash
   curl -X POST http://localhost:8000/send-message \
     -H "Content-Type: application/json" \
     -d '{"text": "Test message\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6"}'
   ```

4. **API Send Page**:
   ```bash
   curl -X POST http://localhost:8000/pages/{page_id}/send
   ```

**Expected Result**: All methods should add "(snoozing)" indicator when silence mode is active.

## Part 4: Edge Cases

### Test 11: Empty Last Line

**Steps**:
1. Activate silence mode
2. Send content with empty last line:
   ```
   Line 1
   Line 2
   Line 3
   Line 4
   Line 5
   
   ```

**Expected Result**: Last line shows only `(snoozing)` (right-aligned)

### Test 12: Content with Color Markers

**Steps**:
1. Activate silence mode
2. Send content with color markers:
   ```
   {{red}} Alert
   Temperature: {{green}} 72F
   Status: OK
   
   
   Last line here
   ```

**Expected Result**:
- Color markers preserved
- Indicator added to last line: `Last line here (snoozing)`

### Test 13: Fewer Than 6 Lines

**Steps**:
1. Activate silence mode
2. Send content with only 3 lines:
   ```
   Line 1
   Line 2
   Line 3
   ```

**Expected Result**:
- Content padded to 6 lines
- Indicator appears on line 6: `            (snoozing)`

## Part 5: Integration Testing

### Test 14: Silence Mode Toggle

**Objective**: Verify smooth transition when toggling silence mode.

**Steps**:
1. Set silence schedule to be active
2. Disable silence schedule in UI
3. Send a page - verify NO indicator
4. Enable silence schedule in UI
5. Send same page - verify indicator appears

### Test 15: Real-Time Transition

**Objective**: Verify indicator appears/disappears at schedule boundaries.

**Steps**:
1. Set silence schedule to start in 2 minutes
2. Send a page before start time - verify NO indicator
3. Wait for start time
4. Send same page after start time - verify indicator appears
5. Set end time to 2 minutes from now
6. Wait for end time
7. Send page after end time - verify NO indicator

## Verification Checklist

- [ ] Timezone conversions (local → UTC) work correctly
- [ ] Timezone conversions (UTC → local) work correctly
- [ ] Midnight-spanning windows work correctly
- [ ] Same-day windows work correctly
- [ ] Indicator appears during silence mode
- [ ] Indicator does NOT appear outside silence mode
- [ ] Indicator works with short content
- [ ] Indicator works with long content (truncates)
- [ ] Indicator works from all endpoints
- [ ] Indicator works with empty last line
- [ ] Indicator preserves color markers
- [ ] Indicator works with fewer than 6 lines
- [ ] Silence mode toggle works correctly
- [ ] Real-time transitions work correctly

## Troubleshooting

### Indicator Not Appearing

1. Check silence mode is active:
   ```bash
   curl http://localhost:8000/silence-status
   ```

2. Check logs:
   ```bash
   docker-compose -f docker-compose.dev.yml logs -f api | grep -i silence
   ```

3. Verify times are in correct format in config:
   ```bash
   cat data/config.json | jq .features.silence_schedule
   ```

### Timezone Issues

1. Check general timezone setting:
   ```bash
   cat data/config.json | jq .general.timezone
   ```

2. Verify UTC conversion:
   - Use online converter: https://www.worldtimebuddy.com/
   - Compare with stored UTC times

### Board Not Updating

1. Check dev mode is disabled:
   ```bash
   curl http://localhost:8000/status | jq .dev_mode
   ```

2. Verify board connection:
   ```bash
   docker-compose -f docker-compose.dev.yml logs -f api | grep -i vestaboard
   ```

