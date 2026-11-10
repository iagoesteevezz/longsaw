/**
 * Banco de frases del informe (sustituye a la antigua interpretación con IA).
 *
 * Estructura: cada HUECO (una tarjeta o un apartado de "Lo que notamos")
 * tiene varias SITUACIONES ordenadas de más específica a más general. Cada
 * situación decide con los datos si aplica (`when` devuelve las variables o
 * null) y trae varias redacciones; el motor (engine.ts) elige una sin repetir.
 *
 * Marcadores en las frases:
 *   {A} {B}  → personas (el motor los convierte en {0}/{1}; la UI pone el nombre)
 *   {n} {x}… → variables que devuelve `when`, ya formateadas
 *
 * Reglas de redacción: tercera persona y SIN adjetivos con género sobre las
 * personas ("{A} es rápido" no vale si {A} es Marta). Humor sí; diagnósticos no.
 */
import { dec1, formatDate, formatDuration, formatMonth, nf } from '../format';
import { tr } from '../i18n';
import type { AuthorIndex, CaptionKey, Pair, Relation, Report } from '../types';

export interface Facts {
  r: Report;
  me: AuthorIndex;
  relation: Relation;
}

export type Vars = Record<string, string | number>;

export interface Situation {
  id: string;
  when: (f: Facts) => Vars | null | undefined | false;
  lines: string[];
}

export type NoticedKey =
  | 'night'
  | 'morning'
  | 'hour'
  | 'weekday'
  | 'weekdayQuiet'
  | 'questions'
  | 'doubleText'
  | 'closer'
  | 'edits'
  | 'calls'
  | 'peakDay'
  | 'bigVolume'
  | 'month'
  | 'favWord';

/* ------------------------------ Ayudas ------------------------------ */

const n = (x: number) => nf.format(Math.round(x));
const pctOf = (a: number, b: number) => Math.round((a / Math.max(1, a + b)) * 100);
const ratio = (x: number) => (x >= 10 ? n(x) : dec1(x));
const DAYS = {
  es: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados', 'domingos'],
  en: ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'],
};
const day = (i: number) => tr(DAYS)[i];

/** Quién va por delante en un par de números (empate → persona 0). */
function lead(p: Pair<number>) {
  const A: AuthorIndex = p[0] >= p[1] ? 0 : 1;
  const B: AuthorIndex = A === 0 ? 1 : 0;
  const hi = p[A];
  const lo = p[B];
  return { A, B, hi, lo, r: hi / Math.max(1, lo), share: hi / Math.max(1, hi + lo) };
}

const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
const both = (p: Pair<number>) => p[0] + p[1];
const solo = (r: Report) => r.counts.messages[0] === 0 || r.counts.messages[1] === 0;

/* ------------------------------ Tarjetas ----------------------------- */

const messages: Situation[] = [
  {
    id: 'messages.solo',
    when: ({ r }) => solo(r) && { A: lead(r.counts.messages).A, n: n(r.meta.totalMessages) },
    lines: [
      'Aquí solo habla {A}. Es menos un chat y más un diario con público.',
      '{A} lleva toda la conversación en solitario: {n} mensajes y ni un eco.',
      'Monólogo de {A} en {n} actos. El público, de momento, no aplaude.',
    ],
  },
  {
    id: 'messages.lopsided',
    when: ({ r }) => {
      const l = lead(r.counts.messages);
      return l.r >= 2 && { A: l.A, B: l.B, x: ratio(l.r), pct: Math.round(l.share * 100), hi: n(l.hi), lo: n(l.lo) };
    },
    lines: [
      '{A} escribe {x} veces más que {B}. Si esto fuera un pódcast, {B} sería quien asiente.',
      '{A} manda {x} mensajes por cada uno de {B}. Alguien tiene el teclado caliente.',
      'Reparto de la palabra: {pct} % para {A}. {B} habla poco, pero quizá elige bien cuándo.',
    ],
  },
  {
    id: 'messages.more',
    when: ({ r }) => {
      const l = lead(r.counts.messages);
      return l.r >= 1.25 && { A: l.A, B: l.B, pct: Math.round(l.share * 100), diff: n(l.hi - l.lo) };
    },
    lines: [
      '{A} habla un poco más ({pct} %), pero {B} no se queda en silencio.',
      'Ligera ventaja de {A}: {diff} mensajes más. Nada que no arregle un audio largo de {B}.',
      '{A} lleva la voz cantante, aunque {B} hace los coros con ganas.',
    ],
  },
  {
    id: 'messages.even',
    when: ({ r }) => ({ A: 0, B: 1, pa: pctOf(r.counts.messages[0], r.counts.messages[1]), pb: pctOf(r.counts.messages[1], r.counts.messages[0]) }),
    lines: [
      'Reparto casi perfecto: {pa} % frente a {pb} %. Ni ante notario quedaría más equilibrado.',
      'Habláis prácticamente lo mismo. Esto es un diálogo de verdad, no dos monólogos cruzados.',
      'Empate técnico en mensajes. Nadie puede echarle en cara a nadie que no escribe.',
    ],
  },
];

