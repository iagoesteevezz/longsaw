/**
 * Parser de exports de WhatsApp (chats individuales).
 *
 * ESTRATEGIA (dos pasadas, O(n)):
 *  1) Pasada léxica: cada línea se prueba contra la cabecera "fecha, hora".
 *     Si encaja, abre un mensaje nuevo; si no, es continuación (multilínea).
 *     Guardamos los números de la fecha SIN interpretarlos todavía.
 *  2) Resolución: con todas las fechas vistas decidimos el orden (DMY/MDY/YMD)
 *     de forma global — un día 13+ en cualquier parte del archivo lo resuelve —
 *     y solo entonces construimos timestamps. Interpretar línea a línea fallaría
 *     con "03/04/2023" (¿3 de abril o 4 de marzo?).
 *
 * FORMATOS SOPORTADOS (ver tests/fixtures):
 *  - Android: `12/03/2023, 14:05 - Nombre: texto`  (también `12/3/23 14:05 - `)
 *  - iOS:     `[12/03/2023, 14:05:33] Nombre: texto`
 *  - 12 h:    `3/12/23, 2:05 PM`, `12/3/23, 2:05 p. m.`  (con U+202F antes de PM en iOS)
 *  - Separadores de fecha `/`, `.`, `-` y años de 2 o 4 cifras, y `2023-03-12`.
 *
 * Por qué regex y no una librería: no hay ninguna mantenida que cubra todos
 * los casos (iOS + Android + 12h en español), y esto son ~200 líneas
 * testeables sin dependencias que además corren en el Worker.
 */
import { detectLocale, LOCALES, type LocalePack } from './locales';
import { detectMediaMarker } from './media';
import type {
  AuthorIndex,
  DateOrder,
  LocaleCode,
  MediaType,
  Message,
  MessageKind,
  ParseWarning,
  ParsedChat,
  Platform,
} from './types';

export type ParseErrorCode = 'EMPTY' | 'NOT_WHATSAPP' | 'GROUP' | 'NO_TXT_IN_ZIP';

export class ParseError extends Error {
  constructor(
    public code: ParseErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ParseError';
  }
}

/* --------------------------- Normalización --------------------------- */

/**
 * Caracteres invisibles que WhatsApp mete en los exports:
 *  - U+200E/U+200F (marcas de dirección): iOS los pone delante de textos de sistema y adjuntos.
 *  - U+202A–U+202E, U+2066–U+2069: aislamientos bidi alrededor de números de teléfono.
 *  - U+FEFF (BOM) y U+200B (espacio de ancho cero).
 * OJO: NO quitamos U+200D (ZWJ) porque forma parte de emojis compuestos (👨‍👩‍👧).
 */
const INVISIBLE = /[‎‏‪-‮⁦-⁩﻿​]/g;
const LEADING_INVISIBLE = /^[‎‏‪-‮⁦-⁩﻿​]+/;

export function stripInvisible(s: string): string {
  return s.replace(INVISIBLE, '');
}

/** Espacios raros → espacio normal (U+202F aparece antes de "PM" en iOS). */
function normalizeSpaces(s: string): string {
  return s.replace(/[   ]/g, ' ');
}

/* ----------------------------- Cabeceras ----------------------------- */

const DATE = String.raw`(\d{1,4})[\/.\-](\d{1,2})[\/.\-](\d{1,4})\.?`;
const TIME = String.raw`(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?(?:\s*([ap])\.?\s?m\.?)?`;
// iOS: "[fecha, hora] "  — Android: "fecha, hora - "
const IOS_HEADER = new RegExp(String.raw`^\[${DATE},?\s+${TIME}\]\s`, 'i');
const ANDROID_HEADER = new RegExp(String.raw`^${DATE},?\s+${TIME}\s[-–]\s`, 'i');

interface RawHeader {
  a: number;
  b: number;
  c: number;
  aLen: number;
  h: number;
  min: number;
  sec: number;
  ampm: 'a' | 'p' | null;
  platform: Platform;
  rest: string;
}

function matchHeader(line: string): RawHeader | null {
  let platform: Platform = 'ios';
  let m = IOS_HEADER.exec(line);
  if (!m) {
    m = ANDROID_HEADER.exec(line);
    platform = 'android';
  }
  if (!m) return null;
  const h = Number(m[4]);
  const min = Number(m[5]);
  if (h > 23 || min > 59) return null;
  return {
    a: Number(m[1]),
    b: Number(m[2]),
    c: Number(m[3]),
    aLen: m[1].length,
    h,
    min,
    sec: m[6] ? Number(m[6]) : 0,
    ampm: m[7] ? (m[7].toLowerCase() as 'a' | 'p') : null,
    platform,
    rest: line.slice(m[0].length),
  };
}

/* ------------------------- Orden de la fecha ------------------------- */

