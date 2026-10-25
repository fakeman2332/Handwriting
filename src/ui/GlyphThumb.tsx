import { memo } from 'react';
import { DEFAULT_METRICS } from '../core/metrics';
import { outlineToSvgPath, variantOutlines } from '../core/stroke';
import type { GlyphVariant } from '../core/types';

const TOP = DEFAULT_METRICS.ascender + 60;
const BOTTOM = DEFAULT_METRICS.descender - 60;
const H = TOP - BOTTOM;

/** Превью варианта буквы в SVG, в общей для всех букв вертикальной шкале. */
export const GlyphThumb = memo(function GlyphThumb({
  variant,
  size = 48,
  pen = 70,
  faded = false,
  title,
}: {
  variant: GlyphVariant;
  size?: number;
  pen?: number;
  faded?: boolean;
  title?: string;
}) {
  const outlines = variantOutlines(variant, pen);
  const cx = variant.leftBearing + variant.advanceWidth / 2;
  const w = Math.max(H, variant.advanceWidth);
  return (
    <svg
      className="glyph-thumb"
      width={size}
      height={size}
      viewBox={`${cx - w / 2} ${-TOP} ${w} ${H}`}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{ opacity: faded ? 0.45 : 1 }}
    >
      <g transform="scale(1,-1)" fill="currentColor">
        {outlines.map((o, i) => (
          <path key={i} d={outlineToSvgPath(o)} />
        ))}
      </g>
    </svg>
  );
});
