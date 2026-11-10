/**
 * Idioma de los textos que genera el core (frases, red flags, estilos, fechas).
 *
 * Es un valor de módulo y no un parámetro en cada función porque lo usan
 * decenas de funciones de formato. Cada entorno lo fija una vez:
 *  - el Worker, al empezar cada análisis (analyze → opts.lang);
 *  - la UI, al cambiar de idioma (src/lib/i18n.tsx).
 */
export type Lang = 'es' | 'en';

let current: Lang = 'es';

export function setCoreLang(l: Lang) {
  current = l;
}

export function coreLang(): Lang {
  return current;
}

/** Elige el texto del idioma actual. */
export function tr<T>(t: Record<Lang, T>): T {
  return t[current];
}

export const LOCALE_TAG: Record<Lang, string> = { es: 'es-ES', en: 'en-GB' };
