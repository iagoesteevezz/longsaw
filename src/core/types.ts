/**
 * Modelo de datos del chat parseado y del informe.
 *
 * DECISIONES DE ARQUITECTURA
 * - `src/core` es TypeScript puro: sin React, sin DOM. Así el mismo código corre
 *   en el Web Worker, en los tests (Node) y, si algún día hiciera falta, en un
 *   servidor. Es la pieza más importante del proyecto y la más testeada.
 * - Los mensajes guardan el autor como ÍNDICE (0 | 1) y no como nombre. Los
 *   nombres viven solo en `participants`. Ventajas: menos memoria en chats de
 *   100k mensajes, y anonimizar se reduce a no enviar `participants`.
 * - Las marcas de tiempo son epoch ms en hora LOCAL "flotante" (construidas con
 *   `new Date(y, m, d, h, min)`). El export de WhatsApp no trae zona horaria;
 *   interpretarlo como local es lo que espera el usuario ("me escribe a las 3 am").
 */
import type { Lang } from './i18n';

/** Tipo de mensaje tras clasificar el texto. */
export type MessageKind =
  | 'text' // mensaje normal
  | 'media' // adjunto omitido o incluido (imagen, audio, sticker...)
  | 'deleted' // "Se eliminó este mensaje" / "Eliminaste este mensaje"
  | 'call' // llamada perdida de voz/vídeo
  | 'system'; // aviso de cifrado, cambios de número, etc. (sin autor)

export type MediaType =
  | 'image'
  | 'video'
  | 'audio'
  | 'sticker'
  | 'gif'
  | 'document'
  | 'contact'
  | 'location'
  | 'other';

export type AuthorIndex = 0 | 1;

export interface Message {
  /** Posición en el chat (estable, útil como clave y para citar evidencias). */
  id: number;
  /** epoch ms (hora local del dispositivo que exportó). */
  ts: number;
  /** null solo para mensajes de sistema. */
  author: AuthorIndex | null;
  /** Texto ya normalizado (sin caracteres invisibles); puede ser multilínea. */
  text: string;
  kind: MessageKind;
  mediaType?: MediaType;
  /** WhatsApp añade "<Se editó este mensaje.>"; lo quitamos y lo marcamos aquí. */
  edited?: boolean;
}

export interface Participant {
  /** Nombre tal y como aparece en el export (puede contener emojis). */
  name: string;
  messageCount: number;
}

export type Platform = 'ios' | 'android' | 'unknown';
export type DateOrder = 'DMY' | 'MDY' | 'YMD';
export type LocaleCode = 'es' | 'en';

/** Avisos del parser como códigos (no texto): la UI los muestra en su idioma. */
export type ParseWarning = { code: 'single' } | { code: 'orphans'; n: number } | { code: 'oddLines' } | { code: 'unordered' };

export interface ParsedChat {
  participants: Participant[]; // longitud 1 o 2 (los grupos se rechazan)
  messages: Message[];
  locale: LocaleCode;
  platform: Platform;
  dateOrder: DateOrder;
  /** Índice del participante que exportó el chat, si se pudo deducir. */
  exporterGuess: AuthorIndex | null;
  /** Avisos no fatales (líneas descartadas, fechas desordenadas…). La UI los traduce. */
  warnings: ParseWarning[];
}

/* ------------------------------------------------------------------ */
/* Configuración del análisis (lo que el usuario elige en el setup)    */
/* ------------------------------------------------------------------ */

export type Relation =
  | 'amistad'
  | 'pareja'
  | 'ex'
  | 'ligue'
  | 'familia'
  | 'trabajo'
  | 'otro';

export interface AnalysisOptions {
  /** Índice del participante que es el usuario ("tú"). */
  me: AuthorIndex;
  relation: Relation;
  /** Alias con el que el usuario quiere ver a la otra persona. */
  otherAlias: string;
  /** Nombre del usuario cuando el export lo trae como "Tú"/"You". */
  myAlias?: string;
  /** Idioma de los textos del informe (por defecto, español). */
  lang?: Lang;
  /** Silencio a partir del cual empieza una "nueva conversación". */
  sessionGapHours: number;
  /** Horas sin respuesta para considerar "visto" (estimación). */
  seenThresholdHours: number;
  /** Días de silencio para considerar parón largo / posible bloqueo. */
  silenceDays: number;
}

export const DEFAULT_OPTIONS: Omit<AnalysisOptions, 'me' | 'relation' | 'otherAlias'> = {
  sessionGapHours: 6,
  seenThresholdHours: 24,
  silenceDays: 7,
};

/* ------------------------------------------------------------------ */
/* Informe                                                             */
/* ------------------------------------------------------------------ */

/**
 * Par de valores [persona 0, persona 1]. Usamos tuplas en vez de objetos
 * {me, other} para que el core no sepa quién es "tú": la UI lo resuelve
 * con `options.me`. Así el mismo informe sirve aunque el usuario cambie
 * quién es quién sin recalcular.
 */
export type Pair<T> = [T, T];

/** Referencia a un mensaje concreto usada como evidencia. */
export interface Excerpt {
  id: number;
  ts: number;
  author: AuthorIndex;
  /** Texto recortado (máx. ~220 caracteres). */
  text: string;
}

export interface ResponseStats {
  count: number;
  meanMs: number | null;
  medianMs: number | null;
  p90Ms: number | null;
}

