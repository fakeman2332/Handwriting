import { describe, expect, it } from 'vitest';
import { charsOf, charsOfAll, CHARSETS } from './charsets';
import { INTER } from './metrics';

describe('charsets', () => {
  it('имеют фиксированный состав', () => {
    expect(charsOf('latin')).toHaveLength(52);
    expect(charsOf('cyrillic')).toHaveLength(66);
    expect(charsOf('digits')).toHaveLength(10);
    expect(charsOf('cyrillic')).toEqual(expect.arrayContaining(['Ё', 'ё', 'Й', 'й']));
  });

  it('около 165 глифов в полном наборе без повторов', () => {
    const all = charsOfAll(['latin', 'cyrillic', 'digits', 'punct']);
    expect(new Set(all).size).toBe(all.length);
    expect(all.length).toBeGreaterThan(160);
    expect(all.length).toBeLessThan(175);
  });

  it('все символы наборов есть в Inter', () => {
    for (const s of Object.values(CHARSETS)) for (const c of s) expect(INTER.glyphs[c], c).toBeDefined();
  });
});