const response: Situation[] = [
  {
    id: 'response.single',
    when: ({ r }) => (r.responses[0].medianMs === null || r.responses[1].medianMs === null) && {},
    lines: [
      'Sin respuestas de las dos partes no hay nada que cronometrar. El cronómetro se aburre.',
      'Para medir tiempos de respuesta hace falta que contesten los dos. De momento, no.',
    ],
  },
  {
    id: 'response.bothFast',
    when: ({ r }) =>
      r.responses[0].medianMs! < 2 * 60_000 &&
      r.responses[1].medianMs! < 2 * 60_000 && { A: 0, B: 1, ma: formatDuration(r.responses[0].medianMs), mb: formatDuration(r.responses[1].medianMs) },
    lines: [
      'Los dos contestáis en menos de dos minutos. ¿Móvil pegado a la mano o telepatía?',
      'Respuestas de récord por las dos partes: {ma} y {mb}. Esto no es un chat, es un partido de tenis.',
      'Nadie deja a nadie esperando: la mediana de los dos está por debajo de dos minutos.',
    ],
  },
  {
    id: 'response.gap',
    when: ({ r }) => {
      const med: Pair<number> = [r.responses[0].medianMs!, r.responses[1].medianMs!];
      const l = lead(med); // A = quien tarda más
      return l.r >= 3 && l.hi > 5 * 60_000 && { A: l.A, B: l.B, ma: formatDuration(l.hi), mb: formatDuration(l.lo), x: ratio(l.r) };
    },
    lines: [
      '{A} tarda {ma} en contestar; {B}, {mb}. Uno vive en el chat y el otro está de visita.',
      '{B} responde {x} veces más rápido que {A}. Paciencia infinita la de {B}.',
      'Mientras {B} contesta en {mb}, {A} se toma {ma}. Cada cual en su zona horaria emocional.',
      '{A} se lo piensa: {ma} de mediana. {B} va en {mb}. Dos ritmos muy distintos.',
    ],
  },
  {
    id: 'response.bothSlow',
    when: ({ r }) =>
      r.responses[0].medianMs! > 60 * 60_000 &&
      r.responses[1].medianMs! > 60 * 60_000 && { A: 0, B: 1, ma: formatDuration(r.responses[0].medianMs), mb: formatDuration(r.responses[1].medianMs) },
    lines: [
      'Aquí nadie tiene prisa: {ma} y {mb} de mediana. Un chat a fuego lento.',
      'Respuestas con calma por las dos partes. Lo vuestro es correspondencia, casi por carta.',
      'Ni {A} ni {B} viven pegados al móvil, y se nota. Y está bien.',
    ],
  },
  {
    id: 'response.slight',
    when: ({ r }) => {
      const l = lead([r.responses[0].medianMs!, r.responses[1].medianMs!]);
      return l.r >= 1.5 && { A: l.A, B: l.B, ma: formatDuration(l.hi), mb: formatDuration(l.lo) };
    },
    lines: [
      '{B} contesta algo antes ({mb}) que {A} ({ma}). Diferencia pequeña, pero se nota.',
      '{A} se toma un poco más de tiempo. Nada grave: {ma} frente a {mb}.',
      'Ventaja de {B} en velocidad, sin que nadie llegue a desesperarse.',
    ],
  },
  {
    id: 'response.even',
    when: ({ r }) => ({ A: 0, B: 1, ma: formatDuration(r.responses[0].medianMs), mb: formatDuration(r.responses[1].medianMs) }),
    lines: [
      'Tiempos casi idénticos: {ma} y {mb}. Estáis sincronizados.',
      'Ni una parte más rápida ni la otra más lenta: el mismo ritmo de respuesta.',
      'Respondéis igual de rápido. Nadie puede usar la excusa de «es que tardas mucho».',
    ],
  },
];

const first: Situation[] = [
  {
    id: 'first.old',
    when: ({ r }) => r.firstMessage && r.meta.durationDays >= 730 && { A: r.firstMessage.author, y: n(Math.floor(r.meta.durationDays / 365)) },
    lines: [
      'Hace más de {y} años de este mensaje de {A}. Lo que ha llovido desde entonces.',
      '{y} años después, aquí seguís. Y todo empezó con {A} escribiendo esto.',
    ],
  },
  {
    id: 'first.question',
    when: ({ r }) => r.firstMessage && /[?¿]/.test(r.firstMessage.text) && { A: r.firstMessage.author },
    lines: [
      'Todo empezó con una pregunta de {A}. Buena forma de abrir la puerta.',
      '{A} abrió el chat preguntando. La curiosidad lo empezó todo.',
    ],
  },
  {
    id: 'first.greeting',
    when: ({ r }) => r.firstMessage && /^(hola|holi|buenas|hey|ey|hi|hello)\b/i.test(r.firstMessage.text) && { A: r.firstMessage.author },
    lines: [
      'Todo empezó con un saludo de {A}. Clásico, educado, sin riesgos.',
      'Un «hola» de {A} y aquí estamos. Los grandes chats empiezan así.',
    ],
  },
  {
    id: 'first.default',
    when: ({ r }) => r.firstMessage && { A: r.firstMessage.author, n: n(r.meta.totalMessages) },
    lines: [
      '{A} rompió el hielo. Sin este mensaje, nada de lo que viene después existiría.',
      'El mensaje cero lo escribió {A}. Todo gran chat empieza con alguien que se lanza.',
      'Primer mensaje: {A}. El resto es historia (y {n} mensajes).',
    ],
  },
];

