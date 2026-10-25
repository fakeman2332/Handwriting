import { computeSpacing, strokesBBox } from './geometry';
import { parseInterPath } from './metrics';
import type { Glyph, GlyphVariant, HandwritingFont, Stroke } from './types';
import { generateVariant } from './variants';

/**
 * Ровные буквы: нарисованная буква подгоняется по вертикали под ту же букву в Inter.
 * Строчные встают на высоту строчных, заглавные — на высоту заглавных, хвосты уходят вниз.
 * Мелкие знаки (точка, запятая, тире, кавычки) только сдвигаются на своё место без масштаба.
 */

/** Ниже этой высоты (em) знак не масштабируется, а только сдвигается. */
const MARK_HEIGHT = 400;
/** Не растягиваем и не сжимаем больше чем вдвое: защита от случайных штрихов. */
const MIN_SCALE = 0.5;
const MAX_SCALE = 2;

type VBox = { yMin: number; yMax: number };
const interBoxes = new Map<string, VBox | null>();

export function interVBox(char: string): VBox | null {
  if (interBoxes.has(char)) return interBoxes.get(char)!;
  let box: VBox | null = null;
  const cmds = parseInterPath(char);
  if (cmds) {
    let yMin = Infinity;
    let yMax = -Infinity;
    for (const c of cmds) {
      if (c.c === 'Z') continue;
      const ys = c.c === 'C' ? [c.y1, c.y2, c.y] : c.c === 'Q' ? [c.y1, c.y] : [c.y];
      for (const y of ys) {
        yMin = Math.min(yMin, y);
        yMax = Math.max(yMax, y);
      }
    }
    if (yMin < yMax) box = { yMin, yMax };
  }
  interBoxes.set(char, box);
  return box;
}

export function alignStrokes(strokes: Stroke[], char: string): Stroke[] {
  const target = interVBox(char);
  const bb = strokesBBox(strokes);
  if (!target || !bb) return strokes;
  const th = target.yMax - target.yMin;
  const dh = bb.maxY - bb.minY;
  const cx = (bb.minX + bb.maxX) / 2;
  let k = 1;
  let dy: (y: number) => number;
  if (th >= MARK_HEIGHT && dh > 1) {
    k = Math.min(MAX_SCALE, Math.max(MIN_SCALE, th / dh));
    // Центр по высоте совпадает с эталоном: при ограниченном масштабе буква не уезжает вверх или вниз.
    const tc = (target.yMin + target.yMax) / 2;
    const dc = (bb.minY + bb.maxY) / 2;
    dy = (y) => tc + (y - dc) * k;
  } else {
    const shift = (target.yMin + target.yMax) / 2 - (bb.minY + bb.maxY) / 2;
    dy = (y) => y + shift;
  }
  return strokes.map((s) => ({ points: s.points.map((p) => ({ ...p, x: cx + (p.x - cx) * k, y: dy(p.y) })) }));
}

export function alignVariant(v: GlyphVariant, char: string): GlyphVariant {
  const strokes = alignStrokes(v.strokes, char);
  return strokes === v.strokes ? v : { ...v, strokes, ...computeSpacing(strokes) };
}

function alignGlyph(glyph: Glyph, font: HandwritingFont): Glyph {
  const aligned = new Map<string, GlyphVariant>();
  for (const v of glyph.variants) if (v.source === 'drawn') aligned.set(v.id, alignVariant(v, glyph.char));
  return {
    char: glyph.char,
    variants: glyph.variants.map((v) => {
      if (v.source === 'drawn') return aligned.get(v.id)!;
      const base = v.baseVariantId ? aligned.get(v.baseVariantId) : undefined;
      if (!base || v.seed === undefined) return v;
      return { ...generateVariant(base, v.seed, font.metrics, glyph.char), createdAt: v.createdAt };
    }),
  };
}

const cache = new WeakMap<HandwritingFont, HandwritingFont>();

/** Шрифт для вывода: с выравниванием или как нарисован. Штрихи в хранилище не меняются. */
export function prepareFont(font: HandwritingFont, align: boolean): HandwritingFont {
  if (!align) return font;
  let out = cache.get(font);
  if (!out) {
    const glyphs: Record<string, Glyph> = {};
    for (const [ch, g] of Object.entries(font.glyphs)) glyphs[ch] = alignGlyph(g, font);
    out = { ...font, glyphs };
    cache.set(font, out);
  }
  return out;
}
