import { SIDE_BEARING } from './metrics';
import type { GlyphVariant, Stroke } from './types';

export type BBox = { minX: number; minY: number; maxX: number; maxY: number };

export function strokesBBox(strokes: Stroke[]): BBox | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const s of strokes)
    for (const p of s.points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
  return minX === Infinity ? null : { minX, minY, maxX, maxY };
}

/** Ширина и левая граница буквы по bbox штрихов плюс фиксированный отступ. */
export function computeSpacing(strokes: Stroke[]): Pick<GlyphVariant, 'advanceWidth' | 'leftBearing'> {
  const bb = strokesBBox(strokes);
  if (!bb) return { advanceWidth: SIDE_BEARING * 2, leftBearing: -SIDE_BEARING };
  return { advanceWidth: bb.maxX - bb.minX + SIDE_BEARING * 2, leftBearing: bb.minX - SIDE_BEARING };
}

export function mapStrokes(strokes: Stroke[], f: (x: number, y: number) => [number, number]): Stroke[] {
  return strokes.map((s) => ({
    points: s.points.map((p) => {
      const [x, y] = f(p.x, p.y);
      return { ...p, x, y };
    }),
  }));
}

export function translateStrokes(strokes: Stroke[], dx: number, dy: number): Stroke[] {
  return mapStrokes(strokes, (x, y) => [x + dx, y + dy]);
}

/** Масштаб буквы относительно базовой линии и центра bbox по горизонтали. */
export function scaleStrokes(strokes: Stroke[], k: number): Stroke[] {
  const bb = strokesBBox(strokes);
  if (!bb) return strokes;
  const cx = (bb.minX + bb.maxX) / 2;
  return mapStrokes(strokes, (x, y) => [cx + (x - cx) * k, y * k]);
}
