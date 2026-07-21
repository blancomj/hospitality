import { defineStore } from 'pinia';
import { ref } from 'vue';
import i18n from '@/i18n';

const STORAGE_KEY = 'preferred_locale';
const SUPPORTED_LOCALES = ['es', 'en'];

export const useI18nStore = defineStore('i18n', () => {
  const locale = ref<string>(localStorage.getItem(STORAGE_KEY) || 'es');

  const setLocale = (newLocale: string) => {
    if (SUPPORTED_LOCALES.includes(newLocale)) {
      locale.value = newLocale;
      localStorage.setItem(STORAGE_KEY, newLocale);
      i18n.global.locale.value = newLocale as 'es' | 'en';
    }
  };

  const toggleLocale = () => {
    const newLocale = locale.value === 'es' ? 'en' : 'es';
    setLocale(newLocale);
  };

  const supportedLocales = SUPPORTED_LOCALES;

  return {
    locale,
    setLocale,
    toggleLocale,
    supportedLocales,
  };
});
