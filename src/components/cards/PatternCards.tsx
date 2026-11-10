/**
 * Tarjetas de patrones (7-11 y 13). Todas muestran CÓMO se calcula y marcan
 * como estimación lo que es inferencia (visto, bloqueo).
 */
import type { AuthorIndex, Flag, Report } from '../../core/types';
import { formatDate, formatDuration } from '../../core/format';
import { useNames } from '../../lib/names';
import { useT } from '../../lib/i18n';
import { BigStat, CountUp, Estimate, Explain, Quote, usePersonColor } from '../ui';

interface P {
  r: Report;
}
const both = [0, 1] as AuthorIndex[];
function useOrder(): AuthorIndex[] {
  const { me } = useNames();
  return me === 0 ? both : [1, 0];
}

/* ------------------------------ Interés ------------------------------ */

export function InterestBody({ r }: P) {
  const t = useT().interest;
  const { names } = useNames();
  const color = usePersonColor();
  const order = useOrder();
  const it = r.interest;
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        {order.map((a) => (
          <BigStat key={a} label={names[a]} value={<CountUp value={it.total[a]} />} unit="/100" color={color(a)} />
        ))}
      </div>

      {it.evolution.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-sm font-bold opacity-70">{t.evolution}</p>
          <svg viewBox="0 0 300 90" className="w-full" role="img" aria-label={t.evolutionAria}>
            {order.map((a) => {
              const pts = it.evolution.map((e, i) => `${20 + i * 86.7},${80 - (e.total[a] / 100) * 70}`).join(' ');
              return <polyline key={a} className="line-draw" pathLength={1} points={pts} fill="none" style={{ stroke: color(a) }} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />;
            })}
            {it.evolution.map((e, i) => (
              <text key={i} x={20 + i * 86.7} y={89} fontSize={9} fontWeight={700} textAnchor="middle" opacity={0.6}>{e.label}</text>
            ))}
          </svg>
        </div>
      )}

      <Explain summary={t.summary}>
        <p>{t.intro}</p>
        <table className="mt-2 w-full text-left text-xs">
          <thead>
            <tr className="opacity-60">
              <th className="py-1 pr-2">{t.signal}</th>
              {order.map((a) => <th key={a} className="py-1 pr-2">{names[a]}</th>)}
            </tr>
          </thead>
          <tbody>
            {it.components.map((c) => (
              <tr key={c.key} className="border-t border-ink/10 align-top">
                <td className="py-1.5 pr-2 font-bold">{c.label} ({t.weight(Math.round(c.weight * 100))})</td>
                {order.map((a) => (
                  <td key={a} className="py-1.5 pr-2">
                    <b>{Math.round(c.scores[a])}</b> · {c.raw[a]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="opacity-80">{t.scales}</p>
      </Explain>
    </>
  );
}

/* ------------------------------- Visto ------------------------------- */

export function SeenBody({ r, hours }: P & { hours: number }) {
  const t = useT().seen;
  const { names } = useNames();
  const color = usePersonColor();
  const order = useOrder();
  return (
    <>
      <p className="mb-4 text-lg font-bold">{t.lead}</p>
      <div className="grid grid-cols-2 gap-4">
        {order.map((a) => (
          <BigStat key={a} label={names[a]} value={r.seen.counts[a]} unit="👀" color={color(a)} />
        ))}
      </div>
      {r.seen.examples.length > 0 && (
        <div className="mt-6 space-y-4">
          <p className="text-sm font-bold opacity-70">{t.waited}</p>
          {r.seen.examples.slice(0, 3).map((e) => (
            <div key={e.message.id}>
              <Quote e={e.message} compact />
              <p className="mt-1 text-center text-sm font-bold">
                {e.waitedMs === null ? t.never : t.until(formatDuration(e.waitedMs))}
              </p>
            </div>
          ))}
        </div>
      )}
      <Estimate>{t.estimate(hours)}</Estimate>
    </>
  );
}

/* ----------------------------- Silencios ----------------------------- */

export function SilenceBody({ r, days }: P & { days: number }) {
  const t = useT().silence;
  const { names } = useNames();
  const uni = r.silences.filter((s) => s.onlySpeaker !== null);
  const mutual = r.silences.filter((s) => s.onlySpeaker === null);
  const end = uni.find((s) => s.atEnd);
  const longest = [...r.silences].sort((a, b) => b.days - a.days)[0];
  return (
    <>
      {end ? (
        <>
          <p className="num text-6xl sm:text-7xl">{t.days(end.days)}</p>
          <p className="mt-2 text-lg font-bold">{t.endText(names[end.onlySpeaker!], end.unansweredMessages)}</p>
        </>
      ) : longest ? (
        <>
          <p className="num text-6xl sm:text-7xl">{t.days(longest.days)}</p>
          <p className="mt-2 text-lg font-bold">{t.longestText}</p>
        </>
      ) : (
        <p className="text-2xl font-extrabold">{t.none(days)}</p>
      )}

      {(uni.length > 0 || mutual.length > 0) && (
        <ul className="mt-6 space-y-2 text-sm font-semibold">
          {r.silences.slice(0, 5).map((s) => (
            <li key={s.startTs} className="rounded-2xl bg-surface/60 px-4 py-2">
              <b>{t.days(s.days)}</b> {t.since(formatDate(s.startTs))} ·{' '}
              {s.onlySpeaker === null ? t.mutual : t.only(names[s.onlySpeaker], s.unansweredMessages)}
              {s.atEnd && t.untilEnd}
            </li>
          ))}
        </ul>
      )}
      <Estimate>{t.estimate}</Estimate>
    </>
  );
}

/* ----------------------------- Palabras ------------------------------ */

export function WordsBody({ r }: P) {
  const t = useT().words;
  const { names } = useNames();
  const color = usePersonColor();
  const order = useOrder();
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {order.map((a) => (
        <div key={a}>
          <p className="mb-2 text-lg font-extrabold" style={{ color: color(a) }}>{names[a]}</p>
          <p className="mb-3 text-4xl leading-tight tracking-wider">{r.words.emojis[a].slice(0, 5).map((e) => e.word).join(' ') || '—'}</p>
          <ol className="space-y-1">
            {r.words.top[a].slice(0, 8).map((w, i) => (
              <li key={w.word} className="flex items-baseline justify-between gap-3 rounded-xl bg-surface/50 px-3 py-1.5 font-bold">
                <span className="truncate"><span className="mr-2 opacity-50">{i + 1}</span>{w.word}</span>
                <span className="text-sm opacity-60">{w.count}</span>
              </li>
            ))}
          </ol>
        </div>
      ))}
      <p className="text-sm opacity-70 sm:col-span-2">{t.note}</p>
    </div>
  );
}

export function SharedBody({ r }: P) {
  const t = useT().shared;
  if (r.words.shared.length === 0) return <p className="text-xl font-extrabold">{t.none}</p>;
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {r.words.shared.map((w, i) => (
          <span
            key={w.word}
            className="animate-pop rounded-full bg-surface px-4 py-2 font-extrabold shadow-sm"
            style={{ fontSize: `${Math.max(1, 1.9 - i * 0.1)}rem`, animationDelay: `${i * 60}ms` }}
          >
            {w.word}
          </span>
        ))}
      </div>
      <Explain summary={t.summary}>{t.explain()}</Explain>
    </>
  );
}

/* ------------------------------- Flags ------------------------------- */

const SEV: Record<Flag['severity'], { icon: string; cls: string }> = {
  red: { icon: '🚩', cls: 'bg-surface' },
  yellow: { icon: '⚠️', cls: 'bg-surface/70' },
  green: { icon: '💚', cls: 'bg-surface/40' },
};

export function FlagsBody({ r }: P) {
  const t = useT().flags;
  const { fill } = useNames();
  if (r.flags.length === 0) return <p className="text-xl font-extrabold">{t.none}</p>;
  const reds = r.flags.filter((f) => f.severity === 'red').length;
  return (
    <>
      <p className="num mb-5 text-6xl">{reds} 🚩</p>
      <ul className="space-y-4">
        {r.flags.map((f) => (
          <li key={f.id} className={`rounded-3xl p-4 ${SEV[f.severity].cls}`}>
            <p className="text-xs font-bold uppercase tracking-widest opacity-60">{SEV[f.severity].icon} {t.sev[f.severity]} · {f.metric}</p>
            <p className="mt-1 text-xl font-extrabold leading-tight">{f.title}</p>
            <p className="mt-1 font-semibold leading-snug">{fill(f.detail)}</p>
            {f.evidence.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-bold">{t.evidence(f.evidence.length)}</summary>
                <div className="mt-3 space-y-3">
                  {f.evidence.map((e) => <Quote key={e.id} e={e} compact maxLines={4} />)}
                </div>
              </details>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