function toYMD(h: RawHeader, order: DateOrder): [number, number, number] {
  const fixYear = (y: number) => (y < 100 ? 2000 + y : y);
  if (order === 'YMD') return [fixYear(h.a), h.b, h.c];
  if (order === 'DMY') return [fixYear(h.c), h.b, h.a];
  return [fixYear(h.c), h.a, h.b];
}

function toTimestamp(h: RawHeader, order: DateOrder): number {
  const [y, mo, d] = toYMD(h, order);
  let hour = h.h;
  if (h.ampm === 'p' && hour < 12) hour += 12;
  if (h.ampm === 'a' && hour === 12) hour = 0;
  return new Date(y, mo - 1, d, hour, h.min, h.sec).getTime();
}

/**
 * Decide el orden de fecha para TODO el archivo:
 *  1. Año de 4 cifras al principio → YMD.
 *  2. Algún primer campo > 12 → DMY; algún segundo campo > 12 → MDY.
 *  3. Si sigue ambiguo: el orden que produce MENOS saltos hacia atrás en el
 *     tiempo (los mensajes están ordenados cronológicamente).
 *  4. Empate → el orden habitual del idioma.
 */
export function inferDateOrder(headers: RawHeader[], fallback: 'DMY' | 'MDY'): DateOrder {
  if (headers.length === 0) return fallback;
  if (headers.some((h) => h.aLen === 4)) return 'YMD';
  if (headers.some((h) => h.a > 12)) return 'DMY';
  if (headers.some((h) => h.b > 12)) return 'MDY';
  const inversions = (order: DateOrder) => {
    let n = 0;
    let prev = -Infinity;
    for (const h of headers) {
      const t = toTimestamp(h, order);
      if (t < prev) n++;
      prev = t;
    }
    return n;
  };
  const dmy = inversions('DMY');
  const mdy = inversions('MDY');
  if (dmy === mdy) return fallback;
  return dmy < mdy ? 'DMY' : 'MDY';
}

/* --------------------------- Clasificación --------------------------- */

interface Classified {
  kind: MessageKind;
  mediaType?: MediaType;
  edited?: boolean;
  text: string;
  deletedByMe?: boolean;
}

/**
 * Clasifica el texto de un mensaje con autor.
 * `systemMark` = el texto empezaba por U+200E (iOS marca así lo que no
 * escribió una persona: adjuntos, borrados, avisos).
 */
export function classify(text: string, systemMark: boolean, pack: LocalePack): Classified {
  let t = text.trim();
  let edited = false;
  if (pack.edited.test(t)) {
    edited = true;
    t = t.replace(pack.edited, '').trim();
  }
  // Probamos todos los idiomas para los marcadores: hay usuarios con el móvil
  // en inglés que chatean en español (el texto de sistema va en el idioma del SO).
  const packs = [pack, ...Object.values(LOCALES).filter((p) => p !== pack)];
  for (const p of packs) {
    if (p.deletedByMe.some((re) => re.test(t))) return { kind: 'deleted', text: '', deletedByMe: true };
    if (p.deletedByOther.some((re) => re.test(t))) return { kind: 'deleted', text: '' };
  }
  // Marcadores "omitido" en cualquier idioma y posición (ver media.ts).
  const marker = detectMediaMarker(t);
  if (marker) return { kind: 'media', mediaType: marker, text: '' };
  for (const p of packs) {
    for (const m of p.media) if (m.re.test(t)) return { kind: 'media', mediaType: m.type, text: '' };
    if (p.missedCall.some((re) => re.test(t))) return { kind: 'call', text: '' };
  }
  for (const p of packs) {
    if (p.systemWithAuthor.some((re) => re.test(t))) return { kind: 'system', text: t };
  }
  if (systemMark) return { kind: 'system', text: t };
  // Android exporta "null" para mensajes de visualización única.
  if (t === 'null') return { kind: 'media', mediaType: 'other', text: '' };
  return { kind: 'text', text: t, edited: edited || undefined };
}

/* ------------------------------ Parser ------------------------------- */

interface Draft {
  header: RawHeader;
  sender: string | null;
  text: string;
  systemMark: boolean;
}

