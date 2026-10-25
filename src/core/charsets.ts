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
