import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { pwaInstallAnalyticsService } from '@services/pwaInstallAnalytics';

declare global {
  interface Window {
    __jobpoytDeferredInstallPrompt?: DeferredInstallPrompt;
  }
}

export type PwaPlatform =
  | 'android'
  | 'ios'
  | 'ipados'
  | 'windows'
  | 'macos'
  | 'linux'
  | 'chromeos'
  | 'unknown';

export type PwaBrowser =
  | 'chrome'
  | 'safari'
  | 'edge'
  | 'firefox'
  | 'samsung_internet'
  | 'unknown';

export type PwaInstallAvailability =
  | 'native_prompt'
  | 'ios_instructions'
  | 'already_installed'
  | 'unsupported';

export type PwaInstallOutcome =
  | 'accepted'
  | 'dismissed'
  | 'ios-instructions'
  | 'already-installed'
  | 'unsupported'
  | 'no-prompt'
  | 'error';

export interface DeferredInstallPrompt {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform?: string }>;
}

export interface PwaInstallPreferences {
  hideBanner: boolean;
  hiddenUntil: number | null;
  neverShowAgain: boolean;
  dontShowIosGuideAgain: boolean;
}

interface UsePwaInstallState {
  platform: PwaPlatform;
  browser: PwaBrowser;
  isInstalled: boolean;
  isStandalone: boolean;
  isInstallAvailable: boolean;
  availability: PwaInstallAvailability;
  deferredPrompt: DeferredInstallPrompt | null;
  canPromptNatively: boolean;
  isIosGuidedInstall: boolean;
  isUnsupported: boolean;
  shouldShowBanner: boolean;
  installMessage: string;
  unsupportedTip: string;
  preferences: PwaInstallPreferences;
}

interface PromptInstallResult {
  outcome: PwaInstallOutcome;
  reason?: string;
}

const PREF_KEY = 'actro:pwa-install-preferences:v1';

const defaultPrefs: PwaInstallPreferences = {
  hideBanner: false,
  hiddenUntil: null,
  neverShowAgain: false,
  dontShowIosGuideAgain: false,
};

const readPrefs = (): PwaInstallPreferences => {
  try {
    const raw = window.localStorage.getItem(PREF_KEY);
    if (!raw) return defaultPrefs;
    const parsed = JSON.parse(raw) as Partial<PwaInstallPreferences>;
    return {
      hideBanner: Boolean(parsed.hideBanner),
      hiddenUntil: typeof parsed.hiddenUntil === 'number' ? parsed.hiddenUntil : null,
      neverShowAgain: Boolean(parsed.neverShowAgain),
      dontShowIosGuideAgain: Boolean(parsed.dontShowIosGuideAgain),
    };
  } catch {
    return defaultPrefs;
  }
};

const writePrefs = (prefs: PwaInstallPreferences) => {
  try {
    window.localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
  } catch {
    // no-op
  }
};

const detectPlatform = (ua: string, maxTouchPoints: number): PwaPlatform => {
  const lower = ua.toLowerCase();

  if (lower.includes('android')) return 'android';
  if (/iphone|ipod/.test(lower)) return 'ios';

  // iPadOS 13+ can report as Macintosh with touch points.
  if (/ipad/.test(lower) || (lower.includes('macintosh') && maxTouchPoints > 1)) return 'ipados';

  if (lower.includes('cros')) return 'chromeos';
  if (lower.includes('windows')) return 'windows';
  if (lower.includes('mac os')) return 'macos';
  if (lower.includes('linux')) return 'linux';

  return 'unknown';
};

const detectBrowser = (ua: string): PwaBrowser => {
  const lower = ua.toLowerCase();

  if (lower.includes('samsungbrowser')) return 'samsung_internet';
  if (lower.includes('edg/')) return 'edge';
  if (lower.includes('firefox/') || lower.includes('fxios/')) return 'firefox';
  if (lower.includes('chrome/') || lower.includes('crios/')) return 'chrome';
  if (lower.includes('safari/') && !lower.includes('chrome/') && !lower.includes('crios/') && !lower.includes('edg/')) return 'safari';

  return 'unknown';
};

const isStandaloneMode = (): boolean => {
  const displayStandalone = typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  const androidAppReferrer = document.referrer.startsWith('android-app://');
  return displayStandalone || iosStandalone || androidAppReferrer;
};

