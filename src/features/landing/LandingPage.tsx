import { Link } from 'react-router-dom';
import { useFonts } from '../../app/store';
import { useT } from '../../locales/i18n';
import { HeroSheet } from './HeroSheet';

export const REPO_URL = 'https://github.com/fakeman2332/handwriting';

const STEPS = [
  { n: 1, title: 'landing.step1', text: 'landing.step1Text' },
  { n: 2, title: 'landing.step2', text: 'landing.step2Text' },
  { n: 3, title: 'landing.step3', text: 'landing.step3Text' },
] as const;

const FACTS = ['landing.factNoSignup', 'landing.factOffline', 'landing.factPrivate', 'landing.factOpen'] as const;

function GithubIcon() {
  return (
    <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

export function LandingPage() {
  const t = useT();
  const fonts = useFonts((s) => s.list);
  const last = fonts[0];

  return (
    <div className="landing">
      <section className="hero">
        <div className="hero-copy">
          <h1>{t('landing.title')}</h1>
          <p className="hero-lead">{t('landing.lead')}</p>
          <div className="hero-cta">
            {last ? (
              <>
                <Link className="btn primary large" to={`/font/${last.id}`}>
                  {t('landing.continue', { name: last.name })}
                </Link>
                <Link className="btn large" to="/new">
                  {t('landing.create')}
                </Link>
              </>
            ) : (
              <Link className="btn primary large" to="/new">
                {t('landing.create')}
              </Link>
            )}
            <a className="btn ghost large" href={REPO_URL} target="_blank" rel="noreferrer">
              <GithubIcon /> {t('landing.repo')}
            </a>
          </div>
          <p className="muted small">{t('landing.note')}</p>
        </div>
        <div className="hero-art" aria-hidden={false}>
          <div className="hero-typed">{t('landing.typed')}</div>
          <span className="hero-arrow" aria-hidden="true">
            →
          </span>
          <HeroSheet label={t('landing.artLabel')} />
        </div>
      </section>

      <section className="steps" aria-labelledby="steps-title">
        <h2 id="steps-title" className="sr-only">
          {t('landing.stepsTitle')}
        </h2>
        <ol>
          {STEPS.map((s) => (
            <li key={s.n} className="step card">
              <span className="step-n" aria-hidden="true">
                {s.n}
              </span>
              <h3>{t(s.title)}</h3>
              <p className="muted">{t(s.text)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="facts" aria-label={t('landing.factsTitle')}>
        <ul>
          {FACTS.map((f) => (
            <li key={f}>{t(f)}</li>
          ))}
        </ul>
      </section>

      <footer className="landing-footer">
        <a href={REPO_URL} target="_blank" rel="noreferrer">
          GitHub
        </a>
        <a href={`${REPO_URL}/blob/master/CONTRIBUTING.md`} target="_blank" rel="noreferrer">
          {t('landing.support')}
        </a>
        <a href={`${REPO_URL}/blob/master/LICENSE`} target="_blank" rel="noreferrer">
          MIT
        </a>
      </footer>
    </div>
  );
}
