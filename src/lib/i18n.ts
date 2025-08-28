import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enCommon from '../locales/en/common.json';
import heCommon from '../locales/he/common.json';
import arCommon from '../locales/ar/common.json';
import esCommon from '../locales/es/common.json';
import frCommon from '../locales/fr/common.json';

export const supportedLanguages = {
  en: 'English',
  he: 'עברית',
  ar: 'العربية',
  es: 'Español',
  fr: 'Français'
} as const;

export type SupportedLanguage = keyof typeof supportedLanguages;

const resources = {
  en: {
    common: enCommon,
  },
  he: {
    common: heCommon,
  },
  ar: {
    common: arCommon,
  },
  es: {
    common: esCommon,
  },
  fr: {
    common: frCommon,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false,
    },

    react: {
      useSuspense: false,
    },
  });

// RTL languages
export const rtlLanguages: SupportedLanguage[] = ['he', 'ar'];

// Function to check if a language is RTL
export const isRTL = (language: string): boolean => {
  return rtlLanguages.includes(language as SupportedLanguage);
};

// Function to get text direction
export const getTextDirection = (language: string): 'ltr' | 'rtl' => {
  return isRTL(language) ? 'rtl' : 'ltr';
};

export default i18n;