const initiator: Situation[] = [
  {
    id: 'init.few',
    when: ({ r }) => r.initiations.sessions < 3 && { A: lead(r.initiations.total).A },
    lines: ['Pocas conversaciones para sacar conclusiones, pero de momento quien abre el chat es {A}.'],
  },
  {
    id: 'init.dominant',
    when: ({ r }) => {
      const l = lead(r.initiations.total);
      return l.share >= 0.7 && { A: l.A, B: l.B, pct: Math.round(l.share * 100), pct2: 100 - Math.round(l.share * 100) };
    },
    lines: [
      '{A} empieza el {pct} % de las conversaciones. Si {A} no escribe, aquí no habla nadie.',
      '{A} es quien enciende la conversación casi siempre. {B} se deja encontrar.',
      'Iniciativa: {A} {pct} %, {B} {pct2} %. Una relación con un claro motor de arranque.',
    ],
  },
  {
    id: 'init.leans',
    when: ({ r }) => {
      const l = lead(r.initiations.total);
      return l.share >= 0.58 && { A: l.A, B: l.B, pct: Math.round(l.share * 100) };
    },
    lines: [
      '{A} suele dar el primer paso ({pct} %), aunque {B} también tira de vez en cuando.',
      'Ligera tendencia: {A} saca la conversación algo más a menudo que {B}.',
      '{A} va un poco por delante en iniciativa, pero sin que sea un problema.',
    ],
  },
  {
    id: 'init.even',
    when: ({ r }) => ({ A: 0, B: 1, pa: pctOf(r.initiations.total[0], r.initiations.total[1]), pb: pctOf(r.initiations.total[1], r.initiations.total[0]) }),
    lines: [
      'Iniciativa repartida: los dos escribís primero más o menos igual. Así da gusto.',
      'Aquí nadie persigue a nadie: {pa} % y {pb} % de conversaciones iniciadas.',
      'Empate en iniciativa. Os buscáis los dos, que es lo que cuenta.',
    ],
  },
];

const mediaTotal = (r: Report, a: AuthorIndex) => sum(Object.values(r.media[a]));
const mediaLead = (r: Report, key: keyof Report['media'][0], min: number) => {
  const l = lead([r.media[0][key], r.media[1][key]]);
  return l.hi >= min && l.hi >= mediaTotal(r, l.A) * 0.3 ? l : null;
};

const media: Situation[] = [
  {
    id: 'media.none',
    when: ({ r }) => mediaTotal(r, 0) + mediaTotal(r, 1) === 0 && {},
    lines: [
      'Ni una foto, ni un audio, ni un sticker. Chat de texto puro, como en los viejos tiempos.',
      'Cero multimedia. Lo vuestro es la palabra escrita.',
    ],
  },
  {
    id: 'media.audio',
    when: ({ r }) => {
      const l = mediaLead(r, 'audio', 10);
      return l && { A: l.A, B: l.B, n: n(l.hi) };
    },
    lines: [
      '{A} manda {n} audios. Pódcast propio, sin suscripción.',
      '{A} prefiere hablar a escribir: {n} audios. {B} ya tiene los cascos puestos.',
      'Con {n} audios, {A} podría sacar un pódcast semanal.',
    ],
  },
  {
    id: 'media.sticker',
    when: ({ r }) => {
      const l = mediaLead(r, 'sticker', 10);
      return l && { A: l.A, n: n(l.hi) };
    },
    lines: [
      '{A} responde con stickers {n} veces. ¿Para qué escribir si hay un sticker para todo?',
      '{n} stickers de {A}. Esa colección merece un museo.',
      '{A} tiene un sticker para cada ocasión, y lo demuestra {n} veces.',
    ],
  },
  {
    id: 'media.photo',
    when: ({ r }) => {
      const l = mediaLead(r, 'photo', 10);
      return l && { A: l.A, n: n(l.hi), k: n(l.hi * 1000) };
    },
    lines: [
      '{A} comparte {n} fotos. Fotoperiodismo de lo cotidiano.',
      'Con {n} fotos de {A}, este chat es casi un álbum.',
      '{A} lo enseña todo: {n} imágenes y subiendo.',
    ],
  },
  {
    id: 'media.unknown',
    when: ({ r }) => {
      const l = lead([r.media[0].unknown, r.media[1].unknown]);
      return l.hi > 0 && l.hi >= mediaTotal(r, l.A) * 0.8 && { A: l.A, n: n(l.hi) };
    },
    lines: [
      '{n} archivos de {A}, pero Android no dice si eran fotos, audios o memes. Misterio.',
      '{A} manda más multimedia ({n}). Qué era exactamente, solo lo sabe vuestra galería.',
      'El export de Android lo tapa todo con «Multimedia omitido». Sabemos cuántos, no qué: {A} gana con {n}.',
    ],
  },
  {
    id: 'media.general',
    when: ({ r }) => {
      const l = lead([mediaTotal(r, 0), mediaTotal(r, 1)]);
      return { A: l.A, B: l.B, n: n(l.hi), m: n(l.lo) };
    },
    lines: [
      '{A} manda más multimedia que {B}: {n} frente a {m}.',
      'Entre fotos, audios y stickers, {A} va por delante.',
    ],
  },
];

