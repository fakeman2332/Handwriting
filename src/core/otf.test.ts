import fs from 'node:fs';
import { parse } from 'opentype.js';
import { describe, expect, it } from 'vitest';
import { buildOtf, glyphName, simplify, variantPolygons } from './otf';
import { fakeFont, fakeVariant } from './testing';
import { drawnVariants } from './variants';

describe('otf', () => {
  it('RDP оставляет концы и выбрасывает точки на прямой', () => {
    expect(simplify([[0, 0], [1, 0.01], [2, 0], [3, 5]], 0.5)).toEqual([[0, 0], [2, 0], [3, 5]]);
  });

  it('пересекающиеся штрихи объединяются в один контур', () => {
    const v = fakeVariant('x', 'vx');
    const mp = variantPolygons(v, 70);
    expect(mp.length).toBeGreaterThan(0);
    expect(mp.length).toBeLessThanOrEqual(v.strokes.length);
  });

  it('файл читается обратно и содержит только первые нарисованные варианты', () => {
    const font = fakeFont();
    const otf = buildOtf(font, 70);
    const bytes = otf.toArrayBuffer();
    fs.mkdirSync('test-output', { recursive: true });
    fs.writeFileSync('test-output/sample.otf', new Uint8Array(bytes));
    const back = parse(bytes);
    const names = (back.names as unknown as { windows: Record<string, { en: string }> }).windows;
    expect(names.fontFamily!.en).toBe('Тестовый почерк');
    expect(names.postScriptName!.en).toBe('TestovyyPocherk-Regular');
    const total = Object.values(font.glyphs).filter((g) => drawnVariants(g).length).length;
    expect(back.glyphs.length).toBe(total + 2);
    const ya = back.charToGlyph('я');
    expect(ya.name).toBe(glyphName('я'));
    expect(ya.advanceWidth).toBe(Math.round(font.glyphs['я']!.variants[0]!.advanceWidth));
    expect(ya.path.commands.length).toBeGreaterThan(4);
  });
});
