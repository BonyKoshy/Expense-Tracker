import { useState, useEffect } from 'react';

// Extend window event for beforeinstallprompt
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function usePwaInstall(onNotice?: (msg: string) => void) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isAppInstalled, setIsAppInstalled] = useState<boolean>(() => {
    return typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches;
  });

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsAppInstalled(true);
        setInstallPrompt(null);
        if (onNotice) {
          onNotice('FinTrack is installing on your device!');
        }
      }
    } catch (err) {
      console.error('Install prompt failed:', err);
    }
  };

  return {
    installPrompt,
    isAppInstalled,
    handleInstallApp,
  };
}
