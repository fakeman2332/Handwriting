import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { glyphPath } from '../../app/routes';
import { useConverter } from '../../app/store';
import { prepareFont } from '../../core/align';
import { charsOf, pangramLetters, PANGRAMS } from '../../core/charsets';
import { fontProgress } from '../../core/font';
import { layoutPages } from '../../core/layout';
import { interAdvance } from '../../core/metrics';
import { PAPER_COLORS, paperGeometry } from '../../core/paper';
import type { CharsetId, HandwritingFont, RenderSettings } from '../../core/types';
import { isFilled } from '../../core/variants';
import { useT } from '../../locales/i18n';
import { useMedia } from '../../ui/useMedia';
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
const CURRENT_MARK = '#1f3a93';

/** Прогресс алфавита на примере фразы, написанной текущим почерком. */
type Props = {
  font: HandwritingFont;
  /** Буква, которая сейчас рисуется: подчёркивается во фразе, по ней выбирается набор. */
  current: string;
  /** Параметры редактора (например, возврат в конвертер), сохраняются при переходе к другой букве. */
  query?: string;
};

/** Фразы для текущей буквы: её набор, а для цифр и знаков — все включённые наборы букв. */
export function phraseCharsets(font: HandwritingFont, current: string): CharsetId[] {
  const ids = (['cyrillic', 'latin'] as CharsetId[]).filter((id) => font.charsets.includes(id) && PANGRAMS[id]);
  const own = ids.filter((id) => charsOf(id).includes(current));
  return own.length ? own : ids;
}

/** Прогресс алфавита на примере фразы; обновляется после каждого штриха. */
export function PhraseProgress({ font, current, query = '' }: Props) {
  const t = useT();
  const ids = phraseCharsets(font, current);
  if (ids.length === 0) return null;
  return (
    <section className="phrase-panel" aria-label={t('alphabet.phraseTitle')}>
      <h2>{t('alphabet.phraseTitle')}</h2>
      {ids.map((id) => (
        <PhraseCard key={id} font={font} charset={id} current={current} query={query} />
      ))}
    </section>
  );
}

function PhraseCard({ font, charset, current, query }: { font: HandwritingFont; charset: CharsetId; current: string; query: string }) {
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
  // Следующая недостающая буква фразы, кроме той, что рисуется сейчас.
  const next = missing.find((c) => c !== current);
  const total = fontProgress(font, [charset]);
  // На телефоне фраза мельче: две строки под холстом вместо трёх.
  const compact = useMedia('(max-width: 800px)');
  const settings: RenderSettings = useMemo(
    () => ({ ...SAMPLE, textSize: compact ? 4.5 : SAMPLE.textSize, fontId: font.id, align }),
    [font.id, align, compact],
  );
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
    // Текущая буква подчёркнута везде, где встречается во фразе.
    ctx.fillStyle = CURRENT_MARK;
    for (const g of layout.glyphs) {
      if (g.char !== current) continue;
      const w = g.variant ? g.variant.advanceWidth * g.scale : interAdvance(g.char) * g.scale;
      ctx.fillRect(g.x - left, g.y - top + geo.lineHeight * 0.12, w, 0.7);
    }
  }, [width, layout, renderFont, settings, geo.baselines, geo.lineHeight, heightMm, widthMm, top, left, current]);

  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const mm = widthMm / r.width;
    const x = (e.clientX - r.left) * mm;
    const y = (e.clientY - r.top) * mm;
    const hit = hits.current.find((h) => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    if (hit) navigate(glyphPath(font.id, hit.char, query));
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
      {next ? (
        <button className="btn small primary phrase-extra" onClick={() => navigate(glyphPath(font.id, next!, query))}>
          {t('alphabet.phraseNext', { char: next })}
        </button>
      ) : (
        <span className="small ok-text phrase-extra">{t('alphabet.phraseDone')}</span>
      )}
      <span className="muted small phrase-extra">{t('alphabet.phraseAlphabet', { filled: total.filled, total: total.total })}</span>
    </section>
  );
}
