import interData from './inter-data.json';
import type { Metrics } from './types';

type InterGlyph = { a: number; d: string };

export const INTER = interData as {
  unitsPerEm: number;
  ascender: number;
  descender: number;
  xHeight: number;
  capHeight: number;
  glyphs: Record<string, InterGlyph>;
};

/** Метрики почерка по умолчанию — метрики Inter, приведённые к 1000 em. */
export const DEFAULT_METRICS: Metrics = {
  unitsPerEm: 1000,
  ascender: INTER.ascender,
  descender: INTER.descender,
  xHeight: INTER.xHeight,
  capHeight: INTER.capHeight,
};

/** Боковой отступ буквы в em. */
export const SIDE_BEARING = 60;
/** Ширина пробела в em. */
export const SPACE_WIDTH = 300;
/** Ширина символа, которого нет ни в шрифте, ни в Inter. */
export const UNKNOWN_WIDTH = 600;

export function interAdvance(char: string): number {
  return INTER.glyphs[char]?.a ?? UNKNOWN_WIDTH;
}

export function interPath(char: string): string | null {
  return INTER.glyphs[char]?.d ?? null;
}

export type PathCmd =
  | { c: 'M' | 'L'; x: number; y: number }
  | { c: 'Q'; x1: number; y1: number; x: number; y: number }
  | { c: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { c: 'Z' };

const parsedCache = new Map<string, PathCmd[]>();

/** Разбирает компактную запись контура Inter (em, ось Y вверх). */
export function parseInterPath(char: string): PathCmd[] | null {
  const cached = parsedCache.get(char);
  if (cached) return cached;
  const d = interPath(char);
  if (d === null) return null;
  const tok = d.split(' ');
  const out: PathCmd[] = [];
  let i = 0;
  const n = () => Number(tok[i++]);
  while (i < tok.length) {
    const c = tok[i++];
    if (c === 'M' || c === 'L') out.push({ c, x: n(), y: n() });
    else if (c === 'Q') out.push({ c, x1: n(), y1: n(), x: n(), y: n() });
    else if (c === 'C') out.push({ c, x1: n(), y1: n(), x2: n(), y2: n(), x: n(), y: n() });
    else if (c === 'Z') out.push({ c });
  }
  parsedCache.set(char, out);
  return out;
}
