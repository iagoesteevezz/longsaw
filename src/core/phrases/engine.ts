/**
 * Motor de frases: recorre los huecos del informe y, para cada uno, toma la
 * primera situación del banco que aplique a los datos y elige una redacción.
 *
 * Garantías (tests/phrases.test.ts):
 *  - Ninguna redacción se repite dentro de un mismo informe.
 *  - Determinista: el mismo chat da el mismo informe (semilla = huella de los
 *    datos), pero chats distintos eligen redacciones distintas.
 *  - No quedan marcadores sin rellenar salvo {0}/{1}, que resuelve la UI.
 */
import type { AuthorIndex, CaptionKey, Relation, Report } from '../types';
import { CAPTIONS, NOTICED, type Facts, type NoticedKey, type Situation, type Vars } from './bank';

/** PRNG pequeño y con semilla (mulberry32). */
export function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Huella numérica estable de los datos del informe. */
function seedOf(r: Report): number {
  const parts = [r.meta.totalMessages, r.meta.firstTs, r.meta.lastTs, ...r.counts.messages, ...r.counts.words];
  let h = 2166136261;
  for (const p of parts) h = Math.imul(h ^ (p % 2147483647), 16777619);
  return h >>> 0;
}

/** {A}/{B} → {0}/{1} y el resto de {var} → su valor. */
export function fillVars(line: string, v: Vars): string {
  return line.replace(/\{([A-Za-z]+)\}/g, (m, k: string) => {
    if (!(k in v)) return m;
    return k === 'A' || k === 'B' ? `{${v[k]}}` : String(v[k]);
  });
}

const NOTICED_MAX = 6;

export function writeCopy(r: Report, opts: { me: AuthorIndex; relation: Relation }) {
  const rand = rng(seedOf(r));
  const used = new Set<string>();
  const facts: Facts = { r, me: opts.me, relation: opts.relation };

  const pick = (situations: Situation[]): string | null => {
    for (const s of situations) {
      let vars: Vars | null | undefined | false;
      try {
        vars = s.when(facts);
      } catch {
        vars = null; // datos incompletos (chat de una sola persona, etc.): la situación no aplica
      }
      if (!vars) continue;
      const free = s.lines.filter((l) => !used.has(l));
      if (free.length === 0) continue;
      const line = free[Math.floor(rand() * free.length)];
      used.add(line);
      return fillVars(line, vars);
    }
    return null;
  };

  const captions: Partial<Record<CaptionKey, string>> = {};
  for (const key of Object.keys(CAPTIONS) as CaptionKey[]) {
    const line = pick(CAPTIONS[key]);
    if (line) captions[key] = line;
  }

  // "Lo que notamos": orden barajado para que cada informe destaque cosas distintas.
  const keys = Object.keys(NOTICED) as NoticedKey[];
  for (let i = keys.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [keys[i], keys[j]] = [keys[j], keys[i]];
  }
  const noticed: string[] = [];
  for (const k of keys) {
    if (noticed.length >= NOTICED_MAX) break;
    const line = pick(NOTICED[k]);
    if (line) noticed.push(line);
  }

  return { captions, noticed };
}
