// Извлекает метрики и контуры Inter из того же woff2, что подключается в интерфейсе,
// и пишет src/core/inter-data.json в системе em = 1000, ось Y вверх.
// Запуск: npm run extract:inter
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';
import wawoff2 from 'wawoff2';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const filesDir = path.join(root, 'node_modules/@fontsource-variable/inter/files');
const SUBSETS = ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext'];
const EM = 1000;

const charsetsSrc = fs.readFileSync(path.join(root, 'src/core/charsets.ts'), 'utf8');
const literal = /:\s*'((?:[^'\\]|\\.)*)'/g;
let chars = '';
for (const m of charsetsSrc.matchAll(literal)) chars += m[1].replace(/\\(.)/g, '$1');
const EXTRA = ' ’‘«»"\'`^|';
const all = [...new Set([...chars, ...EXTRA])];

const fonts = [];
for (const s of SUBSETS) {
  const buf = fs.readFileSync(path.join(filesDir, `inter-${s}-wght-normal.woff2`));
  const ttf = await wawoff2.decompress(buf);
  fonts.push(opentype.parse(ttf.buffer.slice(ttf.byteOffset, ttf.byteOffset + ttf.byteLength)));
}

const f0 = fonts[0];
const k = EM / f0.unitsPerEm;
const r = (v) => Math.round(v * k * 10) / 10;

const glyphs = {};
for (const ch of all) {
  const font = fonts.find((f) => f.charToGlyphIndex(ch) !== 0);
  if (!font) continue;
  const g = font.charToGlyph(ch);
  const d = [];
  for (const c of g.path.commands) {
    if (c.type === 'M' || c.type === 'L') d.push(c.type, r(c.x), r(c.y));
    else if (c.type === 'Q') d.push('Q', r(c.x1), r(c.y1), r(c.x), r(c.y));
    else if (c.type === 'C') d.push('C', r(c.x1), r(c.y1), r(c.x2), r(c.y2), r(c.x), r(c.y));
    else if (c.type === 'Z') d.push('Z');
  }
  glyphs[ch] = { a: r(g.advanceWidth), d: d.join(' ') };
}

const out = {
  source: 'Inter Variable (@fontsource-variable/inter), default instance',
  unitsPerEm: f0.unitsPerEm,
  ascender: r(f0.ascender),
  descender: r(f0.descender),
  xHeight: r(f0.tables.os2.sxHeight),
  capHeight: r(f0.tables.os2.sCapHeight),
  glyphs,
};
fs.writeFileSync(path.join(root, 'src/core/inter-data.json'), JSON.stringify(out) + '\n');
const missing = all.filter((c) => !glyphs[c]);
console.log(`inter-data.json: ${Object.keys(glyphs).length} glyphs` + (missing.length ? `, missing: ${missing.join('')}` : ''));