const longest: Situation[] = [
  {
    id: 'longest.novel',
    when: ({ r }) => {
      const l = lead(r.longestWords);
      return l.hi >= 150 && { A: l.A, n: n(l.hi) };
    },
    lines: [
      '{A} escribió un mensaje de {n} palabras. Eso no es un mensaje, es un capítulo.',
      '{n} palabras de {A} en un solo mensaje. Palomitas antes de leerlo.',
    ],
  },
  {
    id: 'longest.mid',
    when: ({ r }) => {
      const l = lead(r.longestWords);
      return l.hi >= 40 && { A: l.A, n: n(l.hi) };
    },
    lines: [
      'El mensaje más largo de {A} tiene {n} palabras. Lo justo para contar algo importante.',
      '{A} se inspiró una vez y soltó {n} palabras seguidas.',
    ],
  },
  {
    id: 'longest.short',
    when: ({ r }) => ({ n: n(Math.max(...r.longestWords)) }),
    lines: [
      'Ni el mensaje más largo pasa de {n} palabras. Aquí se va al grano.',
      'Lo vuestro es la brevedad: el récord está en {n} palabras.',
    ],
  },
];

const deleted: Situation[] = [
  {
    id: 'deleted.none',
    when: ({ r }) => both(r.deleted) === 0 && {},
    lines: [
      'Nadie ha borrado nada. Transparencia total (o mucha seguridad).',
      'Cero mensajes eliminados. Aquí se escribe sin red… y sin arrepentirse.',
    ],
  },
  {
    id: 'deleted.one',
    when: ({ r }) => {
      const l = lead(r.deleted);
      return l.hi > l.lo && { A: l.A, n: n(l.hi) };
    },
    lines: [
      '{A} ha borrado {n} mensajes. Lo que había ahí, nunca lo sabremos.',
      '{A} es quien más se arrepiente: {n} mensajes eliminados.',
      '{n} mensajes borrados por {A}. El botón de «eliminar para todos» ya le conoce.',
    ],
  },
  {
    id: 'deleted.even',
    when: () => ({}),
    lines: ['Empate técnico en arrepentimientos.', 'Borráis más o menos lo mismo. Secretos repartidos a partes iguales.'],
  },
];

const timeline: Situation[] = [
  {
    id: 'streak.epic',
    when: ({ r }) => r.timeline.longestStreakDays >= 60 && { n: n(r.timeline.longestStreakDays) },
    lines: [
      '{n} días seguidos hablando. Ni el gimnasio consigue esa constancia.',
      'Racha de {n} días sin fallar uno. Esto ya es una tradición.',
    ],
  },
  {
    id: 'streak.long',
    when: ({ r }) => r.timeline.longestStreakDays >= 14 && { n: n(r.timeline.longestStreakDays) },
    lines: [
      'Vuestra mejor racha: {n} días seguidos. Nada mal.',
      '{n} días sin dejar de escribiros. Eso es tener cosas que contarse.',
    ],
  },
  {
    id: 'streak.short',
    when: ({ r }) => ({ n: n(r.timeline.longestStreakDays) }),
    lines: [
      'La racha más larga es de {n} días. Lo vuestro va más a ratos.',
      'Habláis a golpes, no a diario: récord de {n} días seguidos.',
    ],
  },
];

const interest: Situation[] = [
  {
    id: 'interest.fading',
    when: ({ r }) => {
      const ev = r.interest.evolution;
      return ev.length >= 3 && both(ev[0].total) - both(ev[ev.length - 1].total) >= 30 && {};
    },
    lines: [
      'El interés ha bajado con el tiempo: empezasteis más fuerte de lo que termináis.',
      'La curva de interés va cuesta abajo. Las primeras semanas brillaban más.',
    ],
  },
  {
    id: 'interest.gap',
    when: ({ r }) => {
      const l = lead(r.interest.total);
      return l.hi - l.lo >= 15 && { A: l.A, B: l.B, hi: l.hi, lo: l.lo, d: l.hi - l.lo };
    },
    lines: [
      '{A} ({hi}) pone más energía en el chat que {B} ({lo}). La balanza se inclina.',
      'Hay {d} puntos de diferencia en interés a favor de {A}. Se nota quién tira.',
      '{A} va con más ganas; {B}, más en modo ahorro de batería.',
    ],
  },
  {
    id: 'interest.bothHigh',
    when: ({ r }) => Math.min(...r.interest.total) >= 65 && { A: 0, B: 1 },
    lines: [
      'Interés alto por las dos partes. Esto se nota desde fuera.',
      '{A} y {B} tienen las ganas por encima de 65. Química de chat comprobada.',
    ],
  },
  {
    id: 'interest.low',
    when: ({ r }) => Math.max(...r.interest.total) < 40 && { A: 0, B: 1 },
    lines: [
      'Ninguna de las dos partes se desvive por el chat. Puede que lo vuestro vaya más en persona.',
      'Interés bajito por ambas partes. El chat no es vuestro sitio favorito.',
    ],
  },
  {
    id: 'interest.even',
    when: ({ r }) => ({ hi: Math.max(...r.interest.total), lo: Math.min(...r.interest.total) }),
    lines: [
      'Interés parejo: {hi} y {lo}. Nadie persigue, nadie huye.',
      'Os implicáis lo mismo en el chat. Equilibrio, por fin.',
    ],
  },
];

