import '@fontsource-variable/inter/wght.css';
import './ui/styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { useLocale } from './locales/i18n';

document.documentElement.lang = useLocale.getState().locale;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
