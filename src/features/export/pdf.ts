import { jsPDF } from 'jspdf';
import { glyphTransform } from '../../core/layout';
import { inkHex, pressureShade } from '../../core/color';
import { parseInterPath } from '../../core/metrics';
import { PAPER_COLORS, paperGeometry } from '../../core/paper';
import { averagePressure, variantOutlines } from '../../core/stroke';
import type { HandwritingFont, PlacedGlyph, RenderSettings } from '../../core/types';
import { hexToRgb } from '../../core/color';
import { penSizeEm } from '../converter/renderPage';

type Tf = (x: number, y: number) => [number, number];

/** Сглаженный контур: квадратичные кривые через середины рёбер, переведённые в кубические. */
function outlineToPdf(doc: jsPDF, outline: number[][], tf: Tf): void {
  const n = outline.length;
  if (n < 3) return;
  const pt = (i: number) => outline[i % n]!;
  const mid = (i: number): [number, number] => [(pt(i)[0]! + pt(i + 1)[0]!) / 2, (pt(i)[1]! + pt(i + 1)[1]!) / 2];
  let cur = mid(0);
  const [sx, sy] = tf(cur[0], cur[1]);
  doc.moveTo(sx, sy);
  for (let i = 1; i <= n; i++) {
    const c = pt(i);
    const next = mid(i);
    quadTo(doc, tf, cur, [c[0]!, c[1]!], next);
    cur = next;
  }
  doc.close();
}

function quadTo(doc: jsPDF, tf: Tf, p0: [number, number], c: [number, number], p: [number, number]): void {
  const c1: [number, number] = [p0[0] + (2 / 3) * (c[0] - p0[0]), p0[1] + (2 / 3) * (c[1] - p0[1])];
  const c2: [number, number] = [p[0] + (2 / 3) * (c[0] - p[0]), p[1] + (2 / 3) * (c[1] - p[1])];
  const a = tf(c1[0], c1[1]);
  const b = tf(c2[0], c2[1]);
  const e = tf(p[0], p[1]);
  doc.curveTo(a[0], a[1], b[0], b[1], e[0], e[1]);
}

function interToPdf(doc: jsPDF, char: string, tf: Tf): boolean {
  const cmds = parseInterPath(char);
  if (!cmds) return false;
  let cur: [number, number] = [0, 0];
  for (const c of cmds) {
    if (c.c === 'M') {
      const [x, y] = tf(c.x, c.y);
      doc.moveTo(x, y);
      cur = [c.x, c.y];
    } else if (c.c === 'L') {
      const [x, y] = tf(c.x, c.y);
      doc.lineTo(x, y);
      cur = [c.x, c.y];
    } else if (c.c === 'Q') {
      quadTo(doc, tf, cur, [c.x1, c.y1], [c.x, c.y]);
      cur = [c.x, c.y];
    } else if (c.c === 'C') {
      const a = tf(c.x1, c.y1);
      const b = tf(c.x2, c.y2);
      const e = tf(c.x, c.y);
      doc.curveTo(a[0], a[1], b[0], b[1], e[0], e[1]);
      cur = [c.x, c.y];
    } else doc.close();
  }
  return true;
}

/** Векторный PDF: контуры штрихов передаются как пути. */
export function buildPdf(glyphs: PlacedGlyph[], pageCount: number, font: HandwritingFont, s: RenderSettings): jsPDF {
  const geo = paperGeometry(s);
  const doc = new jsPDF({ unit: 'mm', format: s.pageFormat.toLowerCase(), orientation: 'portrait', compress: true });
  doc.setProperties({ title: font.name, creator: 'Handwriting generator' });
  const hex = inkHex(s.ink);
  const size = penSizeEm(font, s);
  for (let page = 0; page < pageCount; page++) {
    if (page > 0) doc.addPage();
    if (geo.rules.h.length || geo.rules.v.length) {
      doc.setDrawColor(...hexToRgb(PAPER_COLORS.rule));
      doc.setLineWidth(0.18);
      for (const y of geo.rules.h) doc.line(0, y, geo.width, y);
      for (const x of geo.rules.v) doc.line(x, 0, x, geo.height);
    }
    if (geo.marginLine !== null) {
      doc.setDrawColor(...hexToRgb(PAPER_COLORS.margin));
      doc.setLineWidth(0.25);
      doc.line(geo.marginLine, 0, geo.marginLine, geo.height);
    }
    for (const g of glyphs) {
      if (g.page !== page) continue;
      const tf = glyphTransform(g);
      if (g.variant) {
        const outlines = variantOutlines(g.variant, size);
        g.variant.strokes.forEach((st, i) => {
          const o = outlines[i];
          if (!o || o.length < 3) return;
          doc.setFillColor(...pressureShade(hex, averagePressure(st)));
          outlineToPdf(doc, o, tf);
          doc.fill();
        });
      } else {
        doc.setFillColor(...hexToRgb(hex));
        if (interToPdf(doc, g.char, tf)) doc.fill();
      }
    }
  }
  return doc;
}

export function pdfBlob(doc: jsPDF): Blob {
  return doc.output('blob');
}

/** Печать: PDF открывается в новой вкладке с вызовом печати. */
export function printPdf(doc: jsPDF): void {
  doc.autoPrint();
  const url = doc.output('bloburl');
  window.open(String(url), '_blank');
}
