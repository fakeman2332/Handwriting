/**
 * Символ в URL кодируется полностью: encodeURIComponent оставляет `.`, а путь `glyph/.`
 * роутер нормализует как «текущая папка» и маршрут перестаёт совпадать.
 */
export function encodeChar(char: string): string {
  return encodeURIComponent(char).replace(/[-_.!~*'()]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

export const glyphPath = (fontId: string, char: string, query = '') => `/font/${fontId}/glyph/${encodeChar(char)}${query}`;
