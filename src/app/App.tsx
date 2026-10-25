import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AlphabetPage } from '../features/alphabet/AlphabetPage';
import { ConverterPage } from '../features/converter/ConverterPage';
import { EditorPage } from '../features/editor/EditorPage';
import { CreateFontPage } from '../features/fonts/CreateFontPage';
import { FontsPage } from '../features/fonts/FontsPage';
import { LandingPage } from '../features/landing/LandingPage';
import { Layout } from './Layout';
import { useConverter, useFonts, usePrefs } from './store';

export function App() {
  useEffect(() => {
    void useFonts.getState().refresh();
    void useConverter.getState().load();
    void usePrefs.getState().load();
  }, []);

  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<LandingPage />} />
          <Route path="fonts" element={<FontsPage />} />
          <Route path="new" element={<CreateFontPage />} />
          <Route path="font/:id" element={<AlphabetPage />} />
          <Route path="font/:id/glyph/:char" element={<EditorPage />} />
          <Route path="convert" element={<ConverterPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
