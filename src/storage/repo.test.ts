import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { hydrateFont } from '../core/font';
import { fakeFont, fakeVariant } from '../core/testing';
import { HwDb } from './db';
import { createRepo } from './repo';

describe('repo', () => {
  it('сохраняет и загружает шрифт целиком, по одной записи на глиф', async () => {
    const db = new HwDb('t1');
    const repo = createRepo(db);
    const font = hydrateFont(fakeFont(['digits']));
    await repo.saveFont(font);
    expect(await db.glyphs.count()).toBe(10);
    expect(await repo.loadFont(font.id)).toEqual(font);
    const list = await repo.listFonts();
    expect(list[0]!.filled).toBe(10);
  });

  it('автосохранение пишет только изменённую букву', async () => {
    const db = new HwDb('t2');
    const repo = createRepo(db);
    const font = hydrateFont(fakeFont(['digits']));
    await repo.saveFont(font);
    const v = fakeVariant('7', 'new7', 9);
    await repo.saveGlyph(font.id, { char: '7', variants: [v] }, 123);
    const back = await repo.loadFont(font.id);
    expect(back!.glyphs['7']!.variants).toEqual([v]);
    expect(back!.glyphs['1']).toEqual(font.glyphs['1']);
    expect(back!.updatedAt).toBe(123);
  });

  it('удаление шрифта удаляет его глифы', async () => {
    const db = new HwDb('t3');
    const repo = createRepo(db);
    const font = fakeFont(['digits']);
    await repo.saveFont(font);
    await repo.deleteFont(font.id);
    expect(await db.glyphs.count()).toBe(0);
    expect(await repo.loadFont(font.id)).toBeNull();
  });
});
