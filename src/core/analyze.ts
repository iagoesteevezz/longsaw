/**
 * Orquestador: ParsedChat + opciones → Report.
 *
 * El informe resultante solo contiene agregados y EXTRACTOS cortos (evidencias),
 * nunca el chat completo. Es lo único que sale del Worker al hilo principal.
 */
import { LOCALES } from './locales';
import type { AnalysisOptions, ParsedChat, Report } from './types';
import { buildContext } from './stats/context';
import { basicCounts, firstMessage, initiations, longest, responseStats } from './stats/basic';
import { timeline } from './stats/timeline';
import { words } from './stats/words';
import { runs, seen, silences } from './stats/silence';
import { interest } from './stats/interest';
import { flags } from './stats/flags';
import { ambiguous } from './stats/ambiguous';
import { insights } from './stats/insights';
import { DAY } from './stats/util';

export type ProgressFn = (step: 'stats' | 'patterns' | 'report', pct: number) => void;

export function analyze(chat: ParsedChat, opts: AnalysisOptions, onProgress: ProgressFn = () => {}): Report {
  const pack = LOCALES[chat.locale];
  const ctx = buildContext(chat, opts, pack);
  const msgs = ctx.msgs;
  if (msgs.length === 0) throw new Error('No hay mensajes que analizar.');

  onProgress('stats', 10);
  const { deleted, ...counts } = basicCounts(ctx);
  const responses = responseStats(ctx);
  const init = initiations(ctx);
  onProgress('stats', 40);
  const tl = timeline(ctx);
  const w = words(ctx);
  onProgress('patterns', 60);
  const rs = runs(msgs);
  const seenRes = seen(ctx, rs);
  const sil = silences(ctx, rs);
  const interestRes = interest(ctx);
  onProgress('patterns', 80);
  const fl = flags({
    ctx,
    rs,
    counts,
    deleted,
    init,
    responses,
    seen: seenRes,
    silences: sil,
    timeline: tl,
    relation: opts.relation,
  });
  const amb = ambiguous(ctx);
  const ins = insights({ ctx, interest: interestRes, responses, init, counts, deleted, seen: seenRes, timeline: tl, flags: fl });
  onProgress('report', 95);

  const firstTs = msgs[0].ts;
  const lastTs = msgs[msgs.length - 1].ts;
  return {
    meta: {
      participants: [chat.participants[0].name, chat.participants[1].name],
      locale: chat.locale,
      platform: chat.platform,
      totalMessages: msgs.length,
      firstTs,
      lastTs,
      durationDays: Math.max(1, Math.round((lastTs - firstTs) / DAY)),
      warnings: chat.warnings,
    },
    counts,
    responses,
    firstMessage: firstMessage(ctx),
    initiations: { total: init.total, sessions: init.sessions },
    endings: init.endings,
    longest: longest(ctx),
    deleted,
    interest: interestRes,
    seen: seenRes,
    silences: sil,
    words: w,
    timeline: tl,
    flags: fl,
    ambiguous: amb,
    insights: ins,
  };
}
