import { INK_PRESETS, type InkColor } from './types';

export function inkHex(ink: InkColor): string {
  return ink.kind === 'preset' ? INK_PRESETS[ink.value] : ink.value;
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h.padEnd(6, '0');
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) || 0) as [number, number, number];
}

/** Цвет штриха: сильнее нажим — насыщеннее, слабее — немного светлее. */
export function pressureShade(hex: string, pressure: number): [number, number, number] {
  const [r, g, b] = hexToRgb(hex);
  const lift = Math.max(0, Math.min(1, 1 - pressure)) * 0.28;
  const mix = (c: number) => Math.round(c + (255 - c) * lift);
  return [mix(r), mix(g), mix(b)];
}

export function rgbCss([r, g, b]: [number, number, number]): string {
  return `rgb(${r} ${g} ${b})`;
}
