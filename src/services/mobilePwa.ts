import { formatDistanceToNow } from 'date-fns';

export type PlatformType = 'desktop' | 'android' | 'iphone' | 'ipad' | 'unknown';

export interface PwaStatusSnapshot {
  isOnline: boolean;
  isInstalled: boolean;
  pushPermission: NotificationPermission | 'unsupported';
  lastSyncAt: string;
  cachedFiles: number;
  cacheNames: string[];
  version: string;
  deviceType: PlatformType;
}

export interface OfflineSupportState {
  offlineDashboard: boolean;
  offlineSavedJobs: boolean;
  offlineCandidateProfiles: boolean;
  offlineJobDrafts: boolean;
  offlineMessagesQueue: boolean;
  offlineInterviewNotes: boolean;
}

export interface PushNotificationPreferences {
  newJobAlert: boolean;
  applicationStatus: boolean;
  interviewReminder: boolean;
  offerReceived: boolean;
  recruiterMessage: boolean;
  automationAlert: boolean;
  paymentReminder: boolean;
  subscriptionExpiry: boolean;
  aiRecommendation: boolean;
  securityAlert: boolean;
}

export interface BackgroundSyncPreferences {
  applications: boolean;
  messages: boolean;
  interviewUpdates: boolean;
  notifications: boolean;
  profileChanges: boolean;
  savedJobs: boolean;
}

export interface MobilePwaSettings {
  theme: 'system' | 'light' | 'dark';
  language: 'en' | 'te' | 'hi';
  largeFonts: boolean;
  highContrast: boolean;
  screenReaderHints: boolean;
  keyboardNavigation: boolean;
  downloadOnWifiOnly: boolean;
  offlineStorageLimitMb: number;
}

export interface TrustedDevice {
  id: string;
  label: string;
  userAgent: string;
  lastSeenAt: string;
  trusted: boolean;
}

export interface MobilePwaAnalytics {
  pwaInstallRate: number;
  dailyActiveMobileUsers: number;
  pushOpenRate: number;
  offlineUsage: number;
  averageSessionTimeMinutes: number;
  crashReports: number;
}

const STORAGE_KEYS = {
  syncAt: 'mobile_pwa_last_sync_at',
  offline: 'mobile_pwa_offline_state',
  pushPrefs: 'mobile_pwa_push_prefs',
  backgroundSync: 'mobile_pwa_background_sync',
  settings: 'mobile_pwa_settings',
  devices: 'mobile_pwa_devices',
  analytics: 'mobile_pwa_analytics',
} as const;

const APP_VERSION = '2.4.0';

const defaultOfflineState: OfflineSupportState = {
  offlineDashboard: true,
  offlineSavedJobs: true,
  offlineCandidateProfiles: true,
  offlineJobDrafts: true,
  offlineMessagesQueue: true,
  offlineInterviewNotes: true,
};

const defaultPushPrefs: PushNotificationPreferences = {
  newJobAlert: true,
  applicationStatus: true,
  interviewReminder: true,
  offerReceived: true,
  recruiterMessage: true,
  automationAlert: true,
  paymentReminder: true,
  subscriptionExpiry: true,
  aiRecommendation: true,
  securityAlert: true,
};

const defaultBackgroundSync: BackgroundSyncPreferences = {
  applications: true,
  messages: true,
  interviewUpdates: true,
  notifications: true,
  profileChanges: true,
  savedJobs: true,
};

const defaultSettings: MobilePwaSettings = {
  theme: 'system',
  language: 'en',
  largeFonts: false,
  highContrast: false,
  screenReaderHints: true,
  keyboardNavigation: true,
  downloadOnWifiOnly: true,
  offlineStorageLimitMb: 256,
};

const defaultAnalytics: MobilePwaAnalytics = {
  pwaInstallRate: 42,
  dailyActiveMobileUsers: 680,
  pushOpenRate: 37,
  offlineUsage: 24,
  averageSessionTimeMinutes: 9.8,
  crashReports: 0,
};

const readStorage = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeStorage = (key: string, value: unknown): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

const getPlatform = (): PlatformType => {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone/.test(ua)) return 'iphone';
  if (/ipad/.test(ua)) return 'ipad';
  if (/android/.test(ua)) return 'android';
  if (/macintosh|windows|linux/.test(ua)) return 'desktop';
  return 'unknown';
};

const getPushPermission = (): NotificationPermission | 'unsupported' => {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
};

const isStandaloneMode = (): boolean => {
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  const displayStandalone = window.matchMedia('(display-mode: standalone)').matches;
  return iosStandalone || displayStandalone;
};

const getCurrentDeviceId = (): string => {
  const existing = localStorage.getItem('mobile_pwa_current_device_id');
  if (existing) return existing;
  const id = `device_${Date.now()}`;
  localStorage.setItem('mobile_pwa_current_device_id', id);
  return id;
};

class MobilePwaService {
  async getStatusSnapshot(): Promise<PwaStatusSnapshot> {
    const lastSyncAt = localStorage.getItem(STORAGE_KEYS.syncAt) || new Date().toISOString();

    let cachedFiles = 0;
    let cacheNames: string[] = [];
    if ('caches' in window) {
      try {
        cacheNames = await caches.keys();
        const totalCounts = await Promise.all(
          cacheNames.map(async (name) => {
            const cache = await caches.open(name);
            const requests = await cache.keys();
            return requests.length;
          })
        );
        cachedFiles = totalCounts.reduce((sum, count) => sum + count, 0);
      } catch {
        cachedFiles = 0;
      }
    }

    return {
      isOnline: navigator.onLine,
      isInstalled: isStandaloneMode(),
      pushPermission: getPushPermission(),
      lastSyncAt,
      cachedFiles,
      cacheNames,
      version: APP_VERSION,
      deviceType: getPlatform(),
    };
  }

