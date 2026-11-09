/**
 * Tarjeta 7: nivel de interés (0-100) por persona.
 *
 * DECISIÓN DE DISEÑO: escalas ABSOLUTAS por componente, no relativas entre
 * los dos. Si fueran relativas, siempre habría un "ganador" aunque ambos
 * estén muy interesados (o ninguno). Cada componente tiene una escala
 * explicable en una frase (ver `explain` en la UI) y un peso fijo.
 *
 *   rapidez     25 %  mediana de respuesta: 0 min → 100, 24 h → 0 (escala log)
 *   iniciativa  20 %  % de conversaciones que empieza: 50 % → 75, ≥ 67 % → 100
 *   longitud    15 %  palabras por mensaje: 12+ → 100
 *   preguntas   15 %  % de mensajes con "?": 25 %+ → 100
 *   volumen     10 %  % de mensajes del total: 50 % → 75, ≥ 67 % → 100
 *   evolución   10 %  su % de mensajes en el último cuarto vs el total
 *   emojis       5 %  emojis por mensaje: 0,5+ → 100
 */
import type { InterestComponent, InterestResult, Message, Pair } from '../types';
import type { Ctx } from './context';
import { clamp, extractEmojis, isQuestion, median, pair, wordCount } from './util';
import { formatDuration } from '../format';

interface Raw {
  medianReply: Pair<number | null>;
  initShare: Pair<number>;
  avgWords: Pair<number>;
  qRate: Pair<number>;
  volShare: Pair<number>;
  emojiRate: Pair<number>;
}

function rawMetrics(ctx: Ctx, from: number, to: number): Raw {
  const msgs = ctx.msgs;
  const replyTimes = pair<number[]>(() => []);
  for (const r of ctx.replies) if (r.index >= from && r.index < to) replyTimes[r.author].push(r.ms);
  const inits = pair(() => 0);
  for (const s of ctx.sessions) if (s.start >= from && s.start < to) inits[s.initiator]++;
  const count = pair(() => 0);
  const text = pair(() => 0);
  const words = pair(() => 0);
  const q = pair(() => 0);
  const emo = pair(() => 0);
  for (let i = from; i < to; i++) {
    const m: Message = msgs[i];
    const a = m.author!;
    count[a]++;
    if (m.kind === 'text') {
      text[a]++;
      words[a] += wordCount(m.text);
      if (isQuestion(m.text)) q[a]++;
      emo[a] += extractEmojis(m.text).length;
    }
  }
  const totalInits = inits[0] + inits[1] || 1;
  const total = count[0] + count[1] || 1;
  return {
    medianReply: replyTimes.map((t) => median(t)) as Pair<number | null>,
    initShare: inits.map((x) => x / totalInits) as Pair<number>,
    avgWords: words.map((w, i) => (text[i] ? w / text[i] : 0)) as Pair<number>,
    qRate: q.map((x, i) => (text[i] ? x / text[i] : 0)) as Pair<number>,
    volShare: count.map((x) => x / total) as Pair<number>,
    emojiRate: emo.map((x, i) => (text[i] ? x / text[i] : 0)) as Pair<number>,
  };
}

const speedScore = (ms: number | null) => {
  if (ms === null) return 0;
  const min = ms / 60_000;
  return clamp(100 * (1 - Math.log10(min + 1) / Math.log10(24 * 60 + 1)));
};
const shareScore = (s: number) => clamp(s * 150);

const pct = (x: number) => `${Math.round(x * 100)} %`;

function components(raw: Raw, trend: Pair<number> | null): InterestComponent[] {
  const list: InterestComponent[] = [
    {
      key: 'speed',
      label: 'Rapidez al responder',
      weight: 0.25,
      scores: raw.medianReply.map(speedScore) as Pair<number>,
      raw: raw.medianReply.map((m) => (m === null ? 'sin datos' : `mediana ${formatDuration(m)}`)) as Pair<string>,
    },
    {
      key: 'initiative',
      label: 'Iniciativa',
      weight: 0.2,
      scores: raw.initShare.map(shareScore) as Pair<number>,
      raw: raw.initShare.map((s) => `${pct(s)} de los inicios`) as Pair<string>,
    },
    {
      key: 'length',
      label: 'Longitud de mensajes',
      weight: 0.15,
      scores: raw.avgWords.map((w) => clamp((w / 12) * 100)) as Pair<number>,
      raw: raw.avgWords.map((w) => `${w.toFixed(1)} palabras/mensaje`) as Pair<string>,
    },
    {
      key: 'questions',
      label: 'Preguntas',
      weight: 0.15,
      scores: raw.qRate.map((r) => clamp((r / 0.25) * 100)) as Pair<number>,
      raw: raw.qRate.map((r) => `${pct(r)} de mensajes con pregunta`) as Pair<string>,
    },
    {
      key: 'effort',
      label: 'Volumen',
      weight: 0.1,
      scores: raw.volShare.map(shareScore) as Pair<number>,
      raw: raw.volShare.map((s) => `${pct(s)} de los mensajes`) as Pair<string>,
    },
    {
      key: 'emojis',
      label: 'Emojis',
      weight: 0.05,
      scores: raw.emojiRate.map((r) => clamp((r / 0.5) * 100)) as Pair<number>,
      raw: raw.emojiRate.map((r) => `${r.toFixed(2)} por mensaje`) as Pair<string>,
    },
  ];
  if (trend) {
    list.push({
      key: 'trend',
      label: 'Evolución reciente',
      weight: 0.1,
      // 50 = estable; sube si al final escribe proporcionalmente más que de media.
      scores: trend.map((d) => clamp(50 + d * 250)) as Pair<number>,
      raw: trend.map((d) => `${d >= 0 ? '+' : ''}${Math.round(d * 100)} pts de cuota al final`) as Pair<string>,
    });
  }
  return list;
}

function weighted(cs: InterestComponent[]): Pair<number> {
  const wsum = cs.reduce((s, c) => s + c.weight, 0);
  return [0, 1].map((p) => Math.round(cs.reduce((s, c) => s + c.scores[p] * c.weight, 0) / wsum)) as Pair<number>;
}

export function interest(ctx: Ctx): InterestResult {
  const n = ctx.msgs.length;
  const all = rawMetrics(ctx, 0, n);
  const lastQ = rawMetrics(ctx, Math.floor(n * 0.75), n);
  const trend: Pair<number> = [lastQ.volShare[0] - all.volShare[0], lastQ.volShare[1] - all.volShare[1]];
  const comps = components(all, n >= 40 ? trend : null);

  // Evolución: 4 tramos con el mismo número de mensajes (no de tiempo), para que
  // un tramo casi vacío no dé puntuaciones absurdas.
  const evolution: InterestResult['evolution'] = [];
  if (n >= 40) {
    for (let q = 0; q < 4; q++) {
      const from = Math.floor((n * q) / 4);
      const to = Math.floor((n * (q + 1)) / 4);
      const d = new Date(ctx.msgs[from].ts);
      evolution.push({
        label: d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
        total: weighted(components(rawMetrics(ctx, from, to), null)),
      });
    }
  }
  return { total: weighted(comps), components: comps, evolution };
}
