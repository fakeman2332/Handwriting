import { NavLink, Outlet } from 'react-router-dom';
import { useLocale, useT, type Locale } from '../locales/i18n';
import { UpdateBanner } from '../ui/UpdateBanner';

export function Layout() {
  const t = useT();
  const { locale, setLocale } = useLocale();
  return (
    <div className="app">
      <header className="header">
        <NavLink to="/" className="brand" aria-label={t('nav.fonts')}>
          <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
            <path d="M6 22c3-9 6-14 8-14s-1 12 2 12 5-10 7-10-1 9 2 9 3-4 3-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{t('app.title')}</span>
        </NavLink>
        <nav className="nav">
          <NavLink to="/" end>
            {t('nav.fonts')}
          </NavLink>
          <NavLink to="/convert">{t('nav.convert')}</NavLink>
          <label className="lang">
            <span className="sr-only">{t('nav.language')}</span>
            <select value={locale} onChange={(e) => setLocale(e.target.value as Locale)}>
              <option value="ru">RU</option>
              <option value="en">EN</option>
            </select>
          </label>
        </nav>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <UpdateBanner />
    </div>
  );
}
