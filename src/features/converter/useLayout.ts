import { useEffect, useMemo, useRef, useState } from 'react';
import { layoutPages, type LayoutResult } from '../../core/layout';
import type { GlyphVariant, HandwritingFont, RenderSettings } from '../../core/types';
import type { LayoutRequest, LayoutResponse } from './layout.worker';

/** С какой длины текста раскладка уходит в Web Worker, чтобы ввод не тормозил. */
export const WORKER_THRESHOLD = 4000;

let worker: Worker | null = null;
function getWorker(): Worker {
  worker ??= new Worker(new URL('./layout.worker.ts', import.meta.url), { type: 'module' });
  return worker;
}

let nextId = 1;

export function useLayout(
  text: string,
  font: HandwritingFont | null | undefined,
  s: RenderSettings,
  seed: number,
): { result: LayoutResult | null; pending: boolean } {
  const sync = useMemo(
    () => (font && text.length <= WORKER_THRESHOLD ? layoutPages(text, font, s, seed) : null),
    [text, font, s, seed],
  );
  const [async, setAsync] = useState<{ key: string; result: LayoutResult } | null>(null);
  const reqId = useRef(0);
  const key = font && text.length > WORKER_THRESHOLD ? `${font.id}:${font.updatedAt}:${seed}:${JSON.stringify(s)}:${text}` : '';

  useEffect(() => {
    if (!font || !key) return;
    const id = nextId++;
    reqId.current = id;
    const w = getWorker();
    const variants = new Map<string, GlyphVariant>();
    for (const g of Object.values(font.glyphs)) for (const v of g.variants) variants.set(v.id, v);
    const onMsg = (e: MessageEvent<LayoutResponse>) => {
      if (e.data.id !== reqId.current) return;
      const glyphs = e.data.glyphs.map(({ variantId, ...g }) => ({ ...g, variant: variantId ? (variants.get(variantId) ?? null) : null }));
      setAsync({ key, result: { glyphs, pageCount: e.data.pageCount } });
    };
    w.addEventListener('message', onMsg);
    w.postMessage({ id, text, font, settings: s, seed } satisfies LayoutRequest);
    return () => w.removeEventListener('message', onMsg);
  }, [key, font, text, s, seed]);

  if (sync) return { result: sync, pending: false };
  if (!key) return { result: null, pending: false };
  return { result: async?.result ?? null, pending: async?.key !== key };
}
