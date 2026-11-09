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
import { formatDuration } from '../format';

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
        title: 'La iniciativa va en una sola dirección',
        who: other(top),
        detail: `${P(top)} empieza ${Math.round(share * 100)} de cada 100 conversaciones. ${P(other(top))} casi nunca abre la conversación.`,
        metric: `${i.init.total[top]} de ${i.init.sessions} inicios`,
        evidence: examples,
      });
    } else if (share <= 0.6) {
      out.push({
        id: 'initiative-balanced',
        severity: 'green',
        title: 'Iniciativa equilibrada',
        who: null,
        detail: 'Los dos abrís conversación más o menos lo mismo. Nadie tira solo del carro.',
        metric: `${i.init.total[0]} vs ${i.init.total[1]} inicios`,
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
        title: 'Uno contesta al momento, el otro cuando puede',
        who: slow,
        detail: `${P(slow)} tarda ${ratio.toFixed(1).replace('.', ',')} veces más en responder (mediana ${formatDuration(Math.max(m0, m1))} frente a ${formatDuration(Math.min(m0, m1))}).`,
        metric: `mediana ${formatDuration(m0)} vs ${formatDuration(m1)}`,
        evidence: slowest,
      });
    } else if (Math.max(m0, m1) < 10 * 60_000) {
      out.push({
        id: 'fast-both',
        severity: 'green',
        title: 'Respuestas rápidas por las dos partes',
        who: null,
        detail: 'Los dos respondéis en minutos. Hay ganas de hablar.',
        metric: `mediana ${formatDuration(m0)} y ${formatDuration(m1)}`,
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
          title: 'Mensajes cada vez más cortos',
          who: a,
          detail: `${P(a)} ha pasado de ${e.toFixed(1).replace('.', ',')} a ${l.toFixed(1).replace('.', ',')} palabras por mensaje entre el principio y el final del chat.`,
          metric: `−${Math.round(((e - l) / e) * 100)} % de longitud`,
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
        title: romantic ? 'Mucha actividad de madrugada' : 'Conversaciones a deshoras',
        who: a,
        detail: romantic
          ? `${Math.round((late / total) * 100)} % de los mensajes de ${P(a)} son entre las 00:00 y las 06:00. Ojo con el patrón "solo me escribe de noche".`
          : `${Math.round((late / total) * 100)} % de los mensajes de ${P(a)} son de madrugada.`,
        metric: `${late} mensajes de madrugada`,
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
        title: 'Bajón brusco de actividad',
        who: null,
        detail: `De ${prev} mensajes en un mes a ${cur} al mes siguiente (${months[k - 1].month} → ${months[k].month}). Algo cambió ahí.`,
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
      title: 'Preguntas que se quedan sin respuesta',
      who: seenTop,
      detail: `${P(seenTop)} deja sin contestar más de ${ctx.opts.seenThresholdHours} h mensajes que pedían respuesta ${Math.max(s0, s1)} veces (frente a ${Math.min(s0, s1)}). Estimación: el export no incluye los "leídos".`,
      metric: `${s0} vs ${s1} "vistos" estimados`,
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
      title: 'El chat termina con una sola voz',
      who: other(sp),
      detail: `${P(sp)} escribió ${endSilence.unansweredMessages} mensajes durante ${endSilence.days} días sin respuesta hasta el final del export. Es compatible con un bloqueo, con que dejó de contestar… o con que hablasteis por otro sitio. Es una inferencia, no un dato.`,
      metric: `${endSilence.days} días sin respuesta`,
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
      title: 'Doble (y triple) texting',
      who: bTop,
      detail: `${P(bTop)} encadena 3 o más mensajes seguidos sin respuesta durante horas ${bursts[bTop].length} veces.`,
      metric: `${bursts[0].length} vs ${bursts[1].length} ráfagas`,
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
        title: 'Se borra mucho',
        who: a,
        detail: `${P(a)} eliminó ${del} mensajes (${Math.round((del / i.counts.messages[a]) * 100)} % de lo que envía). Puede ser perfeccionismo… o arrepentimiento.`,
        metric: `${del} eliminados`,
        evidence: msgs.filter((m) => m.author === a && m.kind === 'deleted').slice(-2).map((m) => excerpt(m)),
      });
    }
  }

  /* Green flags adicionales */
  if (i.timeline.longestStreakDays >= 14) {
    out.push({
      id: 'streak',
      severity: 'green',
      title: `Racha de ${i.timeline.longestStreakDays} días seguidos`,
      who: null,
      detail: 'Hablasteis todos los días durante semanas. Eso no pasa por casualidad.',
      metric: `${i.timeline.longestStreakDays} días`,
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
      title: 'Os preguntáis cosas',
      who: null,
      detail: 'Los dos hacéis preguntas a menudo: hay curiosidad por la vida del otro.',
      metric: `${Math.round(qRates[0] * 100)} % y ${Math.round(qRates[1] * 100)} % de mensajes con pregunta`,
      evidence: [],
    });
  }

  const order = { red: 0, yellow: 1, green: 2 };
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}

/** Exportado para tests. */
export const FLAG_THRESHOLDS = T;