const getUnsupportedTip = (platform: PwaPlatform): string => {
  if (platform === 'ios' || platform === 'ipados') {
    return 'Open this site in Safari and use Share -> Add to Home Screen.';
  }

  if (platform === 'android') {
    return 'Open this site in Chrome or Samsung Internet and tap Install App from browser menu.';
  }

  return 'Try opening this site in Chrome or Edge to install the app.';
};

export const usePWAInstall = () => {
  const trackedBannerRef = useRef(false);
  const trackedInstalledRef = useRef(false);

  const [preferences, setPreferences] = useState<PwaInstallPreferences>(() => readPrefs());
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredInstallPrompt | null>(
    () => window.__jobpoytDeferredInstallPrompt || null,
  );
  const [isStandalone, setIsStandalone] = useState<boolean>(isStandaloneMode());
  const [isInstalled, setIsInstalled] = useState<boolean>(isStandaloneMode());
  const [iosModalOpen, setIosModalOpen] = useState(false);

  const env = useMemo(() => {
    const ua = window.navigator.userAgent || '';
    const platform = detectPlatform(ua, window.navigator.maxTouchPoints || 0);
    const browser = detectBrowser(ua);
    return { platform, browser };
  }, []);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      const prompt = event as unknown as DeferredInstallPrompt;
      window.__jobpoytDeferredInstallPrompt = prompt;
      setDeferredPrompt(prompt);
    };

    const onStoredBeforeInstallPrompt = () => {
      if (window.__jobpoytDeferredInstallPrompt) {
        setDeferredPrompt(window.__jobpoytDeferredInstallPrompt);
      }
    };

    const onAppInstalled = () => {
      setIsInstalled(true);
      setIsStandalone(true);
      setDeferredPrompt(null);
      pwaInstallAnalyticsService.track('install_accepted', { source: 'appinstalled-event' });
      window.dispatchEvent(new CustomEvent('pwa:installed'));
    };

    const media = typeof window.matchMedia === 'function' ? window.matchMedia('(display-mode: standalone)') : null;
    const onDisplayModeChanged = () => {
      const standalone = isStandaloneMode();
      setIsStandalone(standalone);
      if (standalone) {
        setIsInstalled(true);
      }
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt as EventListener);
    window.addEventListener('pwa:beforeinstallprompt', onStoredBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled as EventListener);

    if (media && typeof media.addEventListener === 'function') {
      media.addEventListener('change', onDisplayModeChanged);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt as EventListener);
      window.removeEventListener('pwa:beforeinstallprompt', onStoredBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled as EventListener);
      if (media && typeof media.removeEventListener === 'function') {
        media.removeEventListener('change', onDisplayModeChanged);
      }
    };
  }, []);

  const availability = useMemo<PwaInstallAvailability>(() => {
    if (isInstalled || isStandalone) return 'already_installed';

    const isIosSafari = (env.platform === 'ios' || env.platform === 'ipados') && env.browser === 'safari';
    if (isIosSafari) return 'ios_instructions';

    if (deferredPrompt) return 'native_prompt';

    return 'unsupported';
  }, [deferredPrompt, env.browser, env.platform, isInstalled, isStandalone]);

  const shouldShowBanner = useMemo(() => {
    if (isInstalled || isStandalone) return false;
    if (preferences.neverShowAgain) return false;
    if (preferences.hideBanner) return false;
    if (preferences.hiddenUntil && Date.now() < preferences.hiddenUntil) return false;
    if (availability === 'unsupported') return true;
    if (availability === 'ios_instructions' && preferences.dontShowIosGuideAgain) return false;
    return true;
  }, [availability, isInstalled, isStandalone, preferences]);

  useEffect(() => {
    if (isInstalled && !trackedInstalledRef.current) {
      trackedInstalledRef.current = true;
      pwaInstallAnalyticsService.track('already_installed', { platform: env.platform, browser: env.browser });
    }
  }, [env.browser, env.platform, isInstalled]);

  useEffect(() => {
    if (shouldShowBanner && !trackedBannerRef.current) {
      trackedBannerRef.current = true;
      pwaInstallAnalyticsService.track('install_prompt_shown', {
        platform: env.platform,
        browser: env.browser,
        availability,
      });
    }
  }, [availability, env.browser, env.platform, shouldShowBanner]);

  const updatePreferences = useCallback((updater: (prev: PwaInstallPreferences) => PwaInstallPreferences) => {
    setPreferences((prev) => {
      const next = updater(prev);
      writePrefs(next);
      return next;
    });
  }, []);

  const remindMeLater = useCallback((hours = 24) => {
    updatePreferences((prev) => ({
      ...prev,
      hideBanner: false,
      hiddenUntil: Date.now() + (hours * 60 * 60 * 1000),
    }));
  }, [updatePreferences]);

  const hideInstallBanner = useCallback(() => {
    updatePreferences((prev) => ({
      ...prev,
      hideBanner: true,
    }));
  }, [updatePreferences]);

  const resetBannerVisibility = useCallback(() => {
    updatePreferences((prev) => ({
      ...prev,
      hideBanner: false,
      hiddenUntil: null,
    }));
  }, [updatePreferences]);

  const neverShowAgain = useCallback(() => {
    updatePreferences((prev) => ({
      ...prev,
      neverShowAgain: true,
    }));
  }, [updatePreferences]);

  const openIosInstructions = useCallback(() => {
    setIosModalOpen(true);
    pwaInstallAnalyticsService.track('ios_instructions_viewed', { platform: env.platform });
  }, [env.platform]);

  const closeIosInstructions = useCallback((neverShowGuide = false) => {
    setIosModalOpen(false);
    if (neverShowGuide) {
      updatePreferences((prev) => ({
        ...prev,
        dontShowIosGuideAgain: true,
      }));
    }
  }, [updatePreferences]);

  const updateInstalledApp = useCallback(async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        await registration?.update();
      } catch {
        // Reload still lets the browser use the newest available app shell.
      }
    }

    window.location.reload();
  }, []);

  const promptInstall = useCallback(async (): Promise<PromptInstallResult> => {
    if (isInstalled || isStandalone) {
      await updateInstalledApp();
      return { outcome: 'accepted' };
    }

    if (availability === 'ios_instructions') {
      openIosInstructions();
      return { outcome: 'ios-instructions' };
    }

    if (availability === 'unsupported') {
      pwaInstallAnalyticsService.track('unsupported_browser', {
        platform: env.platform,
        browser: env.browser,
      });
      if (env.platform === 'android' || env.platform === 'ios' || env.platform === 'ipados') {
        openIosInstructions();
        return { outcome: env.platform === 'android' ? 'unsupported' : 'ios-instructions' };
      }
      return { outcome: 'unsupported' };
    }

    if (!deferredPrompt) {
      return { outcome: 'no-prompt' };
    }

    try {
      pwaInstallAnalyticsService.track('install_prompt_shown', {
        source: 'native-prompt',
        platform: env.platform,
        browser: env.browser,
      });
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      window.__jobpoytDeferredInstallPrompt = undefined;

      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setIsStandalone(true);
        pwaInstallAnalyticsService.track('install_accepted', {
          platform: env.platform,
          browser: env.browser,
        });
        return { outcome: 'accepted' };
      }

      pwaInstallAnalyticsService.track('install_dismissed', {
        platform: env.platform,
        browser: env.browser,
      });
      return { outcome: 'dismissed' };
    } catch (error) {
      return { outcome: 'error', reason: error instanceof Error ? error.message : 'install prompt failed' };
    }
  }, [availability, deferredPrompt, env.browser, env.platform, isInstalled, isStandalone, openIosInstructions, updateInstalledApp]);

  const state: UsePwaInstallState = {
    platform: env.platform,
    browser: env.browser,
    isInstalled,
    isStandalone,
    isInstallAvailable: availability !== 'already_installed',
    availability,
    deferredPrompt,
    canPromptNatively: availability === 'native_prompt' && Boolean(deferredPrompt),
    isIosGuidedInstall: availability === 'ios_instructions',
    isUnsupported: availability === 'unsupported',
    shouldShowBanner,
    installMessage: availability === 'unsupported' ? 'Your browser does not support app installation.' : 'Install the app for faster access and better reliability.',
    unsupportedTip: getUnsupportedTip(env.platform),
    preferences,
  };

  return {
    ...state,
    iosModalOpen,
    promptInstall,
    updateInstalledApp,
    openIosInstructions,
    closeIosInstructions,
    hideInstallBanner,
    resetBannerVisibility,
    remindMeLater,
    neverShowAgain,
  };
};

export default usePWAInstall;
