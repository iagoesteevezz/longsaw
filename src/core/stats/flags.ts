/**
 * Tarjeta 13: red flags (y green flags) por REGLAS, cada una con evidencia.
 *
 * Convenciones:
 *  - Los textos usan los marcadores {0} y {1} en lugar de nombres. La UI los
 *    sustituye por el nombre/alias (o "Tú"/"Alguien" en modo compartir) y el
 *    anonimizador por "Persona A/B". Así el core nunca decide cómo se muestra
 *    a nadie y no hay nombres "horneados" en el informe.
 *  - Cada regla exige un mínimo de datos para dispararse (evita flags absurdas
 *    en chats de 20 mensajes).
 *  - Umbrales en constantes con nombre para poder ajustarlos y testearlos.
 */
import type { AuthorIndex, Excerpt, Flag, Pair, Relation, Report } from '../types';
import type { Ctx } from './context';
import type { Run } from './silence';
import { HOUR, excerpt, isQuestion, monthKey, other, wordCount } from './util';
import { dec1, formatDuration } from '../format';
import { tr } from '../i18n';

const T = {
  minSessions: 10,
  initiativeYellow: 0.7,
  initiativeRed: 0.8,
  replyRatioYellow: 3,
  replyRatioRed: 6,
  replyMinSlowMs: 15 * 60_000,
  shrinkDrop: 0.4,
  shrinkMinMsgs: 25,
  lateNightShare: 0.25,
  monthDrop: 0.6,
  seenMin: 5,
  doubleTextMin: 5,
  deletedShare: 0.05,
};

const P = (a: AuthorIndex) => `{${a}}`;

interface Inputs {
  ctx: Ctx;
  rs: Run[];
  counts: Report['counts'];
  deleted: Pair<number>;
  init: { total: Pair<number>; sessions: number };
  responses: Report['responses'];
  seen: Report['seen'];
  silences: Report['silences'];
  timeline: Report['timeline'];
  relation: Relation;
}

