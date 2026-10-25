import type { PageFormat, PaperKind, RenderSettings } from './types';

export const PAGE_SIZES: Record<PageFormat, { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 },
};

/** Межстрочный интервал в долях высоты заглавной. */
export const LINE_HEIGHT_FACTOR = 2;

export type PaperGeometry = {
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  lineHeight: number;
  /** Базовые линии строк текста на странице, мм от верха. */
  baselines: number[];
  /** Линии разлиновки (горизонтальные и вертикальные), мм. */
  rules: { h: number[]; v: number[] };
  marginLine: number | null;
  paper: PaperKind;
};

export function paperGeometry(s: Pick<RenderSettings, 'pageFormat' | 'paper' | 'textSize'>): PaperGeometry {
  const { width, height } = PAGE_SIZES[s.pageFormat];
  const small = s.pageFormat === 'A5';
  const lineHeight = s.textSize * LINE_HEIGHT_FACTOR;
  const margin = {
    top: small ? 12 : 15,
    right: small ? 10 : 12,
    bottom: small ? 12 : 15,
    left: small ? 16 : 22,
  };
  const baselines: number[] = [];
  for (let y = margin.top + lineHeight; y <= height - margin.bottom + 1e-6; y += lineHeight) baselines.push(y);

  const h: number[] = [];
  const v: number[] = [];
  if (s.paper === 'lined') {
    h.push(...baselines);
  } else if (s.paper === 'grid') {
    const cell = lineHeight / 2;
    // Сетка выровнена по базовым линиям.
    const y0 = margin.top + lineHeight;
    for (let y = y0 - cell * Math.floor(y0 / cell); y <= height; y += cell) h.push(y);
    for (let x = margin.left - cell * Math.floor(margin.left / cell); x <= width; x += cell) v.push(x);
  }
  return {
    width,
    height,
    margin,
    lineHeight,
    baselines,
    rules: { h, v },
    marginLine: s.paper === 'blank' ? null : margin.left - 4,
    paper: s.paper,
  };
}

export const PAPER_COLORS = {
  background: '#ffffff',
  rule: '#a9c4e8',
  margin: '#e8a0a0',
} as const;
