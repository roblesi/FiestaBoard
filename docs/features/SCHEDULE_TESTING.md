# Schedule Feature - Manual Testing Guide

## Purpose

This guide provides comprehensive manual test scenarios to verify the schedule feature works end-to-end. Use this to catch UI flow issues, real-time behavior, and edge cases that automated tests might miss.

## Prerequisites

1. FiestaBoard API and UI running (use `/start` or `docker-compose up`)
2. At least 3 pages created in the system
3. Python 3 installed (for test schedule script)

## Quick Real-Time Test

### Automated Test Schedule Setup

The easiest way to test schedule switching in real-time:

```bash
# From project root
python scripts/create_test_schedule.py

# Or specify custom API URL
python scripts/create_test_schedule.py --api-url http://your-ip:6969
```

This script creates 3 schedules that trigger:
- **Now**: Display page 1 (current time → +5 minutes)
- **+5 min**: Display page 2 (+5 min → +10 minutes)
- **+10 min**: Display page 3 (+10 min → +15 minutes)

**Expected Behavior**:
1. Page 1 should display immediately on home page
2. After ~5 minutes, page switches to page 2
3. After ~10 minutes, page switches to page 3
4. Switches may be delayed up to 60 seconds (polling interval)

## Comprehensive Manual Test Scenarios

### Test 1: Create Schedule (Basic Flow)

**Steps**:
1. Navigate to **Schedule** page (sidebar)
2. Verify timezone is displayed correctly at top
3. Click **Add Schedule** button
4. In the form:
   - Select a page from dropdown
   - Set start time (e.g., 09:00)
   - Set end time (e.g., 17:00)
   - Select day pattern (Weekdays)
   - Verify enabled toggle is ON
5. Click **Create** (or Save)

**Expected Result**:
- Schedule appears in list
- Shows correct page name, times, and days
- Toast notification: "Schedule created"
- No errors

### Test 2: Custom Days Selection

**Steps**:
1. Click **Add Schedule**
2. Fill basic fields
3. Select **Custom** day pattern
4. Verify 7 day checkboxes appear (Mon-Sun)
5. Click **Monday**, **Wednesday**, **Friday**
6. Verify selected days are highlighted
7. Click **Wednesday** again to deselect
8. Verify Wednesday is no longer highlighted
9. Create the schedule

**Expected Result**:
- Custom days persist correctly
- Schedule shows "Mon, Fri" in the list
- No nested button warnings in console

### Test 3: Default Page Selection (Bug Fix Verification)

**Steps**:
1. On Schedule page, find **Default Page** card
2. Note current default page (or "No default page set")
3. Click **Change** button
4. Modal opens with list of pages
5. **CRITICAL**: Click on a page name

**Expected Result**:
- ✅ Page is selected (check mark appears)
- ✅ Modal stays open (does NOT navigate to edit page)
- ✅ Click outside or Cancel to close modal
- ❌ Should NOT navigate to `/pages/edit?id=...`

**Regression**: Before fix, clicking would navigate to edit page instead of selecting.

### Test 4: Schedule Validation - Overlaps

**Steps**:
1. Create Schedule A: `09:00 - 12:00`, Weekdays
2. Create Schedule B: `11:00 - 14:00`, Weekdays (overlaps with A)
3. Check for validation warning

**Expected Result**:
- Red/warning alert appears: "Schedule Conflicts Detected"
- Lists the conflicting schedules with description
- Both schedules still exist but user is warned

### Test 5: Schedule Validation - Gaps

**Steps**:
1. Clear all existing schedules (or disable them)
2. Create Schedule A: `09:00 - 12:00`, Weekdays
3. Create Schedule B: `14:00 - 17:00`, Weekdays (2-hour gap)
4. Enable schedule mode
5. Check for gap warning

**Expected Result**:
- Yellow/warning alert: "X time gap(s) in schedule"
- Suggests setting a default page
- Gaps detected: 00:00-09:00, 12:00-14:00, 17:00-23:59

