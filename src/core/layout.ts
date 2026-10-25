import { interAdvance, SPACE_WIDTH } from './metrics';
import { paperGeometry } from './paper';
import { mulberry32, seededNoise2D } from './random';
import type { GlyphVariant, HandwritingFont, PlacedGlyph, RenderSettings } from './types';
import { usableVariants, VARIANT_WEIGHT } from './variants';

/** Внутренние параметры вариативности; пользователь их не видит. */
export const JITTER = {
  rotate: (1.5 * Math.PI) / 180, // ±1,5°
  scale: 0.03, // ±3%
  dy: 0.02, // ±2% высоты строки
  letterSpacing: 0.06, // ±6%
  wordSpacing: 0.12, // ±12%
  driftAmp: 0.025, // плавание базовой линии, доля высоты строки
  driftPeriod: 45, // мм, несколько слов
} as const;

type Item = { char: string; variant: GlyphVariant | null; advance: number; scale: number; rotate: number; dy: number };

export type LayoutResult = { glyphs: PlacedGlyph[]; pageCount: number };

function pickVariant(pool: GlyphVariant[], avoidId: string | undefined, rnd: () => number): GlyphVariant {
  const candidates = pool.length > 1 && avoidId ? pool.filter((v) => v.id !== avoidId) : pool;
  let total = 0;
  for (const v of candidates) total += VARIANT_WEIGHT[v.source];
  let r = rnd() * total;
  for (const v of candidates) {
    r -= VARIANT_WEIGHT[v.source];
    if (r < 0) return v;
  }
  return candidates[candidates.length - 1]!;
}

/** Раскладка текста: чистая функция, одинаковый seed — одинаковый результат. */
export function layoutPages(text: string, font: HandwritingFont, s: RenderSettings, seed: number): LayoutResult {
  const geo = paperGeometry(s);
  const k = s.textSize / font.metrics.capHeight; // мм на единицу em
  const rnd = mulberry32(seed);
  const drift = seededNoise2D(seed ^ 0x5bd1e995);
  const lastVariant = new Map<string, string>();
  const pools = new Map<string, GlyphVariant[]>();
  const poolOf = (ch: string) => {
    let p = pools.get(ch);
    if (!p) {
      p = usableVariants(font.glyphs[ch]);
      pools.set(ch, p);
    }
    return p;
  };
  const jitter = (amp: number) => (rnd() * 2 - 1) * amp;

  const makeItem = (char: string): Item => {
    const pool = poolOf(char);
    if (pool.length === 0) return { char, variant: null, advance: interAdvance(char) * k, scale: k, rotate: 0, dy: 0 };
    const variant = pickVariant(pool, lastVariant.get(char), rnd);
    lastVariant.set(char, variant.id);
    const scale = k * (1 + jitter(JITTER.scale));
    const rotate = jitter(JITTER.rotate);
    const dy = jitter(JITTER.dy) * geo.lineHeight;
    const advance = variant.advanceWidth * scale * (1 + jitter(JITTER.letterSpacing));
    return { char, variant, advance, scale, rotate, dy };
  };

  const glyphs: PlacedGlyph[] = [];
  const left = geo.margin.left;
  const right = geo.width - geo.margin.right;
  let page = 0;
  let line = 0;
  let globalLine = 0;
  let x = left;
  let lineHasContent = false;

  const newLine = () => {
    line++;
    globalLine++;
    if (line >= geo.baselines.length) {
      page++;
      line = 0;
    }
    x = left;
    lineHasContent = false;
  };

  const place = (it: Item) => {
    const base = geo.baselines[line]!;
    const d = drift(x / JITTER.driftPeriod, globalLine * 7.31) * JITTER.driftAmp * geo.lineHeight;
    glyphs.push({ char: it.char, variant: it.variant, x, y: base + d + it.dy, scale: it.scale, rotate: it.rotate, page });
    x += it.advance;
    lineHasContent = true;
  };

  const paragraphs = text.replace(/\r\n?/g, '\n').split('\n');
  paragraphs.forEach((para, pi) => {
    if (pi > 0) newLine();
    const words = para.split(/[ \t\u00a0]+/).filter((w) => w.length > 0);
    for (const word of words) {
      const items = [...word].map(makeItem);
      const width = items.reduce((a, it) => a + it.advance, 0);
      if (lineHasContent && x + width > right) newLine();
      if (width > right - left) {
        // Слово длиннее строки: разрыв принудительно.
        for (const it of items) {
          if (lineHasContent && x + it.advance > right) newLine();
          place(it);
        }
      } else {
        for (const it of items) place(it);
      }
      x += SPACE_WIDTH * k * (1 + jitter(JITTER.wordSpacing));
    }
  });

  const pageCount = glyphs.length ? glyphs[glyphs.length - 1]!.page + 1 : 1;
  return { glyphs, pageCount };
}

export function layout(text: string, font: HandwritingFont, s: RenderSettings, seed: number): PlacedGlyph[] {
  return layoutPages(text, font, s, seed).glyphs;
}

/** Преобразование точки глифа (em, ось Y вверх) в координаты страницы (мм, ось Y вниз). */
export function glyphTransform(g: PlacedGlyph): (x: number, y: number) => [number, number] {
  const lb = g.variant ? g.variant.leftBearing : 0;
  const cos = Math.cos(g.rotate);
  const sin = Math.sin(g.rotate);
  return (px, py) => {
    const lx = (px - lb) * g.scale;
    const ly = -py * g.scale;
    return [g.x + lx * cos - ly * sin, g.y + lx * sin + ly * cos];
  };
}
