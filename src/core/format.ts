/**
 * Formateo de números, duraciones y fechas en el idioma actual (core/i18n).
 * Vive en core porque los textos de evidencias (red flags, insights) se
 * generan en el Worker.
 */
import { LOCALE_TAG, coreLang, tr } from './i18n';

const tag = () => LOCALE_TAG[coreLang()];

const numberFormats = new Map<string, Intl.NumberFormat>();
function fmt(opts: Intl.NumberFormatOptions = {}) {
  const key = tag() + JSON.stringify(opts);
  let f = numberFormats.get(key);
  if (!f) numberFormats.set(key, (f = new Intl.NumberFormat(tag(), opts)));
  return f;
}

/** Enteros con separador de miles del idioma. */
export const nf = { format: (n: number) => fmt().format(n) };

/** Un decimal como mucho, con la coma o el punto del idioma ("2,5" / "2.5"). */
export const dec1 = (n: number) => fmt({ maximumFractionDigits: 1 }).format(n);

const dayWord = (d: number) => tr({ es: d === 1 ? 'día' : 'días', en: d === 1 ? 'day' : 'days' });

export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  const min = Math.round(s / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const rm = min % 60;
  if (h < 24) return rm && h < 10 ? `${h} h ${rm} min` : `${h} h`;
  const d = Math.round(h / 24);
  return `${d} ${dayWord(d)}`;
}

/** Igual que formatDuration pero devuelve [número, unidad] para la UI de números enormes. */
export function durationParts(ms: number | null | undefined): [string, string] {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return ['—', ''];
  const min = ms / 60_000;
  if (min < 1) return [String(Math.max(1, Math.round(ms / 1000))), 's'];
  if (min < 60) return [String(Math.round(min)), 'min'];
  const h = min / 60;
  if (h < 24) return [h < 10 ? dec1(h) : String(Math.round(h)), 'h'];
  const d = Math.round(h / 24);
  return [String(d), dayWord(d)];
}

export function formatDate(ts: number, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
  return new Date(ts).toLocaleDateString(tag(), opts);
}

export function formatDateTime(ts: number) {
  return new Date(ts).toLocaleString(tag(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatMonth(key: string, short = false) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(tag(), { month: short ? 'short' : 'long', year: 'numeric' });
}
