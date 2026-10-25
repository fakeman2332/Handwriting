// Растеризует public/icon.svg в PNG-иконки для PWA через Playwright.
// Playwright не входит в зависимости: запуск `NODE_PATH=$(npm root -g) npm run icons`.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const svg = fs.readFileSync(path.join(root, 'public/icon.svg'), 'utf8');
const targets = [
  ['icon-192.png', 192, 0],
  ['icon-512.png', 512, 0],
  ['icon-512-maskable.png', 512, 0.12],
  ['apple-touch-icon.png', 180, 0],
];
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, size, pad] of targets) {
  const inner = Math.round(size * (1 - pad * 2));
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<body style="margin:0;background:#1f3a93;display:grid;place-items:center;width:${size}px;height:${size}px">` +
      `<div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div></body>`,
  );
  await page.screenshot({ path: path.join(root, 'public', name), omitBackground: false });
}
await browser.close();
console.log('icons written');
