/**
 * Contexto precomputado que comparten todos los módulos de estadísticas.
 *
 * DECISIÓN: calcular UNA vez lo que usan casi todos (mensajes con autor,
 * sesiones, respuestas) y pasarlo a cada módulo. Evita recorrer 100k mensajes
 * diez veces y garantiza que todas las tarjetas usan la MISMA definición de
 * "conversación" y de "respuesta" (si no, los números se contradirían entre sí).
 */
import type { LocalePack } from '../locales/types';
import type { AnalysisOptions, AuthorIndex, Message, ParsedChat } from '../types';
import { HOUR, DAY } from './util';

export interface Session {
  /** Índices en `msgs` (no ids). */
  start: number;
  end: number;
  initiator: AuthorIndex;
  closer: AuthorIndex;
}

export interface Reply {
  /** Índice en `msgs` del mensaje que responde. */
  index: number;
  author: AuthorIndex; // quien responde
  ms: number; // cuánto tardó
}

export interface Ctx {
  chat: ParsedChat;
  opts: AnalysisOptions;
  pack: LocalePack;
  /** Mensajes con autor (sin sistema), en orden. */
  msgs: Message[];
  sessions: Session[];
  replies: Reply[];
  gapMs: number;
  seenMs: number;
  silenceMs: number;
}

export function buildContext(chat: ParsedChat, opts: AnalysisOptions, pack: LocalePack): Ctx {
  const msgs = chat.messages.filter((m) => m.author !== null);
  const gapMs = opts.sessionGapHours * HOUR;
  const sessions: Session[] = [];
  const replies: Reply[] = [];

  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    const prev = msgs[i - 1];
    const newSession = !prev || m.ts - prev.ts >= gapMs;
    if (newSession) {
      if (sessions.length) {
        const s = sessions[sessions.length - 1];
        s.end = i - 1;
        s.closer = msgs[i - 1].author as AuthorIndex;
      }
      sessions.push({ start: i, end: i, initiator: m.author as AuthorIndex, closer: m.author as AuthorIndex });
    } else if (prev.author !== m.author) {
      // Una "respuesta" = cambio de autor dentro de la misma conversación.
      // Medimos desde el ÚLTIMO mensaje del otro: es lo que el usuario percibe
      // ("le escribí y tardó 20 min"). Las respuestas tras > umbral no cuentan
      // como respuesta lenta sino como nueva conversación (iniciativa).
      replies.push({ index: i, author: m.author as AuthorIndex, ms: m.ts - prev.ts });
    }
  }
  if (sessions.length) {
    const s = sessions[sessions.length - 1];
    s.end = msgs.length - 1;
    s.closer = msgs[msgs.length - 1].author as AuthorIndex;
  }

  return {
    chat,
    opts,
    pack,
    msgs,
    sessions,
    replies,
    gapMs,
    seenMs: opts.seenThresholdHours * HOUR,
    silenceMs: opts.silenceDays * DAY,
  };
}
