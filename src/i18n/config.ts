export const locales = [
  'en', 'de', 'es', 'fr', 'it', 'nl', 'pl', 'ru', 'uk', 'ka',
  'pt', 'tr', 'sv', 'da', 'no', 'fi',
  'cs', 'hu', 'ro', 'el', 'bg', 'hr'
] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  // Original
  en: 'English',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  it: 'Italiano',
  nl: 'Nederlands',
  pl: 'Polski',
  ru: 'Русский',
  uk: 'Українська',
  ka: 'ქართული',
  // Major European
  pt: 'Português',
  tr: 'Türkçe',
  sv: 'Svenska',
  da: 'Dansk',
  no: 'Norsk',
  fi: 'Suomi',
  // Central/Eastern European
  cs: 'Čeština',
  hu: 'Magyar',
  ro: 'Română',
  el: 'Ελληνικά',
  bg: 'Български',
  hr: 'Hrvatski',
};
