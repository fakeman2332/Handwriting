import { describe, expect, it } from 'vitest';
import { charsOf, charsOfAll, CHARSETS, pangramLetters } from './charsets';
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

  it('панграммы покрывают все строчные буквы своего набора', () => {
    const lower = (id: 'latin' | 'cyrillic') => charsOf(id).filter((c) => c === c.toLowerCase());
    for (const id of ['latin', 'cyrillic'] as const) {
      const letters = pangramLetters(id).map((c) => c.toLowerCase());
      for (const c of lower(id)) expect(letters, `${id}: ${c}`).toContain(c);
    }
  });

  it('все символы наборов есть в Inter', () => {
    for (const s of Object.values(CHARSETS)) for (const c of s) expect(INTER.glyphs[c], c).toBeDefined();
  });
});
