import Dexie, { type Table } from 'dexie';
import type { Glyph, HandwritingFont } from '../core/types';

export type FontRecord = Omit<HandwritingFont, 'glyphs'>;
export type GlyphRecord = Glyph & { fontId: string };
export type SettingRecord = { key: string; value: unknown };

export class HwDb extends Dexie {
  fonts!: Table<FontRecord, string>;
  glyphs!: Table<GlyphRecord, [string, string]>;
  settings!: Table<SettingRecord, string>;
  constructor(name = 'handwriting') {
    super(name);
    this.version(1).stores({
      fonts: 'id, updatedAt',
      glyphs: '[fontId+char], fontId',
      settings: 'key',
    });
  }
}

export const db = new HwDb();
