/** Толщина пера в OTF по умолчанию, em. Отдельный модуль, чтобы не тянуть opentype.js в основной бандл. */
export const OTF_DEFAULT_PEN = 70;

/** Версия шрифта: число с тремя знаками после точки, как принято в шрифтах (1.000, 1.001…). */
export function isValidVersion(v: string): boolean {
  return /^\d{1,3}(\.\d{1,3})?$/.test(v.trim()) && Number(v) > 0;
}

export function formatVersion(v: string | number): string {
  return Number(v).toFixed(3);
}

/** Следующая версия после последнего экспорта; первая — 1.000. */
export function nextVersion(prev: string | undefined): string {
  if (!prev || !isValidVersion(prev)) return '1.000';
  return formatVersion((Math.round(Number(prev) * 1000) + 1) / 1000);
}

/** Windows принимает имя семейства не длиннее 31 символа. */
export const FAMILY_NAME_MAX = 31;