  getReadableSync(lastSyncAt: string): string {
    return formatDistanceToNow(new Date(lastSyncAt), { addSuffix: true });
  }

  getOfflineState(): OfflineSupportState {
    return readStorage(STORAGE_KEYS.offline, defaultOfflineState);
  }

  setOfflineState(nextState: OfflineSupportState): void {
    writeStorage(STORAGE_KEYS.offline, nextState);
  }

  getPushPreferences(): PushNotificationPreferences {
    return readStorage(STORAGE_KEYS.pushPrefs, defaultPushPrefs);
  }

  setPushPreferences(nextState: PushNotificationPreferences): void {
    writeStorage(STORAGE_KEYS.pushPrefs, nextState);
  }

  getBackgroundSyncPreferences(): BackgroundSyncPreferences {
    return readStorage(STORAGE_KEYS.backgroundSync, defaultBackgroundSync);
  }

  setBackgroundSyncPreferences(nextState: BackgroundSyncPreferences): void {
    writeStorage(STORAGE_KEYS.backgroundSync, nextState);
  }

  getSettings(): MobilePwaSettings {
    return readStorage(STORAGE_KEYS.settings, defaultSettings);
  }

  setSettings(nextState: MobilePwaSettings): void {
    writeStorage(STORAGE_KEYS.settings, nextState);
  }

  getTrustedDevices(): TrustedDevice[] {
    const devices = readStorage<TrustedDevice[]>(STORAGE_KEYS.devices, []);
    if (devices.length > 0) return devices;

    const bootstrap: TrustedDevice[] = [
      {
        id: getCurrentDeviceId(),
        label: 'Current Device',
        userAgent: navigator.userAgent,
        lastSeenAt: new Date().toISOString(),
        trusted: true,
      },
    ];
    writeStorage(STORAGE_KEYS.devices, bootstrap);
    return bootstrap;
  }

  trustCurrentDevice(label: string): TrustedDevice[] {
    const devices = this.getTrustedDevices();
    const id = getCurrentDeviceId();
    const updated = [
      ...devices.filter((device) => device.id !== id),
      {
        id,
        label,
        userAgent: navigator.userAgent,
        lastSeenAt: new Date().toISOString(),
        trusted: true,
      },
    ];
    writeStorage(STORAGE_KEYS.devices, updated);
    return updated;
  }

  logoutOtherDevices(): TrustedDevice[] {
    const currentId = getCurrentDeviceId();
    const devices = this.getTrustedDevices().filter((device) => device.id === currentId);
    writeStorage(STORAGE_KEYS.devices, devices);
    return devices;
  }

  updateLastSync(): string {
    const timestamp = new Date().toISOString();
    localStorage.setItem(STORAGE_KEYS.syncAt, timestamp);
    return timestamp;
  }

  async performBackgroundSync(): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 450));
    return this.updateLastSync();
  }

  getAnalytics(): MobilePwaAnalytics {
    return readStorage(STORAGE_KEYS.analytics, defaultAnalytics);
  }

  bumpInstallRate(): MobilePwaAnalytics {
    const analytics = this.getAnalytics();
    const next = {
      ...analytics,
      pwaInstallRate: Math.min(100, analytics.pwaInstallRate + 1),
    };
    writeStorage(STORAGE_KEYS.analytics, next);
    return next;
  }

  getRealtimeFeatures(): Array<{ key: string; label: string; enabled: boolean }> {
    return [
      { key: 'liveMessaging', label: 'Live Messaging', enabled: true },
      { key: 'typingIndicator', label: 'Typing Indicator', enabled: true },
      { key: 'readReceipts', label: 'Read Receipts', enabled: true },
      { key: 'interviewUpdates', label: 'Interview Updates', enabled: true },
      { key: 'applicationStatus', label: 'Application Status', enabled: true },
      { key: 'liveNotifications', label: 'Live Notifications', enabled: true },
    ];
  }

  createGoogleCalendarLink(title: string, details: string, dateIso: string): string {
    const start = new Date(dateIso);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    const encodeDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      details,
      dates: `${encodeDate(start)}/${encodeDate(end)}`,
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  createIcsContent(title: string, details: string, dateIso: string): string {
    const start = new Date(dateIso);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    const encodeDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `UID:${Date.now()}@jobpoyt`,
      `DTSTAMP:${encodeDate(new Date())}`,
      `DTSTART:${encodeDate(start)}`,
      `DTEND:${encodeDate(end)}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${details}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n');
  }

  generateQrImageUrl(payload: string): string {
    const encoded = encodeURIComponent(payload);
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encoded}`;
  }

  async share(payload: { title: string; text: string; url: string }): Promise<'native' | 'clipboard'> {
    if (navigator.share) {
      await navigator.share(payload);
      return 'native';
    }

    await navigator.clipboard.writeText(`${payload.title}\n${payload.text}\n${payload.url}`);
    return 'clipboard';
  }
}

export const mobilePwaService = new MobilePwaService();
