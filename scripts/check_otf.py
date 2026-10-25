"""Проверка OTF через fontTools: все таблицы и CFF-глифы должны разбираться без ошибок."""
import struct
import sys

from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.boundsPen import BoundsPen


def checksum(data: bytes) -> int:
    data += b"\0" * (-len(data) % 4)
    return sum(struct.unpack(f">{len(data) // 4}I", data)) & 0xFFFFFFFF


def check_checksums(raw: bytes) -> None:
    """fontTools не проверяет контрольные суммы, а установщики шрифтов в Windows и macOS — проверяют."""
    num = struct.unpack(">H", raw[4:6])[0]
    for i in range(num):
        tag, cs, off, ln = struct.unpack(">4sIII", raw[12 + 16 * i : 28 + 16 * i])
        assert off % 4 == 0, f"{tag} не выровнена"
        body = raw[off : off + ln]
        if tag == b"head":
            body = body[:8] + b"\0\0\0\0" + body[12:]
        assert checksum(body) == cs, f"неверная контрольная сумма {tag}"
    assert checksum(raw) == 0xB1B0AFBA, "неверный checksumAdjustment"


def main(path: str) -> None:
    raw = open(path, "rb").read()
    check_checksums(raw)
    font = TTFont(path)
    unwanted = {"ltag", "morx", "mort", "feat", "kerx", "trak"} & set(font.keys())
    assert not unwanted, f"лишние AAT-таблицы: {unwanted}"
    for tag in font.keys():
        font[tag]  # форсирует разбор таблицы
    assert "CFF " in font, "ожидаются CFF-контуры"
    glyph_set = font.getGlyphSet()
    cmap = font.getBestCmap()
    assert cmap, "пустая таблица cmap"
    drawn = 0
    for name in font.getGlyphOrder():
        pen = RecordingPen()
        glyph_set[name].draw(pen)
        bounds = BoundsPen(glyph_set)
        glyph_set[name].draw(bounds)
        if pen.value:
            drawn += 1
            xmin, ymin, xmax, ymax = bounds.bounds
            assert -2000 < xmin <= xmax < 4000 and -2000 < ymin <= ymax < 3000, (name, bounds.bounds)
    name_table = font["name"]
    for rec in name_table.names:
        assert rec.toUnicode().strip(), f"пустая запись name {rec.platformID}/{rec.nameID}"
    family = name_table.getName(1, 3, 1, 0x409)
    assert family and len(family.toUnicode()) <= 31, "имя семейства длиннее 31 символа"
    top = font["CFF "].cff.topDictIndex[0]
    for key in ("FullName", "FamilyName"):
        value = getattr(top, key, "") or ""
        assert value.isascii(), f"CFF {key} не ASCII: {value!r}"
    ps = name_table.getDebugName(6)
    assert ps and ps.isascii() and " " not in ps, f"плохое PostScript-имя: {ps!r}"
    print(f"OK: {path}: {len(font.getGlyphOrder())} glyphs, {drawn} with outlines, {len(cmap)} cmap entries, ps={ps}")


if __name__ == "__main__":
    main(sys.argv[1])
