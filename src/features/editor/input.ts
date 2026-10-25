import type { InputType, Point } from '../../core/types';

/** Пока стилус касался холста в последние 500 мс, касания пальцем игнорируются. */
export const PALM_WINDOW_MS = 500;

/**
 * Давление для мыши и пальца эмулируется по скорости: быстрее движение — тоньше линия.
 * Скорость в em/мс, результат сглаживается.
 */
export function emulatedPressure(prev: Point | undefined, x: number, y: number, t: number): number {
  if (!prev) return 0.6;
  const dt = Math.max(1, t - prev.t);
  const v = Math.hypot(x - prev.x, y - prev.y) / dt;
  const target = Math.min(0.95, Math.max(0.3, 0.95 - v * 0.18));
  return prev.p * 0.75 + target * 0.25;
}

export function pointFromEvent(
  e: PointerEvent,
  em: [number, number],
  t0: number,
  prev: Point | undefined,
  type: InputType,
): Point {
  const [x, y] = em;
  const t = Math.max(0, e.timeStamp - t0);
  if (type === 'pen') {
    const p = e.pressure > 0 ? e.pressure : (prev?.p ?? 0.5);
    return { x, y, p, t, tx: e.tiltX, ty: e.tiltY };
  }
  return { x, y, p: emulatedPressure(prev, x, y, t), t };
}

export function inputTypeOf(e: PointerEvent): InputType {
  return e.pointerType === 'pen' ? 'pen' : e.pointerType === 'touch' ? 'touch' : 'mouse';
}
