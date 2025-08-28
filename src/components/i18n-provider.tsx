'use client';

import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';

interface I18nProviderProps {
  children: React.ReactNode;
}

const RTL_LANGUAGES = ['he', 'ar'];

export function I18nProvider({ children }: I18nProviderProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Wait for i18n to be initialized
    if (i18n.isInitialized) {
      setIsReady(true);
    } else {
      i18n.on('initialized', () => {
        setIsReady(true);
      });
    }

    return () => {
      i18n.off('initialized');
    };
  }, []);

  useEffect(() => {
    const updateDirection = () => {
      const currentLanguage = i18n.language;
      const isRTL = RTL_LANGUAGES.includes(currentLanguage);
      
      document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
      document.documentElement.setAttribute('lang', currentLanguage);
    };

    if (isReady) {
      updateDirection();
      i18n.on('languageChanged', updateDirection);
    }

    return () => {
      i18n.off('languageChanged', updateDirection);
    };
  }, [isReady]);

  if (!isReady) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  );
}
