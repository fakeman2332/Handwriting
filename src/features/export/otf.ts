import { slug } from '../../core/font';
import { otfBytes } from '../../core/otf';
import type { HandwritingFont } from '../../core/types';
import { downloadBlob } from './download';

export function downloadOtf(font: HandwritingFont, penSize: number): void {
  const bytes = otfBytes(font, penSize);
  downloadBlob(new Blob([bytes], { type: 'font/otf' }), `${slug(font.name)}.otf`);
}
