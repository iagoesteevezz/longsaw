/**
 * Anonimizador de textos citados.
 *
 * Se usa al ocultar nombres (por defecto al compartir una tarjeta o descargar
 * el PDF): sustituye en las citas
 *  - los nombres de los participantes (completo, cada palabra y el alias) → "Persona A/B"
 *  - teléfonos, emails, URLs, IBAN, DNI/NIE, números largos y @menciones → [TELÉFONO], [EMAIL]...
 *
 * Limitación conocida: no detecta nombres de TERCERAS personas mencionadas en
 * los mensajes (haría falta un modelo de NER).
 */
import type { AuthorIndex } from './types';

const LABEL: Record<AuthorIndex, string> = { 0: 'Persona A', 1: 'Persona B' };

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Construye la función de limpieza para un par de nombres (+ alias). */
export function makeScrubber(
  names: [string, string],
  alias?: string,
  meIndex?: AuthorIndex,
  labels: Record<AuthorIndex, string> = LABEL,
) {
  const nameRules: [RegExp, string][] = [];
  const add = (fragment: string, label: string) => {
    const f = fragment.trim();
    // Palabras de 1-2 letras darían falsos positivos ("Al", "Mo").
    if (f.length < 3) return;
    // \p{L} como "borde de palabra" que entiende acentos (\b no lo hace).
    nameRules.push([new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(f)}(?![\\p{L}\\p{N}])`, 'giu'), label]);
  };
  names.forEach((n, i) => {
    const clean = n.replace(/\p{Extended_Pictographic}/gu, '').trim();
    add(clean, labels[i as AuthorIndex]);
    for (const part of clean.split(/\s+/)) add(part, labels[i as AuthorIndex]);
  });
  if (alias && meIndex !== undefined) add(alias, labels[(meIndex === 0 ? 1 : 0) as AuthorIndex]);
  // Más largos primero: "María José" antes que "María".
  nameRules.sort((a, b) => b[0].source.length - a[0].source.length);

  const PII: [RegExp, string][] = [
    [/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[EMAIL]'],
    [/https?:\/\/\S+|www\.\S+/gi, '[ENLACE]'],
    [/\b[A-Z]{2}\d{2}(?:\s?\d{4}){4,6}\b/g, '[IBAN]'],
    [/\b\d{8}[A-HJ-NP-TV-Z]\b|\b[XYZ]\d{7}[A-HJ-NP-TV-Z]\b/gi, '[DNI]'],
    [/\+?\d[\d\s().-]{7,}\d/g, '[TELÉFONO]'],
    [/@\S+/g, '[MENCIÓN]'],
    [/\b\d{5,}\b/g, '[NÚMERO]'],
  ];

  return (text: string): string => {
    let t = text;
    for (const [re, rep] of PII) t = t.replace(re, rep);
    for (const [re, rep] of nameRules) t = t.replace(re, rep);
    return t;
  };
}
