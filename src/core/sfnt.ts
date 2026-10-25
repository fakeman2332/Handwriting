// Дособирает OTF после opentype.js: таблицы, которые библиотека пишет с ошибками,
// пересобираются, контрольные суммы считаются заново.

export type NameRecord = { platformID: 1 | 3; encodingID: number; languageID: number; nameID: number; text: string };

export type SfntPatch = {
  names: NameRecord[];
  /** Габариты всех глифов, em. */
  bbox: { xMin: number; yMin: number; xMax: number; yMax: number };
  ascender: number;
  descender: number;
  weightClass: number;
};

/** Таблицы, которые в шрифт не попадают (AAT, Apple-only). */
const DROP = new Set(['ltag']);

export function readTables(buf: ArrayBuffer): { version: number; tables: Map<string, Uint8Array> } {
  const dv = new DataView(buf);
  const version = dv.getUint32(0);
  const num = dv.getUint16(4);
  const tables = new Map<string, Uint8Array>();
  for (let i = 0; i < num; i++) {
    const p = 12 + i * 16;
    const tag = String.fromCharCode(dv.getUint8(p), dv.getUint8(p + 1), dv.getUint8(p + 2), dv.getUint8(p + 3));
    const offset = dv.getUint32(p + 8);
    const length = dv.getUint32(p + 12);
    tables.set(tag, new Uint8Array(buf, offset, length).slice());
  }
  return { version, tables };
}

export function checksum(bytes: Uint8Array): number {
  let sum = 0;
  const n = Math.ceil(bytes.length / 4) * 4;
  for (let i = 0; i < n; i += 4) {
    const word = ((bytes[i] ?? 0) << 24) | ((bytes[i + 1] ?? 0) << 16) | ((bytes[i + 2] ?? 0) << 8) | (bytes[i + 3] ?? 0);
    sum = (sum + (word >>> 0)) >>> 0;
  }
  return sum;
}

function encodeName(r: NameRecord): Uint8Array {
  if (r.platformID === 3) {
    const out = new Uint8Array(r.text.length * 2);
    for (let i = 0; i < r.text.length; i++) {
      const c = r.text.charCodeAt(i);
      out[i * 2] = c >> 8;
      out[i * 2 + 1] = c & 0xff;
    }
    return out;
  }
  // Mac Roman: только ASCII.
  return Uint8Array.from([...r.text].map((c) => (c.charCodeAt(0) < 128 ? c.charCodeAt(0) : 0x3f)));
}

export function buildNameTable(records: NameRecord[]): Uint8Array {
  const sorted = [...records].sort(
    (a, b) => a.platformID - b.platformID || a.encodingID - b.encodingID || a.languageID - b.languageID || a.nameID - b.nameID,
  );
  const strings = sorted.map(encodeName);
  const headerSize = 6 + sorted.length * 12;
  const total = headerSize + strings.reduce((a, s) => a + s.length, 0);
  const out = new Uint8Array(total);
  const dv = new DataView(out.buffer);
  dv.setUint16(0, 0);
  dv.setUint16(2, sorted.length);
  dv.setUint16(4, headerSize);
  let offset = 0;
  sorted.forEach((r, i) => {
    const p = 6 + i * 12;
    dv.setUint16(p, r.platformID);
    dv.setUint16(p + 2, r.encodingID);
    dv.setUint16(p + 4, r.languageID);
    dv.setUint16(p + 6, r.nameID);
    dv.setUint16(p + 8, strings[i]!.length);
    dv.setUint16(p + 10, offset);
    out.set(strings[i]!, headerSize + offset);
    offset += strings[i]!.length;
  });
  return out;
}

function patchHead(head: Uint8Array, p: SfntPatch): void {
  const dv = new DataView(head.buffer, head.byteOffset, head.byteLength);
  dv.setInt16(36, Math.floor(p.bbox.xMin));
  dv.setInt16(38, Math.floor(p.bbox.yMin));
  dv.setInt16(40, Math.ceil(p.bbox.xMax));
  dv.setInt16(42, Math.ceil(p.bbox.yMax));
}

function winMetrics(p: SfntPatch): { ascent: number; descent: number } {
  // Windows обрезает всё, что выходит за usWinAscent/usWinDescent.
  return {
    ascent: Math.max(Math.ceil(p.bbox.yMax), Math.round(p.ascender)),
    descent: Math.max(Math.ceil(-p.bbox.yMin), Math.round(-p.descender)),
  };
}

function patchOs2(os2: Uint8Array, p: SfntPatch): void {
  const dv = new DataView(os2.buffer, os2.byteOffset, os2.byteLength);
  const { ascent, descent } = winMetrics(p);
  dv.setUint16(4, p.weightClass);
  dv.setInt16(68, ascent);
  dv.setInt16(70, -descent);
  dv.setInt16(72, 0);
  dv.setUint16(74, ascent);
  dv.setUint16(76, descent);
}

/** Те же значения в hhea, чтобы высота строки совпадала в Windows и macOS. */
function patchHhea(hhea: Uint8Array, p: SfntPatch): void {
  const dv = new DataView(hhea.buffer, hhea.byteOffset, hhea.byteLength);
  const { ascent, descent } = winMetrics(p);
  dv.setInt16(4, ascent);
  dv.setInt16(6, -descent);
  dv.setInt16(8, 0);
}

/** Собирает sfnt: таблицы по алфавиту, выравнивание по 4 байта, контрольные суммы и checksumAdjustment. */
export function writeSfnt(version: number, tables: Map<string, Uint8Array>): ArrayBuffer {
  const tags = [...tables.keys()].sort();
  const num = tags.length;
  const pow = 2 ** Math.floor(Math.log2(num));
  let offset = 12 + num * 16;
  const layout = tags.map((tag) => {
    const data = tables.get(tag)!;
    const entry = { tag, data, offset };
    offset += Math.ceil(data.length / 4) * 4;
    return entry;
  });
  const out = new Uint8Array(offset);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, version);
  dv.setUint16(4, num);
  dv.setUint16(6, pow * 16);
  dv.setUint16(8, Math.log2(pow));
  dv.setUint16(10, num * 16 - pow * 16);
  let headOffset = -1;
  layout.forEach(({ tag, data, offset: off }, i) => {
    if (tag === 'head') {
      headOffset = off;
      new DataView(data.buffer, data.byteOffset, data.byteLength).setUint32(8, 0);
    }
    const p = 12 + i * 16;
    for (let k = 0; k < 4; k++) dv.setUint8(p + k, tag.charCodeAt(k));
    dv.setUint32(p + 4, checksum(data));
    dv.setUint32(p + 8, off);
    dv.setUint32(p + 12, data.length);
    out.set(data, off);
  });
  if (headOffset >= 0) dv.setUint32(headOffset + 8, (0xb1b0afba - checksum(out)) >>> 0);
  return out.buffer;
}

export function finalizeSfnt(buf: ArrayBuffer, patch: SfntPatch): ArrayBuffer {
  const { version, tables } = readTables(buf);
  for (const tag of DROP) tables.delete(tag);
  tables.set('name', buildNameTable(patch.names));
  const head = tables.get('head');
  if (head) patchHead(head, patch);
  const os2 = tables.get('OS/2');
  if (os2) patchOs2(os2, patch);
  const hhea = tables.get('hhea');
  if (hhea) patchHhea(hhea, patch);
  return writeSfnt(version, tables);
}
