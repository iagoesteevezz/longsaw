/**
 * Tarjetas 8 ("te dejó en visto") y 9 (silencios / posible bloqueo).
 *
 * IMPORTANTE: el export NO incluye el estado de lectura (los ticks azules) ni
 * si alguien bloqueó a alguien. Todo esto son INFERENCIAS a partir de tiempos:
 *  - "Visto": alguien escribió algo que pedía respuesta (una pregunta, o
 *    insistió con varios mensajes) y la otra persona tardó más del umbral
 *    (24 h por defecto) en contestar, o nunca contestó.
 *  - "Silencio unilateral": una persona sigue escribiendo durante ≥ N días
 *    (7 por defecto) sin ninguna respuesta. Si el chat TERMINA así, es la señal
 *    más fuerte compatible con un bloqueo… o con que simplemente dejó de contestar.
 * La UI lo etiqueta siempre como estimación.
 */
import type { AuthorIndex, Message, Pair, Report, SeenEvent, Silence } from '../types';
import type { Ctx } from './context';
import { DAY, HOUR, excerpt, isQuestion, other, pair } from './util';

/** Rachas de mensajes consecutivos del mismo autor. */
export interface Run {
  author: AuthorIndex;
  start: number; // índice en ctx.msgs
  end: number;
}

export function runs(msgs: Message[]): Run[] {
  const out: Run[] = [];
  for (let i = 0; i < msgs.length; i++) {
    const last = out[out.length - 1];
    if (last && last.author === msgs[i].author) last.end = i;
    else out.push({ author: msgs[i].author as AuthorIndex, start: i, end: i });
  }
  return out;
}

export function seen(ctx: Ctx, rs: Run[]): Report['seen'] {
  const counts = pair(() => 0); // counts[p] = veces que p dejó en visto
  const events: SeenEvent[] = [];
  for (let k = 0; k < rs.length; k++) {
    const r = rs[k];
    const slice = ctx.msgs.slice(r.start, r.end + 1);
    const first = slice[0];
    const last = slice[slice.length - 1];
    const asked = slice.some((m) => m.kind === 'text' && isQuestion(m.text));
    const insisted = slice.length >= 2 && last.ts - first.ts >= HOUR;
    if (!asked && !insisted) continue; // no pedía respuesta: no es "visto"
    const next = rs[k + 1] ? ctx.msgs[rs[k + 1].start] : null;
    const waited = next ? next.ts - first.ts : null;
    if (waited !== null && waited < ctx.seenMs) continue;
    // El último mensaje del chat sin respuesta: solo cuenta si ya pasó el umbral
    // respecto al final del export (si no, puede que simplemente se exportó pronto).
    if (waited === null) {
      const end = ctx.msgs[ctx.msgs.length - 1].ts;
      if (end - first.ts < ctx.seenMs) continue;
    }
    const ignoredBy = other(r.author);
    counts[ignoredBy]++;
    const firstQuestion = slice.find((m) => m.kind === 'text' && isQuestion(m.text)) ?? first;
    events.push({ sender: r.author, waitedMs: waited, message: excerpt(firstQuestion) });
  }
  const byWait = (e: SeenEvent) => e.waitedMs ?? Number.MAX_SAFE_INTEGER;
  events.sort((a, b) => byWait(b) - byWait(a));
  const worst: Pair<SeenEvent | null> = [
    events.find((e) => e.sender === 1) ?? null, // peor visto QUE DIO la persona 0 (a mensajes de 1)
    events.find((e) => e.sender === 0) ?? null,
  ];
  return { counts, worst, examples: events.slice(0, 6) };
}

export function silences(ctx: Ctx, rs: Run[]): Silence[] {
  const out: Silence[] = [];
  const endTs = ctx.msgs.length ? ctx.msgs[ctx.msgs.length - 1].ts : 0;
  for (let k = 0; k < rs.length; k++) {
    const r = rs[k];
    const first = ctx.msgs[r.start];
    const last = ctx.msgs[r.end];
    const next = rs[k + 1] ? ctx.msgs[rs[k + 1].start] : null;
    const prevMsg = r.start > 0 ? ctx.msgs[r.start - 1] : null;

    // 1) Unilateral: la persona escribe varias veces durante ≥ N días sin respuesta.
    const waitEnd = next ? next.ts : endTs;
    const insisted = r.end > r.start && last.ts - first.ts >= HOUR;
    if (insisted && waitEnd - first.ts >= ctx.silenceMs) {
      out.push({
        startTs: first.ts,
        endTs: next ? next.ts : null,
        days: Math.round((waitEnd - first.ts) / DAY),
        onlySpeaker: r.author,
        unansweredMessages: r.end - r.start + 1,
        atEnd: !next,
        lastBefore: prevMsg ? excerpt(prevMsg) : null,
      });
      continue;
    }
    // 2) Mutuo: hueco largo entre dos mensajes consecutivos (nadie escribe).
    for (let i = r.start; i <= r.end; i++) {
      const a = ctx.msgs[i];
      const b = ctx.msgs[i + 1];
      if (b && b.ts - a.ts >= ctx.silenceMs) {
        out.push({
          startTs: a.ts,
          endTs: b.ts,
          days: Math.round((b.ts - a.ts) / DAY),
          onlySpeaker: null,
          unansweredMessages: 0,
          atEnd: false,
          lastBefore: excerpt(a),
        });
      }
    }
  }
  // Los más relevantes primero: el final del chat y luego por duración.
  out.sort((a, b) => Number(b.atEnd) - Number(a.atEnd) || b.days - a.days);
  return out.slice(0, 12);
}