const seen: Situation[] = [
  {
    id: 'seen.none',
    when: ({ r }) => both(r.seen.counts) === 0 && {},
    lines: [
      'Nadie deja a nadie en visto. Aquí todo mensaje tiene respuesta.',
      'Cero vistos sospechosos. Un chat con modales.',
    ],
  },
  {
    id: 'seen.one',
    when: ({ r }) => {
      const l = lead(r.seen.counts);
      return l.hi >= 3 && l.hi >= l.lo * 2 && { A: l.A, B: l.B, n: n(l.hi) };
    },
    lines: [
      '{A} deja sin respuesta {n} mensajes que la pedían. {B} lo ha notado, seguro.',
      '{n} vistos de {A}. Leer, lee; contestar, ya es otra cosa.',
      '{A} tiene el doble check fácil y la respuesta difícil: {n} veces.',
    ],
  },
  {
    id: 'seen.even',
    when: ({ r }) => ({ n: n(r.seen.counts[0]), m: n(r.seen.counts[1]) }),
    lines: ['Os dejáis en visto más o menos lo mismo. Empate en despistes.', 'Vistos repartidos: {n} y {m}. Nadie puede tirar la primera piedra.'],
  },
];

const silence: Situation[] = [
  {
    id: 'silence.end',
    when: ({ r }) => {
      const s = r.silences.find((x) => x.atEnd && x.onlySpeaker !== null);
      return s && { A: s.onlySpeaker!, n: n(s.days) };
    },
    lines: [
      'El chat termina con {A} escribiendo sin respuesta durante {n} días. Ese silencio dice cosas.',
      'Últimos {n} días: solo escribe {A}. Al otro lado, nada.',
    ],
  },
  {
    id: 'silence.long',
    when: ({ r }) => {
      const d = Math.max(0, ...r.silences.map((s) => s.days));
      return d >= 30 && { n: n(d) };
    },
    lines: [
      'Hubo un silencio de {n} días. Lo importante es que volvisteis.',
      '{n} días sin hablar en algún momento. Las relaciones también tienen pausas.',
    ],
  },
  {
    id: 'silence.none',
    when: ({ r }) => r.silences.length === 0 && {},
    lines: [
      'Ni un silencio largo en todo el chat. Siempre hay algo que contar.',
      'Nunca pasáis muchos días sin escribiros. Constancia total.',
    ],
  },
  {
    id: 'silence.some',
    when: ({ r }) => ({ n: n(Math.max(...r.silences.map((s) => s.days))) }),
    lines: ['Algún silencio de {n} días, nada fuera de lo normal.', 'Pausas de vez en cuando, como en cualquier chat sano.'],
  },
];

const words: Situation[] = [
  {
    id: 'words.emoji',
    when: ({ r }) => {
      const l = lead([r.words.emojis[0][0]?.count ?? 0, r.words.emojis[1][0]?.count ?? 0]);
      return l.hi >= 5 && { A: l.A, e: r.words.emojis[l.A][0].word, n: n(l.hi) };
    },
    lines: [
      'El emoji de cabecera de {A} es {e}: {n} veces.',
      '{A} usa {e} como si fuera un signo de puntuación ({n} veces).',
      '{e} es la firma de {A}. Aparece {n} veces.',
    ],
  },
  {
    id: 'words.top',
    when: ({ r }) => {
      const l = lead([r.words.top[0][0]?.count ?? 0, r.words.top[1][0]?.count ?? 0]);
      return l.hi >= 3 && { A: l.A, w: r.words.top[l.A][0].word, n: n(l.hi) };
    },
    lines: [
      'La palabra favorita de {A}: «{w}». La dice {n} veces.',
      '«{w}» sale {n} veces de los dedos de {A}. Muletilla oficial.',
      '{A} no puede vivir sin decir «{w}». {n} veces lo demuestran.',
    ],
  },
  {
    id: 'words.none',
    when: () => ({}),
    lines: ['Ni un emoji destacable en todo el chat. Gente seria.', 'Pocas palabras repetidas y casi ningún emoji. Lo vuestro es la sobriedad.'],
  },
];

