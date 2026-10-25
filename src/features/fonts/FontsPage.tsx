import { useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useFonts, usePrefs } from '../../app/store';
import { charsOfAll } from '../../core/charsets';
import { BackupError } from '../../core/format';
import { useT, type Key } from '../../locales/i18n';
import { repo } from '../../storage/repo';
import { downloadBackup } from '../export/backup';

export function FontsPage() {
  const t = useT();
  const navigate = useNavigate();
  const { ready, list, remove, importBackup } = useFonts();
  const setPrefs = usePrefs((s) => s.set);
  const backupAt = usePrefs((s) => s.backupAt);
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  if (!ready) return <p className="muted">{t('common.loading')}</p>;
  if (list.length === 0 && !message) return <Navigate to="/new" replace />;

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

  return (
    <section className="page narrow">
      <div className="page-head">
        <h1>{t('fonts.title')}</h1>
        <div className="row">
          <button className="btn" onClick={() => fileRef.current?.click()}>
            {t('fonts.import')}
          </button>
          <Link className="btn primary" to="/new">
            {t('fonts.new')}
          </Link>
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
      <ul className="font-list">
        {list.map((f) => {
          const total = charsOfAll(f.charsets).length;
          const pct = total ? Math.round((f.filled / total) * 100) : 0;
          return (
            <li key={f.id} className="card font-card">
              <button className="font-card-main" onClick={() => navigate(`/font/${f.id}`)}>
                <span className="font-name">{f.name}</span>
                <span className="muted">{t('fonts.progress', { filled: f.filled, total })}</span>
                <span className="progress" aria-hidden="true">
                  <span style={{ width: `${pct}%` }} />
                </span>
              </button>
              <div className="row">
                <button className="btn small" onClick={() => void onBackup(f.id)}>
                  {t('fonts.backup')}
                </button>
                <button
                  className="btn small danger"
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
      <p className="muted small">{t('fonts.storageNote')}</p>
    </section>
  );
}
