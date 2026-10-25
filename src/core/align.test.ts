import { describe, expect, it } from 'vitest';
import { alignStrokes, alignVariant, interVBox, prepareFont } from './align';
import { hydrateFont } from './font';
import { strokesBBox, translateStrokes, scaleStrokes } from './geometry';
import { fakeFont, fakeVariant } from './testing';

const vbox = (strokes: Parameters<typeof strokesBBox>[0]) => {
  const b = strokesBBox(strokes)!;
  return { yMin: b.minY, yMax: b.maxY };
};

describe('ровные буквы', () => {
  it('буква любого размера и положения встаёт на высоту той же буквы в Inter', () => {
    for (const ch of ['а', 'Б', 'р', 'у', 'd', 'g', '7']) {
      const target = interVBox(ch)!;
      for (const [k, dy] of [[0.75, 120], [1.4, -90], [1, 300]] as const) {
        const drawn = translateStrokes(scaleStrokes(fakeVariant(ch, 'v').strokes, k), 0, dy);
        const b = vbox(alignStrokes(drawn, ch));
        expect(b.yMin, ch).toBeCloseTo(target.yMin, 0);
        expect(b.yMax, ch).toBeCloseTo(target.yMax, 0);
      }
    }
  });

  it('хвосты уходят ниже базовой линии', () => {
    expect(vbox(alignStrokes(fakeVariant('р', 'v').strokes, 'р')).yMin).toBeLessThan(-100);
    expect(vbox(alignStrokes(fakeVariant('а', 'v').strokes, 'а')).yMin).toBeGreaterThan(-30);
  });

  it('мелкие знаки только сдвигаются, размер не меняется', () => {
    for (const ch of ['.', ',', '-', '"']) {
      const drawn = translateStrokes(fakeVariant(ch, 'v').strokes, 0, 400);
      const before = vbox(drawn);
      const after = vbox(alignStrokes(drawn, ch));
      const target = interVBox(ch)!;
      expect(after.yMax - after.yMin, ch).toBeCloseTo(before.yMax - before.yMin, 6);
      expect((after.yMin + after.yMax) / 2, ch).toBeCloseTo((target.yMin + target.yMax) / 2, 6);
    }
  });

  it('повторное выравнивание ничего не меняет', () => {
    const once = alignVariant(fakeVariant('ж', 'v'), 'ж');
    const twice = alignVariant(once, 'ж');
    expect(vbox(twice.strokes).yMin).toBeCloseTo(vbox(once.strokes).yMin, 6);
    expect(twice.advanceWidth).toBeCloseTo(once.advanceWidth, 6);
  });

  it('сгенерированные варианты строятся от выровненной буквы, хранилище не меняется', () => {
    const font = hydrateFont(fakeFont(['cyrillic']));
    const snapshot = JSON.stringify(font);
    const out = prepareFont(font, true);
    expect(prepareFont(font, true)).toBe(out);
    expect(prepareFont(font, false)).toBe(font);
    expect(JSON.stringify(font)).toBe(snapshot);
    const g = out.glyphs['д']!;
    const base = g.variants.find((v) => v.source === 'drawn')!;
    const gen = g.variants.find((v) => v.source === 'generated')!;
    expect(gen.baseVariantId).toBe(base.id);
    expect(Math.abs(vbox(gen.strokes).yMin - vbox(base.strokes).yMin)).toBeLessThan(60);
  });
});