### Test 6: Enable/Disable Schedule Mode

**Steps**:
1. Navigate to home page
2. Note "Manual Mode" badge and "Change Page" button
3. Go to Schedule page
4. Toggle **Schedule Mode** switch ON
5. Return to home page

**Expected Result**:
- Badge changes to "Schedule Mode" with calendar icon
- Button changes from "Change Page" to "View Schedule"
- Clicking button navigates to `/schedule` (not page selector)
- If no active schedule, see "Schedule gap" warning

**Steps** (Disable):
1. Go to Schedule page
2. Toggle Schedule Mode OFF
3. Return to home page

**Expected Result**:
- Badge back to "Manual Mode"
- Button back to "Change Page"
- Clicking opens page selector sheet

### Test 7: Edit Schedule

**Steps**:
1. Create a schedule
2. Click **Edit** icon (pencil) on the schedule
3. Modal opens with form pre-filled
4. Change start time from `09:00` to `08:00`
5. Click **Save**

**Expected Result**:
- Modal closes
- Schedule in list updates to show `08:00`
- Toast: "Schedule updated"

### Test 8: Delete Schedule

**Steps**:
1. Create a test schedule
2. Click **Delete** icon (trash) on the schedule
3. Confirmation dialog appears
4. Click **Delete** (confirm)

**Expected Result**:
- Schedule removed from list
- Toast: "Schedule deleted"
- Validation refreshes (overlaps/gaps may change)

### Test 9: Disable Individual Schedule

**Steps**:
1. Create schedule with enabled=true (default)
2. Edit the schedule
3. Toggle **Enabled** switch OFF
4. Save

**Expected Result**:
- Schedule shows "Disabled" badge in list
- Schedule no longer affects active page resolution
- Schedule no longer counted in overlap/gap validation

### Test 10: Real-Time Schedule Switching

**Setup**: Use `scripts/create_test_schedule.py` (see Quick Test above)

**Steps**:
1. Run the script to create test schedules
2. Navigate to home page
3. Verify Schedule Mode badge is shown
4. Note which page is currently active
5. Wait 5-6 minutes (or until next scheduled time)
6. Watch the home page

**Expected Result**:
- Active page name changes automatically (within 60 seconds of scheduled time)
- Board preview updates to show new page content
- No errors in console
- Smooth transition (no flashing or loading errors)

**Timing Note**: Due to 60-second polling interval, switches may be delayed. A schedule set for `14:05:00` might not switch until `14:05:45` or even `14:06:00`.

### Test 11: Schedule Gap with No Default Page

**Steps**:
1. Create schedules that DON'T cover current time (e.g., only 09:00-17:00, test at 20:00)
2. Ensure **Default Page** is set to "None"
3. Enable schedule mode
4. Navigate to home page

**Expected Result**:
- Yellow warning alert: "No page scheduled for current time"
- Message includes link to "Schedule settings"
- Board display shows empty/last page (depending on fallback logic)
- No crashes or errors

### Test 12: Schedule Gap with Default Page Set

**Steps**:
1. Same setup as Test 11 (gap exists)
2. Go to Schedule page
3. Click **Change** on Default Page card
4. Select a page as default
5. Close modal
6. Verify default page is shown in card
7. Return to home page

**Expected Result**:
- No gap warning (or less severe)
- Home page shows the default page
- Badge still says "Schedule Mode"

### Test 13: Multiple Schedules on Same Day

**Steps**:
1. Create Schedule A: `09:00 - 12:00`, Monday
2. Create Schedule B: `14:00 - 17:00`, Monday (no overlap)
3. Create Schedule C: `18:00 - 20:00`, Tuesday

**Expected Result**:
- All schedules created successfully
- Validation shows gaps on Monday: `00:00-09:00`, `12:00-14:00`, `17:00-23:59`
- No overlaps detected
- Tuesday gaps: `00:00-18:00`, `20:00-23:59`

### Test 14: Timezone Display

**Steps**:
1. Navigate to Schedule page
2. Look at header area

