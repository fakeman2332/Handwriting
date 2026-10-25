import { useRegisterSW } from 'virtual:pwa-register/react';
import { useT } from '../locales/i18n';

/**
 * Плашка только о новой версии: она не подменяется посреди рисования, пользователь сам перезагружает страницу.
 * Сообщение «готово к работе офлайн» не показываем — оно ничего не требует от пользователя и закрывает контент.
 */
export function UpdateBanner() {
  const t = useT();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  if (!needRefresh) return null;
  return (
    <div className="toast" role="status">
      <span>{t('pwa.update')}</span>
      <button className="btn primary small" onClick={() => void updateServiceWorker(true)}>
        {t('pwa.reload')}
      </button>
      <button className="btn ghost small" aria-label={t('common.close')} onClick={() => setNeedRefresh(false)}>
        ✕
      </button>
    </div>
  );
}
