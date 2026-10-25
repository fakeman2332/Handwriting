/// <reference lib="webworker" />
import { layoutPages } from '../../core/layout';
import type { HandwritingFont, RenderSettings } from '../../core/types';

export type LayoutRequest = { id: number; text: string; font: HandwritingFont; settings: RenderSettings; seed: number };
export type WirePlaced = { char: string; variantId: string | null; x: number; y: number; scale: number; rotate: number; page: number };
export type LayoutResponse = { id: number; glyphs: WirePlaced[]; pageCount: number };

self.onmessage = (e: MessageEvent<LayoutRequest>) => {
  const { id, text, font, settings, seed } = e.data;
  const { glyphs, pageCount } = layoutPages(text, font, settings, seed);
  const wire: WirePlaced[] = glyphs.map(({ variant, ...g }) => ({ ...g, variantId: variant?.id ?? null }));
  (self as unknown as Worker).postMessage({ id, glyphs: wire, pageCount } satisfies LayoutResponse);
};
