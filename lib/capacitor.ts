// lib/capacitor.ts
// Capacitor helper utilities for native features

// Check if we're running in a native environment
export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check if Capacitor is available
  return !!(window as any).Capacitor;
}

export function getPlatform(): 'web' | 'ios' | 'android' {
  if (!isNativeApp()) return 'web';
  
  const Capacitor = (window as any).Capacitor;
  return Capacitor.getPlatform();
}

// Safe wrapper for Capacitor plugins
export async function safeCapacitorCall<T>(
  pluginCall: () => Promise<T>,
  fallback?: T
): Promise<T | undefined> {
  if (!isNativeApp()) {
    return fallback;
  }

  try {
    return await pluginCall();
  } catch (error) {
    console.error('Capacitor plugin error:', error);
    return fallback;
  }
}

// Helper to add haptic feedback on touch
export async function hapticImpact(style: 'light' | 'medium' | 'heavy' = 'light') {
  if (!isNativeApp()) return;

  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    const styleMap = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy
    };
    await Haptics.impact({ style: styleMap[style] });
  } catch (error) {
    // Haptics not available, silently fail
  }
}

// Helper to trigger haptic notification
export async function hapticNotification(type: 'success' | 'warning' | 'error' = 'success') {
  if (!isNativeApp()) return;

  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    const typeMap = {
      success: NotificationType.Success,
      warning: NotificationType.Warning,
      error: NotificationType.Error
    };
    await Haptics.notification({ type: typeMap[type] });
  } catch (error) {
    // Haptics not available, silently fail
  }
}

// Get current geolocation (native or browser)
export async function getCurrentLocation(): Promise<{ lat: number; lng: number } | null> {
  try {
    if (isNativeApp()) {
      const { Geolocation } = await import('@capacitor/geolocation');
      const position = await Geolocation.getCurrentPosition();
      return {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
    } else {
      // Fallback to browser geolocation
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation not supported'));
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          (error) => reject(error),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      });
    }
  } catch (error) {
    console.error('Error getting location:', error);
    return null;
  }
}

// Watch position changes
export async function watchPosition(
  callback: (position: { lat: number; lng: number }) => void
): Promise<string | null> {
  try {
    if (isNativeApp()) {
      const { Geolocation } = await import('@capacitor/geolocation');
      const watchId = await Geolocation.watchPosition(
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
        (position) => {
          if (position) {
            callback({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          }
        }
      );
      return watchId;
    } else {
      // Browser fallback
      if (!navigator.geolocation) return null;
      
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          callback({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => console.error('Watch position error:', error),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
      
      return watchId.toString();
    }
  } catch (error) {
    console.error('Error watching position:', error);
    return null;
  }
}

// Clear position watch
export async function clearWatch(watchId: string) {
  try {
    if (isNativeApp()) {
      const { Geolocation } = await import('@capacitor/geolocation');
      await Geolocation.clearWatch({ id: watchId });
    } else {
      navigator.geolocation.clearWatch(parseInt(watchId));
    }
  } catch (error) {
    console.error('Error clearing watch:', error);
  }
}

// Request native push notification permissions
export async function requestPushPermissions(): Promise<boolean> {
  if (!isNativeApp()) {
    // Fallback to browser notifications
    if ('Notification' in window && Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  }

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    
    const permission = await PushNotifications.requestPermissions();
    
    if (permission.receive === 'granted') {
      await PushNotifications.register();
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error requesting push permissions:', error);
    return false;
  }
}

// Share content (native share sheet)
export async function shareContent(title: string, text: string, url?: string): Promise<boolean> {
  try {
    if (isNativeApp()) {
      const { Share } = await import('@capacitor/share');
      await Share.share({
        title,
        text,
        url,
        dialogTitle: 'Share via'
      });
      return true;
    } else if (navigator.share) {
      // Browser Web Share API
      await navigator.share({ title, text, url });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error sharing:', error);
    return false;
  }
}

// Check if app can use native features
export function getAvailableFeatures() {
  return {
    isNative: isNativeApp(),
    platform: getPlatform(),
    hasHaptics: isNativeApp(),
    hasNativeGeo: isNativeApp(),
    hasNativePush: isNativeApp(),
    hasShare: isNativeApp() || !!navigator.share
  };
}