export function parseWhatsApp(input: string): ParsedChat {
  const lines = input.replace(/\r\n?/g, '\n').split('\n');
  const drafts: Draft[] = [];
  let orphanLines = 0;

  // ---- Pasada 1: líneas → borradores de mensaje ----
  for (const rawLine of lines) {
    const line = normalizeSpaces(rawLine).replace(LEADING_INVISIBLE, '');
    const header = matchHeader(line);
    if (header) {
      const rest = header.rest;
      const sep = rest.indexOf(': ');
      // Sin "Nombre: " → mensaje de sistema (Android: aviso de cifrado, etc.)
      // Un nombre de contacto razonable no supera ~60 caracteres.
      if (sep > 0 && sep <= 80) {
        const rawText = rest.slice(sep + 2);
        drafts.push({
          header,
          sender: stripInvisible(rest.slice(0, sep)).trim(),
          text: rawText,
          systemMark: /^[‎‏]/.test(rawText),
        });
      } else {
        drafts.push({ header, sender: null, text: rest, systemMark: true });
      }
    } else if (drafts.length > 0) {
      // Continuación de un mensaje multilínea: conservamos los saltos de línea.
      drafts[drafts.length - 1].text += '\n' + rawLine;
    } else if (line.trim()) {
      orphanLines++;
    }
  }

  if (drafts.length === 0) {
    throw new ParseError(
      'NOT_WHATSAPP',
      'No reconocemos este archivo como un chat exportado de WhatsApp. Exporta el chat desde WhatsApp → Más → Exportar chat.',
    );
  }

  // ---- Idioma (con una muestra para no recorrer chats enormes dos veces) ----
  const sample = drafts
    .filter((_, i) => i < 400 || i % 50 === 0)
    .map((d) => stripInvisible(d.text));
  const locale: LocaleCode = detectLocale(sample);
  const pack = LOCALES[locale];

  // ---- Orden de fecha global ----
  const dateOrder = inferDateOrder(
    drafts.map((d) => d.header),
    pack.defaultDateOrder,
  );
  const platformVotes = { ios: 0, android: 0 };
  for (const d of drafts) platformVotes[d.header.platform as 'ios' | 'android']++;
  const platform: Platform = platformVotes.ios >= platformVotes.android ? 'ios' : 'android';

  // ---- Clasificar y contar remitentes ----
  const classified = drafts.map((d) => {
    const text = stripInvisible(d.text);
    if (d.sender === null) return { d, c: { kind: 'system' as const, text: text.trim() } };
    return { d, c: classify(text, d.systemMark, pack) };
  });

  const senderCounts = new Map<string, number>();
  for (const { d, c } of classified) {
    if (d.sender !== null && c.kind !== 'system') {
      senderCounts.set(d.sender, (senderCounts.get(d.sender) ?? 0) + 1);
    }
  }
  const senders = [...senderCounts.entries()].sort((x, y) => y[1] - x[1]);

  if (senders.length === 0) {
    throw new ParseError('EMPTY', 'El chat no contiene mensajes de personas (solo avisos del sistema).');
  }
  // Grupos: más de 2 remitentes con actividad real. Un tercer "remitente" con
  // 1-2 mensajes suele ser un falso positivo (texto con ": " en un aviso).
  // En chats pequeños no podemos distinguir ruido de un grupo real → grupo.
  const totalWithAuthor = senders.reduce((s, [, n]) => s + n, 0);
  if (
    senders.length > 2 &&
    (senders.length > 3 || senders[2][1] >= 3 || totalWithAuthor < 50)
  ) {
    throw new ParseError(
      'GROUP',
      'Parece un chat de grupo. De momento solo analizamos chats entre dos personas.',
    );
  }

  const warnings: ParseWarning[] = [];
  const names = senders.slice(0, 2).map(([n]) => n);
  if (names.length === 1) {
    warnings.push({ code: 'single' });
  }
  if (orphanLines > 0) warnings.push({ code: 'orphans', n: orphanLines });
  if (senders.length > 2) warnings.push({ code: 'oddLines' });

  // ---- Construir mensajes finales ----
  const messages: Message[] = [];
  const exporterVotes: [number, number] = [0, 0];
  let lastTs = -Infinity;
  let outOfOrder = 0;
  for (const { d, c } of classified) {
    const idx = d.sender !== null ? names.indexOf(d.sender) : -1;
    const isSystem = c.kind === 'system' || idx === -1;
    const ts = toTimestamp(d.header, dateOrder);
    if (Number.isNaN(ts)) continue;
    if (ts < lastTs) outOfOrder++;
    lastTs = Math.max(lastTs, ts);
    const author = isSystem ? null : (idx as AuthorIndex);
    if (author !== null && 'deletedByMe' in c && c.deletedByMe) exporterVotes[author]++;
    messages.push({
      id: messages.length,
      ts,
      author,
      text: isSystem ? c.text : c.text,
      kind: isSystem ? 'system' : c.kind,
      ...(c.kind === 'media' && c.mediaType ? { mediaType: c.mediaType } : {}),
      ...('edited' in c && c.edited ? { edited: true } : {}),
    });
  }
  if (outOfOrder > messages.length * 0.02) {
    warnings.push({ code: 'unordered' });
  }

  // Chat de una sola persona: añadimos un participante vacío para que todo el
  // código posterior pueda asumir siempre dos (evita mil comprobaciones).
  const participants = names.map((name) => ({ name, messageCount: senderCounts.get(name) ?? 0 }));
  if (participants.length === 1) participants.push({ name: 'Otra persona', messageCount: 0 });

  const exporterGuess: AuthorIndex | null =
    exporterVotes[0] > exporterVotes[1] ? 0 : exporterVotes[1] > exporterVotes[0] ? 1 : null;

  return { participants, messages, locale, platform, dateOrder, exporterGuess, warnings };
}
