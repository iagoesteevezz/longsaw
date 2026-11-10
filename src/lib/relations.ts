/**
 * Adaptación del informe al tipo de relación: etiquetas, títulos, tono y qué
 * tarjetas se muestran. Centralizado aquí para que los componentes de
 * tarjeta no tengan `if (relation === ...)` repartidos por todas partes.
 */
import type { Relation } from '../core/types';

export const RELATIONS: { id: Relation; label: string; emoji: string }[] = [
  { id: 'amistad', label: 'Amigo/a', emoji: '🫶' },
  { id: 'pareja', label: 'Pareja', emoji: '💞' },
  { id: 'ex', label: 'Ex', emoji: '💔' },
  { id: 'ligue', label: 'Ligue', emoji: '😏' },
  { id: 'familia', label: 'Familiar', emoji: '🏡' },
  { id: 'trabajo', label: 'Compañero/a', emoji: '💼' },
  { id: 'otro', label: 'Otro', emoji: '✨' },
];

export type CardId =
  | 'messages'
  | 'response'
  | 'first'
  | 'initiator'
  | 'media'
  | 'lexicon'
  | 'longest'
  | 'deleted'
  | 'interest'
  | 'seen'
  | 'silence'
  | 'words'
  | 'shared'
  | 'timeline'
  | 'flags'
  | 'style'
  | 'meaning'
  | 'move';

const romantic = (r: Relation) => r === 'pareja' || r === 'ex' || r === 'ligue';

/** Orden del informe (de arriba abajo). */
export const CARD_ORDER: CardId[] = [
  'messages', 'response', 'first', 'initiator', 'media', 'lexicon', 'longest', 'deleted', 'timeline',
  'interest', 'seen', 'silence', 'words', 'shared', 'flags', 'style', 'meaning', 'move',
];

/** Tarjetas que no aportan en cierta relación. */
export function isCardVisible(id: CardId, r: Relation): boolean {
  if (r === 'trabajo' && (id === 'shared' || id === 'meaning')) return false;
  return true;
}

type Copy = { title: string; kicker: string };

export function cardCopy(id: CardId, r: Relation): Copy {
  const rom = romantic(r);
  const table: Record<CardId, Copy> = {
    messages: { kicker: 'Mensajes', title: '¿Quién habla más?' },
    response: { kicker: 'Tiempo de respuesta', title: rom ? '¿Quién está más pendiente del móvil?' : '¿Quién contesta antes?' },
    first: { kicker: 'El primer mensaje', title: 'Así empezó todo' },
    initiator: { kicker: 'Quién inicia', title: rom ? '¿Quién escribe primero?' : '¿Quién saca la conversación?' },
    media: { kicker: 'Fotos, audios y stickers', title: 'Lo que no cabe en palabras' },
    lexicon: { kicker: 'Risas, cariño y pullitas', title: r === 'trabajo' ? 'El tono del chat' : 'Cómo os habláis' },
    longest: { kicker: 'Mensaje más largo', title: 'El testamento' },
    deleted: { kicker: 'Mensajes eliminados', title: 'Lo que nunca sabremos' },
    timeline: { kicker: 'Cómo fue', title: 'Vuestra historia en el chat' },
    interest: {
      kicker: 'Nivel de interés',
      title:
        r === 'ligue' ? '¿Le gustas?' : r === 'ex' ? '¿Quién sigue más enganchado?' : r === 'pareja' ? '¿Quién pone más?' : r === 'familia' ? '¿Quién está más pendiente?' : r === 'trabajo' ? 'Implicación en el chat' : '¿Quién tiene más ganas de hablar?',
    },
    seen: { kicker: r === 'trabajo' ? 'Mensajes sin respuesta' : 'Te dejó en visto', title: 'Preguntas al vacío' },
    silence: {
      kicker: rom ? 'Posible bloqueo' : 'Silencios largos',
      title: rom ? '¿Te bloqueó o solo desapareció?' : 'Las pausas más largas',
    },
    words: { kicker: 'Palabras y emojis', title: 'Lo que más decís' },
    shared: { kicker: 'Vuestro idioma', title: 'Cosas que solo decís vosotros' },
    flags: { kicker: 'Red flags y patrones', title: 'Lo que dicen los números' },
    style: {
      kicker: rom ? 'Estilo de apego (versión ligera)' : 'Estilo de comunicación',
      title: 'Lo que notamos',
    },
    meaning: { kicker: 'Lo que quiere decir', title: 'Traducción simultánea' },
    move: { kicker: 'The move', title: '¿Y ahora qué?' },
  };
  return table[id];
}

export const CARD_COLOR: Record<CardId, string> = {
  messages: 'bg-card-mint',
  response: 'bg-card-blue',
  first: 'bg-card-yellow',
  initiator: 'bg-card-green',
  media: 'bg-card-sky',
  lexicon: 'bg-card-pink',
  longest: 'bg-card-lavender',
  deleted: 'bg-card-peach',
  timeline: 'bg-card-cream',
  interest: 'bg-card-mint',
  seen: 'bg-card-blue',
  silence: 'bg-card-stone',
  words: 'bg-card-lilac',
  shared: 'bg-card-coral',
  flags: 'bg-card-red',
  style: 'bg-card-sage',
  meaning: 'bg-card-periwinkle',
  move: 'bg-card-yellow',
};
