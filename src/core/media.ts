/**
 * Marcadores de multimedia de los exports "sin archivos".
 *
 * WhatsApp sustituye cada foto, audio, vídeo o sticker por un texto que
 * depende del idioma del MÓVIL (no del chat) y de la plataforma:
 *   Android → "<Multimedia omitido>", "<Media omitted>", "<Mídia oculta>"… (sin tipo)
 *   iOS     → "imagen omitida", "audio omitido", "sticker omitido", "image omitted"…
 *   iOS doc → "factura.pdf • 2 páginas documento omitido" (el marcador va al FINAL)
 *
 * Por eso no basta con comparar el mensaje entero contra una lista: usamos un
 * regex "tipo + palabra de omisión" tolerante a <>, mayúsculas, punto final y
 * texto delante. Lo que se detecta aquí NUNCA llega al análisis de texto
 * (ranking de palabras, palabras por mensaje, diccionarios).
 */
import type { MediaType } from './types';

/** Palabra de "omitido" en los idiomas en que WhatsApp exporta. */
const OMIT = String.raw`(?:omitid[oa]s?|omitted|ocultad?[oa]s?|oculta|omis(?:es?)?|omess[oiae]|weggelassen|ausgeschlossen|absente?s?)`;

/** Tipo → palabras que lo nombran. El orden importa: lo más específico primero. */
const TYPES: [MediaType, string][] = [
  ['contact', String.raw`(?:tarjeta de contacto|contact card|cart[aã]o de contato|kontaktkarte|scheda contatto|fiche contact|contacto|contato|contact)`],
  ['audio', String.raw`(?:nota de voz|mensaje de voz|voice message|voice note|sprachnachricht|messaggio vocale|message vocal|[aá]udio|audio)`],
  ['video', String.raw`(?:v[ií]deo|vid[ée]o)`],
  ['sticker', String.raw`(?:sticker|figurinha|autocollant|aufkleber)`],
  ['gif', String.raw`(?:gif)`],
  ['image', String.raw`(?:imagen|imagem|image|immagine|foto|photo|bild)`],
  ['document', String.raw`(?:documento|document|dokument)`],
  ['other', String.raw`(?:archivo multimedia|fichier multim[ée]dia|file multimediali|multimedia|multim[eè]dia|m[ií]dias?|m[ée]dias?|medien|media)`],
];

/** Marcador al final del mensaje (con o sin <>), con cualquier cosa delante. */
const AT_END = TYPES.map(
  ([type, words]) => [type, new RegExp(String.raw`(?:^|[\s<•·])${words}\s+${OMIT}\s*>?\s*\.?\s*$`, 'iu')] as const,
);

/** Cualquier marcador en cualquier posición (para limpiar textos). */
const ANYWHERE = new RegExp(
  String.raw`<?\s*(?:${TYPES.map(([, w]) => w).join('|')})\s+${OMIT}\s*>?`,
  'giu',
);

/** Variantes sin la estructura "tipo + omitido". */
const SPECIAL: [RegExp, MediaType][] = [
  [/^<?\s*se omiti[oó] un archivo multimedia/i, 'other'],
  [/^<?\s*view once (?:voice message|media|photo|video)\s+omitted\s*>?$/i, 'other'],
  [/^<?\s*(?:archivo|file) (?:omitido|omitted)\s*>?$/i, 'document'],
];

/** Devuelve el tipo de multimedia si el mensaje es un marcador de "omitido". */
export function detectMediaMarker(text: string): MediaType | null {
  const t = text.trim();
  if (!t || t.length > 300) return null;
  for (const [re, type] of SPECIAL) if (re.test(t)) return type;
  for (const [type, re] of AT_END) if (re.test(t)) return type;
  return null;
}

/** Quita marcadores que aparezcan dentro de un texto (red de seguridad del análisis de texto). */
export function stripMediaMarkers(text: string): string {
  return text.replace(ANYWHERE, ' ');
}

/** Palabras que solo existen por los marcadores: nunca deben salir en el ranking. */
export const MARKER_WORDS = new Set([
  'omitido', 'omitida', 'omitidos', 'omitidas', 'omitted', 'multimedia', 'oculta', 'ocultada', 'ocultado',
  'omis', 'omise', 'omesso', 'omessa', 'omessi', 'weggelassen', 'ausgeschlossen', 'absente',
]);

/** Agrupación para la tarjeta de multimedia. */
export type MediaGroup = 'photo' | 'audio' | 'video' | 'sticker' | 'other' | 'unknown';

export function mediaGroup(t: MediaType | undefined): MediaGroup {
  switch (t) {
    case 'image': return 'photo';
    case 'audio': return 'audio';
    case 'video': return 'video';
    case 'sticker':
    case 'gif': return 'sticker';
    // "<Multimedia omitido>" de Android no dice qué era.
    case 'other':
    case undefined: return 'unknown';
    default: return 'other'; // documentos, contactos, ubicaciones
  }
}
