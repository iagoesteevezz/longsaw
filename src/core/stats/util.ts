/**
 * Utilidades compartidas por los módulos de estadísticas.
 * Todas son funciones puras y baratas; ningún módulo de stats muta mensajes.
 */
import type { AuthorIndex, Excerpt, Message, Pair } from '../types';

export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

export const pair = <T>(make: () => T): Pair<T> => [make(), make()];
export const other = (a: AuthorIndex): AuthorIndex => (a === 0 ? 1 : 0);
export const clamp = (x: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));

export function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function percentile(xs: number[], p: number): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
}

export function mean(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

const PLACEHOLDER: Record<string, string> = {
  media: '📎 (multimedia)',
  deleted: '🗑️ (mensaje eliminado)',
  call: '📞 (llamada perdida)',
};

/** Convierte un mensaje en evidencia citable, recortada. */
export function excerpt(m: Message, max = 220): Excerpt {
  const raw = m.kind === 'text' ? m.text : (PLACEHOLDER[m.kind] ?? m.text);
  const text = raw.length > max ? raw.slice(0, max - 1).trimEnd() + '…' : raw;
  return { id: m.id, ts: m.ts, author: m.author as AuthorIndex, text };
}

export function wordCount(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

/** Clave de día local 'YYYY-MM-DD'. */
export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function monthKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/* ------------------------------ Emojis ------------------------------- */

const PICTO = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u;
// Intl.Segmenter agrupa emojis compuestos (👨‍👩‍👧, 👍🏽, banderas) como un solo grafema.
const segmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl
  ? new Intl.Segmenter('es', { granularity: 'grapheme' })
  : null;

export function extractEmojis(text: string): string[] {
  if (!PICTO.test(text)) return []; // atajo: la mayoría de mensajes no tienen emojis
  const out: string[] = [];
  if (segmenter) {
    for (const { segment } of segmenter.segment(text)) {
      if (PICTO.test(segment)) out.push(segment.replace(/️/g, ''));
    }
  } else {
    for (const ch of text) if (PICTO.test(ch)) out.push(ch);
  }
  return out;
}

/* ------------------------------ Palabras ----------------------------- */

const URL_RE = /https?:\/\/\S+|www\.\S+/gi;

/** Normaliza risas para que "jajajaj" y "jajaja" cuenten como lo mismo. */
export function normalizeToken(w: string): string {
  if (/^(?:j+a+|a+j+)[ja]*$/.test(w) && w.length >= 4) return 'jaja';
  if (/^(?:ha){2,}h?$/.test(w)) return 'haha';
  if (/^(?:js){2,}j?$/.test(w)) return 'jsjs';
  if (/^x+d+$/.test(w)) return 'xd';
  // "holaaaa" → "holaa": colapsa letras repetidas 3+ veces a 2 (conserva el énfasis)
  return w.replace(/(\p{L})\1{2,}/gu, '$1$1');
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(URL_RE, ' ')
    .split(/[^\p{L}\p{N}']+/u)
    .map((w) => w.replace(/^'+|'+$/g, ''))
    .filter((w) => w.length > 0 && !/^\d+$/.test(w))
    .map(normalizeToken);
}

export function topN(map: Map<string, number>, n: number) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([word, count]) => ({ word, count }));
}

export const isQuestion = (t: string) => t.includes('?') || t.includes('¿');