**Expected Result**:
- Text shows: "Times shown in: [Your Timezone]"
- Example: "Times shown in: America/Los_Angeles"
- Timezone matches your browser/system timezone

### Test 15: Form Validation

**Steps**:
1. Click **Add Schedule**
2. Try to create schedule with:
   - Start time = `12:00`
   - End time = `09:00` (before start)
3. Attempt to save

**Expected Result**:
- Client-side validation error
- Form doesn't submit
- Error message near time fields

**Additional**: Try invalid times like `25:00`, `12:75`, or `not-a-time`. Form should prevent or show errors.

## Test Coverage Summary

| Area | Test # | Pass/Fail | Notes |
|------|--------|-----------|-------|
| Create schedule | 1 | | |
| Custom days | 2 | | |
| Default page picker | 3 | | Bug fix regression test |
| Overlap detection | 4 | | |
| Gap detection | 5 | | |
| Enable/disable mode | 6 | | |
| Edit schedule | 7 | | |
| Delete schedule | 8 | | |
| Disable schedule | 9 | | |
| Real-time switching | 10 | | Requires waiting |
| Gap with no default | 11 | | |
| Gap with default | 12 | | |
| Multiple schedules | 13 | | |
| Timezone display | 14 | | |
| Form validation | 15 | | |

## Common Issues to Watch For

### Issue: Schedule not switching

**Possible Causes**:
1. Schedule mode not enabled
2. Individual schedule disabled
3. Time/day doesn't match (check timezone)
4. Waiting for next 60-second poll
5. Browser tab in background (throttled)

**Debug**:
- Check browser console for errors
- Verify schedule mode toggle is ON
- Check API `/schedules/active/page` endpoint directly
- Verify server logs for schedule resolution

### Issue: Default page picker navigates to edit

**This is the bug we fixed!** If this happens:
1. Check you're using `PagePickerDialog` component
2. Verify no `PageSelector` usage in Schedule page
3. Check browser console for React warnings

### Issue: Nested button warnings

**This is also fixed!** If you see console warnings:
```
In HTML, <button> cannot be a descendant of <button>
```

The DaySelector component was updated to use `<label>` + hidden checkboxes instead of nested buttons.

### Issue: Overlaps not detected

**Check**:
1. Are schedules on the same days?
2. Do time ranges actually overlap? (remember: end time is exclusive)
3. Are both schedules enabled?

### Issue: Times don't match expectations

**Remember**:
- Times are shown in browser timezone
- Times execute in server timezone
- If these differ, displayed times ≠ execution times

## Automated Test Coverage

The following are covered by automated component tests (`web/src/__tests__/schedule-components.test.tsx`):

- ✅ PagePickerDialog renders pages
- ✅ PagePickerDialog calls onSelect (not navigate)
- ✅ PagePickerDialog shows/hides "None" option
- ✅ DaySelector renders day patterns
- ✅ DaySelector shows custom day checkboxes
- ✅ DaySelector toggles days correctly
- ✅ No nested button HTML issues

Backend unit tests cover schedule logic, validation, and API endpoints.

## Regression Test Checklist

Before releasing schedule feature updates, run these critical tests:

- [ ] Test 3: Default page picker doesn't navigate
- [ ] Test 6: Schedule mode toggle updates home page
- [ ] Test 10: Real-time switching works (wait for actual switch)
- [ ] Test 11/12: Gap handling with/without default page
- [ ] Console: No nested button warnings

## Performance Testing

For large deployments:

1. Create 20-30 schedules covering different days/times
2. Navigate to Schedule page - should load quickly
3. Create new schedule - validation should complete in <2 seconds
4. Check gap detection doesn't lag

If validation takes >5 seconds with 50+ schedules, the gap detection algorithm may need optimization.

## Notes for Developers

When adding new schedule features, update this test guide with new scenarios. The goal is to catch UI flow bugs (like the default page picker navigation issue) that automated tests might miss.

Consider recording a test session video for complex flows (especially real-time switching) to serve as reference for future testing.
