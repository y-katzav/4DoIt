'use client';

import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { isRTL, getTextDirection, type SupportedLanguage } from '@/lib/i18n';

export const useI18n = () => {
  const { t, i18n } = useTranslation('common');

  const currentLanguage = i18n.language as SupportedLanguage;
  const isCurrentRTL = isRTL(currentLanguage);
  const textDirection = getTextDirection(currentLanguage);

  // Update document direction and language
  useEffect(() => {
    document.documentElement.setAttribute('dir', textDirection);
    document.documentElement.setAttribute('lang', currentLanguage);
  }, [textDirection, currentLanguage]);

  const changeLanguage = (language: SupportedLanguage) => {
    i18n.changeLanguage(language);
    localStorage.setItem('i18nextLng', language);
  };

  return {
    t,
    currentLanguage,
    isRTL: isCurrentRTL,
    textDirection,
    changeLanguage,
    isReady: i18n.isInitialized,
  };
};
