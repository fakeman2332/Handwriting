import { mulberry32 } from '../../core/random';

/** Иллюстрация: строки «рукописи» на тетрадном листе, прорисовываются как перо. */
function scribble(x0: number, base: number, width: number, seed: number): string {
  const rnd = mulberry32(seed);
  let d = '';
  let x = x0;
  let first = true;
  while (x < x0 + width) {
    // Слово: несколько петель разной высоты, иногда выносной элемент.
    const letters = 2 + Math.floor(rnd() * 5);
    for (let i = 0; i < letters; i++) {
      const tall = rnd() < 0.22;
      const h = tall ? 15 + rnd() * 4 : 7 + rnd() * 2.5;
      const w = 5 + rnd() * 3;
      if (x + w * 1.2 > x0 + width) break;
      const top = base - h;
      if (first) {
        d += `M${x.toFixed(1)} ${base.toFixed(1)}`;
        first = false;
      }
      d += ` C${(x + w * 0.2).toFixed(1)} ${top.toFixed(1)} ${(x + w * 0.9).toFixed(1)} ${top.toFixed(1)} ${(x + w * 0.6).toFixed(1)} ${(base - h * 0.35).toFixed(1)}`;
      d += ` S${(x + w * 0.9).toFixed(1)} ${(base + 0.5).toFixed(1)} ${(x + w * 1.2).toFixed(1)} ${base.toFixed(1)}`;
      x += w;
    }
    x += 7 + rnd() * 3;
    if (x < x0 + width) d += ` M${x.toFixed(1)} ${base.toFixed(1)}`;
  }
  return d;
}

const LINES = [
  { w: 205, seed: 3 },
  { w: 205, seed: 11 },
  { w: 190, seed: 29 },
  { w: 120, seed: 47 },
];

export function HeroSheet({ label }: { label: string }) {
  return (
    <svg className="hero-sheet" viewBox="0 0 280 200" role="img" aria-label={label}>
      <rect x="0.5" y="0.5" width="279" height="199" rx="6" fill="#fff" stroke="var(--line)" />
      {Array.from({ length: 7 }, (_, i) => (
        <line key={i} x1="0" x2="280" y1={46 + i * 24} y2={46 + i * 24} stroke="#a9c4e8" strokeWidth="0.6" />
      ))}
      <line x1="34" x2="34" y1="0" y2="200" stroke="#e8a0a0" strokeWidth="0.7" />
      {LINES.map((l, i) => (
        <path
          key={i}
          className="hero-ink"
          style={{ animationDelay: `${0.3 + i * 0.9}s` }}
          d={scribble(44, 46 + i * 24 - 1, l.w, l.seed)}
          pathLength={1}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
