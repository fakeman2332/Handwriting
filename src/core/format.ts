import { CHARSET_IDS } from './charsets';
import { DEFAULT_METRICS } from './metrics';
import type { Glyph, HandwritingFont } from './types';
import { dehydrateGlyph } from './variants';

export const CURRENT_FORMAT_VERSION = 1;
export const BACKUP_EXTENSION = '.hwfont.json';

/**
 * Миграции формата: ключ — версия, из которой мигрируем; функция поднимает объект на версию выше.
 * Версия 0 — черновой формат без formatVersion и metrics.
 */
export const MIGRATIONS: Record<number, (doc: Record<string, unknown>) => Record<string, unknown>> = {
  0: (doc) => ({ ...doc, formatVersion: 1, metrics: doc.metrics ?? { ...DEFAULT_METRICS } }),
};

export class BackupError extends Error {
  constructor(public code: 'json' | 'version' | 'shape') {
    super(code);
  }
}

export function serializeBackup(font: HandwritingFont): string {
  const glyphs: Record<string, Glyph> = {};
  for (const [ch, g] of Object.entries(font.glyphs)) glyphs[ch] = dehydrateGlyph(g);
  return JSON.stringify({ ...font, glyphs });
}

export function migrate(doc: Record<string, unknown>): Record<string, unknown> {
  let v = typeof doc.formatVersion === 'number' ? doc.formatVersion : 0;
  if (v > CURRENT_FORMAT_VERSION) throw new BackupError('version');
  let cur = doc;
  while (v < CURRENT_FORMAT_VERSION) {
    const step = MIGRATIONS[v];
    if (!step) throw new BackupError('version');
    cur = step(cur);
    v++;
  }
  return cur;
}

function isFont(d: Record<string, unknown>): d is HandwritingFont {
  const glyphs = d.glyphs as Record<string, Glyph> | undefined;
  return (
    typeof d.id === 'string' &&
    typeof d.name === 'string' &&
    Array.isArray(d.charsets) &&
    (d.charsets as unknown[]).every((c) => CHARSET_IDS.includes(c as never)) &&
    typeof glyphs === 'object' &&
    glyphs !== null &&
    Object.values(glyphs).every((g) => typeof g.char === 'string' && Array.isArray(g.variants))
  );
}

export function parseBackup(text: string): HandwritingFont {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError('json');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new BackupError('shape');
  const doc = migrate(raw as Record<string, unknown>);
  if (!isFont(doc)) throw new BackupError('shape');
  const now = Date.now();
  return {
    ...doc,
    createdAt: typeof doc.createdAt === 'number' ? doc.createdAt : now,
    updatedAt: typeof doc.updatedAt === 'number' ? doc.updatedAt : now,
  };
}
