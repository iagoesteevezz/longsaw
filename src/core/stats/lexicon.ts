/**
 * Tarjeta "Risas, cariño y pullitas": cuenta por persona las risas (y su
 * estilo: jaja, jsjs, xd…), las palabras de cariño, los insultos suaves y
 * los saludos, usando los diccionarios de core/dictionaries.ts.
 *
 * Las expresiones se buscan de la más larga a la más corta y consumen sus
 * palabras: "te quiero mucho" cuenta una vez, no también como "te quiero".
 */
import {
  AFFECTION,
  AFFECTION_EMOJIS,
  GOOD_MORNING,
  GOOD_NIGHT,
  GREETINGS,
  LAUGH_EMOJIS,
  SOFT_INSULTS,
  fold,
  laughFamily,
  phraseIndex,
} from '../dictionaries';
import { stripMediaMarkers } from '../media';
import type { Pair, Report } from '../types';
import type { Ctx } from './context';
import { extractEmojis, pair, topN } from './util';

type Category = 'affection' | 'insults' | 'greetings';
const INDEX: [Category, Map<number, Set<string>>][] = [
  ['affection', phraseIndex(AFFECTION)],
  ['insults', phraseIndex(SOFT_INSULTS)],
  ['greetings', phraseIndex(GREETINGS)],
];
/** Primeras palabras de las expresiones de 2-3 palabras: solo con ellas merece la pena mirar n-gramas. */
const STARTERS = new Set(
  INDEX.flatMap(([, idx]) => [...(idx.get(2) ?? []), ...(idx.get(3) ?? [])].map((p) => p.split(' ')[0])),
);
const NON_ASCII = /[^\x00-\x7f]/;

export function lexicon(ctx: Ctx): Report['lexicon'] {
  const laughs = pair(() => 0);
  const laughFam = pair(() => new Map<string, number>());
  const longestLaugh: Pair<string | null> = [null, null];
  const hits = { affection: pair(() => new Map<string, number>()), insults: pair(() => new Map<string, number>()), greetings: pair(() => new Map<string, number>()) };
  const totals = { affection: pair(() => 0), insults: pair(() => 0), greetings: pair(() => 0) };
  const goodMorning = pair(() => 0);
  const goodNight = pair(() => 0);
  const inc = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);

  for (const m of ctx.msgs) {
    if (m.kind !== 'text') continue;
    const a = m.author!;
    const text = stripMediaMarkers(m.text);
    // fold() (quitar tildes) es lo caro: solo hace falta si hay caracteres no ASCII.
    const lower = NON_ASCII.test(text) ? fold(text) : text.toLowerCase();
    const toks = lower.split(/[^\p{L}\p{N}ñ]+/u).filter(Boolean);

    for (let i = 0; i < toks.length; ) {
      const w = toks[i];
      const fam = laughFamily(w);
      if (fam) {
        laughs[a]++;
        inc(laughFam[a], fam);
        if (!longestLaugh[a] || w.length > longestLaugh[a]!.length) longestLaugh[a] = w;
        i++;
        continue;
      }
      let used = 0;
      for (let n = STARTERS.has(w) ? 3 : 1; n >= 1 && !used; n--) {
        if (i + n > toks.length) continue;
        const phrase = toks.slice(i, i + n).join(' ');
        for (const [cat, idx] of INDEX) {
          if (idx.get(n)?.has(phrase)) {
            totals[cat][a]++;
            inc(hits[cat][a], phrase);
            if (GOOD_MORNING.has(phrase)) goodMorning[a]++;
            if (GOOD_NIGHT.has(phrase)) goodNight[a]++;
            used = n;
            break;
          }
        }
      }
      i += used || 1;
    }

    for (const e of extractEmojis(text)) {
      if (LAUGH_EMOJIS.has(e)) {
        laughs[a]++;
        inc(laughFam[a], '😂');
      } else if (AFFECTION_EMOJIS.has(e)) {
        totals.affection[a]++;
        inc(hits.affection[a], e);
      }
    }
  }

  const laughStyle = laughFam.map((m) => topN(m, 1)[0]?.word ?? null) as Pair<string | null>;
  return {
    laughs,
    laughStyle,
    longestLaugh,
    affection: totals.affection,
    topAffection: hits.affection.map((m) => topN(m, 5)) as Report['lexicon']['topAffection'],
    insults: totals.insults,
    topInsults: hits.insults.map((m) => topN(m, 5)) as Report['lexicon']['topInsults'],
    greetings: totals.greetings,
    goodMorning,
    goodNight,
  };
}
