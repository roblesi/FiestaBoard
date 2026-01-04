# PWA Testing Guide

This guide covers how to test the Progressive Web App (PWA) functionality of the FiestaBoard Control web UI.

## Prerequisites

- Docker and Docker Compose installed
- Chrome, Edge, or Safari browser (for PWA support)
- Mobile device or emulator (optional, for mobile testing)

## Testing Checklist

### 1. Service Worker Registration

**What to test:** Service worker is properly registered and active

**How to test:**
1. Build and start the production containers:
   ```bash
   /restart
   ```

2. Open the app in your browser (http://localhost:3000 or your server IP)

3. Open DevTools (F12) → Application → Service Workers
   - You should see a service worker registered for your domain
   - Status should show "activated and is running"

**Expected result:** ✅ Service worker appears in DevTools and shows as active

**Troubleshooting:**
- Service workers only work in production builds (not `npm run dev`)
- Service workers require HTTPS in production (HTTP is OK for localhost)
- Clear browser cache and hard reload if service worker doesn't appear

---

### 2. Offline Functionality

**What to test:** App works when network is unavailable

**How to test:**
1. Load the app with network enabled
2. Navigate to a few pages (Home, Settings, Pages)
3. Open DevTools → Network tab
4. Check "Offline" box to simulate offline mode
5. Try navigating to previously visited pages
6. Try refreshing the page

**Expected result:** 
- ✅ Previously visited pages load instantly from cache
- ✅ App shows offline message for new content
- ✅ `/offline` page displays when trying to access uncached routes

**Troubleshooting:**
- If pages don't load offline, check service worker cache in DevTools → Application → Cache Storage
- Verify "offlineCache" exists and contains expected resources

---

### 3. App Installation (Desktop)

**What to test:** App can be installed on desktop

**How to test (Chrome/Edge):**
1. Load the app in Chrome or Edge
2. Look for the install icon in the address bar (⊕ icon)
3. Click the install icon or wait for the install prompt banner
4. Click "Install" in the prompt
5. App should open in a standalone window (no browser chrome)
6. Check that app appears in your OS applications

**Expected result:**
- ✅ Install prompt appears (either system or custom banner)
- ✅ App installs and opens in standalone window
- ✅ App shows proper name and icon in OS
- ✅ App can be launched from Start Menu/Dock/Applications

**Troubleshooting:**
- Install icon may not appear immediately - wait a few seconds
- If no install prompt, check DevTools → Application → Manifest for errors
- Chrome only shows install prompt if PWA criteria are met

---

### 4. App Installation (Mobile)

**What to test:** App can be installed on iOS and Android

**How to test (iOS Safari):**
1. Open the app in Safari on iPhone/iPad
2. Tap the Share button (square with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add" in the confirmation dialog
5. App icon should appear on home screen
6. Tap the icon to launch the app

**How to test (Android Chrome):**
1. Open the app in Chrome on Android
2. Wait for the "Add to Home Screen" banner or custom install prompt
3. Tap "Install" or "Add"
4. App should install and icon appears on home screen
5. Tap icon to launch

**Expected result:**
- ✅ "Add to Home Screen" option available
- ✅ App installs with correct name and icon
- ✅ App launches in standalone mode (no browser UI)
- ✅ Splash screen shows app icon while loading

**Troubleshooting:**
- iOS requires user to manually add via Share menu
- Android may auto-show banner after multiple visits
- Check manifest.json icons are properly sized (192x192, 512x512 minimum)

---

### 5. Custom Install Prompt

**What to test:** Custom install banner appears for eligible users

**How to test:**
1. Open app in Chrome (not already installed)
2. Wait 2 seconds after page load
3. Look for custom banner in bottom-right corner
4. Click "Install" button in banner
5. System install dialog should appear

**Expected result:**
- ✅ Custom banner appears after 2-second delay
- ✅ Banner shows app name, description, and install button
- ✅ Clicking "Install" triggers system install dialog
- ✅ Clicking "Not now" dismisses banner
- ✅ Dismissed banner doesn't reappear for 7 days

**Troubleshooting:**
- Banner only shows if app is installable (not already installed)
- Check localStorage for "pwa-install-dismissed" to see if dismissed
- Clear localStorage and reload to reset dismissal state

---

### 6. Offline Fallback Page

**What to test:** Custom offline page displays when network fails

**How to test:**
1. Load the app with network enabled
2. Open DevTools → Network tab
3. Set throttling to "Offline"
4. Navigate to a new page that hasn't been cached
5. The `/offline` page should load

**Expected result:**
- ✅ Custom offline page displays with app styling
- ✅ Shows helpful message about offline state
- ✅ "Try Again" button appears
- ✅ List of available offline features shown
- ✅ When network returns, button auto-reloads app

**Troubleshooting:**
- If blank page shows instead, check next.config.ts fallbacks configuration
- Verify `/offline` route exists at `web/src/app/offline/page.tsx`

---

### 7. Lighthouse PWA Score

**What to test:** App meets PWA standards

**How to test:**
1. Open app in Chrome
2. Open DevTools → Lighthouse tab
3. Select "Progressive Web App" category
4. Select "Desktop" or "Mobile" device
5. Click "Analyze page load"
6. Review the PWA score and audit results

**Expected result:**
- ✅ PWA score ≥ 90/100
- ✅ All installability checks pass
- ✅ Service worker and offline checks pass
- ✅ Manifest and icons checks pass

**Common issues:**
- **HTTPS required** - Lighthouse fails on HTTP (except localhost)
- **Viewport not set** - Already configured in layout.tsx
- **Icons missing** - Verify icons in public/icons/ directory
- **Service worker issues** - Check DevTools → Application → Service Workers

---

### 8. Manifest Validation

**What to test:** Web app manifest is valid and accessible

**How to test:**
1. Open app in browser
2. Open DevTools → Application → Manifest
3. Review all manifest properties
4. Check that icons are loading correctly

**Expected result:**
- ✅ Manifest appears in DevTools without errors
- ✅ App name shows as "FiestaBoard Control"
- ✅ Icons display properly (72x72 through 512x512)
- ✅ Theme colors are set correctly
- ✅ Display mode is "standalone"

**Troubleshooting:**
- If manifest doesn't load, check `public/manifest.json` exists
- Verify manifest is linked in `app/layout.tsx` metadata
- Check browser console for manifest parsing errors

---

## Testing in Different Environments

### Local Development
```bash
# Development mode (service worker disabled)
cd web
npm run dev
# Visit http://localhost:3000

# Production mode (service worker enabled)
npm run build
npm run start
# Visit http://localhost:3000
```

### Docker Production
```bash
# Full production build with PWA
/restart
# Visit http://localhost:3000
```

### Remote Server
```bash
# Deploy to your server
# Service worker requires HTTPS (not HTTP)
# Use your domain with SSL certificate
```

---

## Browser Support

| Browser | Installation | Service Worker | Offline |
|---------|-------------|----------------|---------|
| Chrome (Desktop) | ✅ | ✅ | ✅ |
| Chrome (Android) | ✅ | ✅ | ✅ |
| Edge (Desktop) | ✅ | ✅ | ✅ |
| Safari (iOS) | ✅ Manual | ✅ | ✅ |
| Safari (macOS) | ⚠️ Limited | ✅ | ✅ |
| Firefox | ❌ | ✅ | ✅ |

**Notes:**
- iOS Safari requires manual "Add to Home Screen" (no automatic prompt)
- macOS Safari has limited PWA support
- Firefox supports service workers but not installation prompts

---

## Debugging Tips

### Service Worker Not Updating
```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => registration.unregister());
});
// Then hard reload (Ctrl+Shift+R)
```

### Check PWA Status
The app includes built-in PWA utilities. In browser console:
```javascript
// Import utilities
import { logPWAStatus } from '@/lib/pwa-utils';
await logPWAStatus();
```

### Clear All Caches
```javascript
// In browser console
caches.keys().then(names => {
  names.forEach(name => caches.delete(name));
});
```

---

## Success Criteria

Before considering PWA implementation complete, verify:

- [ ] ✅ Service worker registers on production build
- [ ] ✅ App works offline for previously visited pages
- [ ] ✅ App can be installed on desktop (Chrome/Edge)
- [ ] ✅ App can be installed on mobile (iOS/Android)
- [ ] ✅ Custom install prompt appears and functions
- [ ] ✅ Offline fallback page displays correctly
- [ ] ✅ Lighthouse PWA score ≥ 90
- [ ] ✅ Manifest is valid with no errors
- [ ] ✅ Icons display correctly on all platforms
- [ ] ✅ App launches in standalone mode when installed

---

## Resources

- [MDN: Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [web.dev: PWA Checklist](https://web.dev/pwa-checklist/)
- [Chrome DevTools: Debug PWAs](https://developer.chrome.com/docs/devtools/progressive-web-apps/)
- [Lighthouse PWA Audit](https://web.dev/lighthouse-pwa/)