const shared: Situation[] = [
  {
    id: 'shared.many',
    when: ({ r }) => r.words.shared.length >= 5 && { n: n(r.words.shared.length), w: r.words.shared[0].word },
    lines: [
      'Tenéis {n} palabras y expresiones en común. Un idioma propio en construcción.',
      '«{w}» es tan vuestro que debería estar en el diccionario.',
      'Cuando los dos decís «{w}», os entendéis sin explicar nada más.',
    ],
  },
  {
    id: 'shared.some',
    when: ({ r }) => r.words.shared.length > 0 && { w: r.words.shared[0].word },
    lines: ['Pocas expresiones compartidas, pero «{w}» ya es cosa vuestra.', 'El inicio de un idioma común: «{w}».'],
  },
  {
    id: 'shared.none',
    when: () => ({}),
    lines: ['Todavía no tenéis un idioma propio. Dadle tiempo.', 'Cada cual habla a su manera: ninguna expresión compartida destaca.'],
  },
];

const reds = (r: Report) => r.flags.filter((f) => f.severity === 'red').length;
const flags: Situation[] = [
  {
    id: 'flags.many',
    when: ({ r }) => reds(r) >= 3 && { n: n(reds(r)) },
    lines: [
      '{n} red flags según los números. No es una sentencia, pero da para pensar.',
      'Bastantes señales en rojo. Mira la evidencia antes de sacar conclusiones.',
    ],
  },
  {
    id: 'flags.some',
    when: ({ r }) => reds(r) > 0 && {},
    lines: [
      'Alguna red flag suelta, nada que no se arregle hablando.',
      'Hay alguna alerta, pero el resto del chat compensa.',
    ],
  },
  {
    id: 'flags.green',
    when: ({ r }) => r.flags.some((f) => f.severity === 'green') && !r.flags.some((f) => f.severity === 'yellow') && {},
    lines: [
      'Cero red flags y alguna green flag. Esto pinta bien.',
      'Solo señales verdes. Que dure.',
    ],
  },
  {
    id: 'flags.neutral',
    when: () => ({}),
    lines: ['Sin alarmas rojas: un chat bastante tranquilo.', 'Nada grave a la vista. Algún matiz, y poco más.'],
  },
];

/* ----------------------- Risas, cariño y pullitas --------------------- */

const laughs: Situation[] = [
  {
    id: 'laughs.none',
    when: ({ r }) => both(r.lexicon.laughs) === 0 && {},
    lines: ['Ni un «jaja» en todo el chat. ¿Seguro que os caéis bien?', 'Cero risas escritas. O hay mucha seriedad o reís en persona.'],
  },
  {
    id: 'laughs.lead',
    when: ({ r }) => {
      const l = lead(r.lexicon.laughs);
      const lx = r.lexicon;
      return l.r >= 1.5 && { A: l.A, B: l.B, n: n(l.hi), m: n(l.lo), x: ratio(l.r), s: lx.laughStyle[l.A] ?? 'jaja', long: lx.longestLaugh[l.A] ?? lx.laughStyle[l.A] ?? 'jaja' };
    },
    lines: [
      '{A} se ríe {n} veces y su risa oficial es «{s}». {B}, {m}.',
      'Risómetro: {A} {n}, {B} {m}. A {A} le hace gracia casi todo.',
      '{A} es el público ideal: {n} risas. Si cuentas un chiste, que sea a {A}.',
    ],
  },
  {
    id: 'laughs.even',
    when: ({ r }) => ({ n: n(r.lexicon.laughs[0]), m: n(r.lexicon.laughs[1]) }),
    lines: [
      'Os reís lo mismo: {n} y {m}. Mismo sentido del humor, o los mismos memes.',
      'Empate en carcajadas. Os hacéis gracia mutuamente, que es mucho.',
      'Risas repartidas a partes iguales. Química humorística confirmada.',
    ],
  },
];

const affection: Situation[] = [
  {
    id: 'affection.none',
    when: ({ r }) => both(r.lexicon.affection) === 0 && {},
    lines: ['Ni un «te quiero» ni un ❤️. Cariño en modo silencioso.', 'Aquí el cariño no se escribe, se supone.'],
  },
  {
    id: 'affection.lead',
    when: ({ r }) => {
      const l = lead(r.lexicon.affection);
      return l.hi >= 5 && l.r >= 2 && { A: l.A, B: l.B, n: n(l.hi), m: n(l.lo), w: r.lexicon.topAffection[l.A][0]?.word ?? '❤️' };
    },
    lines: [
      '{A} reparte {n} muestras de cariño; {B}, {m}. Alguien es más de decirlo.',
      '{A} es de besos y corazones ({n}). {B} lo demuestra de otras formas… o no.',
      'Medidor de cariño escrito: {A} {n}, {B} {m}.',
    ],
  },
  {
    id: 'affection.even',
    when: ({ r }) => {
      const l = lead(r.lexicon.affection);
      return { n: n(r.lexicon.affection[0]), m: n(r.lexicon.affection[1]), w: r.lexicon.topAffection[l.A][0]?.word ?? '❤️' };
    },
    lines: [
      'Cariño repartido: {n} y {m}. Os lo decís los dos.',
      'Mismo nivel de ternura por las dos partes. Qué bonito, de verdad.',
      'Los dos soltáis el «{w}» con facilidad.',
    ],
  },
];

