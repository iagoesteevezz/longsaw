/**
 * Formateo de duraciones y fechas en español. Vive en core porque los textos
 * de evidencias (red flags, insights) se generan en el Worker.
 */
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
  return d === 1 ? '1 día' : `${d} días`;
}

/** Igual que formatDuration pero devuelve [número, unidad] para la UI de números enormes. */
export function durationParts(ms: number | null | undefined): [string, string] {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return ['—', ''];
  const min = ms / 60_000;
  if (min < 1) return [String(Math.max(1, Math.round(ms / 1000))), 's'];
  if (min < 60) return [String(Math.round(min)), 'min'];
  const h = min / 60;
  if (h < 24) return [h < 10 ? h.toFixed(1).replace('.', ',') : String(Math.round(h)), 'h'];
  return [String(Math.round(h / 24)), Math.round(h / 24) === 1 ? 'día' : 'días'];
}

export function formatDate(ts: number, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
  return new Date(ts).toLocaleDateString('es-ES', opts);
}

export function formatDateTime(ts: number) {
  return new Date(ts).toLocaleString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatMonth(key: string, short = false) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('es-ES', { month: short ? 'short' : 'long', year: 'numeric' });
}

export const nf = new Intl.NumberFormat('es-ES');
