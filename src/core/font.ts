import { CHARSET_IDS, charsOfAll } from './charsets';
import { DEFAULT_METRICS } from './metrics';
import { uid } from './random';
import type { CharsetId, Glyph, HandwritingFont } from './types';
import { hydrateGlyph, isFilled } from './variants';

export function createFont(name: string, charsets: CharsetId[], now = Date.now()): HandwritingFont {
  return {
    id: uid(),
    name: name.trim() || 'Untitled',
    formatVersion: 1,
    metrics: { ...DEFAULT_METRICS },
    charsets: CHARSET_IDS.filter((c) => charsets.includes(c)),
    glyphs: {},
    createdAt: now,
    updatedAt: now,
  };
}

export function hydrateFont(font: HandwritingFont): HandwritingFont {
  const glyphs: Record<string, Glyph> = {};
  for (const [ch, g] of Object.entries(font.glyphs)) glyphs[ch] = hydrateGlyph(g, font.metrics);
  return { ...font, glyphs };
}

export function fontProgress(font: HandwritingFont, ids: CharsetId[] = font.charsets): { filled: number; total: number } {
  const chars = charsOfAll(ids);
  return { filled: chars.filter((c) => isFilled(font.glyphs[c])).length, total: chars.length };
}

/** Следующая незаполненная буква после `after` по порядку включённых наборов (с переходом через конец). */
export function nextUnfilled(font: HandwritingFont, after: string | null): string | null {
  const chars = charsOfAll(font.charsets);
  const start = after === null ? -1 : chars.indexOf(after);
  for (let i = 1; i <= chars.length; i++) {
    const c = chars[(start + i + chars.length) % chars.length]!;
    if (c !== after && !isFilled(font.glyphs[c])) return c;
  }
  return null;
}

export function slug(name: string): string {
  const map: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm',
    н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch',
    ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  };
  const s = [...name.toLowerCase()]
    .map((c) => map[c] ?? c)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || 'handwriting';
}
