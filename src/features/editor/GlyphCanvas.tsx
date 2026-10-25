import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { interAdvance } from '../../core/metrics';
import { outlineToSvgPath, strokeOutline } from '../../core/stroke';
import type { InputType, Metrics, Point, Stroke } from '../../core/types';
import { EDITOR_PEN, guideLines, setEmTransform, toEm, VIEW, type ViewTransform } from './view';
import { inputTypeOf, PALM_WINDOW_MS, pointFromEvent } from './input';

type Props = {
  char: string;
  strokes: Stroke[];
  metrics: Metrics;
  showSample: boolean;
  label: string;
  onStroke: (stroke: Stroke, type: InputType) => void;
};

const INK = '#1c1c1e';

function fillOutline(ctx: CanvasRenderingContext2D, pts: Point[], last: boolean) {
  const o = strokeOutline(pts, EDITOR_PEN, last);
  if (o.length >= 3) ctx.fill(new Path2D(outlineToSvgPath(o)));
}

/**
 * Холст из трёх слоёв: направляющие и образец Inter, сохранённые штрихи, текущий штрих.
 * Верхний слой перерисовывается на каждом кадре, нижние — только при изменениях.
 */
export function GlyphCanvas({ char, strokes, metrics, showSample, label, onStroke }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const guidesRef = useRef<HTMLCanvasElement>(null);
  const savedRef = useRef<HTMLCanvasElement>(null);
  const liveRef = useRef<HTMLCanvasElement>(null);
  const [vt, setVt] = useState<ViewTransform | null>(null);
  const [fontReady, setFontReady] = useState(false);

  const live = useRef<{ id: number; type: InputType; t0: number; points: Point[] } | null>(null);
  const lastPen = useRef(-Infinity);
  const raf = useRef(0);

  // Размер холста в CSS-пикселях × devicePixelRatio.
  useLayoutEffect(() => {
    const el = wrapRef.current!;
    const resize = () => {
      const size = el.clientWidth;
      const dpr = window.devicePixelRatio || 1;
      for (const c of [guidesRef.current!, savedRef.current!, liveRef.current!]) {
        c.width = Math.round(size * dpr);
        c.height = Math.round(size * dpr);
      }
      setVt({ scale: size / VIEW.size, dpr });
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Рендер образца ждёт загрузки Inter, чтобы не мелькал системный шрифт.
  useEffect(() => {
    let alive = true;
    void document.fonts.load('16px "Inter Variable"', char).then(() => alive && setFontReady(true));
    return () => {
      alive = false;
    };
  }, [char]);

  useEffect(() => {
    if (!vt) return;
    const c = guidesRef.current!;
    const ctx = c.getContext('2d')!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    setEmTransform(ctx, vt);
    const px = 1 / (vt.scale * vt.dpr);
    for (const g of guideLines(metrics)) {
      ctx.strokeStyle = g.strong ? '#7a8aa6' : '#c3cbd8';
      ctx.lineWidth = (g.strong ? 1.5 : 1) * px * vt.dpr;
      ctx.setLineDash(g.strong ? [] : [8 * px * vt.dpr, 6 * px * vt.dpr]);
      ctx.beginPath();
      ctx.moveTo(VIEW.x0, g.y);
      ctx.lineTo(VIEW.x0 + VIEW.size, g.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    if (showSample && fontReady) {
      // Образец: Inter, ~14% непрозрачности, выровнен по метрикам Inter.
      const k = vt.scale * vt.dpr;
      const originX = VIEW.x0 + VIEW.size / 2 - interAdvance(char) / 2;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = '#000';
      ctx.font = `${1000 * k}px "Inter Variable"`;
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(char, (originX - VIEW.x0) * k, VIEW.top * k);
      ctx.globalAlpha = 1;
    }
  }, [vt, metrics, showSample, fontReady, char]);

  useEffect(() => {
    if (!vt) return;
    const c = savedRef.current!;
    const ctx = c.getContext('2d')!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    setEmTransform(ctx, vt);
    ctx.fillStyle = INK;
    for (const s of strokes) fillOutline(ctx, s.points, true);
  }, [vt, strokes]);

  const drawLive = useCallback(() => {
    raf.current = 0;
    if (!vt) return;
    const c = liveRef.current!;
    const ctx = c.getContext('2d')!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    const l = live.current;
    if (!l) return;
    setEmTransform(ctx, vt);
    ctx.fillStyle = INK;
    fillOutline(ctx, l.points, false);
  }, [vt]);

  const schedule = useCallback(() => {
    if (!raf.current) raf.current = requestAnimationFrame(drawLive);
  }, [drawLive]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const emOf = (e: PointerEvent): [number, number] => {
    const r = liveRef.current!.getBoundingClientRect();
    return toEm(e.clientX - r.left, e.clientY - r.top, vt!);
  };

  const onDown = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const e = ev.nativeEvent;
    if (!vt || live.current) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const type = inputTypeOf(e);
    if (type === 'pen') lastPen.current = e.timeStamp;
    else if (type === 'touch' && e.timeStamp - lastPen.current < PALM_WINDOW_MS) return; // защита от ладони
    ev.currentTarget.setPointerCapture(e.pointerId);
    const first = pointFromEvent(e, emOf(e), e.timeStamp, undefined, type);
    live.current = { id: e.pointerId, type, t0: e.timeStamp, points: [first] };
    schedule();
  };

  const onMove = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const l = live.current;
    const e = ev.nativeEvent;
    if (!l || e.pointerId !== l.id) return;
    if (l.type === 'pen') lastPen.current = e.timeStamp;
    const events = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
    for (const ce of events.length ? events : [e]) {
      const prev = l.points[l.points.length - 1];
      const pt = pointFromEvent(ce, emOf(ce), l.t0, prev, l.type);
      if (prev && Math.hypot(pt.x - prev.x, pt.y - prev.y) < 0.5) continue;
      l.points.push(pt);
    }
    schedule();
  };

  const finish = (ev: React.PointerEvent<HTMLCanvasElement>, cancelled: boolean) => {
    const l = live.current;
    if (!l || ev.nativeEvent.pointerId !== l.id) return;
    if (l.type === 'pen') lastPen.current = ev.nativeEvent.timeStamp;
    live.current = null;
    schedule();
    if (cancelled) return;
    // Одиночное касание — точка.
    const points = l.points.length === 1 ? [l.points[0]!, { ...l.points[0]!, x: l.points[0]!.x + 0.5, t: l.points[0]!.t + 1 }] : l.points;
    onStroke({ points }, l.type);
  };

  return (
    <div className="glyph-canvas" ref={wrapRef}>
      <canvas ref={guidesRef} aria-hidden="true" />
      <canvas ref={savedRef} aria-hidden="true" />
      <canvas
        ref={liveRef}
        role="img"
        aria-label={label}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={(e) => finish(e, false)}
        onPointerCancel={(e) => finish(e, true)}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
}
