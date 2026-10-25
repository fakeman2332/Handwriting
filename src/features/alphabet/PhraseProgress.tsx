import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { glyphPath } from '../../app/routes';
import { useConverter } from '../../app/store';
import { prepareFont } from '../../core/align';
import { pangramLetters, PANGRAMS } from '../../core/charsets';
import { fontProgress } from '../../core/font';
import { layoutPages } from '../../core/layout';
import { PAPER_COLORS, paperGeometry } from '../../core/paper';
import type { CharsetId, HandwritingFont, RenderSettings } from '../../core/types';
import { isFilled } from '../../core/variants';
import { useT } from '../../locales/i18n';
import { drawGlyph, type MissingHit } from '../converter/renderPage';

const SAMPLE: Omit<RenderSettings, 'fontId' | 'align'> = {
  ink: { kind: 'preset', value: 'blue' },
  penSize: 0.55,
  textSize: 7,
  paper: 'lined',
  pageFormat: 'A5',
};
/** Фиксированный seed: фраза не «прыгает» при каждой новой букве. */
const SEED = 20261025;

/** Прогресс алфавита на примере фразы, написанной текущим почерком. */
export function PhraseProgress({ font }: { font: HandwritingFont }) {
  const t = useT();
  const ids = (['cyrillic', 'latin'] as CharsetId[]).filter((id) => font.charsets.includes(id) && PANGRAMS[id]);
  if (ids.length === 0) return null;
  return (
    <aside className="phrase-panel" aria-label={t('alphabet.phraseTitle')}>
      <h2>{t('alphabet.phraseTitle')}</h2>
      {ids.map((id) => (
        <PhraseCard key={id} font={font} charset={id} />
      ))}
    </aside>
  );
}

function PhraseCard({ font, charset }: { font: HandwritingFont; charset: CharsetId }) {
  const t = useT();
  const navigate = useNavigate();
  const align = useConverter((s) => s.settings.align);
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hits = useRef<MissingHit[]>([]);
  const [width, setWidth] = useState(0);

  const phrase = PANGRAMS[charset]!;
  const letters = pangramLetters(charset);
  const missing = letters.filter((c) => !isFilled(font.glyphs[c]));
  const total = fontProgress(font, [charset]);
  const settings: RenderSettings = useMemo(() => ({ ...SAMPLE, fontId: font.id, align }), [font.id, align]);
  const renderFont = useMemo(() => prepareFont(font, align), [font, align]);
  const layout = useMemo(() => layoutPages(phrase, renderFont, settings, SEED), [phrase, renderFont, settings]);

  const geo = paperGeometry(settings);
  const lastBaseline = layout.glyphs.reduce((m, g) => Math.max(m, g.y), geo.baselines[0] ?? 0);
  // Обрезаем лист: от верхнего поля до последней строки фразы.
  const top = geo.margin.top + geo.lineHeight * 0.25;
  const heightMm = lastBaseline + geo.lineHeight * 0.75 - top;
  // И поля по бокам: фраза занимает всю ширину панели.
  const left = geo.margin.left - 3;
  const widthMm = geo.width - geo.margin.right + 3 - left;

  useLayoutEffect(() => {
    const el = wrapRef.current!;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!width) return;
    const c = canvasRef.current!;
    const dpr = window.devicePixelRatio || 1;
    const pxPerMm = (width * dpr) / widthMm;
    c.width = Math.round(widthMm * pxPerMm);
    c.height = Math.round(heightMm * pxPerMm);
    const ctx = c.getContext('2d')!;
    ctx.setTransform(pxPerMm, 0, 0, pxPerMm, 0, 0);
    ctx.fillStyle = PAPER_COLORS.background;
    ctx.fillRect(0, 0, widthMm, heightMm);
    ctx.strokeStyle = PAPER_COLORS.rule;
    ctx.lineWidth = 0.18;
    ctx.beginPath();
    for (const b of geo.baselines) {
      if (b - top > heightMm) break;
      ctx.moveTo(0, b - top);
      ctx.lineTo(widthMm, b - top);
    }
    ctx.stroke();
    // Лист сдвинут: видны только строки с фразой, без полей.
    const found: MissingHit[] = [];
    for (const g of layout.glyphs) {
      const hit = drawGlyph(ctx, { ...g, x: g.x - left, y: g.y - top }, renderFont, settings, pxPerMm, true);
      if (hit) found.push(hit);
    }
    hits.current = found;
  }, [width, layout, renderFont, settings, geo.baselines, heightMm, widthMm, top, left]);

  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const mm = widthMm / r.width;
    const x = (e.clientX - r.left) * mm;
    const y = (e.clientY - r.top) * mm;
    const hit = hits.current.find((h) => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    if (hit) navigate(glyphPath(font.id, hit.char));
  };

  const done = letters.length - missing.length;
  return (
    <section className="phrase-card card">
      <div className="phrase-head">
        <span className="small">{t(`charset.${charset}`)}</span>
        <span className="muted small">{t('alphabet.phraseProgress', { filled: done, total: letters.length })}</span>
      </div>
      <span className="progress" aria-hidden="true">
        <span style={{ width: `${(done / letters.length) * 100}%` }} />
      </span>
      <div ref={wrapRef} className="phrase-sheet">
        <canvas
          ref={canvasRef}
          style={{ aspectRatio: `${widthMm} / ${heightMm}` }}
          onClick={onClick}
          role="img"
          aria-label={phrase}
        />
      </div>
      {missing.length > 0 ? (
        <button className="btn small primary" onClick={() => navigate(glyphPath(font.id, missing[0]!))}>
          {t('alphabet.phraseNext', { char: missing[0]! })}
        </button>
      ) : (
        <span className="small ok-text">{t('alphabet.phraseDone')}</span>
      )}
      <span className="muted small">{t('alphabet.phraseAlphabet', { filled: total.filled, total: total.total })}</span>
    </section>
  );
}
