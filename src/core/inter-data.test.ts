import fs from 'node:fs';
import path from 'node:path';
import { Font, parse } from 'opentype.js';
import wawoff2 from 'wawoff2';
import { describe, expect, it } from 'vitest';
import { DEFAULT_METRICS, INTER } from './metrics';

const file = path.resolve('node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2');

describe('inter-data.json', () => {
  it('совпадает с метриками woff2, который рисуется в интерфейсе', async () => {
    const ttf: Uint8Array = await wawoff2.decompress(fs.readFileSync(file));
    const font: Font = parse(ttf.buffer.slice(ttf.byteOffset, ttf.byteOffset + ttf.byteLength));
    const k = 1000 / font.unitsPerEm;
    expect(INTER.capHeight).toBeCloseTo(font.tables.os2!.sCapHeight * k, 0);
    expect(INTER.xHeight).toBeCloseTo(font.tables.os2!.sxHeight * k, 0);
    expect(INTER.ascender).toBeCloseTo(font.ascender * k, 0);
    expect(INTER.glyphs.A!.a).toBeCloseTo(font.charToGlyph('A').advanceWidth! * k, 0);
    expect(DEFAULT_METRICS.unitsPerEm).toBe(1000);
  });
});
