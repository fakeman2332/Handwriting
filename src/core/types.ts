export type Point = { x: number; y: number; p: number; t: number; tx?: number; ty?: number };
// p — давление 0..1, t — мс от начала штриха, tx/ty — наклон стилуса

export type Stroke = { points: Point[] };

export type InputType = 'mouse' | 'touch' | 'pen';

export type GlyphVariant = {
  id: string;
  source: 'drawn' | 'generated';
  inputType: InputType;
  seed?: number; // для generated: из чего и с каким seed получен
  baseVariantId?: string;
  strokes: Stroke[];
  /** Ширина буквы в em: bbox штрихов плюс боковые отступы. */
  advanceWidth: number;
  /** Координата X в системе штрихов, с которой начинается бокс буквы (bbox.minX − отступ). */
  leftBearing: number;
  createdAt: number;
};

export type Glyph = { char: string; variants: GlyphVariant[] };

export type CharsetId = 'latin' | 'cyrillic' | 'digits' | 'punct';

export type Metrics = {
  unitsPerEm: 1000;
  ascender: number;
  descender: number;
  xHeight: number;
  capHeight: number;
};

/** Запись об экспорте OTF: по ней предлагается следующая версия. */
export type OtfExport = { name: string; version: string; penSize: number; at: number };

export type HandwritingFont = {
  id: string;
  name: string;
  formatVersion: 1;
  metrics: Metrics;
  charsets: CharsetId[];
  glyphs: Record<string, Glyph>;
  createdAt: number;
  updatedAt: number;
  exports?: OtfExport[];
};

export const INK_PRESETS = { blue: '#1F3A93', black: '#1C1C1E' } as const;

export type InkColor =
  | { kind: 'preset'; value: keyof typeof INK_PRESETS }
  | { kind: 'custom'; value: string };

export type PaperKind = 'blank' | 'lined' | 'grid';
export type PageFormat = 'A4' | 'A5';

export type RenderSettings = {
  fontId: string;
  ink: InkColor;
  penSize: number; // мм
  textSize: number; // высота заглавной, мм
  paper: PaperKind;
  pageFormat: PageFormat;
  /** Ровные буквы: выравнивание по линиям при выводе. */
  align: boolean;
};

export type PlacedGlyph = {
  char: string;
  variant: GlyphVariant | null; // null — символа нет в шрифте
  x: number;
  y: number; // мм на странице, начало координат глифа на базовой линии
  scale: number; // мм на единицу em
  rotate: number; // радианы
  page: number;
};
