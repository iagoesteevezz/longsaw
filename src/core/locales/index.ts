/**
 * Registro de idiomas. Para añadir uno nuevo: crear el pack y añadirlo aquí.
 */
import type { LocaleCode } from '../types';
import type { LocalePack } from './types';
import { es } from './es';
import { en } from './en';

export const LOCALES: Record<LocaleCode, LocalePack> = { es, en };
export const ALL_LOCALES: LocalePack[] = Object.values(LOCALES);
export type { LocalePack };

/**
 * Detecta el idioma del export puntuando:
 *  - textos de sistema conocidos (peso alto: son inequívocos), y
 *  - frecuencia de palabras vacías en una muestra de mensajes (peso bajo).
 * Se ejecuta sobre una muestra para que sea O(1) en chats enormes.
 */
export function detectLocale(sampleLines: string[]): LocaleCode {
  const scores = Object.fromEntries(ALL_LOCALES.map((l) => [l.code, 0])) as Record<LocaleCode, number>;
  for (const line of sampleLines) {
    const lower = line.toLowerCase();
    for (const pack of ALL_LOCALES) {
      const markers = [
        ...pack.systemHints,
        ...pack.deletedByMe,
        ...pack.deletedByOther,
        ...pack.missedCall,
      ];
      if (markers.some((re) => re.test(lower))) scores[pack.code] += 25;
      if (pack.media.some((m) => m.re.test(lower))) scores[pack.code] += 10;
      if (/\b(a|p)\.\s?m\./.test(lower)) scores.es += 5; // "p. m." es típico del export en español
      for (const w of lower.split(/[^\p{L}]+/u)) {
        if (w.length > 1 && pack.stopwords.has(w)) scores[pack.code] += 1;
      }
    }
  }
  let best: LocaleCode = 'es';
  for (const pack of ALL_LOCALES) if (scores[pack.code] > scores[best]) best = pack.code;
  return best;
}
