import { describe, expect, it } from 'vitest';
import { charsOfAll, SMALL_MARKS } from './charsets';
import { strokesBBox } from './geometry';
import { DEFAULT_METRICS } from './metrics';
import { fakeVariant } from './testing';
import { dehydrateGlyph, generateVariant, hydrateGlyph, noiseAmplitude, stubsFor } from './variants';

const m = DEFAULT_METRICS;

describe('generateVariant', () => {
  it('детерминирован по паре «исходник + seed»', () => {
    const base = fakeVariant('a', 'v1');
    expect(generateVariant(base, 42, m, 'a')).toEqual(generateVariant(base, 42, m, 'a'));
    expect(generateVariant(base, 42, m, 'a').strokes).not.toEqual(generateVariant(base, 43, m, 'a').strokes);
  });

  it('смещения ограничены на всём алфавите, мелкие знаки не превращаются в кляксу', () => {
    for (const ch of charsOfAll(['latin', 'cyrillic', 'digits', 'punct'])) {
      const base = fakeVariant(ch, `v-${ch}`);
      const bb = strokesBBox(base.strokes)!;
      const size = Math.max(bb.maxX - bb.minX, bb.maxY - bb.minY);
      const amp = noiseAmplitude(base, m, ch);
      if (SMALL_MARKS.has(ch)) expect(amp, ch).toBeLessThanOrEqual(size * 0.04 + 1e-9);
      for (const seed of [1, 2, 3]) {
        const g = generateVariant(base, seed, m, ch);
        const gb = strokesBBox(g.strokes)!;
        const gsize = Math.max(gb.maxX - gb.minX, gb.maxY - gb.minY);
        // Аффинный сдвиг ±4% и шум не меняют размер буквы больше чем на ~15%.
        expect(Math.abs(gsize - size) / size, ch).toBeLessThan(0.15);
        for (const s of g.strokes) for (const p of s.points) expect(p.p).toBeLessThanOrEqual(1);
      }
    }
  });

  it('варианты различимы, но не дрожат: соседние точки смещаются согласованно', () => {
    const base = fakeVariant('o', 'v1');
    const g = generateVariant(base, 7, m, 'o');
    const d = base.strokes[0]!.points.map((p, i) => {
      const q = g.strokes[0]!.points[i]!;
      return [q.x - p.x, q.y - p.y] as const;
    });
    let maxJump = 0;
    for (let i = 1; i < d.length; i++) maxJump = Math.max(maxJump, Math.hypot(d[i]![0] - d[i - 1]![0], d[i]![1] - d[i - 1]![1]));
    expect(maxJump).toBeLessThan(m.xHeight * 0.05);
  });
});

describe('hydrate/dehydrate', () => {
  it('сгенерированные варианты хранятся как seed и восстанавливаются', () => {
    const base = fakeVariant('b', 'vb');
    const glyph = { char: 'b', variants: [base, ...stubsFor(base)] };
    const hydrated = hydrateGlyph(glyph, m);
    expect(hydrated.variants).toHaveLength(4);
    expect(hydrated.variants.slice(1).every((v) => v.strokes.length === base.strokes.length)).toBe(true);
    const stored = dehydrateGlyph(hydrated);
    expect(stored.variants.slice(1).every((v) => v.strokes.length === 0 && v.seed !== undefined)).toBe(true);
    expect(hydrateGlyph(stored, m)).toEqual(hydrated);
  });

  it('варианты без исходника отбрасываются', () => {
    const base = fakeVariant('c', 'vc');
    const glyph = { char: 'c', variants: stubsFor(base) };
    expect(hydrateGlyph(glyph, m).variants).toHaveLength(0);
  });
});