const insults: Situation[] = [
  {
    id: 'insults.none',
    when: ({ r }) => both(r.lexicon.insults) === 0 && {},
    lines: ['Ni una pulla. O hay mucha educación o aún falta confianza.', 'Cero insultos cariñosos. Respeto institucional.'],
  },
  {
    id: 'insults.some',
    when: ({ r }) => {
      const l = lead(r.lexicon.insults);
      return { A: l.A, B: l.B, n: n(l.hi), m: n(l.lo), w: r.lexicon.topInsults[l.A][0]?.word ?? 'tonto' };
    },
    lines: [
      '{A} suelta {n} insultos de confianza («{w}» es el favorito). Eso es cariño, en otro idioma.',
      '«{w}», dice {A}, y no lo dice en serio. {n} veces.',
      '{A} tiene la pulla fácil: {n} veces. Solo se pica así a quien se quiere.',
    ],
  },
];

const greetings: Situation[] = [
  {
    id: 'greetings.morning',
    when: ({ r }) => {
      const l = lead(r.lexicon.goodMorning);
      return l.hi >= 5 && l.r >= 2 && { A: l.A, B: l.B, n: n(l.hi) };
    },
    lines: [
      '{A} da los buenos días {n} veces. Mejor que cualquier despertador.',
      'El «buenos días» de este chat lo pone {A} ({n} veces).',
    ],
  },
  {
    id: 'greetings.night',
    when: ({ r }) => {
      const l = lead(r.lexicon.goodNight);
      return l.hi >= 5 && l.r >= 2 && { A: l.A, B: l.B, n: n(l.hi) };
    },
    lines: ['{A} da las buenas noches {n} veces. Lo último que lee {B} antes de dormir.', '{n} buenas noches de {A}. Ritual nocturno oficial.'],
  },
  {
    id: 'greetings.none',
    when: ({ r }) => both(r.lexicon.greetings) === 0 && {},
    lines: ['Aquí nadie dice hola: se entra directamente al tema.', 'Cero saludos. Vais al grano desde el primer mensaje.'],
  },
  {
    id: 'greetings.general',
    when: ({ r }) => {
      const l = lead(r.lexicon.greetings);
      return { A: l.A, B: l.B, n: n(l.hi), m: n(l.lo) };
    },
    lines: ['{A} saluda más ({n} saludos). La educación ante todo.', 'Saludos: {A} {n}, {B} {m}. Lo cortés no quita lo valiente.'],
  },
];

export const CAPTIONS: Record<CaptionKey, Situation[]> = {
  messages,
  response,
  first,
  initiator,
  media,
  longest,
  deleted,
  timeline,
  interest,
  seen,
  silence,
  words,
  shared,
  flags,
  laughs,
  affection,
  insults,
  greetings,
};

/* --------------------------- Lo que notamos --------------------------- */

const shareOfHours = (h: number[], from: number, to: number) => sum(h.slice(from, to)) / Math.max(1, sum(h));
const enough = (r: Report, a: AuthorIndex) => r.counts.messages[a] >= 40;

