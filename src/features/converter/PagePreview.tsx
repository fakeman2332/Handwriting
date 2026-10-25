import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { paperGeometry } from '../../core/paper';
import type { HandwritingFont, PlacedGlyph, RenderSettings } from '../../core/types';
import { useT } from '../../locales/i18n';
import { animatePage } from './animate';
import { drawPage, type MissingHit } from './renderPage';

type Props = {
  glyphs: PlacedGlyph[];
  page: number;
  font: HandwritingFont;
  settings: RenderSettings;
  onMissing: (char: string) => void;
};

/** Превью одной страницы; рисуется, только когда видна на экране. */
export function PagePreview({ glyphs, page, font, settings, onMissing }: Props) {
  const t = useT();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hits = useRef<MissingHit[]>([]);
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(page === 0);
  const [playing, setPlaying] = useState(false);
  const geo = paperGeometry(settings);

  useLayoutEffect(() => {
    const el = wrapRef.current!;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    const io = new IntersectionObserver(([e]) => setVisible(!!e?.isIntersecting), { rootMargin: '200px' });
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const pxPerMm = (width * dpr) / geo.width;

  useEffect(() => {
    if (!visible || !width || playing) return;
    const c = canvasRef.current!;
    c.width = Math.round(geo.width * pxPerMm);
    c.height = Math.round(geo.height * pxPerMm);
    hits.current = drawPage(c.getContext('2d')!, glyphs, page, font, settings, { pxPerMm, highlightMissing: true });
  }, [visible, width, glyphs, page, font, settings, pxPerMm, geo.width, geo.height, playing]);

  useEffect(() => {
    if (!playing) return;
    return animatePage(canvasRef.current!, glyphs, page, font, settings, pxPerMm, () => setPlaying(false));
  }, [playing, glyphs, page, font, settings, pxPerMm]);

  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const mm = geo.width / r.width;
    const x = (e.clientX - r.left) * mm;
    const y = (e.clientY - r.top) * mm;
    const hit = hits.current.find((h) => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    if (hit) onMissing(hit.char);
  };

  return (
    <figure className="sheet" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        style={{ aspectRatio: `${geo.width} / ${geo.height}` }}
        onClick={onClick}
        aria-label={t('convert.page', { n: page + 1 })}
        role="img"
      />
      <figcaption>
        <span className="muted small">{t('convert.page', { n: page + 1 })}</span>
        <button className="btn ghost small" onClick={() => setPlaying((p) => !p)}>
          {playing ? `■ ${t('convert.stop')}` : `▶ ${t('convert.animate')}`}
        </button>
      </figcaption>
    </figure>
  );
}