export interface WordCount {
  word: string;
  count: number;
}

export interface TimelinePoint {
  /** 'YYYY-MM' */
  month: string;
  counts: Pair<number>;
}

export interface Silence {
  startTs: number;
  endTs: number | null; // null = el chat termina en silencio
  days: number;
  /** Quién habló durante/justo después del silencio sin obtener respuesta. */
  onlySpeaker: AuthorIndex | null;
  unansweredMessages: number;
  /** true si el chat termina así: es la señal más fuerte de posible bloqueo. */
  atEnd: boolean;
  lastBefore: Excerpt | null;
}

export interface SeenEvent {
  /** Quien escribió y no obtuvo respuesta a tiempo. */
  sender: AuthorIndex;
  waitedMs: number | null; // null = nunca hubo respuesta
  message: Excerpt;
}

export interface InterestComponent {
  key: 'speed' | 'length' | 'questions' | 'initiative' | 'emojis' | 'trend' | 'effort';
  label: string;
  weight: number;
  /** Puntuación 0-100 de cada persona en este componente. */
  scores: Pair<number>;
  /** Valores brutos explicados (ej. "mediana 4 min"). */
  raw: Pair<string>;
}

export interface InterestResult {
  total: Pair<number>; // 0-100
  components: InterestComponent[];
  /** Interés por trimestre del chat (para ver evolución). */
  evolution: { label: string; total: Pair<number> }[];
}

export type FlagSeverity = 'green' | 'yellow' | 'red';

export interface Flag {
  id: string;
  severity: FlagSeverity;
  title: string;
  /** A quién "apunta" el patrón, si a alguien. */
  who: AuthorIndex | null;
  detail: string;
  /** Números que lo justifican, en texto. */
  metric: string;
  evidence: Excerpt[];
}

export interface AmbiguousMessage {
  message: Excerpt;
  /** Mensaje previo de la otra persona (contexto). */
  context: Excerpt | null;
  pattern: string;
  /** Lectura por reglas. */
  reading: string;
}

/** Multimedia enviada, por tipo (ver core/media.ts → mediaGroup). */
export interface MediaBreakdown {
  photo: number;
  audio: number;
  video: number;
  sticker: number;
  /** Documentos, contactos y ubicaciones. */
  other: number;
  /** "<Multimedia omitido>" de Android: el export no dice qué era. */
  unknown: number;
}

/** Huecos con frase generada (tarjetas y sub-apartados). */
export type CaptionKey =
  | 'messages'
  | 'response'
  | 'first'
  | 'initiator'
  | 'media'
  | 'longest'
  | 'deleted'
  | 'timeline'
  | 'interest'
  | 'seen'
  | 'silence'
  | 'words'
  | 'shared'
  | 'flags'
  | 'laughs'
  | 'affection'
  | 'insults'
  | 'greetings';

export interface Report {
  meta: {
    participants: Pair<string>;
    locale: LocaleCode;
    platform: Platform;
    totalMessages: number;
    firstTs: number;
    lastTs: number;
    durationDays: number;
    warnings: ParseWarning[];
  };
  counts: {
    messages: Pair<number>;
    words: Pair<number>;
    media: Pair<number>;
    calls: Pair<number>;
    edited: Pair<number>;
    /** Mensajes de texto con pregunta. */
    questions: Pair<number>;
  };
  media: Pair<MediaBreakdown>;
  lexicon: {
    laughs: Pair<number>;
    /** Familia de risa favorita: 'jaja', 'jsjs', 'xd', '😂'… */
    laughStyle: Pair<string | null>;
    longestLaugh: Pair<string | null>;
    affection: Pair<number>;
    topAffection: Pair<WordCount[]>;
    insults: Pair<number>;
    topInsults: Pair<WordCount[]>;
    greetings: Pair<number>;
    goodMorning: Pair<number>;
    goodNight: Pair<number>;
  };
  responses: Pair<ResponseStats>;
  firstMessage: Excerpt | null;
  initiations: { total: Pair<number>; sessions: number };
  /** Quién cierra las conversaciones (último mensaje antes del silencio). */
  endings: Pair<number>;
  longest: Pair<Excerpt | null>;
  /** Palabras del mensaje más largo (la cita va recortada, este número no). */
  longestWords: Pair<number>;
  deleted: Pair<number>;
  interest: InterestResult;
  seen: { counts: Pair<number>; worst: Pair<SeenEvent | null>; examples: SeenEvent[] };
  silences: Silence[];
  words: { top: Pair<WordCount[]>; emojis: Pair<WordCount[]>; shared: WordCount[] };
  timeline: {
    months: TimelinePoint[];
    peakDay: { date: string; count: number } | null;
    longestStreakDays: number;
    activeDays: number;
    mostActiveMonth: TimelinePoint | null;
    leastActiveMonth: TimelinePoint | null;
    hours: Pair<number[]>; // 24 posiciones
    weekdays: Pair<number[]>; // 7 posiciones, 0 = lunes
  };
  flags: Flag[];
  ambiguous: AmbiguousMessage[];
  /** Textos por reglas y plantillas (core/phrases). Usan {0}/{1} en vez de nombres. */
  insights: {
    styles: Pair<{ label: string; emoji: string; traits: string[] }>;
    noticed: string[];
    move: { title: string; steps: string[] };
    captions: Partial<Record<CaptionKey, string>>;
  };
}
