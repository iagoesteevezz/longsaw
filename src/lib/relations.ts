/**
 * Relaciones y tarjetas: orden, colores y qué tarjeta se muestra en cada
 * relación. Las etiquetas y los títulos de cada idioma están en src/i18n.
 */
import type { Relation } from '../core/types';

/** Orden y emoji de cada relación. Las etiquetas están en el diccionario (t.relations). */
export const RELATIONS: { id: Relation; emoji: string }[] = [
  { id: 'amistad', emoji: '🫶' },
  { id: 'pareja', emoji: '💞' },
  { id: 'ex', emoji: '💔' },
  { id: 'ligue', emoji: '😏' },
  { id: 'familia', emoji: '🏡' },
  { id: 'trabajo', emoji: '💼' },
  { id: 'otro', emoji: '✨' },
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
