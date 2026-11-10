/**
 * Paso previo al análisis: quién eres, quién es la otra persona (tipo de
 * relación) y cómo quieres verla. El tipo de relación adapta títulos, tono,
 * tarjetas visibles y "the move". Si el export trae al usuario como "Tú",
 * pedimos su nombre para que las frases no digan "Tú manda 40 audios".
 */
import { useState, type ReactNode } from 'react';
import { DEFAULT_OPTIONS, type AnalysisOptions, type AuthorIndex, type Relation } from '../core/types';
import { formatDate, nf } from '../core/format';
import { isSelfPlaceholder } from '../core/selfName';
import type { ChatSummary } from '../lib/workerClient';
import { RELATIONS } from '../lib/relations';

const firstWord = (n: string) => (n.split(/\s+/)[0] ?? '').slice(0, 24);

export function SetupPage(props: { summary: ChatSummary; onSubmit: (o: AnalysisOptions) => void; onCancel: () => void }) {
  const s = props.summary;
  const placeholderIdx = s.participants.findIndex((p) => isSelfPlaceholder(p.name));
  const [me, setMe] = useState<AuthorIndex>(s.exporterGuess ?? (placeholderIdx === 1 ? 1 : 0));
  const [relation, setRelation] = useState<Relation | null>(null);
  const otherIdx: AuthorIndex = me === 0 ? 1 : 0;
  const myRaw = s.participants[me].name;
  const otherRaw = s.participants[otherIdx].name;
  const needMyName = isSelfPlaceholder(myRaw);
  const defaultAlias = isSelfPlaceholder(otherRaw) ? '' : firstWord(otherRaw);
  const [myName, setMyName] = useState('');
  const [alias, setAlias] = useState<string | null>(null);
  const [gap, setGap] = useState(DEFAULT_OPTIONS.sessionGapHours);
  const [seen, setSeen] = useState(DEFAULT_OPTIONS.seenThresholdHours);
  const [silence, setSilence] = useState(DEFAULT_OPTIONS.silenceDays);

  const otherShown = (alias ?? defaultAlias).trim();
  const missingName = needMyName && !myName.trim();
  const ready = relation !== null && !missingName;

  const submit = () => {
    if (!ready) return;
    props.onSubmit({
      me,
      relation,
      otherAlias: otherShown || 'Otra persona',
      ...(needMyName ? { myAlias: myName.trim() } : {}),
      sessionGapHours: gap,
      seenThresholdHours: seen,
      silenceDays: silence,
    });
  };

  let step = 0;
  const next = () => ++step;

  return (
    <main className="pb-32">
      {/* ------------------------------ Cabecera ------------------------------ */}
      <section className="wa-gradient relative overflow-hidden text-white">
        <span aria-hidden className="pointer-events-none absolute -right-8 -top-10 text-[10rem] leading-none opacity-10">💬</span>
        <div className="mx-auto max-w-xl px-5 pb-10 pt-5">
          <button type="button" onClick={props.onCancel} className="press rounded-full bg-white/12 px-4 py-2 text-sm font-bold ring-1 ring-white/20 hover:bg-white/20">
            ← Otro archivo
          </button>
          <p className="mt-8 text-sm font-bold uppercase tracking-widest text-white/70">Chat cargado</p>
          <p className="num mt-2 text-7xl text-wa-green">{nf.format(s.totalMessages)}</p>
          <p className="mt-2 text-lg font-extrabold">mensajes entre {formatDate(s.firstTs)} y {formatDate(s.lastTs)}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-sm font-bold">
            <span className="rounded-full bg-white/12 px-3 py-1 ring-1 ring-white/15">{s.platform === 'ios' ? 'iPhone' : 'Android'}</span>
            <span className="rounded-full bg-white/12 px-3 py-1 ring-1 ring-white/15">{s.locale === 'es' ? 'Español' : 'Inglés'}</span>
            <span className="rounded-full bg-wa-green/20 px-3 py-1 text-wa-green ring-1 ring-wa-green/30">🔒 Sigue en tu navegador</span>
          </div>
          {s.warnings.map((w) => (
            <p key={w} className="mt-3 rounded-2xl bg-black/20 px-4 py-2 text-sm font-semibold text-white/85">⚠️ {w}</p>
          ))}
        </div>
      </section>

      <div className="mx-auto flex max-w-xl flex-col gap-10 px-5 pt-8">
        {/* ------------------------------ Quién eres ----------------------------- */}
        <Question n={next()} title="¿Quién eres tú?" hint={s.exporterGuess !== null || placeholderIdx >= 0 ? 'Lo hemos deducido del archivo, pero compruébalo.' : undefined}>
          <div className="grid grid-cols-2 gap-3">
            {s.participants.map((p, i) => {
              const on = me === i;
              const placeholder = isSelfPlaceholder(p.name);
              return (
                <button
                  key={i}
                  type="button"
                  aria-pressed={on}
                  disabled={p.messageCount === 0}
                  onClick={() => {
                    setMe(i as AuthorIndex);
                    setAlias(null);
                  }}
                  className={`press rounded-2xl rounded-tr-md p-4 text-left ring-2 transition-colors disabled:opacity-40 ${
                    on ? 'bg-wa-bubble ring-wa-teal' : 'bg-white ring-transparent hover:ring-wa-teal/30'
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-lg font-extrabold">{p.name}</span>
                    <span aria-hidden className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-black transition ${on ? 'bg-wa-teal text-white' : 'bg-ink/8 text-transparent'}`}>✓</span>
                  </span>
                  <span className="mt-0.5 block text-sm font-semibold opacity-65">
                    {nf.format(p.messageCount)} mensajes{placeholder ? ' · sin nombre' : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </Question>

        {/* ------------------------- Tu nombre (si es "Tú") ------------------------ */}
        {needMyName && (
          <Question n={next()} title="¿Cómo te llamas?" hint={`En el archivo apareces como «${myRaw}». Lo usamos para que las frases suenen bien.`}>
            <TextInput value={myName} onChange={setMyName} placeholder="Tu nombre o apodo" autoFocus />
          </Question>
        )}

        {/* ---------------------------- Tipo de relación --------------------------- */}
        <Question n={next()} title={`¿Quién es ${otherShown || 'la otra persona'} para ti?`} hint="Cambia el tono, los apartados y los consejos del informe.">
          <div className="flex flex-wrap gap-2">
            {RELATIONS.map((r) => {
              const on = relation === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setRelation(r.id)}
                  className={`press rounded-full px-4 py-2.5 font-extrabold ring-2 transition-colors ${
                    on ? 'bg-wa-dark text-white ring-wa-dark' : 'bg-white ring-transparent hover:ring-wa-teal/30'
                  }`}
                >
                  {r.emoji} {r.label}
                </button>
              );
            })}
          </div>
        </Question>

        {/* ------------------------------ Alias otra ----------------------------- */}
        <Question n={next()} title="¿Cómo quieres verle en el informe?" hint="Al compartir tarjetas o el PDF ocultamos los nombres por defecto.">
          <TextInput value={alias ?? defaultAlias} onChange={setAlias} placeholder="Nombre o apodo" />
        </Question>

        <details className="group rounded-3xl bg-white/70 px-5 py-4">
          <summary className="flex cursor-pointer list-none items-center justify-between font-extrabold">
            Ajustes avanzados
            <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 text-wa-teal transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </summary>
          <Range label="Nueva conversación tras un silencio de" value={gap} min={1} max={24} unit="h" onChange={setGap} />
          <Range label="Contar “visto” si no responde en" value={seen} min={2} max={72} unit="h" onChange={setSeen} />
          <Range label="Silencio largo / posible bloqueo a partir de" value={silence} min={2} max={30} unit="días" onChange={setSilence} />
        </details>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-paper via-paper/95 to-transparent px-5 pb-5 pt-10">
        <button
          type="button"
          disabled={!ready}
          onClick={submit}
          className="press mx-auto block w-full max-w-xl rounded-full bg-wa-green px-6 py-4 text-lg font-extrabold text-wa-ink shadow-[0_14px_30px_-14px_rgb(37_211_102/0.8)] enabled:hover:bg-[#3ee07a] disabled:bg-ink/15 disabled:text-ink/50 disabled:shadow-none"
        >
          {ready ? 'Analizar chat →' : missingName ? 'Escribe tu nombre' : 'Elige el tipo de relación'}
        </button>
      </div>
    </main>
  );
}

/** Cada pregunta, como un mensaje recibido. */
function Question(p: { n: number; title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="animate-[rise_0.7s_var(--ease-out-expo)_both]">
      <legend className="w-fit max-w-full rounded-3xl rounded-tl-md bg-white px-5 py-3 shadow-[0_1px_0_rgb(0_0_0/0.06)]">
        <span className="flex items-baseline gap-2 text-xl font-extrabold leading-tight sm:text-2xl">
          <span className="text-wa-teal">{p.n}.</span>
          {p.title}
        </span>
        {p.hint && <span className="mt-1 block text-sm font-semibold leading-snug opacity-65">{p.hint}</span>}
      </legend>
      <div className="mt-3">{p.children}</div>
    </fieldset>
  );
}

function TextInput(p: { value: string; onChange: (v: string) => void; placeholder: string; autoFocus?: boolean }) {
  return (
    <input
      value={p.value}
      maxLength={24}
      autoFocus={p.autoFocus}
      onChange={(e) => p.onChange(e.target.value)}
      placeholder={p.placeholder}
      aria-label={p.placeholder}
      className="w-full rounded-2xl bg-white px-5 py-4 text-lg font-bold outline-none ring-2 ring-transparent transition placeholder:font-semibold placeholder:opacity-40 focus:ring-wa-teal"
    />
  );
}

function Range(p: { label: string; value: number; min: number; max: number; unit: string; onChange: (n: number) => void }) {
  return (
    <label className="mt-4 block">
      <span className="flex justify-between gap-3 text-sm font-bold">
        <span>{p.label}</span>
        <span className="shrink-0 rounded-full bg-wa-bubble px-2 text-wa-dark">{p.value} {p.unit}</span>
      </span>
      <input type="range" min={p.min} max={p.max} value={p.value} onChange={(e) => p.onChange(Number(e.target.value))} className="mt-2 w-full accent-wa-teal" />
    </label>
  );
}
