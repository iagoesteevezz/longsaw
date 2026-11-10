/**
 * Cuerpos de las tarjetas básicas (1-6 y la línea temporal). El marco (color,
 * título, comentario, compartir) lo pone <Card> desde la página del informe.
 */
import type { AuthorIndex, Report } from '../../core/types';
import { durationParts, formatDate, formatDuration, formatMonth, nf } from '../../core/format';
import { useNames } from '../../lib/names';
import { useT } from '../../lib/i18n';
import { BigStat, CountUp, Explain, Pill, Quote, VersusBar, usePersonColor } from '../ui';

export interface BodyProps {
  r: Report;
}

const both = [0, 1] as AuthorIndex[];

/** Ordena para que "tú" salga siempre primero/izquierda. */
function useOrder(): AuthorIndex[] {
  const { me } = useNames();
  return me === 0 ? both : [1, 0];
}

export function MessagesBody({ r }: BodyProps) {
  const t = useT();
  const { names } = useNames();
  const color = usePersonColor();
  const order = useOrder();
  return (
    <>
      <div className="num text-[5.5rem] sm:text-9xl"><CountUp value={r.meta.totalMessages} /></div>
      <p className="-mt-1 mb-6 text-lg font-bold">{t.messages.inDays(nf.format(r.meta.durationDays))}</p>
      <div className="mb-6 grid grid-cols-2 gap-4">
        {order.map((a) => (
          <BigStat key={a} label={names[a]} value={<CountUp value={r.counts.messages[a]} />} color={color(a)} sub={t.messages.words(nf.format(r.counts.words[a]))} />
        ))}
      </div>
      <VersusBar values={r.counts.messages} label={t.card.split} />
      <div className="mt-5 flex flex-wrap gap-2">
        {order.map((a) => (
          <Pill key={a}>
            {names[a]}: {nf.format(r.counts.questions[a])} ❓ · {r.counts.calls[a]} 📞
          </Pill>
        ))}
      </div>
    </>
  );
}

export function ResponseBody({ r }: BodyProps) {
  const t = useT().response;
  const { names } = useNames();
  const color = usePersonColor();
  const order = useOrder();
  return (
    <>
      <p className="mb-3 text-sm font-bold uppercase tracking-wider opacity-70">{t.median}</p>
      <div className="grid grid-cols-2 gap-4">
        {order.map((a) => {
          const [v, u] = durationParts(r.responses[a].medianMs);
          return <BigStat key={a} label={names[a]} value={v} unit={u} color={color(a)} />;
        })}
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-4 rounded-2xl bg-surface/50 px-4 py-3 text-sm">
        {order.map((a) => (
          <div key={a}>
            <dt className="font-bold opacity-70">{t.meanOf(names[a])}</dt>
            <dd className="text-lg font-extrabold">{formatDuration(r.responses[a].meanMs)}</dd>
          </div>
        ))}
      </dl>
      <Explain summary={t.summary}>
        {t.explain({ a: names[order[0]], pa: formatDuration(r.responses[order[0]].p90Ms), b: names[order[1]], pb: formatDuration(r.responses[order[1]].p90Ms) })}
      </Explain>
    </>
  );
}

export function FirstBody({ r }: BodyProps) {
  const t = useT().first;
  const { names } = useNames();
  if (!r.firstMessage) return <p>{t.none}</p>;
  return (
    <>
      <p className="num mb-1 text-5xl sm:text-6xl">{formatDate(r.firstMessage.ts, { day: 'numeric', month: 'long' })}</p>
      <p className="mb-6 text-lg font-bold">
        {t.by(new Date(r.firstMessage.ts).getFullYear(), names[r.firstMessage.author])}
      </p>
      <Quote e={r.firstMessage} />
    </>
  );
}

export function InitiatorBody({ r, gapHours }: BodyProps & { gapHours: number }) {
  const t = useT().initiator;
  const { names } = useNames();
  const color = usePersonColor();
  const order = useOrder();
  const tot = r.initiations.total;
  const total = tot[0] + tot[1] || 1;
  const top: AuthorIndex = tot[0] >= tot[1] ? 0 : 1;
  return (
    <>
      <p className="mb-1 text-lg font-bold">{t.writesFirst}</p>
      <p className="num mb-2 text-6xl sm:text-7xl" style={{ color: color(top) }}>{names[top]}</p>
      <p className="mb-6 text-lg font-bold">{t.share(Math.round((tot[top] / total) * 100), nf.format(r.initiations.sessions))}</p>
      <VersusBar values={tot} label={t.bar} />
      <div className="mt-4 flex flex-wrap gap-2">
        {order.map((a) => (
          <Pill key={a}>{t.closes(names[a], r.endings[a])}</Pill>
        ))}
      </div>
      <Explain>
        {t.explain(gapHours)}
      </Explain>
    </>
  );
}

