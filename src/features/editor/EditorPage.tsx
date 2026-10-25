import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useConverter, useFonts, usePrefs } from '../../app/store';
import { charsOfAll } from '../../core/charsets';
import { nextUnfilled } from '../../core/font';
import { computeSpacing, scaleStrokes, translateStrokes } from '../../core/geometry';
import { randomSeed, uid } from '../../core/random';
import type { Glyph, GlyphVariant, HandwritingFont, InputType, Stroke } from '../../core/types';
import { drawnVariants, GENERATED_PER_DRAWN, generatedStub, stubsFor } from '../../core/variants';
import { useT } from '../../locales/i18n';
import { GlyphThumb } from '../../ui/GlyphThumb';
import { glyphPath } from '../../app/routes';
import { useFont } from '../fonts/useFont';
import { PhraseProgress } from '../alphabet/PhraseProgress';
import { GlyphCanvas } from './GlyphCanvas';

export function EditorPage() {
  const t = useT();
  const { id, char } = useParams();
  const [search] = useSearchParams();
  const font = useFont(id);
  if (font === undefined) return <p className="muted">{t('common.loading')}</p>;
  if (font === null || !char)
    return (
      <section className="page narrow">
        <h1>{t('error.notFound')}</h1>
        <Link to="/">{t('error.toList')}</Link>
      </section>
    );
  const v = search.get('v');
  return <Editor key={`${char}|${v ?? ''}`} font={font} char={char} variantParam={v} returnTo={search.get('return')} />;
}

type History = { past: Stroke[][]; present: Stroke[]; future: Stroke[][] };

const SHIFT = 20;