export function flags(i: Inputs): Flag[] {
  const { ctx } = i;
  const out: Flag[] = [];
  const msgs = ctx.msgs;
  const n = msgs.length;

  /* 1. Desequilibrio de iniciativa */
  if (i.init.sessions >= T.minSessions) {
    const share0 = i.init.total[0] / i.init.sessions;
    const top: AuthorIndex = share0 >= 0.5 ? 0 : 1;
    const share = Math.max(share0, 1 - share0);
    if (share >= T.initiativeYellow) {
      const examples = ctx.sessions
        .filter((s) => s.initiator === top)
        .slice(-3)
        .map((s) => excerpt(msgs[s.start]));
      out.push({
        id: 'initiative',
        severity: share >= T.initiativeRed ? 'red' : 'yellow',
        title: tr({ es: 'La iniciativa va en una sola dirección', en: 'Initiative only goes one way' }),
        who: other(top),
        detail: tr({
          es: `${P(top)} empieza ${Math.round(share * 100)} de cada 100 conversaciones. ${P(other(top))} casi nunca abre la conversación.`,
          en: `${P(top)} starts ${Math.round(share * 100)} out of every 100 conversations. ${P(other(top))} almost never opens one.`,
        }),
        metric: tr({ es: `${i.init.total[top]} de ${i.init.sessions} inicios`, en: `${i.init.total[top]} of ${i.init.sessions} starts` }),
        evidence: examples,
      });
    } else if (share <= 0.6) {
      out.push({
        id: 'initiative-balanced',
        severity: 'green',
        title: tr({ es: 'Iniciativa equilibrada', en: 'Balanced initiative' }),
        who: null,
        detail: tr({
          es: 'Los dos abrís conversación más o menos lo mismo. Nadie tira solo del carro.',
          en: 'You both start conversations about equally. Nobody is pulling alone.',
        }),
        metric: tr({ es: `${i.init.total[0]} vs ${i.init.total[1]} inicios`, en: `${i.init.total[0]} vs ${i.init.total[1]} starts` }),
        evidence: [],
      });
    }
  }

  /* 2. Asimetría en tiempos de respuesta */
  const [m0, m1] = i.responses.map((r) => r.medianMs);
  if (m0 !== null && m1 !== null && i.responses[0].count >= 10 && i.responses[1].count >= 10) {
    const slow: AuthorIndex = m0 > m1 ? 0 : 1;
    const ratio = Math.max(m0, m1) / Math.max(1, Math.min(m0, m1));
    if (ratio >= T.replyRatioYellow && Math.max(m0, m1) >= T.replyMinSlowMs) {
      const slowest = ctx.replies
        .filter((r) => r.author === slow)
        .sort((a, b) => b.ms - a.ms)
        .slice(0, 3)
        .map((r) => excerpt(msgs[r.index]));
      out.push({
        id: 'reply-gap',
        severity: ratio >= T.replyRatioRed ? 'red' : 'yellow',
        title: tr({ es: 'Uno contesta al momento, el otro cuando puede', en: 'One replies instantly, the other whenever' }),
        who: slow,
        detail: tr({
          es: `${P(slow)} tarda ${dec1(ratio)} veces más en responder (mediana ${formatDuration(Math.max(m0, m1))} frente a ${formatDuration(Math.min(m0, m1))}).`,
          en: `${P(slow)} takes ${dec1(ratio)} times longer to reply (median ${formatDuration(Math.max(m0, m1))} vs ${formatDuration(Math.min(m0, m1))}).`,
        }),
        metric: tr({ es: `mediana ${formatDuration(m0)} vs ${formatDuration(m1)}`, en: `median ${formatDuration(m0)} vs ${formatDuration(m1)}` }),
        evidence: slowest,
      });
    } else if (Math.max(m0, m1) < 10 * 60_000) {
      out.push({
        id: 'fast-both',
        severity: 'green',
        title: tr({ es: 'Respuestas rápidas por las dos partes', en: 'Quick replies on both sides' }),
        who: null,
        detail: tr({ es: 'Los dos respondéis en minutos. Hay ganas de hablar.', en: 'You both reply within minutes. There’s a real wish to talk.' }),
        metric: tr({ es: `mediana ${formatDuration(m0)} y ${formatDuration(m1)}`, en: `median ${formatDuration(m0)} and ${formatDuration(m1)}` }),
        evidence: [],
      });
    }
  }

  /* 3. Mensajes cada vez más cortos (primer cuarto vs último cuarto del chat) */
  if (n >= 200) {
    for (const a of [0, 1] as AuthorIndex[]) {
      const seg = (from: number, to: number) =>
        msgs.slice(from, to).filter((m) => m.author === a && m.kind === 'text');
      const early = seg(0, Math.floor(n / 4));
      const late = seg(Math.floor((n * 3) / 4), n);
      if (early.length < T.shrinkMinMsgs || late.length < T.shrinkMinMsgs) continue;
      const avg = (xs: typeof early) => xs.reduce((s, m) => s + wordCount(m.text), 0) / xs.length;
      const e = avg(early);
      const l = avg(late);
      if (e > 0 && (e - l) / e >= T.shrinkDrop) {
        const longEarly = [...early].sort((x, y) => y.text.length - x.text.length)[0];
        const shortLate = late.filter((m) => wordCount(m.text) <= 2).slice(-2);
        out.push({
          id: `shrinking-${a}`,
          severity: 'yellow',
          title: tr({ es: 'Mensajes cada vez más cortos', en: 'Messages getting shorter' }),
          who: a,
          detail: tr({
            es: `${P(a)} ha pasado de ${dec1(e)} a ${dec1(l)} palabras por mensaje entre el principio y el final del chat.`,
            en: `${P(a)} went from ${dec1(e)} to ${dec1(l)} words per message between the start and the end of the chat.`,
          }),
          metric: tr({ es: `−${Math.round(((e - l) / e) * 100)} % de longitud`, en: `−${Math.round(((e - l) / e) * 100)}% length` }),
          evidence: [excerpt(longEarly, 160), ...shortLate.map((m) => excerpt(m))],
        });
      }
    }
  }

  /* 4. Horarios de madrugada (00:00-05:59) */
  for (const a of [0, 1] as AuthorIndex[]) {
    const h = i.timeline.hours[a];
    const total = h.reduce((s, x) => s + x, 0);
    const late = h.slice(0, 6).reduce((s, x) => s + x, 0);
    if (total >= 100 && late / total >= T.lateNightShare) {
      const ex = msgs
        .filter((m) => m.author === a && m.kind === 'text' && new Date(m.ts).getHours() < 5)
        .slice(-2)
        .map((m) => excerpt(m));
      const romantic = ['ligue', 'ex', 'pareja'].includes(i.relation);
      out.push({
        id: `late-${a}`,
        severity: romantic && i.relation !== 'pareja' ? 'red' : 'yellow',
        title: romantic
          ? tr({ es: 'Mucha actividad de madrugada', en: 'Lots of late-night activity' })
          : tr({ es: 'Conversaciones a deshoras', en: 'Conversations at odd hours' }),
        who: a,
        detail: romantic
          ? tr({
              es: `${Math.round((late / total) * 100)} % de los mensajes de ${P(a)} son entre las 00:00 y las 06:00. Ojo con el patrón "solo me escribe de noche".`,
              en: `${Math.round((late / total) * 100)}% of messages from ${P(a)} are between midnight and 6 am. Watch out for the "only texts me at night" pattern.`,
            })
          : tr({
              es: `${Math.round((late / total) * 100)} % de los mensajes de ${P(a)} son de madrugada.`,
              en: `${Math.round((late / total) * 100)}% of messages from ${P(a)} are sent in the small hours.`,
            }),
        metric: tr({ es: `${late} mensajes de madrugada`, en: `${late} late-night messages` }),
        evidence: ex,
      });
    }
  }

  /* 5. Cambio brusco de actividad (mes a mes) */
  const months = i.timeline.months;
  const tot = (k: number) => months[k].counts[0] + months[k].counts[1];
  const avgMonth = months.length ? n / months.length : 0;
  for (let k = 1; k < months.length; k++) {
    const prev = tot(k - 1);
    const cur = tot(k);
    if (prev >= Math.max(60, avgMonth) && (prev - cur) / prev >= T.monthDrop) {
      const lastOfPrev = msgs.filter((m) => monthKey(m.ts) === months[k - 1].month && m.kind === 'text').slice(-3);
      out.push({
        id: `drop-${months[k].month}`,
        severity: 'yellow',
        title: tr({ es: 'Bajón brusco de actividad', en: 'Sudden drop in activity' }),
        who: null,
        detail: tr({
          es: `De ${prev} mensajes en un mes a ${cur} al mes siguiente (${months[k - 1].month} → ${months[k].month}). Algo cambió ahí.`,
          en: `From ${prev} messages in one month to ${cur} the next (${months[k - 1].month} → ${months[k].month}). Something changed there.`,
        }),
        metric: `−${Math.round(((prev - cur) / prev) * 100)} %`,
        evidence: lastOfPrev.map((m) => excerpt(m)),
      });
      break; // solo el primero: con uno basta para la tarjeta
    }
  }

  /* 6. Vistos asimétricos */
  const [s0, s1] = i.seen.counts;
  const seenTop: AuthorIndex = s0 >= s1 ? 0 : 1;
  if (Math.max(s0, s1) >= T.seenMin && Math.max(s0, s1) >= 2 * Math.max(1, Math.min(s0, s1))) {
    out.push({
      id: 'seen',
      severity: Math.max(s0, s1) >= 3 * Math.max(1, Math.min(s0, s1)) ? 'red' : 'yellow',
      title: tr({ es: 'Preguntas que se quedan sin respuesta', en: 'Questions left unanswered' }),
      who: seenTop,
      detail: tr({
        es: `${P(seenTop)} deja sin contestar más de ${ctx.opts.seenThresholdHours} h mensajes que pedían respuesta ${Math.max(s0, s1)} veces (frente a ${Math.min(s0, s1)}). Estimación: el export no incluye los "leídos".`,
        en: `${P(seenTop)} leaves messages that needed an answer unanswered for over ${ctx.opts.seenThresholdHours} h, ${Math.max(s0, s1)} times (vs ${Math.min(s0, s1)}). An estimate: the export doesn’t include read receipts.`,
      }),
      metric: tr({ es: `${s0} vs ${s1} "vistos" estimados`, en: `${s0} vs ${s1} estimated "left on read"` }),
      evidence: i.seen.examples.filter((e) => e.sender === other(seenTop)).slice(0, 3).map((e) => e.message),
    });
  }

  /* 7. Silencio unilateral al final del chat */
  const endSilence = i.silences.find((s) => s.atEnd && s.onlySpeaker !== null);
  if (endSilence) {
    const sp = endSilence.onlySpeaker!;
    const unanswered = msgs.slice(-endSilence.unansweredMessages).slice(-3).map((m) => excerpt(m));
    out.push({
      id: 'end-silence',
      severity: 'red',
      title: tr({ es: 'El chat termina con una sola voz', en: 'The chat ends with just one voice' }),
      who: other(sp),
      detail: tr({
        es: `${P(sp)} escribió ${endSilence.unansweredMessages} mensajes durante ${endSilence.days} días sin respuesta hasta el final del export. Es compatible con un bloqueo, con que dejó de contestar… o con que hablasteis por otro sitio. Es una inferencia, no un dato.`,
        en: `${P(sp)} wrote ${endSilence.unansweredMessages} messages over ${endSilence.days} days without a reply until the end of the export. It fits a block, someone who stopped replying… or you talking somewhere else. It’s an inference, not a fact.`,
      }),
      metric: tr({ es: `${endSilence.days} días sin respuesta`, en: `${endSilence.days} days without a reply` }),
      evidence: unanswered,
    });
  }

  /* 8. Insistencia: ráfagas de 3+ mensajes durante 2+ horas sin respuesta */
  const bursts: Pair<Excerpt[]> = [[], []];
  for (const r of i.rs) {
    const len = r.end - r.start + 1;
    if (len >= 3 && msgs[r.end].ts - msgs[r.start].ts >= 2 * HOUR) bursts[r.author].push(excerpt(msgs[r.start]));
  }
  const bTop: AuthorIndex = bursts[0].length >= bursts[1].length ? 0 : 1;
  if (bursts[bTop].length >= T.doubleTextMin && bursts[bTop].length >= 2 * Math.max(1, bursts[other(bTop)].length)) {
    out.push({
      id: 'double-text',
      severity: 'yellow',
      title: tr({ es: 'Doble (y triple) texting', en: 'Double (and triple) texting' }),
      who: bTop,
      detail: tr({
        es: `${P(bTop)} encadena 3 o más mensajes seguidos sin respuesta durante horas ${bursts[bTop].length} veces.`,
        en: `${P(bTop)} sends 3 or more messages in a row with no reply for hours, ${bursts[bTop].length} times.`,
      }),
      metric: tr({ es: `${bursts[0].length} vs ${bursts[1].length} ráfagas`, en: `${bursts[0].length} vs ${bursts[1].length} bursts` }),
      evidence: bursts[bTop].slice(-3),
    });
  }

  /* 9. Muchos mensajes borrados */
  for (const a of [0, 1] as AuthorIndex[]) {
    const del = i.deleted[a];
    if (del >= 10 && del / Math.max(1, i.counts.messages[a]) >= T.deletedShare) {
      out.push({
        id: `deleted-${a}`,
        severity: 'yellow',
        title: tr({ es: 'Se borra mucho', en: 'Lots of deleting' }),
        who: a,
        detail: tr({
          es: `${P(a)} eliminó ${del} mensajes (${Math.round((del / i.counts.messages[a]) * 100)} % de lo que envía). Puede ser perfeccionismo… o arrepentimiento.`,
          en: `${P(a)} deleted ${del} messages (${Math.round((del / i.counts.messages[a]) * 100)}% of what they send). Could be perfectionism… or regret.`,
        }),
        metric: tr({ es: `${del} eliminados`, en: `${del} deleted` }),
        evidence: msgs.filter((m) => m.author === a && m.kind === 'deleted').slice(-2).map((m) => excerpt(m)),
      });
    }
  }

  /* Green flags adicionales */
  if (i.timeline.longestStreakDays >= 14) {
    out.push({
      id: 'streak',
      severity: 'green',
      title: tr({ es: `Racha de ${i.timeline.longestStreakDays} días seguidos`, en: `A ${i.timeline.longestStreakDays}-day streak` }),
      who: null,
      detail: tr({
        es: 'Hablasteis todos los días durante semanas. Eso no pasa por casualidad.',
        en: 'You talked every single day for weeks. That doesn’t happen by accident.',
      }),
      metric: tr({ es: `${i.timeline.longestStreakDays} días`, en: `${i.timeline.longestStreakDays} days` }),
      evidence: [],
    });
  }
  const qRates = [0, 1].map((a) => {
    const t = msgs.filter((m) => m.author === a && m.kind === 'text');
    return t.length ? t.filter((m) => isQuestion(m.text)).length / t.length : 0;
  });
  if (qRates[0] >= 0.12 && qRates[1] >= 0.12) {
    out.push({
      id: 'curious',
      severity: 'green',
      title: tr({ es: 'Os preguntáis cosas', en: 'You ask each other things' }),
      who: null,
      detail: tr({
        es: 'Los dos hacéis preguntas a menudo: hay curiosidad por la vida del otro.',
        en: 'You both ask questions often: there’s real curiosity about each other’s lives.',
      }),
      metric: tr({
        es: `${Math.round(qRates[0] * 100)} % y ${Math.round(qRates[1] * 100)} % de mensajes con pregunta`,
        en: `${Math.round(qRates[0] * 100)}% and ${Math.round(qRates[1] * 100)}% of messages with a question`,
      }),
      evidence: [],
    });
  }

  const order = { red: 0, yellow: 1, green: 2 };
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}

/** Exportado para tests. */
export const FLAG_THRESHOLDS = T;
