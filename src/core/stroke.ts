import { getStroke } from 'perfect-freehand';
import type { GlyphVariant, Point, Stroke } from './types';

export type Outline = number[][]; // [x, y][]

export const STROKE_OPTIONS = {
  thinning: 0.55,
  smoothing: 0.5,
  streamline: 0.35,
  simulatePressure: false,
  last: true,
} as const;

export function strokeOutline(points: Point[], size: number, last = true): Outline {
  if (points.length === 0) return [];
  const input = points.map((p) => [p.x, p.y, p.p]);
  return getStroke(input, { ...STROKE_OPTIONS, size, last });
}

export function averagePressure(s: Stroke): number {
  if (s.points.length === 0) return 0.5;
  let sum = 0;
  for (const p of s.points) sum += p.p;
  return sum / s.points.length;
}

type CachedVariant = Map<number, Outline[]>;
const cache = new WeakMap<GlyphVariant, CachedVariant>();

/** Контуры всех штрихов варианта в em; кеш по паре «вариант + толщина пера». */
export function variantOutlines(v: GlyphVariant, sizeEm: number): Outline[] {
  const key = Math.round(sizeEm * 10) / 10;
  let byVariant = cache.get(v);
  if (!byVariant) {
    byVariant = new Map();
    cache.set(v, byVariant);
  }
  let out = byVariant.get(key);
  if (!out) {
    out = v.strokes.map((s) => strokeOutline(s.points, key));
    byVariant.set(key, out);
  }
  return out;
}

/** Сглаженный SVG-путь по контуру (квадратичные кривые через середины рёбер). */
export function outlineToSvgPath(outline: Outline): string {
  const n = outline.length;
  if (n < 3) return '';
  const p = (i: number) => outline[i % n]!;
  const f = (v: number) => v.toFixed(2);
  let d = `M${f((p(0)[0]! + p(1)[0]!) / 2)} ${f((p(0)[1]! + p(1)[1]!) / 2)}`;
  for (let i = 1; i <= n; i++) {
    const a = p(i);
    const b = p(i + 1);
    d += `Q${f(a[0]!)} ${f(a[1]!)} ${f((a[0]! + b[0]!) / 2)} ${f((a[1]! + b[1]!) / 2)}`;
  }
  return d + 'Z';
}
