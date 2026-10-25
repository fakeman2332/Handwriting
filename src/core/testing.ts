// Синтетические почерки для тестов ядра.
import { createFont } from './font';
import { computeSpacing } from './geometry';
import { mulberry32 } from './random';
import type { CharsetId, Glyph, GlyphVariant, HandwritingFont, Stroke } from './types';
import { stubsFor } from './variants';
import { charsOfAll, SMALL_MARKS } from './charsets';

/** Штрихи, похожие на букву: пара дуг с давлением, размер зависит от регистра. */
export function fakeStrokes(char: string, seed = 1): Stroke[] {
  const rnd = mulberry32(seed + char.codePointAt(0)!);
  const small = SMALL_MARKS.has(char);
  const upper = char !== char.toLowerCase();
  const h = small ? 60 : upper ? 720 : 540;
  const w = small ? 40 : 300 + rnd() * 250;
  const y0 = small ? 0 : 0;
  const strokes: Stroke[] = [];
  const n = small ? 1 : 2;
  for (let s = 0; s < n; s++) {
    const points = [];
    for (let i = 0; i <= 24; i++) {
      const u = i / 24;
      const a = u * Math.PI * (1.2 + s);
      points.push({
        x: 100 + w / 2 + Math.cos(a) * (w / 2) * (s ? 0.6 : 1),
        y: y0 + h / 2 + Math.sin(a) * (h / 2),
        p: 0.4 + 0.4 * Math.sin(u * Math.PI),
        t: i * 12,
      });
    }
    strokes.push({ points });
  }
  return strokes;
}

export function fakeVariant(char: string, id: string, seed = 1): GlyphVariant {
  const strokes = fakeStrokes(char, seed);
  return { id, source: 'drawn', inputType: 'pen', strokes, ...computeSpacing(strokes), createdAt: 1 };
}

export function fakeFont(charsets: CharsetId[] = ['latin', 'cyrillic', 'digits', 'punct'], withStubs = true): HandwritingFont {
  const font = createFont('Тестовый почерк', charsets, 1);
  font.id = 'font-test';
  for (const ch of charsOfAll(charsets)) {
    const v = fakeVariant(ch, `v-${ch.codePointAt(0)}`);
    const g: Glyph = { char: ch, variants: [v, ...(withStubs ? stubsFor(v) : [])] };
    font.glyphs[ch] = g;
  }
  return font;
}
