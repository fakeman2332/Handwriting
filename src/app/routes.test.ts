import { matchRoutes, resolvePath } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { charsOfAll } from '../core/charsets';
import { encodeChar, glyphPath } from './routes';

const routes = [{ path: '/font/:id/glyph/:char' }, { path: '*' }];

function routeChar(path: string): string | undefined {
  // navigate() разрешает путь (в том числе сегменты `.` и `..`), затем роутер раскодирует и сопоставляет.
  const { pathname } = resolvePath(path);
  return matchRoutes(routes, pathname)?.[0]?.params.char;
}

describe('glyphPath', () => {
  it('любой символ наборов переживает navigate() и сопоставление маршрута', () => {
    for (const ch of charsOfAll(['latin', 'cyrillic', 'digits', 'punct'])) expect(routeChar(glyphPath('f1', ch)), ch).toBe(ch);
  });

  it('точка ломала маршрут при обычном encodeURIComponent', () => {
    expect(routeChar(`/font/f1/glyph/${encodeURIComponent('.')}`)).toBeUndefined();
    expect(encodeChar('.')).toBe('%2E');
  });
});
