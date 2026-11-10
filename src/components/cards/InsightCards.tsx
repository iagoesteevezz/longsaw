/**
 * Tarjetas interpretativas: estilo, "lo que quiere decir" y "the move".
 * Todo sale de reglas y del banco de frases (core/phrases): sin IA.
 */
import type { AuthorIndex, Report } from '../../core/types';
import { useNames } from '../../lib/names';
import { Quote, usePersonColor } from '../ui';

interface P {
  r: Report;
}

export function StyleBody({ r }: P) {
  const { names, me, fill } = useNames();
  const color = usePersonColor();
  const order: AuthorIndex[] = me === 0 ? [0, 1] : [1, 0];
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {order.map((a) => {
          const s = r.insights.styles[a];
          return (
            <div key={a} className="tile-hover rounded-3xl bg-surface/60 p-5">
              <p className="text-5xl" aria-hidden>{s.emoji}</p>
              <p className="mt-2 text-sm font-bold" style={{ color: color(a) }}>{names[a]}</p>
              <p className="text-2xl font-extrabold leading-tight">{s.label}</p>
              <ul className="mt-3 space-y-1 text-sm font-semibold leading-snug">
                {s.traits.map((t) => <li key={t}>· {t}</li>)}
              </ul>
            </div>
          );
        })}
      </div>
      {r.insights.noticed.length > 0 && (
        <>
          <h3 className="mt-6 mb-2 text-lg font-extrabold">Lo que notamos</h3>
          <ul className="space-y-2">
            {r.insights.noticed.map((n) => (
              <li key={n} className="tile-hover rounded-2xl bg-surface/50 px-4 py-2 font-semibold">{fill(n)}</li>
            ))}
          </ul>
        </>
      )}
      <p className="mt-5 text-sm font-semibold opacity-70">
        Esto es entretenimiento, no psicología clínica. Un chat es una parte pequeña de una relación y nadie “es” un estilo de apego por cómo escribe en WhatsApp.
      </p>
    </>
  );
}

export function MeaningBody({ r }: P) {
  if (r.ambiguous.length === 0) return <p className="text-xl font-extrabold">No hemos encontrado mensajes ambiguos clave. Os entendéis bastante bien.</p>;
  return (
    <div className="space-y-6">
      {r.ambiguous.map((a) => (
        <div key={a.message.id} className="space-y-2">
          {a.context && <Quote e={a.context} compact maxLines={3} />}
          <Quote e={a.message} />
          <div className="rounded-3xl bg-surface/70 p-4">
            <p className="text-xs font-bold uppercase tracking-widest opacity-60">{a.pattern}</p>
            <p className="mt-1 font-bold leading-snug">{a.reading}</p>
          </div>
        </div>
      ))}
      <p className="text-sm font-semibold opacity-70">Interpretaciones posibles, no certezas. Si de verdad importa, pregunta.</p>
    </div>
  );
}

export function MoveBody({ r }: P) {
  const { fill } = useNames();
  const move = { title: fill(r.insights.move.title), steps: r.insights.move.steps.map(fill) };
  return (
    <>
      <p className="num text-5xl sm:text-6xl">{move.title}</p>
      <ol className="mt-6 space-y-3">
        {move.steps.map((s, i) => (
          <li key={s} className="tile-hover flex items-start gap-3 rounded-3xl bg-surface/70 p-4 text-lg font-bold leading-snug">
            <span className="num grid h-9 w-9 shrink-0 place-items-center rounded-full bg-wa-dark text-lg text-white">{i + 1}</span>
            <span className="pt-1">{s}</span>
          </li>
        ))}
      </ol>
    </>
  );
}
