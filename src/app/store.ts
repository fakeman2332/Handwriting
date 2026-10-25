import { create } from 'zustand';
import { createFont as newFont, hydrateFont } from '../core/font';
import { parseBackup } from '../core/format';
import { uid } from '../core/random';
import type { CharsetId, Glyph, HandwritingFont, RenderSettings } from '../core/types';
import { hydrateGlyph } from '../core/variants';
import { repo, requestPersistence, type FontSummary } from '../storage/repo';

export type { FontSummary };

type FontsState = {
  ready: boolean;
  list: FontSummary[];
  current: HandwritingFont | null;
  refresh: () => Promise<void>;
  open: (id: string) => Promise<HandwritingFont | null>;
  create: (name: string, charsets: CharsetId[]) => Promise<HandwritingFont>;
  updateMeta: (patch: Partial<Pick<HandwritingFont, 'name' | 'charsets' | 'exports'>>) => Promise<void>;
  saveGlyph: (glyph: Glyph) => Promise<void>;
  remove: (id: string) => Promise<void>;
  importBackup: (text: string) => Promise<HandwritingFont>;
};

let persistAsked = false;
async function askPersistOnce() {
  if (persistAsked) return;
  persistAsked = true;
  await requestPersistence();
}

export const useFonts = create<FontsState>((set, get) => ({
  ready: false,
  list: [],
  current: null,

  async refresh() {
    set({ list: await repo.listFonts(), ready: true });
  },

  async open(id) {
    const cur = get().current;
    if (cur?.id === id) return cur;
    const font = await repo.loadFont(id);
    set({ current: font });
    return font;
  },

  async create(name, charsets) {
    const font = newFont(name, charsets);
    await repo.saveFont(font);
    void askPersistOnce();
    set({ current: font });
    await get().refresh();
    return font;
  },

  async updateMeta(patch) {
    const cur = get().current;
    if (!cur) return;
    const next = { ...cur, ...patch, updatedAt: Date.now() };
    const { glyphs: _glyphs, ...rec } = next;
    await repo.saveFontMeta(rec);
    set({ current: next });
    await get().refresh();
  },

  async saveGlyph(glyph) {
    const cur = get().current;
    if (!cur) return;
    const now = Date.now();
    const glyphs = { ...cur.glyphs };
    if (glyph.variants.length === 0) delete glyphs[glyph.char];
    else glyphs[glyph.char] = hydrateGlyph(glyph, cur.metrics);
    set({ current: { ...cur, glyphs, updatedAt: now } });
    await repo.saveGlyph(cur.id, glyph, now);
    void askPersistOnce();
  },

  async remove(id) {
    await repo.deleteFont(id);
    if (get().current?.id === id) set({ current: null });
    await get().refresh();
  },

  async importBackup(text) {
    let font = parseBackup(text);
    if (await repo.loadFont(font.id)) font = { ...font, id: uid() };
    font = hydrateFont(font);
    await repo.saveFont(font);
    void askPersistOnce();
    await get().refresh();
    return font;
  },
}));

export const DEFAULT_RENDER: RenderSettings = {
  fontId: '',
  ink: { kind: 'preset', value: 'blue' },
  penSize: 0.45,
  textSize: 4.5,
  paper: 'lined',
  pageFormat: 'A4',
  align: true,
};

/** Около 20 страниц A4. */
export const TEXT_LIMIT = 30_000;

type ConverterState = {
  loaded: boolean;
  text: string;
  settings: RenderSettings;
  seed: number;
  customColor: string;
  load: () => Promise<void>;
  setText: (text: string) => void;
  patch: (p: Partial<RenderSettings>) => void;
  setCustomColor: (c: string) => void;
  regenerate: () => void;
};

let saveTimer: ReturnType<typeof setTimeout> | undefined;
function persistConverter(s: Pick<ConverterState, 'text' | 'settings' | 'seed' | 'customColor'>) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void repo.setSetting('converter', { text: s.text, settings: s.settings, seed: s.seed, customColor: s.customColor });
  }, 500);
}

export const useConverter = create<ConverterState>((set, get) => ({
  loaded: false,
  text: '',
  settings: DEFAULT_RENDER,
  seed: 1,
  customColor: '#7a2e8c',
  async load() {
    if (get().loaded) return;
    const saved = await repo.getSetting<Partial<ConverterState> | null>('converter', null);
    set({
      loaded: true,
      text: saved?.text ?? '',
      settings: { ...DEFAULT_RENDER, ...saved?.settings },
      seed: saved?.seed ?? Math.floor(Math.random() * 1e9),
      customColor: saved?.customColor ?? '#7a2e8c',
    });
  },
  setText(text) {
    set({ text: text.slice(0, TEXT_LIMIT) });
    persistConverter(get());
  },
  patch(p) {
    set({ settings: { ...get().settings, ...p } });
    persistConverter(get());
  },
  setCustomColor(customColor) {
    set({ customColor, settings: { ...get().settings, ink: { kind: 'custom', value: customColor } } });
    persistConverter(get());
  },
  regenerate() {
    set({ seed: Math.floor(Math.random() * 1e9) });
    persistConverter(get());
  },
}));

type PrefsState = {
  showSample: boolean;
  iosHintShown: boolean;
  backupAt: Record<string, number>;
  load: () => Promise<void>;
  set: (p: Partial<Omit<PrefsState, 'load' | 'set'>>) => void;
};

export const usePrefs = create<PrefsState>((set, get) => ({
  showSample: true,
  iosHintShown: false,
  backupAt: {},
  async load() {
    const saved = await repo.getSetting<Partial<PrefsState>>('prefs', {});
    set({ ...saved });
  },
  set(p) {
    set(p);
    const { showSample, iosHintShown, backupAt } = get();
    void repo.setSetting('prefs', { showSample, iosHintShown, backupAt });
  },
}));
