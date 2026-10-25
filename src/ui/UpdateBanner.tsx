import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useT } from '../locales/i18n';

/** Новая версия не подменяется посреди рисования: пользователь сам перезагружает страницу. */
export function UpdateBanner() {
  const t = useT();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();
  useEffect(() => {
    if (!offlineReady) return;
    const id = setTimeout(() => setOfflineReady(false), 5000);
    return () => clearTimeout(id);
  }, [offlineReady, setOfflineReady]);
  if (!needRefresh && !offlineReady) return null;
  return (
    <div className="toast" role="status">
      <span>{needRefresh ? t('pwa.update') : t('pwa.offlineReady')}</span>
      {needRefresh && (
        <button className="btn primary small" onClick={() => void updateServiceWorker(true)}>
          {t('pwa.reload')}
        </button>
      )}
      <button
        className="btn ghost small"
        aria-label={t('common.close')}
        onClick={() => {
          setNeedRefresh(false);
          setOfflineReady(false);
        }}
      >
        ✕
      </button>
    </div>
  );
}
