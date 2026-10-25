import { describe, expect, it } from 'vitest';
import { BackupError, parseBackup, serializeBackup } from './format';
import { hydrateFont } from './font';
import { fakeFont } from './testing';

describe('backup', () => {
  it('сохраняет шрифт без сгенерированных штрихов и восстанавливает его', () => {
    const font = hydrateFont(fakeFont(['digits']));
    const text = serializeBackup(font);
    const parsed = JSON.parse(text);
    expect(parsed.formatVersion).toBe(1);
    for (const g of Object.values<{ variants: { source: string; strokes: unknown[] }[] }>(parsed.glyphs))
      for (const v of g.variants) if (v.source === 'generated') expect(v.strokes).toHaveLength(0);
    expect(hydrateFont(parseBackup(text))).toEqual(font);
  });

  it('прогоняет миграции со старых версий', () => {
    const old = { id: 'x', name: 'old', charsets: ['digits'], glyphs: {} };
    const f = parseBackup(JSON.stringify(old));
    expect(f.formatVersion).toBe(1);
    expect(f.metrics.unitsPerEm).toBe(1000);
  });

  it('отклоняет будущие версии и мусор', () => {
    expect(() => parseBackup('{')).toThrow(BackupError);
    expect(() => parseBackup(JSON.stringify({ formatVersion: 99 }))).toThrow(BackupError);
    expect(() => parseBackup(JSON.stringify({ formatVersion: 1, id: 1 }))).toThrow(BackupError);
  });
});
