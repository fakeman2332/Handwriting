"""Проверка OTF через fontTools: все таблицы и CFF-глифы должны разбираться без ошибок."""
import sys

from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.boundsPen import BoundsPen


def main(path: str) -> None:
    font = TTFont(path)
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
    ps = name_table.getDebugName(6)
    assert ps and ps.isascii() and " " not in ps, f"плохое PostScript-имя: {ps!r}"
    print(f"OK: {path}: {len(font.getGlyphOrder())} glyphs, {drawn} with outlines, {len(cmap)} cmap entries, ps={ps}")


if __name__ == "__main__":
    main(sys.argv[1])
