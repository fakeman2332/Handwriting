import { inkHex, pressureShade, rgbCss } from '../../core/color';
import { averagePressure, outlineToSvgPath, strokeOutline, variantOutlines } from '../../core/stroke';
import type { HandwritingFont, PlacedGlyph, RenderSettings } from '../../core/types';
import { drawGlyph, drawPaper, penSizeEm } from './renderPage';

/** Фиксированные паузы: между штрихами, буквами и словами, мс. */
const PAUSE = { stroke: 90, letter: 70, word: 260 } as const;

type Step = { glyph: PlacedGlyph; stroke: number; start: number; duration: number };

function timeline(glyphs: PlacedGlyph[], textSize: number): { steps: (Step | { glyph: PlacedGlyph; start: number })[]; total: number } {
  const steps: (Step | { glyph: PlacedGlyph; start: number })[] = [];
  let t = 0;
  let prev: PlacedGlyph | null = null;
  for (const g of glyphs) {
    if (prev) {
      const newLine = Math.abs(g.y - prev.y) > textSize;
      const advance = prev.variant ? prev.variant.advanceWidth * prev.scale : textSize * 0.6;
      const wordGap = g.x - (prev.x + advance) > textSize * 0.25;
      t += newLine || wordGap ? PAUSE.word : PAUSE.letter;
    }
    if (!g.variant) {
      steps.push({ glyph: g, start: t });
      t += 120;
    } else {
      g.variant.strokes.forEach((s, i) => {
        if (i > 0) t += PAUSE.stroke;
        const duration = Math.max(40, s.points[s.points.length - 1]?.t ?? 0);
        steps.push({ glyph: g, stroke: i, start: t, duration });
        t += duration;
      });
    }
    prev = g;
  }
  return { steps, total: t };
}

/** Проигрывает написание страницы по меткам времени штрихов. Возвращает функцию остановки. */
export function animatePage(
  canvas: HTMLCanvasElement,
  glyphs: PlacedGlyph[],
  page: number,
  font: HandwritingFont,
  s: RenderSettings,
  pxPerMm: number,
  onDone: () => void,
): () => void {
  const ctx = canvas.getContext('2d')!;
  const base = document.createElement('canvas');
  base.width = canvas.width;
  base.height = canvas.height;
  const bctx = base.getContext('2d')!;
  drawPaper(bctx, s, pxPerMm);
  const pageGlyphs = glyphs.filter((g) => g.page === page);
  const { steps, total } = timeline(pageGlyphs, s.textSize);
  const size = penSizeEm(font, s);
  const hex = inkHex(s.ink);
  let done = 0;
  let raf = 0;
  const t0 = performance.now();

  const fillStroke = (c: CanvasRenderingContext2D, g: PlacedGlyph, outline: number[][], pressure: number) => {
    if (outline.length < 3) return;
    c.save();
    c.setTransform(pxPerMm, 0, 0, pxPerMm, 0, 0);
    c.translate(g.x, g.y);
    c.rotate(g.rotate);
    c.scale(g.scale, -g.scale);
    c.translate(-(g.variant?.leftBearing ?? 0), 0);
    c.fillStyle = rgbCss(pressureShade(hex, pressure));
    c.fill(new Path2D(outlineToSvgPath(outline)));
    c.restore();
  };

  const frame = (now: number) => {
    const el = now - t0;
    while (done < steps.length) {
      const st = steps[done]!;
      const end = 'duration' in st ? st.start + st.duration : st.start;
      if (end > el) break;
      if ('duration' in st) {
        const v = st.glyph.variant!;
        fillStroke(bctx, st.glyph, variantOutlines(v, size)[st.stroke] ?? [], averagePressure(v.strokes[st.stroke]!));
      } else drawGlyph(bctx, st.glyph, font, s, pxPerMm, false);
      done++;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(base, 0, 0);
    const cur = steps[done];
    if (cur && 'duration' in cur && el >= cur.start) {
      const st = cur.glyph.variant!.strokes[cur.stroke]!;
      const local = el - cur.start;
      const pts = st.points.filter((p) => p.t <= local);
      if (pts.length) fillStroke(ctx, cur.glyph, strokeOutline(pts, size, false), averagePressure(st));
    }
    if (el < total + 50) raf = requestAnimationFrame(frame);
    else onDone();
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}
