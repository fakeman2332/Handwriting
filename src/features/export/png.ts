import { zipSync } from 'fflate';
import { paperGeometry } from '../../core/paper';
import type { HandwritingFont, PlacedGlyph, RenderSettings } from '../../core/types';
import { drawPage } from '../converter/renderPage';

export const PNG_DPI = 300;

function canvasToBlob(canvas: HTMLCanvasElement | OffscreenCanvas): Promise<Blob> {
  if ('convertToBlob' in canvas) return canvas.convertToBlob({ type: 'image/png' });
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'),
  );
}

export async function renderPagePng(
  glyphs: PlacedGlyph[],
  page: number,
  font: HandwritingFont,
  s: RenderSettings,
): Promise<Blob> {
  const geo = paperGeometry(s);
  const pxPerMm = PNG_DPI / 25.4;
  const w = Math.round(geo.width * pxPerMm);
  const h = Math.round(geo.height * pxPerMm);
  const canvas: HTMLCanvasElement | OffscreenCanvas =
    typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  drawPage(ctx, glyphs, page, font, s, { pxPerMm, highlightMissing: false });
  return canvasToBlob(canvas);
}

/** Одна страница — PNG, несколько — zip из PNG. */
export async function exportPng(
  glyphs: PlacedGlyph[],
  pageCount: number,
  font: HandwritingFont,
  s: RenderSettings,
  baseName: string,
): Promise<{ blob: Blob; filename: string }> {
  if (pageCount === 1) return { blob: await renderPagePng(glyphs, 0, font, s), filename: `${baseName}.png` };
  const files: Record<string, Uint8Array> = {};
  for (let p = 0; p < pageCount; p++) {
    const blob = await renderPagePng(glyphs, p, font, s);
    files[`${baseName}-${String(p + 1).padStart(2, '0')}.png`] = new Uint8Array(await blob.arrayBuffer());
  }
  const zip = zipSync(files, { level: 0 });
  return { blob: new Blob([zip as BlobPart], { type: 'application/zip' }), filename: `${baseName}.zip` };
}
