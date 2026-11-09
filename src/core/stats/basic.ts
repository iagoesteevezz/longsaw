/**
 * Tarjetas 1-6: mensajes, tiempos de respuesta, primer mensaje, quién inicia,
 * mensaje más largo y mensajes eliminados.
 */
import type { Excerpt, Message, Pair, Report, ResponseStats } from '../types';
import type { Ctx } from './context';
import { excerpt, mean, median, pair, percentile, wordCount } from './util';

export function basicCounts(ctx: Ctx): Report['counts'] & { deleted: Pair<number> } {
  const messages = pair(() => 0);
  const words = pair(() => 0);
  const media = pair(() => 0);
  const calls = pair(() => 0);
  const edited = pair(() => 0);
  const deleted = pair(() => 0);
  for (const m of ctx.msgs) {
    const a = m.author!;
    messages[a]++;
    if (m.kind === 'text') words[a] += wordCount(m.text);
    if (m.kind === 'media') media[a]++;
    if (m.kind === 'call') calls[a]++;
    if (m.kind === 'deleted') deleted[a]++;
    if (m.edited) edited[a]++;
  }
  return { messages, words, media, calls, edited, deleted };
}

export function responseStats(ctx: Ctx): Pair<ResponseStats> {
  const times = pair<number[]>(() => []);
  for (const r of ctx.replies) times[r.author].push(r.ms);
  return times.map((t) => ({
    count: t.length,
    meanMs: mean(t),
    // La mediana es la cifra "honesta": 3 respuestas de 5 h no la mueven.
    medianMs: median(t),
    p90Ms: percentile(t, 0.9),
  })) as Pair<ResponseStats>;
}

export function firstMessage(ctx: Ctx): Excerpt | null {
  const m = ctx.msgs.find((x) => x.kind === 'text') ?? ctx.msgs[0];
  return m ? excerpt(m) : null;
}

export function initiations(ctx: Ctx) {
  const total = pair(() => 0);
  const endings = pair(() => 0);
  for (const s of ctx.sessions) {
    total[s.initiator]++;
    endings[s.closer]++;
  }
  return { total, sessions: ctx.sessions.length, endings };
}

export function longest(ctx: Ctx): Pair<Excerpt | null> {
  const best: Pair<Message | null> = [null, null];
  for (const m of ctx.msgs) {
    if (m.kind !== 'text') continue;
    const cur = best[m.author!];
    if (!cur || m.text.length > cur.text.length) best[m.author!] = m;
  }
  // Para el más largo mostramos más texto (la gracia es ver lo largo que es).
  return best.map((m) => (m ? excerpt(m, 600) : null)) as Pair<Excerpt | null>;
}