export function LongestBody({ r }: BodyProps) {
  const t = useT().longest;
  const { names } = useNames();
  const order = useOrder();
  return (
    <div className="space-y-6">
      {order.map((a) =>
        r.longest[a] ? (
          <div key={a}>
            <p className="mb-2 text-sm font-bold opacity-70">
              {t.words(names[a], nf.format(r.longestWords[a]))}
            </p>
            <Quote e={r.longest[a]!} maxLines={10} />
          </div>
        ) : (
          <p key={a} className="font-bold">{t.noText(names[a])}</p>
        ),
      )}
    </div>
  );
}

export function DeletedBody({ r }: BodyProps) {
  const t = useT().deleted;
  const { names } = useNames();
  const color = usePersonColor();
  const order = useOrder();
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        {order.map((a) => (
          <BigStat key={a} label={names[a]} value={<CountUp value={r.deleted[a]} />} unit="🗑️" color={color(a)} />
        ))}
      </div>
      <Explain summary={t.summary}>
        <p>{t.explain}</p>
      </Explain>
    </>
  );
}

/* ---------------------------- Línea temporal --------------------------- */

export function TimelineBody({ r }: BodyProps) {
  const t = useT().timeline;
  const { names } = useNames();
  const color = usePersonColor();
  const order = useOrder();
  const tl = r.timeline;
  const months = tl.months;
  const max = Math.max(1, ...months.map((m) => m.counts[0] + m.counts[1]));
  const W = 320;
  const H = 120;
  const bw = W / Math.max(1, months.length);
  const hoursTotal = tl.hours[0].map((x, i) => x + tl.hours[1][i]);
  const hMax = Math.max(1, ...hoursTotal);

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-4">
        <BigStat label={t.days} value={<CountUp value={r.meta.durationDays} />} sub={`${formatDate(r.meta.firstTs)} → ${formatDate(r.meta.lastTs)}`} />
        <BigStat label={t.streak} value={tl.longestStreakDays} unit={t.daysUnit} sub={t.activeDays(nf.format(tl.activeDays))} />
      </div>

      <figure>
        <svg viewBox={`0 0 ${W} ${H + 18}`} className="w-full" role="img" aria-label={t.monthsAria}>
          {months.map((m, i) => {
            const h0 = (m.counts[order[0]] / max) * H;
            const h1 = (m.counts[order[1]] / max) * H;
            const x = i * bw + bw * 0.12;
            const w = Math.max(1.5, bw * 0.76);
            return (
              <g key={m.month}>
                <title>{`${formatMonth(m.month)}: ${names[order[0]]} ${m.counts[order[0]]}, ${names[order[1]]} ${m.counts[order[1]]}`}</title>
                <rect className="bar-grow" style={{ animationDelay: `${i * 25}ms`, fill: color(order[0]) }} x={x} y={H - h0} width={w} height={h0} rx={Math.min(3, w / 2)} />
                <rect className="bar-grow" style={{ animationDelay: `${i * 25}ms`, fill: color(order[1]) }} x={x} y={H - h0 - h1} width={w} height={h1} rx={Math.min(3, w / 2)} opacity={0.85} />
              </g>
            );
          })}
          <text x={0} y={H + 14} fontSize={10} fontWeight={700} opacity={0.6}>{months[0] && formatMonth(months[0].month, true)}</text>
          <text x={W} y={H + 14} fontSize={10} fontWeight={700} opacity={0.6} textAnchor="end">
            {months.at(-1) && formatMonth(months.at(-1)!.month, true)}
          </text>
        </svg>
      </figure>

      <div className="mt-5 flex flex-col gap-2 text-base font-bold">
        {tl.mostActiveMonth && <p>{t.mostActive(formatMonth(tl.mostActiveMonth.month), nf.format(tl.mostActiveMonth.counts[0] + tl.mostActiveMonth.counts[1]))}</p>}
        {tl.leastActiveMonth && months.length > 1 && <p>{t.leastActive(formatMonth(tl.leastActiveMonth.month), nf.format(tl.leastActiveMonth.counts[0] + tl.leastActiveMonth.counts[1]))}</p>}
        {tl.peakDay && <p>{t.peak(formatDate(new Date(tl.peakDay.date + 'T12:00:00').getTime()), tl.peakDay.count)}</p>}
      </div>

      <p className="mt-6 mb-2 text-sm font-bold opacity-70">{t.hoursQ}</p>
      <svg viewBox="0 0 240 50" className="w-full" role="img" aria-label={t.hoursAria}>
        {hoursTotal.map((v, h) => (
          <rect key={h} x={h * 10 + 1} y={40 - (v / hMax) * 38} width={8} height={(v / hMax) * 38 + 1} rx={2} style={{ fill: 'var(--color-me)' }} opacity={0.25 + 0.75 * (v / hMax)}>
            <title>{t.hourTitle(h, v)}</title>
          </rect>
        ))}
        {[0, 6, 12, 18, 23].map((h) => (
          <text key={h} x={h * 10 + 5} y={49} fontSize={7} textAnchor={h === 23 ? 'end' : 'middle'} fontWeight={700} opacity={0.6}>{h}h</text>
        ))}
      </svg>
    </>
  );
}
