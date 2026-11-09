/**
 * Paso previo al análisis: quién eres, quién es la otra persona (tipo de
 * relación) y cómo quieres verla. El tipo de relación adapta títulos, tono,
 * tarjetas visibles y "the move".
 */
import { useState } from 'react';
import { DEFAULT_OPTIONS, type AnalysisOptions, type AuthorIndex, type Relation } from '../core/types';
import { formatDate, nf } from '../core/format';
import type { ChatSummary } from '../lib/workerClient';
import { RELATIONS } from '../lib/relations';

export function SetupPage(props: { summary: ChatSummary; onSubmit: (o: AnalysisOptions) => void; onCancel: () => void }) {
  const s = props.summary;
  const [me, setMe] = useState<AuthorIndex>(s.exporterGuess ?? 0);
  const [relation, setRelation] = useState<Relation | null>(null);
  const otherIdx: AuthorIndex = me === 0 ? 1 : 0;
  const defaultAlias = (s.participants[otherIdx].name.split(/\s+/)[0] ?? '').slice(0, 24);
  const [alias, setAlias] = useState<string | null>(null);
  const [gap, setGap] = useState(DEFAULT_OPTIONS.sessionGapHours);
  const [seen, setSeen] = useState(DEFAULT_OPTIONS.seenThresholdHours);
  const [silence, setSilence] = useState(DEFAULT_OPTIONS.silenceDays);

  const submit = () => {
    if (!relation) return;
    props.onSubmit({
      me,
      relation,
      otherAlias: (alias ?? defaultAlias).trim() || 'Otra persona',
      sessionGapHours: gap,
      seenThresholdHours: seen,
      silenceDays: silence,
    });
  };

  return (
    <main className="mx-auto max-w-xl px-5 pb-28 pt-8">
      <button type="button" onClick={props.onCancel} className="rounded-full bg-white px-4 py-2 text-sm font-bold">← Otro archivo</button>

      <div className="mt-6 rounded-[2rem] bg-card-yellow p-6">
        <p className="text-sm font-bold uppercase tracking-widest opacity-60">Chat cargado</p>
        <p className="num mt-2 text-6xl">{nf.format(s.totalMessages)}</p>
        <p className="font-bold">mensajes · {formatDate(s.firstTs)} → {formatDate(s.lastTs)} · {s.platform === 'ios' ? 'iPhone' : 'Android'} · {s.locale === 'es' ? 'español' : 'inglés'}</p>
        {s.warnings.map((w) => <p key={w} className="mt-2 text-sm font-semibold">⚠️ {w}</p>)}
      </div>

      <fieldset className="mt-8">
        <legend className="text-2xl font-extrabold">¿Quién eres tú?</legend>
        {s.exporterGuess !== null && <p className="mt-1 text-sm font-semibold opacity-70">Lo hemos deducido del archivo, pero compruébalo.</p>}
        <div className="mt-3 grid grid-cols-2 gap-3">
          {s.participants.map((p, i) => (
            <button
              key={i}
              type="button"
              aria-pressed={me === i}
              disabled={p.messageCount === 0}
              onClick={() => {
                setMe(i as AuthorIndex);
                setAlias(null);
              }}
              className={`rounded-3xl p-4 text-left font-extrabold transition disabled:opacity-40 ${me === i ? 'bg-ink text-white' : 'bg-white'}`}
            >
              <span className="block truncate text-lg">{p.name}</span>
              <span className="text-sm font-semibold opacity-70">{nf.format(p.messageCount)} mensajes</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-8">
        <legend className="text-2xl font-extrabold">¿Quién es {s.participants[otherIdx].name} para ti?</legend>
        <p className="mt-1 text-sm font-semibold opacity-70">Cambia el tono, los apartados y los consejos del informe.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {RELATIONS.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={relation === r.id}
              onClick={() => setRelation(r.id)}
              className={`rounded-full px-4 py-3 font-extrabold transition ${relation === r.id ? 'scale-105 bg-ink text-white' : 'bg-white'}`}
            >
              {r.emoji} {r.label}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="mt-8 block">
        <span className="text-2xl font-extrabold">¿Cómo quieres verle en el informe?</span>
        <input
          value={alias ?? defaultAlias}
          maxLength={24}
          onChange={(e) => setAlias(e.target.value)}
          className="mt-3 w-full rounded-3xl border-2 border-ink/10 bg-white px-5 py-4 text-lg font-bold outline-none focus:border-ink"
          placeholder="Nombre o apodo"
        />
        <span className="mt-1 block text-sm font-semibold opacity-70">Al compartir tarjetas ocultamos los nombres por defecto.</span>
      </label>

      <details className="mt-8 rounded-3xl bg-white p-5">
        <summary className="cursor-pointer font-extrabold">Ajustes avanzados</summary>
        <Range label="Nueva conversación tras un silencio de" value={gap} min={1} max={24} unit="h" onChange={setGap} />
        <Range label="Contar “visto” si no responde en" value={seen} min={2} max={72} unit="h" onChange={setSeen} />
        <Range label="Silencio largo / posible bloqueo a partir de" value={silence} min={2} max={30} unit="días" onChange={setSilence} />
      </details>

      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-paper via-paper to-transparent px-5 pb-5 pt-8">
        <button
          type="button"
          disabled={!relation}
          onClick={submit}
          className="mx-auto block w-full max-w-xl rounded-full bg-ink px-6 py-4 text-lg font-extrabold text-white transition enabled:hover:scale-[1.02] disabled:opacity-30"
        >
          {relation ? 'Analizar chat →' : 'Elige el tipo de relación'}
        </button>
      </div>
    </main>
  );
}

function Range(p: { label: string; value: number; min: number; max: number; unit: string; onChange: (n: number) => void }) {
  return (
    <label className="mt-4 block">
      <span className="flex justify-between text-sm font-bold">
        <span>{p.label}</span>
        <span>{p.value} {p.unit}</span>
      </span>
      <input type="range" min={p.min} max={p.max} value={p.value} onChange={(e) => p.onChange(Number(e.target.value))} className="mt-2 w-full accent-ink" />
    </label>
  );
}
