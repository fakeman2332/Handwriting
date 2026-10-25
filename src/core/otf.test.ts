import fs from 'node:fs';
import { parse } from 'opentype.js';
import { describe, expect, it } from 'vitest';
import { glyphName, isValidVersion, nameRecords, nextVersion, otfBytes, simplify, variantPolygons } from './otf';
import { checksum, readTables } from './sfnt';
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
    const bytes = otfBytes(font, 70);
    fs.mkdirSync('test-output', { recursive: true });
    fs.writeFileSync('test-output/sample.otf', new Uint8Array(bytes));
    const back = parse(bytes);
    const names = (back.names as unknown as { windows: Record<string, { en: string }> }).windows;
    expect(names.fontFamily!.en).toBe('Тестовый почерк');
    expect(names.postScriptName!.en).toBe('TestovyyPocherk-Regular');
    const total = Object.values(font.glyphs).filter((g) => drawnVariants(g).length).length;
    expect(back.glyphs.length).toBe(total + 3);
    expect(back.charToGlyph('\u00a0').advanceWidth).toBe(back.charToGlyph(' ').advanceWidth);
    const ya = back.charToGlyph('я');
    expect(ya.name).toBe(glyphName('я'));
    expect(ya.advanceWidth).toBe(Math.round(font.glyphs['я']!.variants[0]!.advanceWidth));
    expect(ya.path.commands.length).toBeGreaterThan(4);
  });

  it('контрольные суммы таблиц и checksumAdjustment верны, лишних таблиц нет', () => {
    const bytes = otfBytes(fakeFont(['cyrillic']), 70);
    const { tables } = readTables(bytes);
    expect([...tables.keys()]).not.toContain('ltag');
    const dv = new DataView(bytes);
    const num = dv.getUint16(4);
    for (let i = 0; i < num; i++) {
      const p = 12 + i * 16;
      const off = dv.getUint32(p + 8);
      expect(off % 4).toBe(0);
      const data = new Uint8Array(bytes, off, dv.getUint32(p + 12)).slice();
      const tag = String.fromCharCode(...new Uint8Array(bytes, p, 4));
      if (tag === 'head') new DataView(data.buffer).setUint32(8, 0);
      expect(checksum(data), tag).toBe(dv.getUint32(p + 4));
    }
    expect(checksum(new Uint8Array(bytes))).toBe(0xb1b0afba);
  });

  it('имена: без пустых записей, ASCII для Mac, имя семейства не длиннее 31 символа', () => {
    const font = { ...fakeFont(['digits']), name: 'Очень длинное название моего рукописного почерка' };
    const back = parse(otfBytes(font, 70));
    const n = back.names as unknown as Record<'windows' | 'macintosh', Record<string, { en: string }>>;
    expect(n.windows.fontFamily!.en.length).toBeLessThanOrEqual(31);
    expect(n.windows.fontFamily!.en.startsWith('Очень длинное')).toBe(true);
    expect(n.macintosh.fontFamily!.en).toMatch(/^[\x20-\x7e]+$/);
    for (const platform of Object.values(n)) for (const v of Object.values(platform)) expect(v.en.trim()).not.toBe('');
    expect(nameRecords('Мой почерк').find((r) => r.platformID === 1 && r.nameID === 1)?.text).toBe('Moy Pocherk');
  });
});

describe('версии и название шрифта', () => {
  it('следующая версия', () => {
    expect(nextVersion(undefined)).toBe('1.000');
    expect(nextVersion('1.000')).toBe('1.001');
    expect(nextVersion('1.999')).toBe('2.000');
    expect(nextVersion('2')).toBe('2.001');
    expect(isValidVersion('1.2.3')).toBe(false);
    expect(isValidVersion('0')).toBe(false);
  });

  it('название и версия попадают в name и head', () => {
    const bytes = otfBytes(fakeFont(['digits']), 70, { familyName: 'Конспект', version: '1.004' });
    const back = parse(bytes);
    const n = (back.names as unknown as { windows: Record<string, { en: string }> }).windows;
    expect(n.fontFamily!.en).toBe('Конспект');
    expect(n.version!.en).toBe('Version 1.004');
    expect(n.postScriptName!.en).toBe('Konspekt-Regular');
    expect(back.tables.head!.fontRevision).toBeCloseTo(1.004, 3);
  });
});
