import type { Metrics } from '../../core/types';

/** Видимая область холста в em: квадрат 1400×1400. */
export const VIEW = { x0: -100, top: 1060, size: 1400 } as const;
/** Толщина пера в редакторе, em. */
export const EDITOR_PEN = 70;

export type ViewTransform = { scale: number; dpr: number };

export function toEm(px: number, py: number, vt: ViewTransform): [number, number] {
  return [VIEW.x0 + px / vt.scale, VIEW.top - py / vt.scale];
}

/** Матрица canvas: em → пиксели устройства, ось Y вверх. */
export function setEmTransform(ctx: CanvasRenderingContext2D, vt: ViewTransform): void {
  const k = vt.scale * vt.dpr;
  ctx.setTransform(k, 0, 0, -k, -VIEW.x0 * k, VIEW.top * k);
}

export function guideLines(m: Metrics): { y: number; strong: boolean }[] {
  return [
    { y: 0, strong: true },
    { y: m.xHeight, strong: false },
    { y: m.capHeight, strong: false },
    { y: m.descender, strong: false },
  ];
}
