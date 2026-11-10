/**
 * Tarjetas 10 y 11: palabras y emojis top, y "vuestro idioma" (palabras y
 * expresiones que usan los dos con frecuencia).
 *
 * Filtramos palabras vacías de TODOS los idiomas registrados, no solo del
 * detectado: los chats mezclan ("ok", "bro", "please") y así el ranking no
 * se llena de conectores.
 */
import { ALL_LOCALES } from '../locales';
import { MARKER_WORDS, stripMediaMarkers } from '../media';
import type { Pair, Report } from '../types';
import type { Ctx } from './context';
import { extractEmojis, pair, tokenize, topN } from './util';

// Las palabras de los marcadores de multimedia ("omitido", "multimedia"…) cuentan como vacías.
const STOP = new Set([...ALL_LOCALES.flatMap((l) => [...l.stopwords]), ...MARKER_WORDS]);
const LAUGHS = new Set(['jaja', 'haha', 'jsjs', 'xd']);

const isContent = (w: string) => w.length >= 3 && !STOP.has(w);

export function words(ctx: Ctx): Report['words'] {
  const uni = pair(() => new Map<string, number>());
  const bi = pair(() => new Map<string, number>());
  const emo = pair(() => new Map<string, number>());
  const inc = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);

  for (const m of ctx.msgs) {
    if (m.kind !== 'text') continue;
    const a = m.author!;
    // Red de seguridad: un marcador incrustado en un texto no debe puntuar como palabra.
    const toks = tokenize(stripMediaMarkers(m.text));
    for (let i = 0; i < toks.length; i++) {
      const w = toks[i];
      if (isContent(w) || LAUGHS.has(w)) inc(uni[a], w);
      const next = toks[i + 1];
      // Bigramas con al menos una palabra con contenido ("te echo", "buenas noches").
      if (next && next !== w && (isContent(w) || isContent(next)) && !LAUGHS.has(w) && !LAUGHS.has(next)) {
        inc(bi[a], `${w} ${next}`);
      }
    }
    for (const e of extractEmojis(m.text)) inc(emo[a], e);
  }

  // Top por persona: sin risas (saldrían siempre primeras y no dicen nada nuevo).
  const top = uni.map((u) => {
    const copy = new Map([...u].filter(([w]) => !LAUGHS.has(w)));
    return topN(copy, 12);
  }) as Pair<ReturnType<typeof topN>>;
  const emojis = emo.map((e) => topN(e, 10)) as Pair<ReturnType<typeof topN>>;

  /**
   * "Solo vosotros": candidatos que usan LOS DOS al menos 3 veces.
   * Puntuación = mínimo de los dos (premia lo compartido, no lo que uno repite)
   * con bonus a expresiones de 2 palabras, que suelen ser más "vuestras".
   * Limitación honesta: sin un corpus de referencia no sabemos si algo es raro
   * fuera de este chat; por eso la UI lo presenta como "vuestro idioma".
   */
  const shared: { word: string; count: number; score: number }[] = [];
  const collect = (maps: Pair<Map<string, number>>, bonus: number) => {
    for (const [w, c0] of maps[0]) {
      const c1 = maps[1].get(w) ?? 0;
      if (c0 >= 3 && c1 >= 3) shared.push({ word: w, count: c0 + c1, score: Math.min(c0, c1) * bonus });
    }
  };
  collect(uni, 1);
  collect(bi, 2.2);
  shared.sort((a, b) => b.score - a.score);
  // Evita repetir: si "buenas noches" está, quita "noches" suelto y "noches bien".
  const picked: { word: string; count: number }[] = [];
  for (const s of shared) {
    if (picked.length >= 10) break;
    const toks = s.word.split(' ');
    if (s.word === 'jaja' || s.word === 'haha') continue; // la risa estándar no es "vuestra"
    if (picked.some((p) => p.word.split(' ').some((t) => toks.includes(t)))) continue;
    picked.push({ word: s.word, count: s.count });
  }

  return { top, emojis, shared: picked };
}
