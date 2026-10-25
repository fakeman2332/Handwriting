import type { Glyph, HandwritingFont } from '../core/types';
import { dehydrateGlyph, hydrateGlyph } from '../core/variants';
import { db as defaultDb, type FontRecord, type HwDb } from './db';

/** Доступ к шрифтам: по одной записи на глиф, чтобы автосохранение писало только изменённую букву. */
export function createRepo(db: HwDb) {
  return {
    async listFonts(): Promise<(FontRecord & { filled: number })[]> {
      const fonts = await db.fonts.orderBy('updatedAt').reverse().toArray();
      return Promise.all(
        fonts.map(async (f) => {
          const glyphs = await db.glyphs.where('fontId').equals(f.id).toArray();
          const filled = glyphs.filter((g) => g.variants.some((v) => v.source === 'drawn' && v.strokes.length > 0)).length;
          return { ...f, filled };
        }),
      );
    },

    async loadFont(id: string): Promise<HandwritingFont | null> {
      const rec = await db.fonts.get(id);
      if (!rec) return null;
      const rows = await db.glyphs.where('fontId').equals(id).toArray();
      const glyphs: Record<string, Glyph> = {};
      for (const { fontId: _fontId, ...g } of rows) glyphs[g.char] = hydrateGlyph(g, rec.metrics);
      return { ...rec, glyphs };
    },

    async saveFont(font: HandwritingFont): Promise<void> {
      const { glyphs, ...rec } = font;
      await db.transaction('rw', db.fonts, db.glyphs, async () => {
        await db.fonts.put(rec);
        await db.glyphs.where('fontId').equals(font.id).delete();
        await db.glyphs.bulkPut(Object.values(glyphs).map((g) => ({ ...dehydrateGlyph(g), fontId: font.id })));
      });
    },

    async saveFontMeta(rec: FontRecord): Promise<void> {
      await db.fonts.put(rec);
    },

    async saveGlyph(fontId: string, glyph: Glyph, now = Date.now()): Promise<void> {
      await db.transaction('rw', db.fonts, db.glyphs, async () => {
        if (glyph.variants.length === 0) await db.glyphs.delete([fontId, glyph.char]);
        else await db.glyphs.put({ ...dehydrateGlyph(glyph), fontId });
        await db.fonts.update(fontId, { updatedAt: now });
      });
    },

    async deleteFont(id: string): Promise<void> {
      await db.transaction('rw', db.fonts, db.glyphs, async () => {
        await db.glyphs.where('fontId').equals(id).delete();
        await db.fonts.delete(id);
      });
    },

    async getSetting<T>(key: string, fallback: T): Promise<T> {
      const row = await db.settings.get(key);
      return row === undefined ? fallback : (row.value as T);
    },

    async setSetting(key: string, value: unknown): Promise<void> {
      await db.settings.put({ key, value });
    },
  };
}

export type Repo = ReturnType<typeof createRepo>;
export const repo = createRepo(defaultDb);

/** Просит браузер не удалять данные сайта при нехватке места. */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
