import { usePrefs } from '../app/store';
import { useT } from '../locales/i18n';

function isIos(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** На iOS один раз предлагаем установить PWA: иначе Safari удаляет данные через 7 дней. */
export function IosInstallHint() {
  const t = useT();
  const shown = usePrefs((s) => s.iosHintShown);
  const set = usePrefs((s) => s.set);
  if (shown || !isIos() || isStandalone()) return null;
  return (
    <div className="note warn row spread compact-note" role="note">
      <span>{t('pwa.iosHint')}</span>
      <button className="btn ghost small" aria-label={t('common.close')} onClick={() => set({ iosHintShown: true })}>
        ✕
      </button>
    </div>
  );
}
