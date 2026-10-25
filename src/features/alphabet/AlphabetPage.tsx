import { useRef, useState, type KeyboardEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { glyphPath } from '../../app/routes';
import { useConverter, useFonts, usePrefs } from '../../app/store';
import { CHARSET_IDS, charsOf } from '../../core/charsets';
import { fontProgress, nextUnfilled } from '../../core/font';
import type { CharsetId, HandwritingFont } from '../../core/types';
import { drawnVariants } from '../../core/variants';
import { useT } from '../../locales/i18n';
import { GlyphThumb } from '../../ui/GlyphThumb';
import { IosInstallHint } from '../../ui/IosInstallHint';
import { PhraseProgress } from './PhraseProgress';
import { downloadBackup } from '../export/backup';
import { CharsetPicker } from '../fonts/CreateFontPage';
import { useFont } from '../fonts/useFont';


/** Показывать заметную кнопку резервной копии после первых 20 букв. */
const BACKUP_HINT_AFTER = 20;

export function AlphabetPage() {
  const t = useT();
  const { id } = useParams();
  const font = useFont(id);
  if (font === undefined) return <p className="muted">{t('common.loading')}</p>;
  if (font === null)
    return (
      <section className="page narrow">
        <h1>{t('error.notFound')}</h1>
        <Link to="/">{t('error.toList')}</Link>
      </section>
    );
  return <Alphabet font={font} />;
}

function Alphabet({ font }: { font: HandwritingFont }) {
  const t = useT();
  const navigate = useNavigate();
  const updateMeta = useFonts((s) => s.updateMeta);
  const patchConverter = useConverter((s) => s.patch);
  const backupAt = usePrefs((s) => s.backupAt);
  const setPrefs = usePrefs((s) => s.set);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(font.name);
  const next = nextUnfilled(font, null);
  const total = fontProgress(font);
  const lastBackup = backupAt[font.id];
  const showBackupHint =
    total.filled >= BACKUP_HINT_AFTER && (lastBackup === undefined || font.updatedAt - lastBackup > 24 * 3600 * 1000);

  const openConverter = () => {
    patchConverter({ fontId: font.id });
    navigate('/convert');
  };

  const backup = () => {
    downloadBackup(font);
    setPrefs({ backupAt: { ...backupAt, [font.id]: Date.now() } });
  };

  return (
    <section className="page">
      <div className="page-head">
        {editing ? (
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              void updateMeta({ name: name.trim() || font.name, charsets: font.charsets });
              setEditing(false);
            }}
          >
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoFocus aria-label={t('create.name')} />
            <button className="btn small primary">{t('common.save')}</button>
          </form>
        ) : (
          <h1>
            {font.name}{' '}
            <button className="btn ghost small" onClick={() => setEditing(true)}>
              {t('alphabet.rename')}
            </button>
          </h1>
        )}
        <div className="row">
          {next ? (
            <button className="btn primary" onClick={() => navigate(glyphPath(font.id, next))}>
              {t('alphabet.next')} «{next}»
            </button>
          ) : (
            <span className="muted">{t('alphabet.done')}</span>
          )}
          <button className="btn" onClick={openConverter}>
            {t('alphabet.convert')}
          </button>
          <button className="btn" onClick={backup}>
            {t('fonts.backup')}
          </button>
        </div>
      </div>

      <IosInstallHint />

      {showBackupHint && (
        <div className="note warn row spread" role="status">
          <span>{t('alphabet.backupHint', { filled: total.filled })}</span>
          <button className="btn primary small" onClick={backup}>
            {t('alphabet.backupNow')}
          </button>
        </div>
      )}

      <div className="alphabet-layout">
        <div className="alphabet-main">
          <details className="charsets-edit">
            <summary>{t('alphabet.charsets')}</summary>
            <CharsetPicker
              value={font.charsets}
              onChange={(charsets: CharsetId[]) => charsets.length > 0 && void updateMeta({ charsets })}
            />
          </details>

          {CHARSET_IDS.filter((c) => font.charsets.includes(c)).map((cs) => (
            <CharsetGrid key={cs} font={font} charset={cs} />
          ))}
        </div>
        <PhraseProgress font={font} />
      </div>
    </section>
  );
}

function CharsetGrid({ font, charset }: { font: HandwritingFont; charset: CharsetId }) {
  const t = useT();
  const navigate = useNavigate();
  const chars = charsOf(charset);
  const { filled, total } = fontProgress(font, [charset]);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const [focus, setFocus] = useState(0);

  const onKey = (e: KeyboardEvent, i: number) => {
    const grid = e.currentTarget.parentElement;
    const cols = grid ? Math.max(1, Math.round(grid.clientWidth / (e.currentTarget as HTMLElement).offsetWidth)) : 8;
    const move: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols, Home: -i, End: chars.length - 1 - i };
    const d = move[e.key];
    if (d === undefined) return;
    e.preventDefault();
    const j = Math.min(chars.length - 1, Math.max(0, i + d));
    setFocus(j);
    refs.current[j]?.focus();
  };

  return (
    <section className="charset">
      <h2>
        {t(`charset.${charset}`)}{' '}
        <span className="muted small">{t('fonts.progress', { filled, total })}</span>
      </h2>
      <span className="progress" aria-hidden="true">
        <span style={{ width: `${total ? (filled / total) * 100 : 0}%` }} />
      </span>
      <div className="glyph-grid" role="grid" aria-label={t(`charset.${charset}`)}>
        {chars.map((ch, i) => {
          const g = font.glyphs[ch];
          const drawn = drawnVariants(g);
          const main = drawn[0];
          const others = g ? g.variants.filter((v) => v !== main && v.strokes.length > 0) : [];
          const state = main ? t('alphabet.filled', { count: others.length + 1 }) : t('alphabet.empty');
          return (
            <button
              key={ch}
              ref={(el) => {
                refs.current[i] = el;
              }}
              role="gridcell"
              tabIndex={i === focus ? 0 : -1}
              className={main ? 'glyph-cell filled' : 'glyph-cell'}
              aria-label={t('alphabet.glyphLabel', { char: ch, state })}
              onKeyDown={(e) => onKey(e, i)}
              onFocus={() => setFocus(i)}
              onClick={() => navigate(glyphPath(font.id, ch))}
            >
              <span className="glyph-char">{ch}</span>
              {main && <GlyphThumb variant={main} size={56} />}
              {others.length > 0 && (
                <span className="glyph-variants" aria-hidden="true">
                  {others.slice(0, 6).map((v) => (
                    <GlyphThumb key={v.id} variant={v} size={16} faded={v.source === 'generated'} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
