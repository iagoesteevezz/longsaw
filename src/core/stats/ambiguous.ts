/**
 * Tarjeta 15 "Lo que quiere decir de verdad" (versión por reglas).
 *
 * Buscamos respuestas cortas típicamente ambiguas ("ok", "como quieras",
 * "ya veremos"…) que llegan DESPUÉS de un mensaje con contenido de la otra
 * persona, o que cierran una conversación. Son las que la gente relee a las
 * 2 de la mañana. La lectura por reglas es genérica; con IA (opt-in) se
 * reinterpreta con el contexto anonimizado.
 */
import { ALL_LOCALES } from '../locales';
import type { AmbiguousMessage } from '../types';
import type { Ctx } from './context';
import { excerpt, wordCount } from './util';

export function ambiguous(ctx: Ctx, limit = 6): AmbiguousMessage[] {
  const packs = [ctx.pack, ...ALL_LOCALES.filter((p) => p !== ctx.pack)];
  const closers = new Set(ctx.sessions.map((s) => s.end));
  const found: (AmbiguousMessage & { weight: number })[] = [];
  const perPattern = new Map<string, number>();

  for (let i = 1; i < ctx.msgs.length; i++) {
    const m = ctx.msgs[i];
    // Solo mensajes de la OTRA persona: la tarjeta interpreta lo que te dicen a ti.
    if (m.author === ctx.opts.me || m.kind !== 'text' || m.text.length > 40) continue;
    const norm = m.text.toLowerCase().trim().replace(/[!.…]+$/u, '');
    let hit: (typeof packs)[number]['ambiguous'][number] | undefined;
    for (const p of packs) {
      hit = p.ambiguous.find((a) => a.re.test(norm));
      if (hit) break;
    }
    if (!hit) continue;
    const prev = ctx.msgs[i - 1];
    const prevWords = prev.author !== m.author && prev.kind === 'text' ? wordCount(prev.text) : 0;
    const closes = closers.has(i);
    if (prevWords < 10 && !closes) continue; // sin contexto que lo haga "ambiguo"
    const used = perPattern.get(hit.pattern) ?? 0;
    if (used >= 1) continue; // variedad: un ejemplo por patrón
    perPattern.set(hit.pattern, used + 1);
    found.push({
      message: excerpt(m),
      context: prevWords ? excerpt(prev, 260) : null,
      pattern: hit.pattern,
      reading: closes
        ? `${hit.reading} Además, fue lo último que se dijo en esa conversación.`
        : hit.reading,
      weight: prevWords + (closes ? 15 : 0),
    });
  }
  return found
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit)
    .map(({ weight: _w, ...rest }) => rest);
}
