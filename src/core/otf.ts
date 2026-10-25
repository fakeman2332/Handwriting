import { Font, Glyph, Path } from 'opentype.js';
import polygonClipping, { type MultiPolygon, type Pair, type Ring } from 'polygon-clipping';
import { charsOfAll } from './charsets';
import { slug } from './font';
import { SPACE_WIDTH } from './metrics';
import { strokeOutline } from './stroke';
import type { GlyphVariant, HandwritingFont } from './types';
import { drawnVariants } from './variants';

import { OTF_DEFAULT_PEN } from './otf-defaults';

export { OTF_DEFAULT_PEN };
const SIMPLIFY_EPSILON = 2.5;

/** Упрощение ломаной (Рамер–Дуглас–Пекер). */
export function simplify(points: Pair[], epsilon: number): Pair[] {
  if (points.length < 3) return points.slice();
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [ax, ay] = points[a]!;
    const [bx, by] = points[b]!;
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    let maxD = -1;
    let idx = -1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i]!;
      const d = Math.abs(dy * px - dx * py + bx * ay - by * ax) / len;
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (maxD > epsilon && idx > 0) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

function closeRing(r: Pair[]): Ring {
  if (r.length === 0) return r;
  const f = r[0]!;
  const l = r[r.length - 1]!;
  return f[0] === l[0] && f[1] === l[1] ? r : [...r, [f[0], f[1]]];
}

/** Контуры штрихов буквы, объединённые в один многоугольник без самопересечений. */
export function variantPolygons(v: GlyphVariant, penSize: number): MultiPolygon {
  const polys = v.strokes
    .map((s) => strokeOutline(s.points, penSize))
    .map((o) => simplify(o.map(([x, y]) => [x! - v.leftBearing, y!] as Pair), SIMPLIFY_EPSILON))
    .filter((r) => r.length >= 3)
    .map((r) => [closeRing(r)]);
  if (polys.length === 0) return [];
  try {
    return polygonClipping.union(polys[0]!, ...polys.slice(1));
  } catch {
    return polys;
  }
}

/** Многоугольник → path со сглаживанием в квадратичные кривые через середины рёбер. */
export function polygonsToPath(mp: MultiPolygon): Path {
  const path = new Path();
  const r = (n: number) => Math.round(n);
  for (const poly of mp)
    for (const ring of poly) {
      const pts = ring.slice(0, -1);
      const n = pts.length;
      if (n < 3) continue;
      const mid = (i: number): Pair => {
        const a = pts[i % n]!;
        const b = pts[(i + 1) % n]!;
        return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      };
      const m0 = mid(0);
      path.moveTo(r(m0[0]), r(m0[1]));
      for (let i = 1; i <= n; i++) {
        const c = pts[i % n]!;
        const m = mid(i);
        path.quadraticCurveTo(r(c[0]), r(c[1]), r(m[0]), r(m[1]));
      }
      path.close();
    }
  return path;
}

export function glyphName(char: string): string {
  const cp = char.codePointAt(0)!;
  return cp > 0xffff ? `u${cp.toString(16).toUpperCase()}` : `uni${cp.toString(16).toUpperCase().padStart(4, '0')}`;
}

function notdefGlyph(m: HandwritingFont['metrics']): Glyph {
  const p = new Path();
  const w = 500;
  const h = m.capHeight;
  p.moveTo(50, 0);
  p.lineTo(w - 50, 0);
  p.lineTo(w - 50, h);
  p.lineTo(50, h);
  p.close();
  p.moveTo(100, 50);
  p.lineTo(100, h - 50);
  p.lineTo(w - 100, h - 50);
  p.lineTo(w - 100, 50);
  p.close();
  return new Glyph({ name: '.notdef', unicode: 0, advanceWidth: w, path: p });
}

/** PostScript-имя: только ASCII без пробелов, не длиннее 63 символов. */
export function postScriptName(name: string): string {
  const base = slug(name)
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
  return `${base}-Regular`.slice(0, 63);
}

/** Собирает OTF (CFF) из первого нарисованного варианта каждой буквы. */
export function buildOtf(userFont: HandwritingFont, penSize = OTF_DEFAULT_PEN): Font {
  const m = userFont.metrics;
  const glyphs: Glyph[] = [];
  const chars = new Set([...charsOfAll(userFont.charsets), ...Object.keys(userFont.glyphs)]);
  for (const char of chars) {
    const variant = drawnVariants(userFont.glyphs[char])[0];
    if (!variant) continue;
    glyphs.push(
      new Glyph({
        name: glyphName(char),
        unicode: char.codePointAt(0)!,
        advanceWidth: Math.round(variant.advanceWidth),
        path: polygonsToPath(variantPolygons(variant, penSize)),
      }),
    );
  }
  const space = new Glyph({ name: 'space', unicode: 32, advanceWidth: SPACE_WIDTH, path: new Path() });
  return new Font({
    familyName: userFont.name,
    styleName: 'Regular',
    postScriptName: postScriptName(userFont.name),
    designer: 'Handwriting generator',
    version: 'Version 1.0',
    unitsPerEm: 1000,
    ascender: Math.round(m.ascender),
    descender: Math.round(m.descender),
    glyphs: [notdefGlyph(m), space, ...glyphs],
  });
}

export function otfBytes(userFont: HandwritingFont, penSize = OTF_DEFAULT_PEN): ArrayBuffer {
  return buildOtf(userFont, penSize).toArrayBuffer();
}
