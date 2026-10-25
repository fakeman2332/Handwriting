import { describe, expect, it } from 'vitest';
import { hydrateFont } from './font';
import { glyphTransform, layoutPages } from './layout';
import { paperGeometry } from './paper';
import { fakeFont } from './testing';
import type { RenderSettings } from './types';

const settings: RenderSettings = {
  fontId: 'font-test',
  ink: { kind: 'preset', value: 'blue' },
  penSize: 0.5,
  textSize: 5,
  paper: 'lined',
  pageFormat: 'A4',
  align: false,
};
const font = hydrateFont(fakeFont());
const LOREM = 'Съешь же ещё этих мягких французских булок, да выпей чаю. The quick brown fox jumps over the lazy dog 0123456789.';

describe('layout', () => {
  it('один и тот же seed даёт одинаковый результат', () => {
    expect(layoutPages(LOREM, font, settings, 5)).toEqual(layoutPages(LOREM, font, settings, 5));
    expect(layoutPages(LOREM, font, settings, 5)).not.toEqual(layoutPages(LOREM, font, settings, 6));
  });

  it('буквы не выходят за поля, строки лежат на линиях', () => {
    const geo = paperGeometry(settings);
    const { glyphs } = layoutPages(LOREM.repeat(5), font, settings, 1);
    for (const g of glyphs) {
      expect(g.x).toBeGreaterThanOrEqual(geo.margin.left - 1e-9);
      expect(g.x).toBeLessThan(geo.width - geo.margin.right);
      const nearest = Math.min(...geo.baselines.map((b) => Math.abs(b - g.y)));
      expect(nearest).toBeLessThan(geo.lineHeight * 0.1);
    }
  });

  it('слова переносятся целиком', () => {
    const { glyphs } = layoutPages(LOREM.repeat(3), font, settings, 1);
    const words = LOREM.repeat(3).split(' ').filter(Boolean);
    let i = 0;
    for (const w of words) {
      const part = glyphs.slice(i, i + [...w].length);
      expect(new Set(part.map((g) => `${g.page}:${Math.round(g.y / 5)}`)).size, w).toBe(1);
      i += [...w].length;
    }
  });

  it('слово длиннее строки разрывается принудительно', () => {
    const long = 'а'.repeat(200);
    const { glyphs } = layoutPages(long, font, settings, 1);
    expect(glyphs).toHaveLength(200);
    expect(new Set(glyphs.map((g) => g.y.toFixed(0))).size).toBeGreaterThan(1);
  });

  it('одна и та же буква не берёт один вариант дважды подряд', () => {
    const { glyphs } = layoutPages('о'.repeat(300), font, settings, 3);
    for (let i = 1; i < glyphs.length; i++) expect(glyphs[i]!.variant!.id).not.toBe(glyphs[i - 1]!.variant!.id);
  });

  it('переполнение листа открывает новую страницу', () => {
    const { pageCount, glyphs } = layoutPages(Array(80).fill('строка').join('\n'), font, settings, 1);
    const geo = paperGeometry(settings);
    expect(pageCount).toBe(Math.ceil(80 / geo.baselines.length));
    expect(glyphs.filter((g) => g.page === 1).length).toBeGreaterThan(0);
  });

  it('отсутствующий символ отмечается variant = null', () => {
    const partial = hydrateFont(fakeFont(['latin']));
    const { glyphs } = layoutPages('ab я', partial, settings, 1);
    expect(glyphs.map((g) => g.variant === null)).toEqual([false, false, true]);
  });

  it('снимок раскладки и геометрии не меняется', () => {
    const { glyphs } = layoutPages('Привет, мир! Hello', font, settings, 2026);
    const snap = glyphs.map((g) => {
      const tf = glyphTransform(g);
      const p = g.variant!.strokes[0]!.points[0]!;
      const [x, y] = tf(p.x, p.y);
      return `${g.char} ${g.variant!.source[0]} ${g.x.toFixed(2)} ${g.y.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)}`;
    });
    expect(snap).toMatchSnapshot();
  });
});
