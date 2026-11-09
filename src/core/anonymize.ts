/**
 * Anonimizador + construcción del payload para el LLM.
 *
 * PRINCIPIO: minimización. Al LLM solo le llegan:
 *  - un resumen ESTADÍSTICO (números, sin texto),
 *  - las red flags con sus evidencias (máx. 3 extractos por flag, recortados),
 *  - los mensajes ambiguos con 1 línea de contexto,
 *  - el tipo de relación.
 * Nunca el chat completo. Antes de enviar, todo texto pasa por `scrub()`:
 *  - nombres de los participantes (completo, cada palabra del nombre y el alias) → "Persona A/B"
 *  - teléfonos, emails, URLs, IBAN, DNI/NIE, números largos, @menciones → [TELÉFONO], [EMAIL]...
 * El usuario ve EXACTAMENTE este JSON antes de aceptar (pantalla de consentimiento).
 *
 * Limitación conocida (se explica en la UI): no podemos detectar nombres de
 * TERCERAS personas mencionadas en los mensajes sin un modelo NER. Por eso
 * el usuario puede editar/quitar cualquier extracto antes de enviar.
 */
import type { AuthorIndex, Excerpt, Report } from './types';
import { formatDuration } from './format';

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

/** Marcadores {0}/{1} del core → etiquetas anónimas. */
const tokens = (s: string) => s.replace(/\{0\}/g, LABEL[0]).replace(/\{1\}/g, LABEL[1]);

export interface AiPayload {
  relation: string;
  /** Quién es el usuario que pide el informe. */
  user: 'Persona A' | 'Persona B';
  stats: Record<string, string | number>;
  flags: { title: string; detail: string; evidence: { from: string; text: string }[] }[];
  ambiguous: { id: number; from: string; message: string; context: string | null }[];
}

export function buildAiPayload(report: Report, opts: { me: AuthorIndex; relation: string; otherAlias: string }): AiPayload {
  const scrub = makeScrubber(report.meta.participants, opts.otherAlias, opts.me);
  const ex = (e: Excerpt) => ({ from: LABEL[e.author], text: scrub(e.text).slice(0, 220) });
  const r = report;
  return {
    relation: opts.relation,
    user: LABEL[opts.me] as AiPayload['user'],
    stats: {
      duracion_dias: r.meta.durationDays,
      mensajes_A: r.counts.messages[0],
      mensajes_B: r.counts.messages[1],
      mediana_respuesta_A: formatDuration(r.responses[0].medianMs),
      mediana_respuesta_B: formatDuration(r.responses[1].medianMs),
      conversaciones: r.initiations.sessions,
      inicia_A: r.initiations.total[0],
      inicia_B: r.initiations.total[1],
      interes_A: r.interest.total[0],
      interes_B: r.interest.total[1],
      vistos_dados_por_A: r.seen.counts[0],
      vistos_dados_por_B: r.seen.counts[1],
      borrados_A: r.deleted[0],
      borrados_B: r.deleted[1],
      evolucion_interes: r.interest.evolution.map((e) => `${e.total[0]}/${e.total[1]}`).join(' → '),
    },
    flags: r.flags
      .filter((f) => f.severity !== 'green')
      .slice(0, 6)
      .map((f) => ({ title: f.title, detail: scrub(tokens(f.detail)), evidence: f.evidence.slice(0, 3).map(ex) })),
    ambiguous: r.ambiguous.slice(0, 5).map((a, i) => ({
      id: i,
      from: LABEL[a.message.author],
      message: scrub(a.message.text),
      context: a.context ? `${LABEL[a.context.author]}: ${scrub(a.context.text)}` : null,
    })),
  };
}

/** Respuesta esperada del LLM (validada en cliente y servidor). */
export interface AiResult {
  attachment: { A: string; B: string; summary: string };
  meanings: { id: number; reading: string }[];
  move: { title: string; steps: string[] };
  flagsComment: string;
}

export function isAiResult(x: unknown): x is AiResult {
  const o = x as AiResult;
  return (
    !!o &&
    typeof o.attachment?.A === 'string' &&
    typeof o.attachment?.B === 'string' &&
    Array.isArray(o.meanings) &&
    typeof o.move?.title === 'string' &&
    Array.isArray(o.move?.steps) &&
    typeof o.flagsComment === 'string'
  );
}