export const NOTICED: Record<NoticedKey, Situation[]> = {
  night: [
    {
      id: 'night',
      when: ({ r }) => {
        const s: Pair<number> = [shareOfHours(r.timeline.hours[0], 0, 6), shareOfHours(r.timeline.hours[1], 0, 6)];
        const l = lead(s);
        return l.hi >= 0.15 && enough(r, l.A) && { A: l.A, pct: Math.round(l.hi * 100) };
      },
      lines: [
        '{A} escribe el {pct} % de sus mensajes entre las 0 y las 6. Alma de búho.',
        'Las madrugadas son territorio de {A}: {pct} % de sus mensajes.',
        '{A} tiene horario de vampiro: mucho chat de madrugada.',
      ],
    },
  ],
  morning: [
    {
      id: 'morning',
      when: ({ r }) => {
        const s: Pair<number> = [shareOfHours(r.timeline.hours[0], 6, 9), shareOfHours(r.timeline.hours[1], 6, 9)];
        const l = lead(s);
        return l.hi >= 0.15 && enough(r, l.A) && { A: l.A, pct: Math.round(l.hi * 100) };
      },
      lines: [
        '{A} madruga para escribir: {pct} % de sus mensajes antes de las 9.',
        '{A} es de chat con el primer café.',
      ],
    },
  ],
  hour: [
    {
      id: 'hour',
      when: ({ r }) => {
        const h = r.timeline.hours[0].map((x, i) => x + r.timeline.hours[1][i]);
        return sum(h) >= 30 && { h: h.indexOf(Math.max(...h)) };
      },
      lines: [
        'Vuestra hora punta: las {h}:00. Ahí es cuando más os escribís.',
        'A las {h}:00 el chat echa humo.',
      ],
    },
  ],
  weekday: [
    {
      id: 'weekday',
      when: ({ r }) => {
        const w = r.timeline.weekdays[0].map((x, i) => x + r.timeline.weekdays[1][i]);
        return sum(w) >= 30 && { d: day(w.indexOf(Math.max(...w))) };
      },
      lines: [
        'Vuestro día favorito para hablar: los {d}.',
        'Los {d} el chat se anima más que nunca.',
        'Estadísticamente, los {d} son vuestros.',
      ],
    },
  ],
  weekdayQuiet: [
    {
      id: 'weekdayQuiet',
      when: ({ r }) => {
        const w = r.timeline.weekdays[0].map((x, i) => x + r.timeline.weekdays[1][i]);
        return sum(w) >= 100 && { d: day(w.indexOf(Math.min(...w))) };
      },
      lines: ['Los {d} el chat se queda más tranquilo.', 'Día más flojo: los {d}. Descanso semanal.'],
    },
  ],
  questions: [
    {
      id: 'questions',
      when: ({ r }) => {
        const l = lead(r.counts.questions);
        return l.hi >= 10 && l.r >= 1.4 && { A: l.A, B: l.B, n: n(l.hi), m: n(l.lo) };
      },
      lines: [
        '{A} pregunta más: {n} preguntas frente a {m}. Curiosidad no le falta.',
        '{A} es quien hace las preguntas en este chat ({n}).',
      ],
    },
  ],
  doubleText: [
    {
      id: 'doubleText',
      when: ({ r }) => {
        const f = r.flags.find((x) => x.id === 'double-text' && x.who !== null);
        return f && { A: f.who! };
      },
      lines: [
        '{A} manda mensajes en ráfaga. No espera respuesta para seguir.',
        'El doble mensaje es el deporte favorito de {A}.',
      ],
    },
  ],
  closer: [
    {
      id: 'closer',
      when: ({ r }) => {
        const l = lead(r.endings);
        return l.hi + l.lo >= 10 && l.share >= 0.6 && { A: l.A, pct: Math.round(l.share * 100) };
      },
      lines: [
        '{A} se queda con la última palabra el {pct} % de las veces.',
        'Las conversaciones las cierra {A} casi siempre.',
      ],
    },
  ],
  edits: [
    {
      id: 'edits',
      when: ({ r }) => {
        const l = lead(r.counts.edited);
        return l.hi >= 5 && { A: l.A, n: n(l.hi) };
      },
      lines: ['{A} edita sus mensajes {n} veces. Perfeccionismo de teclado.', '{n} mensajes editados por {A}. La errata no tiene sitio aquí.'],
    },
  ],
  calls: [
    {
      id: 'calls',
      when: ({ r }) => {
        const l = lead(r.counts.calls);
        return l.hi >= 3 && { A: l.A, n: n(l.hi) };
      },
      lines: ['{n} llamadas perdidas de {A}. Insistencia en modo analógico.', '{A} llama y nadie contesta: {n} llamadas perdidas.'],
    },
  ],
  peakDay: [
    {
      id: 'peakDay',
      when: ({ r }) =>
        r.timeline.peakDay &&
        r.timeline.peakDay.count >= 60 && {
          n: n(r.timeline.peakDay.count),
          date: formatDate(new Date(r.timeline.peakDay.date + 'T12:00:00').getTime(), { day: 'numeric', month: 'long', year: 'numeric' }),
        },
      lines: [
        'El {date} os escribisteis {n} mensajes. ¿Qué pasó ese día?',
        'Día récord: {n} mensajes el {date}. Algo gordo pasó.',
      ],
    },
  ],
  bigVolume: [
    {
      id: 'bigVolume',
      when: ({ r }) => r.meta.totalMessages >= 10_000 && { n: n(r.meta.totalMessages) },
      lines: ['{n} mensajes en total. Impresos, harían falta varias estanterías.', 'Lleváis {n} mensajes. Esto ya es una saga.'],
    },
  ],
  month: [
    {
      id: 'month',
      when: ({ r }) => {
        const m = r.timeline.mostActiveMonth;
        return m && r.timeline.months.length >= 3 && { m: formatMonth(m.month), n: n(both(m.counts)) };
      },
      lines: ['{m} fue vuestro mes estrella: {n} mensajes.', 'En {m} el chat no paró. Fue vuestro mes más intenso.'],
    },
  ],
  favWord: [
    {
      id: 'favWord',
      when: ({ r, me }) => {
        // La otra persona que la de la tarjeta de palabras: así no se repite el protagonista.
        const a: AuthorIndex = me === 0 ? 1 : 0;
        const w = r.words.top[a][0];
        return w && w.count >= 5 && { A: a, w: w.word };
      },
      lines: ['«{w}» es la palabra que más usa {A}.', 'Muletilla detectada en {A}: «{w}».'],
    },
  ],
};

/** Número total de redacciones distintas (para tests y documentación). */
export function bankSize(): number {
  const all = [...Object.values(CAPTIONS), ...Object.values(NOTICED)].flat();
  return all.reduce((s, x) => s + x.lines.length, 0);
}
