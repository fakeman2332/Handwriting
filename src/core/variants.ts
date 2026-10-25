import { SMALL_MARKS } from './charsets';
import { computeSpacing, strokesBBox } from './geometry';
import { hashString, mulberry32, seededNoise2D } from './random';
import type { Glyph, GlyphVariant, Metrics } from './types';

/** Сколько вариантов генерируется из каждого нарисованного. */
export const GENERATED_PER_DRAWN = 3;

/** Вес варианта при случайном выборе в раскладке. */
export const VARIANT_WEIGHT = { drawn: 2, generated: 1 } as const;

/** Амплитуда шума: от высоты строчной, для мелких знаков — от размера самого знака. */
export function noiseAmplitude(base: GlyphVariant, m: Metrics, char?: string): number {
  const amp = m.xHeight * 0.018;
  const bb = strokesBBox(base.strokes);
  if (!bb) return amp;
  const size = Math.max(bb.maxX - bb.minX, bb.maxY - bb.minY);
  const small = (char !== undefined && SMALL_MARKS.has(char)) || size < m.xHeight * 0.5;
  return small ? Math.min(amp, size * 0.04) : amp;
}

export function generateVariant(base: GlyphVariant, seed: number, m: Metrics, char?: string): GlyphVariant {
  const rnd = mulberry32(seed);
  const noise = seededNoise2D(seed ^ 0x9e3779b9);
  const slant = (rnd() - 0.5) * 0.1; // ±~3°
  const sx = 1 + (rnd() - 0.5) * 0.08;
  const sy = 1 + (rnd() - 0.5) * 0.08;
  const amp = noiseAmplitude(base, m, char);
  const freq = 1 / (m.xHeight * 0.6);
  const strokes = base.strokes.map((s, si) => ({
    points: s.points.map((pt) => {
      const x = pt.x * sx + pt.y * slant;
      const y = pt.y * sy;
      return {
        ...pt,
        x: x + noise(x * freq, si * 10) * amp,
        y: y + noise(y * freq, si * 10 + 5) * amp,
        p: Math.min(1, pt.p * (0.85 + 0.3 * (noise(pt.t * 0.002, si) * 0.5 + 0.5))),
      };
    }),
  }));
  return {
    ...base,
    id: `${base.id}:${seed}`,
    source: 'generated',
    seed,
    baseVariantId: base.id,
    strokes,
    ...computeSpacing(strokes),
  };
}

/** Заготовка сгенерированного варианта: хранится только seed и ссылка на исходник. */
export function generatedStub(base: GlyphVariant, seed: number): GlyphVariant {
  return {
    id: `${base.id}:${seed}`,
    source: 'generated',
    inputType: base.inputType,
    seed,
    baseVariantId: base.id,
    strokes: [],
    advanceWidth: 0,
    leftBearing: 0,
    createdAt: base.createdAt,
  };
}

export function defaultSeeds(base: GlyphVariant): number[] {
  const h = hashString(base.id);
  return Array.from({ length: GENERATED_PER_DRAWN }, (_, i) => (h + Math.imul(i + 1, 0x9e3779b1)) >>> 0);
}

export function stubsFor(base: GlyphVariant): GlyphVariant[] {
  return defaultSeeds(base).map((s) => generatedStub(base, s));
}

/** Пересчитывает сгенерированные варианты по seed; варианты без исходника отбрасываются. */
export function hydrateGlyph(glyph: Glyph, m: Metrics): Glyph {
  const drawn = new Map(glyph.variants.filter((v) => v.source === 'drawn').map((v) => [v.id, v]));
  const variants: GlyphVariant[] = [];
  for (const v of glyph.variants) {
    if (v.source === 'drawn') variants.push(v);
    else {
      const base = v.baseVariantId ? drawn.get(v.baseVariantId) : undefined;
      if (base && v.seed !== undefined && base.strokes.length > 0)
        variants.push({ ...generateVariant(base, v.seed, m, glyph.char), createdAt: v.createdAt });
    }
  }
  return { char: glyph.char, variants };
}

/** Убирает штрихи сгенерированных вариантов перед записью. */
export function dehydrateGlyph(glyph: Glyph): Glyph {
  return {
    char: glyph.char,
    variants: glyph.variants.map((v) =>
      v.source === 'generated' ? { ...v, strokes: [], advanceWidth: 0, leftBearing: 0 } : v,
    ),
  };
}

export function drawnVariants(glyph: Glyph | undefined): GlyphVariant[] {
  return glyph ? glyph.variants.filter((v) => v.source === 'drawn' && v.strokes.length > 0) : [];
}

export function isFilled(glyph: Glyph | undefined): boolean {
  return drawnVariants(glyph).length > 0;
}

/** Варианты, пригодные для рендера. */
export function usableVariants(glyph: Glyph | undefined): GlyphVariant[] {
  return glyph ? glyph.variants.filter((v) => v.strokes.length > 0) : [];
}
