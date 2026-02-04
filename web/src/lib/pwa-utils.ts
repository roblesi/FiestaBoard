/**
 * PWA utility functions for detecting installation status and capabilities
 */

/**
 * Check if the app is currently running as an installed PWA
 */
export function isInstalled(): boolean {
  if (typeof window === "undefined") return false;
  
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // @ts-expect-error - navigator.standalone is iOS-specific
    window.navigator.standalone === true
  );
}

/**
 * Check if the browser supports PWA installation
 */
export function isInstallable(): boolean {
  if (typeof window === "undefined") return false;
  
  // Check if beforeinstallprompt is supported
  return "onbeforeinstallprompt" in window;
}

/**
 * Check if the app is running in a browser that supports service workers
 */
export function supportsServiceWorker(): boolean {
  if (typeof window === "undefined") return false;
  
  return "serviceWorker" in navigator;
}

/**
 * Get the current service worker registration status
 */
export async function getServiceWorkerStatus(): Promise<{
  registered: boolean;
  active: boolean;
  waiting: boolean;
  installing: boolean;
}> {
  if (!supportsServiceWorker()) {
    return {
      registered: false,
      active: false,
      waiting: false,
      installing: false,
    };
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    
    if (!registration) {
      return {
        registered: false,
        active: false,
        waiting: false,
        installing: false,
      };
    }

    return {
      registered: true,
      active: !!registration.active,
      waiting: !!registration.waiting,
      installing: !!registration.installing,
    };
  } catch (error) {
    console.error("Error checking service worker status:", error);
    return {
      registered: false,
      active: false,
      waiting: false,
      installing: false,
    };
  }
}

/**
 * Check if the device is currently online
 */
export function isOnline(): boolean {
  if (typeof window === "undefined") return true;
  
  return navigator.onLine;
}

/**
 * Get device/browser information for PWA analytics
 */
export function getDeviceInfo() {
  if (typeof window === "undefined") return null;
  
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    standalone: isInstalled(),
    online: isOnline(),
    serviceWorker: supportsServiceWorker(),
  };
}

/**
 * Log PWA status for debugging (development only)
 */
export async function logPWAStatus(): Promise<void> {
  if (process.env.NODE_ENV !== "development") return;
  
  console.group("🔧 PWA Status");
  console.log("Installed:", isInstalled());
  console.log("Installable:", isInstallable());
  console.log("Service Worker Support:", supportsServiceWorker());
  console.log("Online:", isOnline());
  
  if (supportsServiceWorker()) {
    const swStatus = await getServiceWorkerStatus();
    console.log("Service Worker Status:", swStatus);
  }
  
  console.log("Device Info:", getDeviceInfo());
  console.groupEnd();
}

