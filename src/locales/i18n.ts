import { create } from 'zustand';
import en from './en.json';
import ru from './ru.json';

export type Locale = 'ru' | 'en';
export type Key = keyof typeof ru;

// Отсутствующий ключ в любом словаре — ошибка компиляции.
const dict = { ru, en } satisfies Record<Locale, Record<Key, string>>;

const STORAGE_KEY = 'hw.locale';

function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'ru' || saved === 'en') return saved;
  } catch {
    /* хранилище недоступно */
  }
  const lang = typeof navigator !== 'undefined' ? navigator.language : 'ru';
  return lang.toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

export const useLocale = create<{ locale: Locale; setLocale: (l: Locale) => void }>((set) => ({
  locale: initialLocale(),
  setLocale: (locale) => {
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* хранилище недоступно */
    }
    document.documentElement.lang = locale;
    set({ locale });
  },
}));

export type Params = Record<string, string | number>;

function format(s: string, params?: Params): string {
  return params ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m)) : s;
}

export const t = (key: Key, params?: Params) => format(dict[useLocale.getState().locale][key], params);

/** Хук: компонент перерисовывается при смене языка. */
export function useT() {
  const locale = useLocale((s) => s.locale);
  return (key: Key, params?: Params) => format(dict[locale][key], params);
}
