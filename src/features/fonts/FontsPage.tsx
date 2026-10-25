import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFonts, usePrefs, type FontSummary } from '../../app/store';
import { charsOfAll } from '../../core/charsets';
import { BackupError } from '../../core/format';
import { useLocale, useT, type Key } from '../../locales/i18n';
import { repo } from '../../storage/repo';
import { GlyphThumb } from '../../ui/GlyphThumb';
import { downloadBackup } from '../export/backup';

/** Название почерка, написанное им самим; ненарисованные буквы — обычным шрифтом. */
function FontSample({ font }: { font: FontSummary }) {
  if (font.sample.length === 0) return null;
  return (
    <span className="font-sample" aria-hidden="true">
      {font.sample.map((s, i) =>
        s.variant ? (
          <GlyphThumb key={i} variant={s.variant} size={34} pen={80} />
        ) : (
          <span key={i} className="font-sample-char">
            {s.char === ' ' ? ' ' : s.char}
          </span>
        ),
      )}
    </span>
  );
}

export function FontsPage() {
  const t = useT();
  const locale = useLocale((s) => s.locale);
  const navigate = useNavigate();
  const { ready, list, remove, importBackup } = useFonts();
  const setPrefs = usePrefs((s) => s.set);
  const backupAt = usePrefs((s) => s.backupAt);
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  if (!ready) return <p className="muted">{t('common.loading')}</p>;

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const font = await importBackup(await file.text());
      setMessage({ kind: 'ok', text: t('fonts.imported', { name: font.name }) });
    } catch (e) {
      const code = e instanceof BackupError ? e.code : 'shape';
      setMessage({ kind: 'error', text: t('fonts.importError', { reason: t(`fonts.importError.${code}` as Key) }) });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onBackup = async (id: string) => {
    const font = await repo.loadFont(id);
    if (!font) return;
    downloadBackup(font);
    setPrefs({ backupAt: { ...backupAt, [id]: Date.now() } });
  };

  const date = (ms: number) => new Date(ms).toLocaleDateString(locale, { day: 'numeric', month: 'long' });

  return (
    <section className="page narrow">
      <div className="page-head">
        <h1>{t('fonts.title')}</h1>
        <div className="row">
          <button className="btn ghost" onClick={() => fileRef.current?.click()}>
            {t('fonts.import')}
          </button>
          {list.length > 0 && (
            <Link className="btn primary" to="/new">
              + {t('fonts.new')}
            </Link>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => void onImport(e.target.files?.[0])}
        />
      </div>

      {message && (
        <p className={message.kind === 'ok' ? 'note ok' : 'note error'} role="status">
          {message.text}
        </p>
      )}

      {list.length === 0 ? (
        <div className="empty card">
          <h2>{t('fonts.emptyTitle')}</h2>
          <p className="muted">{t('fonts.emptyText')}</p>
          <Link className="btn primary large" to="/new">
            {t('landing.create')}
          </Link>
        </div>
      ) : (
        <ul className="font-list">
          {list.map((f) => {
            const total = charsOfAll(f.charsets).length;
            const pct = total ? Math.round((f.filled / total) * 100) : 0;
            return (
              <li key={f.id} className="card font-card">
                <button className="font-card-main" onClick={() => navigate(`/font/${f.id}`)}>
                  <FontSample font={f} />
                  <span className="font-name">{f.name}</span>
                  <span className="font-meta muted small">
                    {t('fonts.progress', { filled: f.filled, total })} · {t('fonts.updated', { date: date(f.updatedAt) })}
                  </span>
                  <span className="progress" aria-hidden="true">
                    <span style={{ width: `${pct}%` }} />
                  </span>
                </button>
                <div className="font-card-actions">
                  <button className="btn ghost small" onClick={() => void onBackup(f.id)}>
                    {t('fonts.backup')}
                  </button>
                  <button
                    className="btn ghost small danger"
                    onClick={() => {
                      if (confirm(t('fonts.deleteConfirm', { name: f.name }))) void remove(f.id);
                    }}
                  >
                    {t('common.delete')}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="muted small">{t('fonts.storageNote')}</p>
    </section>
  );
}
