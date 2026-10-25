import { averagePressure, outlineToSvgPath, variantOutlines, type Outline } from '../../core/stroke';
import { inkHex, pressureShade, rgbCss } from '../../core/color';
import { parseInterPath, type PathCmd } from '../../core/metrics';
import { PAPER_COLORS, paperGeometry } from '../../core/paper';
import type { HandwritingFont, PlacedGlyph, RenderSettings } from '../../core/types';
import { interAdvance } from '../../core/metrics';

export type MissingHit = { char: string; x: number; y: number; w: number; h: number };

const pathCache = new WeakMap<Outline, Path2D>();
function outlinePath(o: Outline): Path2D {
  let p = pathCache.get(o);
  if (!p) {
    p = new Path2D(outlineToSvgPath(o));
    pathCache.set(o, p);
  }
  return p;
}

const interCache = new Map<string, Path2D | null>();
function interPath2D(char: string): Path2D | null {
  if (interCache.has(char)) return interCache.get(char)!;
  const cmds = parseInterPath(char);
  let p: Path2D | null = null;
  if (cmds) {
    p = new Path2D();
    for (const c of cmds as PathCmd[]) {
      if (c.c === 'M') p.moveTo(c.x, c.y);
      else if (c.c === 'L') p.lineTo(c.x, c.y);
      else if (c.c === 'Q') p.quadraticCurveTo(c.x1, c.y1, c.x, c.y);
      else if (c.c === 'C') p.bezierCurveTo(c.x1, c.y1, c.x2, c.y2, c.x, c.y);
      else p.closePath();
    }
  }
  interCache.set(char, p);
  return p;
}

/** Толщина пера в em; от базового масштаба, чтобы кеш контуров работал для всех копий буквы. */
export function penSizeEm(font: HandwritingFont, s: RenderSettings): number {
  return s.penSize / (s.textSize / font.metrics.capHeight);
}

export type DrawOptions = {
  /** Пикселей на миллиметр. */
  pxPerMm: number;
  highlightMissing: boolean;
  /** Если задано — рисуются только эти глифы (для анимации). */
  glyphFilter?: (g: PlacedGlyph, index: number) => boolean;
};

export function drawPaper(ctx: CanvasRenderingContext2D, s: RenderSettings, pxPerMm: number): void {
  const geo = paperGeometry(s);
  ctx.save();
  ctx.setTransform(pxPerMm, 0, 0, pxPerMm, 0, 0);
  ctx.fillStyle = PAPER_COLORS.background;
  ctx.fillRect(0, 0, geo.width, geo.height);
  ctx.lineWidth = 0.18;
  ctx.strokeStyle = PAPER_COLORS.rule;
  ctx.beginPath();
  for (const y of geo.rules.h) {
    ctx.moveTo(0, y);
    ctx.lineTo(geo.width, y);
  }
  for (const x of geo.rules.v) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, geo.height);
  }
  ctx.stroke();
  if (geo.marginLine !== null) {
    ctx.strokeStyle = PAPER_COLORS.margin;
    ctx.lineWidth = 0.25;
    ctx.beginPath();
    ctx.moveTo(geo.marginLine, 0);
    ctx.lineTo(geo.marginLine, geo.height);
    ctx.stroke();
  }
  ctx.restore();
}

/** Ставит систему координат глифа: em, ось Y вверх, начало на базовой линии. */
function glyphMatrix(ctx: CanvasRenderingContext2D, g: PlacedGlyph, pxPerMm: number): void {
  ctx.setTransform(pxPerMm, 0, 0, pxPerMm, 0, 0);
  ctx.translate(g.x, g.y);
  ctx.rotate(g.rotate);
  ctx.scale(g.scale, -g.scale);
  ctx.translate(-(g.variant?.leftBearing ?? 0), 0);
}

export function drawGlyph(
  ctx: CanvasRenderingContext2D,
  g: PlacedGlyph,
  font: HandwritingFont,
  s: RenderSettings,
  pxPerMm: number,
  highlightMissing: boolean,
): MissingHit | null {
  const hex = inkHex(s.ink);
  ctx.save();
  if (g.variant) {
    glyphMatrix(ctx, g, pxPerMm);
    const outlines = variantOutlines(g.variant, penSizeEm(font, s));
    g.variant.strokes.forEach((st, i) => {
      const o = outlines[i];
      if (!o || o.length < 3) return;
      ctx.fillStyle = rgbCss(pressureShade(hex, averagePressure(st)));
      ctx.fill(outlinePath(o));
    });
    ctx.restore();
    return null;
  }
  const w = interAdvance(g.char) * g.scale;
  const h = font.metrics.capHeight * g.scale;
  const hit: MissingHit = { char: g.char, x: g.x, y: g.y - h * 1.15, w, h: h * 1.4 };
  if (highlightMissing) {
    ctx.setTransform(pxPerMm, 0, 0, pxPerMm, 0, 0);
    ctx.fillStyle = 'rgba(255, 196, 0, 0.35)';
    ctx.fillRect(hit.x, hit.y, hit.w, hit.h);
  }
  const p = interPath2D(g.char);
  ctx.fillStyle = highlightMissing ? '#b54708' : hex;
  if (p) {
    glyphMatrix(ctx, g, pxPerMm);
    ctx.fill(p);
  } else {
    // Символа нет и в Inter: системный шрифт браузера.
    ctx.setTransform(pxPerMm, 0, 0, pxPerMm, 0, 0);
    ctx.translate(g.x, g.y);
    ctx.font = `${1000 * g.scale}px "Inter Variable", sans-serif`;
    ctx.fillText(g.char, 0, 0);
  }
  ctx.restore();
  return hit;
}

/** Рисует страницу целиком; возвращает области отсутствующих символов для клика. */
export function drawPage(
  ctx: CanvasRenderingContext2D,
  glyphs: PlacedGlyph[],
  page: number,
  font: HandwritingFont,
  s: RenderSettings,
  opts: DrawOptions,
): MissingHit[] {
  drawPaper(ctx, s, opts.pxPerMm);
  const hits: MissingHit[] = [];
  glyphs.forEach((g, i) => {
    if (g.page !== page) return;
    if (opts.glyphFilter && !opts.glyphFilter(g, i)) return;
    const hit = drawGlyph(ctx, g, font, s, opts.pxPerMm, opts.highlightMissing);
    if (hit) hits.push(hit);
  });
  return hits;
}
