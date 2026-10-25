import { useEffect, useState } from 'react';
import { useFonts } from '../../app/store';
import type { HandwritingFont } from '../../core/types';

/** Загружает шрифт по id в общий стор; null — не найден, undefined — грузится. */
export function useFont(id: string | undefined): HandwritingFont | null | undefined {
  const current = useFonts((s) => s.current);
  const open = useFonts((s) => s.open);
  const [missing, setMissing] = useState<string | null>(null);
  useEffect(() => {
    if (!id) return;
    let alive = true;
    void open(id).then((f) => {
      if (alive && !f) setMissing(id);
    });
    return () => {
      alive = false;
    };
  }, [id, open]);
  if (!id || missing === id) return null;
  return current?.id === id ? current : undefined;
}
