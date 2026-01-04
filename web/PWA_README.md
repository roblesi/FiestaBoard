# Progressive Web App (PWA) Implementation

FiestaBoard Control is now a fully functional Progressive Web App! This means users can install it on their devices and use it offline.

## Features

### 🚀 Installable
- **Desktop**: Install on Windows, macOS, Linux, ChromeOS
- **Mobile**: Install on iOS (Safari) and Android (Chrome)
- **Custom Install Prompt**: User-friendly banner prompts installation
- **Standalone Mode**: Runs like a native app without browser chrome

### 📴 Offline Support
- **Service Worker**: Automatically caches pages and assets
- **Network-First Strategy**: Tries network, falls back to cache
- **Offline Fallback**: Custom offline page when network unavailable
- **Auto-Recovery**: Automatically reloads when connection restored

### ⚡ Performance
- **Instant Loading**: Cached assets load immediately
- **Background Updates**: Service worker updates in background
- **Reduced Bandwidth**: Fewer network requests after first visit

## Technical Implementation

### Stack
- **Next.js 15**: App Router with standalone output
- **@ducanh2912/next-pwa**: Workbox-based PWA plugin for Next.js 15
- **Service Worker**: Automatic generation with Workbox
- **Web App Manifest**: Complete manifest with all required fields

### Architecture

```
web/
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── icons/                 # PWA icons (72x72 to 512x512)
│   ├── sw.js                  # Service worker (generated)
│   └── workbox-*.js           # Workbox runtime (generated)
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Manifest link, install prompt integration
│   │   └── offline/
│   │       └── page.tsx       # Offline fallback page
│   ├── components/
│   │   └── install-prompt.tsx # Custom install banner
│   └── lib/
│       └── pwa-utils.ts       # PWA helper functions
└── next.config.ts             # PWA plugin configuration
```

### Configuration

The PWA is configured in [`next.config.ts`](next.config.ts):

```typescript
const withPWA = withPWAInit({
  dest: "public",                    // Output directory
  disable: process.env.NODE_ENV === "development", // Disable in dev
  register: true,                    // Auto-register service worker
  skipWaiting: true,                 // Update immediately
  reloadOnOnline: true,              // Reload when back online
  fallbacks: {
    document: "/offline",            // Offline fallback page
  },
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: /^https?.*/,     // Cache all HTTP(S) requests
        handler: "NetworkFirst",      // Try network, fallback to cache
        options: {
          cacheName: "offlineCache",
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
          },
          networkTimeoutSeconds: 10,
        },
      },
    ],
  },
});
```

## Usage

### For Developers

**Development Mode** (Service worker disabled):
```bash
cd web
npm run dev
```

**Production Mode** (Service worker enabled):
```bash
# Local production build
cd web
npm run build
npm run start

# Docker production build
/restart
```

**Test PWA Features**:
See [`docs/development/PWA_TESTING.md`](../docs/development/PWA_TESTING.md) for comprehensive testing guide.

### For Users

**Install on Desktop (Chrome/Edge)**:
1. Visit the FiestaBoard Control app
2. Look for install icon (⊕) in address bar
3. Click "Install" in the prompt
4. App opens in standalone window

**Install on Mobile (iOS)**:
1. Open in Safari
2. Tap Share button
3. Tap "Add to Home Screen"
4. Tap "Add"

**Install on Mobile (Android)**:
1. Open in Chrome
2. Wait for "Add to Home Screen" banner
3. Tap "Install"

**Use Offline**:
- Once installed, the app works offline for previously visited pages
- New pages will show offline message until connection restored

## Browser Support

| Feature | Chrome | Edge | Safari | Firefox |
|---------|--------|------|--------|---------|
| Service Worker | ✅ | ✅ | ✅ | ✅ |
| Installation | ✅ | ✅ | ⚠️ Manual | ❌ |
| Offline Mode | ✅ | ✅ | ✅ | ✅ |
| Push Notifications* | ✅ | ✅ | ❌ | ✅ |

*Push notifications not yet implemented

## Maintenance

### Updating Service Worker

Service worker updates automatically when you deploy new code:

1. User visits site with new version
2. New service worker installs in background
3. On next visit, new version activates
4. No user action required

### Force Service Worker Update

If needed, users can force update:

```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => registration.unregister());
});
// Then hard reload (Ctrl+Shift+R)
```

### Clear Caches

```javascript
// In browser console
caches.keys().then(names => {
  names.forEach(name => caches.delete(name));
});
```

## Debugging

### Check Service Worker Status

Open DevTools → Application → Service Workers

### Validate Manifest

Open DevTools → Application → Manifest

### Run Lighthouse Audit

Open DevTools → Lighthouse → Select "Progressive Web App" → Analyze

### Use Built-in Utilities

```javascript
// In browser console (development mode)
import { logPWAStatus } from '@/lib/pwa-utils';
await logPWAStatus();
```

## Files Modified/Created

### Modified
- `web/package.json` - Added @ducanh2912/next-pwa dependency
- `web/next.config.ts` - Configured PWA plugin
- `web/src/app/layout.tsx` - Added install prompt component
- `web/.gitignore` - Ignore generated service worker files
- `Dockerfile.ui` - Ensured PWA files included in build

### Created
- `web/src/app/offline/page.tsx` - Offline fallback page
- `web/src/components/install-prompt.tsx` - Custom install banner
- `web/src/lib/pwa-utils.ts` - PWA utility functions
- `docs/development/PWA_TESTING.md` - Comprehensive testing guide
- `web/PWA_README.md` - This file

## Resources

- [Next PWA Documentation](https://github.com/DuCanhGH/next-pwa)
- [Workbox Documentation](https://developer.chrome.com/docs/workbox/)
- [MDN: Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [web.dev: PWA Patterns](https://web.dev/explore/progressive-web-apps)

## Future Enhancements

Potential improvements for future iterations:

- [ ] **Push Notifications**: Real-time alerts for board updates
- [ ] **Background Sync**: Queue updates when offline, sync when online
- [ ] **Periodic Background Sync**: Auto-refresh data in background
- [ ] **Share Target API**: Share content directly to FiestaBoard
- [ ] **App Shortcuts**: Quick actions from home screen icon
- [ ] **Install Analytics**: Track installation rates and platforms
- [ ] **Update Notifications**: Toast when new version available

---

**Status**: ✅ PWA Implementation Complete

Last Updated: January 4, 2026