function Editor({
  font,
  char,
  variantParam,
  returnTo,
}: {
  font: HandwritingFont;
  char: string;
  variantParam: string | null;
  returnTo: string | null;
}) {
  const t = useT();
  const navigate = useNavigate();
  const saveGlyph = useFonts((s) => s.saveGlyph);
  const showSample = usePrefs((s) => s.showSample);
  const setPrefs = usePrefs((s) => s.set);
  const align = useConverter((s) => s.settings.align);
  const glyph: Glyph = font.glyphs[char] ?? { char, variants: [] };

  const [target] = useState<GlyphVariant | null>(() => {
    const drawn = drawnVariants(glyph);
    if (variantParam === 'new') return null;
    return drawn.find((v) => v.id === variantParam) ?? drawn[0] ?? null;
  });
  const [variantId] = useState(() => target?.id ?? uid());
  const [createdAt] = useState(() => target?.createdAt ?? Date.now());
  const inputType = useRef<InputType>(target?.inputType ?? 'mouse');
  const [hist, setHist] = useState<History>({ past: [], present: target?.strokes ?? [], future: [] });
  const [selected, setSelected] = useState<string>(variantId);
  const [saved, setSaved] = useState(false);

  const query = returnTo ? `?return=${encodeURIComponent(returnTo)}` : '';
  const chars = charsOfAll(font.charsets);
  const idx = chars.indexOf(char);

  const persist = useCallback(
    (strokes: Stroke[]) => {
      const cur = useFonts.getState().current?.glyphs[char] ?? { char, variants: [] };
      let variants = cur.variants;
      const exists = variants.some((v) => v.id === variantId);
      if (strokes.length === 0) {
        variants = variants.filter((v) => v.id !== variantId && v.baseVariantId !== variantId);
      } else {
        const variant: GlyphVariant = {
          id: variantId,
          source: 'drawn',
          inputType: inputType.current,
          strokes,
          ...computeSpacing(strokes),
          createdAt,
        };
        variants = exists
          ? variants.map((v) => (v.id === variantId ? variant : v))
          : [...variants, variant, ...stubsFor(variant)];
      }
      void saveGlyph({ char, variants }).then(() => setSaved(true));
    },
    [char, variantId, createdAt, saveGlyph],
  );

  const commit = useCallback(
    (next: Stroke[]) => {
      setHist((h) => ({ past: [...h.past, h.present], present: next, future: [] }));
      persist(next);
    },
    [persist],
  );

  const undo = useCallback(() => {
    if (!hist.past.length) return;
    const present = hist.past[hist.past.length - 1]!;
    setHist({ past: hist.past.slice(0, -1), present, future: [hist.present, ...hist.future] });
    persist(present);
  }, [hist, persist]);

  const redo = useCallback(() => {
    if (!hist.future.length) return;
    const present = hist.future[0]!;
    setHist({ past: [...hist.past, hist.present], present, future: hist.future.slice(1) });
    persist(present);
  }, [hist, persist]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || (e.target as HTMLElement).tagName === 'INPUT') return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((k === 'z' && e.shiftKey) || k === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const goNext = () => {
    const n = nextUnfilled(font, char);
    navigate(n ? glyphPath(font.id, n, query) : `/font/${font.id}`);
  };
  const goStep = (d: number) => {
    const c = chars[(idx + d + chars.length) % chars.length];
    if (c) navigate(glyphPath(font.id, c, query));
  };

  // Свайп по нижней панели переключает буквы на телефоне.
  const touchX = useRef<number | null>(null);

  const updateVariants = (variants: GlyphVariant[]) => void saveGlyph({ char, variants });
  const live = glyph;
  const sel = live.variants.find((v) => v.id === selected);

  return (
    <section className="page editor">
      <div className="editor-head">
        <Link to={`/font/${font.id}`} className="btn ghost small">
          ← {t('alphabet.title')}
        </Link>
        <h1>{t('editor.title', { char })}</h1>
        <span className="muted small" aria-live="polite">
          {saved ? t('editor.saved') : ''}
        </span>
      </div>

      <div className="editor-body">
        <div className="editor-canvas-col">
          <GlyphCanvas
            char={char}
            strokes={hist.present}
            metrics={font.metrics}
            showSample={showSample}
            label={t('editor.canvasLabel', { char })}
            onStroke={(s, type) => {
              inputType.current = type;
              commit([...hist.present, s]);
            }}
          />
          <div className="toolbar" role="toolbar">
            <button className="btn" onClick={undo} disabled={!hist.past.length} title="Ctrl+Z">
              ↶ {t('editor.undo')}
            </button>
            <button className="btn" onClick={redo} disabled={!hist.future.length} title="Ctrl+Shift+Z">
              ↷ {t('editor.redo')}
            </button>
            <button className="btn" onClick={() => commit([])} disabled={!hist.present.length}>
              {t('editor.clear')}
            </button>
            <label className="check">
              <input type="checkbox" checked={showSample} onChange={(e) => setPrefs({ showSample: e.target.checked })} />
              <span>{t('editor.sample')}</span>
            </label>
          </div>
          {align && <p className="muted small editor-note">{t('editor.alignNote')}</p>}
          <div className="toolbar compact" role="toolbar">
            {(
              [
                ['←', t('editor.moveLeft'), () => commit(translateStrokes(hist.present, -SHIFT, 0))],
                ['→', t('editor.moveRight'), () => commit(translateStrokes(hist.present, SHIFT, 0))],
                ['↑', t('editor.moveUp'), () => commit(translateStrokes(hist.present, 0, SHIFT))],
                ['↓', t('editor.moveDown'), () => commit(translateStrokes(hist.present, 0, -SHIFT))],
                ['+', t('editor.bigger'), () => commit(scaleStrokes(hist.present, 1.05))],
                ['−', t('editor.smaller'), () => commit(scaleStrokes(hist.present, 1 / 1.05))],
              ] as const
            ).map(([icon, label, fn]) => (
              <button key={label} className="btn icon" aria-label={label} title={label} onClick={fn} disabled={!hist.present.length}>
                {icon}
              </button>
            ))}
          </div>
        </div>

        <aside className="editor-side">
          <PhraseProgress font={font} current={char} query={query} />
          <h2>{t('editor.variants')}</h2>
          <div className="variant-strip">
            {live.variants
              .filter((v) => v.strokes.length > 0 || v.id === variantId)
              .map((v) => (
                <button
                  key={v.id}
                  className={v.id === selected ? 'variant selected' : 'variant'}
                  aria-pressed={v.id === selected}
                  onClick={() => {
                    if (v.source === 'drawn' && v.id !== variantId) navigate(glyphPath(font.id, char, `?v=${v.id}${query ? '&' + query.slice(1) : ''}`));
                    else setSelected(v.id);
                  }}
                  title={v.source === 'generated' ? t('editor.generated') : t('editor.drawn')}
                >
                  {v.strokes.length > 0 ? <GlyphThumb variant={v} size={52} faded={v.source === 'generated'} /> : <span className="variant-empty">…</span>}
                </button>
              ))}
            {target === null && !live.variants.some((v) => v.id === variantId) && (
              <span className="variant selected">
                <span className="variant-empty">✎</span>
              </span>
            )}
          </div>
          <div className="row wrap">
            {sel?.source === 'generated' && (
              <>
                <button className="btn small" onClick={() => updateVariants(live.variants.filter((v) => v.id !== sel.id))}>
                  {t('editor.deleteVariant')}
                </button>
                <button
                  className="btn small"
                  onClick={() => {
                    updateVariants(live.variants.filter((v) => v.id !== sel.id));
                    navigate(glyphPath(font.id, char, `?v=new${query ? '&' + query.slice(1) : ''}`));
                  }}
                >
                  {t('editor.replace')}
                </button>
              </>
            )}
            {sel?.source === 'drawn' && sel.id === variantId && (
              <>
                <button
                  className="btn small"
                  onClick={() => {
                    const base = live.variants.find((v) => v.id === variantId)!;
                    const stubs = Array.from({ length: GENERATED_PER_DRAWN }, () => generatedStub(base, randomSeed()));
                    updateVariants([...live.variants.filter((v) => v.baseVariantId !== variantId), ...stubs]);
                  }}
                >
                  {t('editor.regenerate')}
                </button>
                {drawnVariants(live).length > 1 && (
                  <button
                    className="btn small danger"
                    onClick={() => {
                      updateVariants(live.variants.filter((v) => v.id !== variantId && v.baseVariantId !== variantId));
                      navigate(glyphPath(font.id, char, query), { replace: true });
                    }}
                  >
                    {t('editor.deleteVariant')}
                  </button>
                )}
              </>
            )}
            {drawnVariants(live).length > 0 && (
              <button className="btn small" onClick={() => navigate(glyphPath(font.id, char, `?v=new${query ? '&' + query.slice(1) : ''}`))}>
                + {t('editor.addVariant')}
              </button>
            )}
          </div>
        </aside>
      </div>

      <nav
        className="editor-nav"
        onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          const x0 = touchX.current;
          const x1 = e.changedTouches[0]?.clientX;
          touchX.current = null;
          if (x0 !== null && x1 !== undefined && Math.abs(x1 - x0) > 60) goStep(x1 < x0 ? 1 : -1);
        }}
      >
        <button className="btn icon" onClick={() => goStep(-1)} aria-label={t('editor.prev')} title={t('editor.prev')}>
          ‹
        </button>
        <span className="muted small editor-pos">
          {idx + 1} / {chars.length}
        </span>
        {returnTo === 'convert' ? (
          <button className="btn primary" onClick={() => navigate('/convert')}>
            {t('editor.toConverter')}
          </button>
        ) : (
          <button className="btn primary" onClick={goNext}>
            {t('editor.next')} ›
          </button>
        )}
        <button className="btn icon" onClick={() => goStep(1)} aria-label={t('editor.nextChar')} title={t('editor.nextChar')}>
          ›
        </button>
      </nav>
    </section>
  );
}
