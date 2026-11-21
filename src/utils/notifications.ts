// Daily Push Notification Scheduler & Notification Manager for FinTrack
// 100% on-device, local-first reminder system with Android & Desktop Service Worker support

const STORAGE_KEYS = {
  ENABLED: 'fintrack_daily_reminder_enabled',
  TIME: 'fintrack_daily_reminder_time',
  LAST_DATE: 'fintrack_daily_reminder_last_date',
} as const;

export interface ReminderSettings {
  enabled: boolean;
  time: string; // HH:MM 24-hr format (e.g. "21:00")
  lastDate: string; // YYYY-MM-DD
}

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export interface FinTrackNotificationOptions extends NotificationOptions {
  renotify?: boolean;
  vibrate?: number[];
}

/** Check if the Notification API is supported in the current environment */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/** Get the current notification permission state */
export function getNotificationPermission(): NotificationPermissionState {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission as NotificationPermissionState;
}

/** Request notification permission from the user */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    return permission as NotificationPermissionState;
  } catch (err) {
    console.warn('FinTrack: Failed to request notification permission', err);
    return Notification.permission as NotificationPermissionState;
  }
}

/** Get current reminder settings from local storage */
export function getReminderSettings(): ReminderSettings {
  if (typeof window === 'undefined') {
    return { enabled: false, time: '21:00', lastDate: '' };
  }
  const enabled = localStorage.getItem(STORAGE_KEYS.ENABLED) === 'true';
  const time = localStorage.getItem(STORAGE_KEYS.TIME) || '21:00';
  const lastDate = localStorage.getItem(STORAGE_KEYS.LAST_DATE) || '';
  return { enabled, time, lastDate };
}

/** Save reminder settings to local storage */
export function saveReminderSettings(settings: Partial<ReminderSettings>): ReminderSettings {
  if (typeof window !== 'undefined') {
    if (settings.enabled !== undefined) {
      localStorage.setItem(STORAGE_KEYS.ENABLED, settings.enabled ? 'true' : 'false');
    }
    if (settings.time !== undefined) {
      localStorage.setItem(STORAGE_KEYS.TIME, settings.time);
    }
    if (settings.lastDate !== undefined) {
      localStorage.setItem(STORAGE_KEYS.LAST_DATE, settings.lastDate);
    }
  }
  return getReminderSettings();
}

/** Helper to get service worker registration with a safety timeout */
async function getServiceWorkerRegistration(timeoutMs = 1500): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const swReadyPromise = navigator.serviceWorker.ready;
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));
    const reg = await Promise.race([swReadyPromise, timeoutPromise]);
    if (reg) return reg;

    const currentReg = await navigator.serviceWorker.getRegistration();
    return currentReg || null;
  } catch (err) {
    console.warn('FinTrack: Could not obtain service worker registration', err);
    return null;
  }
}

/**
 * Low-level dispatch for displaying a notification.
 * Prefers ServiceWorkerRegistration.showNotification() (required on Android Chrome),
 * with fallback to the standard window Notification constructor.
 */
export async function triggerNotification(
  title: string,
  options?: FinTrackNotificationOptions
): Promise<{ success: boolean; error?: string }> {
  if (!isNotificationSupported()) {
    return { success: false, error: 'Notifications are not supported on this browser.' };
  }

  let permission: NotificationPermissionState = Notification.permission;
  if (permission === 'default') {
    permission = await requestNotificationPermission();
  }

  if (permission !== 'granted') {
    return {
      success: false,
      error:
        permission === 'denied'
          ? 'Notification permission is blocked. Please allow notifications in site/browser settings.'
          : 'Notification permission was dismissed.',
    };
  }

  const notificationOptions: FinTrackNotificationOptions = {
    icon: '/pwa-192x192.png',
    badge: '/favicon.svg',
    tag: 'fintrack-daily-reminder',
    renotify: true,
    silent: false,
    vibrate: [200, 100, 200],
    ...options,
  };

  // 1. Try Service Worker showNotification (crucial for Android Chrome & PWA)
  const swReg = await getServiceWorkerRegistration(2000);
  if (swReg && typeof swReg.showNotification === 'function') {
    try {
      await swReg.showNotification(title, notificationOptions as NotificationOptions);
      return { success: true };
    } catch (swErr) {
      console.warn('FinTrack: swReg.showNotification failed, trying fallback constructor:', swErr);
    }
  }

  // 2. Fallback to standard Notification constructor (Desktop browsers)
  try {
    new Notification(title, notificationOptions as NotificationOptions);
    return { success: true };
  } catch (err: any) {
    console.error('FinTrack: Notification constructor failed:', err);
    return {
      success: false,
      error: err?.message || 'Failed to display notification.',
    };
  }
}

/** Immediate test notification trigger for user verification */
export async function sendTestNotification(): Promise<{ success: boolean; message: string }> {
  const result = await triggerNotification('FinTrack Daily Reminder 📝', {
    body: "Don't forget to log today's expenses & PG splits to keep balances accurate!",
    tag: 'fintrack-test-reminder',
    renotify: true,
  });

  if (result.success) {
    return {
      success: true,
      message: 'Test notification triggered! Check your device notification bar.',
    };
  }

  return {
    success: false,
    message: result.error || 'Could not display test notification.',
  };
}

/** Helper to get current local date string (YYYY-MM-DD) */
export function getLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Helper to get current local time string (HH:MM in 24h format) */
export function getLocalTimeString(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Checks if the daily reminder is due and dispatches it if not already sent today.
 * Can be called periodically by an interval or on window focus / visibilitychange.
 */
export async function checkAndTriggerDailyReminder(force = false): Promise<boolean> {
  const settings = getReminderSettings();
  if (!settings.enabled && !force) {
    return false;
  }

  if (getNotificationPermission() !== 'granted') {
    return false;
  }

  const todayStr = getLocalDateString();
  const currentTime = getLocalTimeString();

  if (!force) {
    // If already sent today, skip
    if (settings.lastDate === todayStr) {
      return false;
    }

    // Compare HH:MM (e.g. "21:05" >= "21:00")
    if (currentTime < settings.time) {
      return false;
    }
  }

  const result = await triggerNotification('FinTrack Daily Reminder 📝', {
    body: "Time to record today's spending! Keep your cash, cards, and PG splits up to date.",
    tag: 'fintrack-daily-reminder',
    renotify: true,
  });

  if (result.success) {
    saveReminderSettings({ lastDate: todayStr });
    return true;
  }

  return false;
}
