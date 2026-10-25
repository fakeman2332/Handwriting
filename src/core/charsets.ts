import type { CharsetId } from './types';

export const CHARSETS: Record<CharsetId, string> = {
  latin: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  cyrillic: 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя',
  digits: '0123456789',
  punct: '.,!?…-–—:;\'"«»„“()[]{}@#№%&*+=/\\<>_~$€₽',
};

export const CHARSET_IDS: CharsetId[] = ['latin', 'cyrillic', 'digits', 'punct'];

/** Символы набора по кодовым точкам (а не UTF-16 юнитам). */
export function charsOf(id: CharsetId): string[] {
  return [...CHARSETS[id]];
}

export function charsOfAll(ids: CharsetId[]): string[] {
  return CHARSET_IDS.filter((id) => ids.includes(id)).flatMap(charsOf);
}

/** Мелкие знаки: для них амплитуда шума считается от размера самого знака. */
export const SMALL_MARKS = new Set([...'.,:;\'"«»„“…-_~`’‘']);

/** Фразы-панграммы для показа прогресса: в каждой встречаются все строчные буквы алфавита. */
export const PANGRAMS: Partial<Record<CharsetId, string>> = {
  cyrillic: 'Съешь же ещё этих мягких французских булок, да выпей чаю.',
  latin: 'The quick brown fox jumps over the lazy dog.',
};

/** Уникальные буквы фразы из её набора (без пробелов и знаков). */
export function pangramLetters(id: CharsetId): string[] {
  const phrase = PANGRAMS[id] ?? '';
  const set = new Set(charsOf(id));
  return [...new Set([...phrase].filter((c) => set.has(c)))];
}
