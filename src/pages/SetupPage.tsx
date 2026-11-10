/**
 * Paso previo al análisis, como una conversación de WhatsApp: longsaw
 * pregunta desde la izquierda (con "escribiendo…" entre mensajes) y el
 * usuario contesta con opciones o escribiendo. Tocar una respuesta ya dada
 * vuelve a esa pregunta.
 *
 * Preguntas: quién eres, tu nombre (solo si el export te trae como "Tú"),
 * quién es la otra persona (tipo de relación) y cómo quieres verla.
 */
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { DEFAULT_OPTIONS, type AnalysisOptions, type AuthorIndex, type Relation } from '../core/types';
import { formatDate, nf } from '../core/format';
import { isSelfPlaceholder } from '../core/selfName';
import type { ChatSummary } from '../lib/workerClient';
import { RELATIONS } from '../lib/relations';
import { Ticks } from '../components/ChatToChart';
import { LogoMark } from '../components/Logo';

type Step = 'me' | 'name' | 'relation' | 'alias' | 'confirm';
const ANSWER_ORDER = ['me', 'name', 'relation', 'alias'] as const;

interface Answers {
  me?: AuthorIndex;
  name?: string;
  relation?: Relation;
  alias?: string;
}

interface Item {
  id: string;
  side: 'bot' | 'me';
  /** Texto plano: marca cuánto tarda en "escribirse". */
  text: string;
  node?: ReactNode;
  rewind?: Step;
}

const firstWord = (n: string) => (n.split(/\s+/)[0] ?? '').slice(0, 24);
const typingDelay = (text: string) => 380 + Math.min(950, text.length * 16);

export function SetupPage(props: { summary: ChatSummary; onSubmit: (o: AnalysisOptions) => void; onCancel: () => void }) {
  const s = props.summary;
  const reduced = useMemo(() => matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const time = useMemo(() => new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }), []);
  const placeholderIdx = s.participants.findIndex((p) => isSelfPlaceholder(p.name));
  const guess: AuthorIndex | null = s.exporterGuess ?? (placeholderIdx >= 0 ? (placeholderIdx as AuthorIndex) : null);

  const [a, setA] = useState<Answers>({});
  const [gap, setGap] = useState(DEFAULT_OPTIONS.sessionGapHours);
  const [seen, setSeen] = useState(DEFAULT_OPTIONS.seenThresholdHours);
  const [silence, setSilence] = useState(DEFAULT_OPTIONS.silenceDays);
  const [advanced, setAdvanced] = useState(false);

  const otherIdx: AuthorIndex | undefined = a.me === undefined ? undefined : a.me === 0 ? 1 : 0;
  const myRaw = a.me === undefined ? '' : s.participants[a.me].name;
  const otherRaw = otherIdx === undefined ? '' : s.participants[otherIdx].name;
  const needName = a.me !== undefined && isSelfPlaceholder(myRaw);
  const myShown = needName ? a.name ?? '' : firstWord(myRaw);
  const defaultAlias = isSelfPlaceholder(otherRaw) ? '' : firstWord(otherRaw);

  const steps: Step[] = ['me', ...(needName ? (['name'] as const) : []), 'relation', 'alias', 'confirm'];
  const answered = (st: Step) =>
    st === 'me' ? a.me !== undefined : st === 'name' ? !!a.name : st === 'relation' ? !!a.relation : st === 'alias' ? a.alias !== undefined : false;
  const current = steps.find((st) => !answered(st)) ?? 'confirm';

  /** Vuelve a una pregunta: borra esa respuesta y las siguientes. */
  const rewind = (st: Step) => {
    const from = ANSWER_ORDER.indexOf(st as (typeof ANSWER_ORDER)[number]);
    if (from < 0) return;
    setA((prev) => {
      const next = { ...prev };
      for (const k of ANSWER_ORDER.slice(from)) delete next[k];
      return next;
    });
    setAdvanced(false);
  };

  /* ----------------------------- Conversación ----------------------------- */
  const items: Item[] = [];
  const bot = (id: string, text: string, node?: ReactNode) => items.push({ id, side: 'bot', text, node });
  const me = (id: string, text: string, rewindTo: Step) => items.push({ id, side: 'me', text, rewind: rewindTo });

  bot('hi', '¡Hola! 👋 Ya he leído vuestro chat.');
  bot(
    'stats',
    `Son ${nf.format(s.totalMessages)} mensajes, del ${formatDate(s.firstTs)} al ${formatDate(s.lastTs)}. Antes de hacer el informe, unas preguntas rápidas.`,
    <>
      Son <b>{nf.format(s.totalMessages)} mensajes</b>, del {formatDate(s.firstTs)} al {formatDate(s.lastTs)}. Antes de hacer el informe, unas preguntas rápidas.
    </>,
  );
  s.warnings.forEach((w, i) => bot(`warn-${i}`, `⚠️ ${w}`));

  for (const st of steps) {
    if (st === 'me') {
      bot('q-me', '¿Quién de los dos eres tú?');
      if (guess !== null) {
        const g = s.participants[guess].name;
        bot('q-me-guess', isSelfPlaceholder(g) ? `Uno de los dos sale como «${g}» en el archivo: diría que eres tú 👀` : `Diría que eres ${g}, pero confírmamelo 👀`);
      }
      if (a.me !== undefined) me('a-me', isSelfPlaceholder(myRaw) ? `Soy «${myRaw}»` : `Soy ${myRaw}`, 'me');
    } else if (st === 'name') {
      bot('q-name', `En el archivo sales como «${myRaw}» 😅 ¿Cómo te llamas? Así las frases sonarán bien.`);
      if (a.name) me('a-name', a.name, 'name');
    } else if (st === 'relation') {
      bot('q-rel', `${myShown ? `¡Genial, ${myShown}! ` : '¡Genial! '}¿Y quién es ${defaultAlias || 'la otra persona'} para ti?`);
      bot('q-rel-hint', 'Cambia el tono, los apartados y los consejos del informe.');
      if (a.relation) {
        const r = RELATIONS.find((x) => x.id === a.relation)!;
        me('a-rel', `${r.emoji} ${r.label}`, 'relation');
      }
    } else if (st === 'alias') {
      bot('q-alias', `¿Cómo quieres que salga ${defaultAlias || 'la otra persona'} en el informe? Puedes ponerle un apodo.`);
      if (a.alias !== undefined) me('a-alias', a.alias, 'alias');
    } else {
      bot('q-done', '¡Listo! Ya tengo todo lo que necesito 🙌');
      bot('q-done-2', 'Al compartir tarjetas o el PDF los nombres se ocultan por defecto. ¿Lo analizo?');
    }
    if (st === current) break;
  }

  /* -------------------------- Ritmo de escritura -------------------------- */
  const [shown, setShown] = useState(0);
  const [typing, setTyping] = useState(false);
  const visible = Math.min(shown, items.length);
  const nextItem = items[visible];

  useEffect(() => {
    if (shown > items.length) {
      setShown(items.length);
      return;
    }
    if (!nextItem) return;
    if (nextItem.side === 'me' || reduced) {
      setShown(visible + 1);
      return;
    }
    setTyping(true);
    const t = setTimeout(() => {
      setTyping(false);
      setShown(visible + 1);
    }, typingDelay(nextItem.text));
    return () => {
      clearTimeout(t);
      setTyping(false);
    };
  }, [visible, items.length, nextItem?.id, reduced]); // eslint-disable-line react-hooks/exhaustive-deps

  const settled = visible === items.length && !typing;

  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end', behavior: reduced ? 'auto' : 'smooth' });
  }, [visible, typing, settled, advanced, reduced]);

  const submit = () => {
    if (a.me === undefined || !a.relation) return;
    props.onSubmit({
      me: a.me,
      relation: a.relation,
      otherAlias: (a.alias ?? defaultAlias).trim() || 'Otra persona',
      ...(needName && a.name ? { myAlias: a.name } : {}),
      sessionGapHours: gap,
      seenThresholdHours: seen,
      silenceDays: silence,
    });
  };

  return (
    <main className="flex h-dvh flex-col bg-paper">
      {/* --------------------------- Cabecera de chat --------------------------- */}
      <header className="wa-gradient z-10 text-white shadow-[0_2px_10px_-4px_rgb(0_0_0/0.4)]">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-3 py-2.5">
          <button type="button" onClick={props.onCancel} aria-label="Elegir otro archivo" className="press grid h-10 w-10 place-items-center rounded-full hover:bg-white/10">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <LogoMark className="h-10 w-10 shrink-0 rounded-full ring-1 ring-white/20" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="font-brand text-xl font-semibold">longsaw</p>
            <p className="text-sm font-semibold text-white/75" aria-hidden>{typing ? 'escribiendo…' : 'en línea'}</p>
          </div>
        </div>
      </header>

      {/* ------------------------------ Mensajes ------------------------------ */}
      <div className="setup-chat min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-2xl flex-col gap-1.5 px-3 pb-4 pt-4 sm:px-5" role="log" aria-live="polite">
          <p className="mx-auto mb-1 rounded-lg bg-white/80 px-3 py-1 text-xs font-bold uppercase tracking-wide text-ink/60">Hoy</p>
          <p className="mx-auto mb-3 max-w-sm rounded-xl bg-[#fff3c4] px-4 py-2 text-center text-[13px] font-semibold leading-snug text-[#54451a]">
            🔒 Este chat se analiza en tu navegador. Nada se sube y nadie más puede leerlo.
          </p>

          {items.slice(0, visible).map((it, i) => {
            const prev = items[i - 1];
            const first = !prev || prev.side !== it.side;
            if (it.side === 'bot') {
              return (
                <div key={it.id} className={`chat-in max-w-[85%] self-start rounded-2xl bg-white px-3.5 py-2 text-[15px] font-semibold leading-snug shadow-[0_1px_0.5px_rgb(11_20_26/0.13)] sm:max-w-[70%] ${first ? 'mt-2 rounded-tl-sm' : ''}`}>
                  {it.node ?? it.text}
                  <span className="ml-3 inline-block translate-y-1 text-[11px] font-semibold text-[#667781]">{time}</span>
                </div>
              );
            }
            const read = i < visible - 1 || typing;
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => it.rewind && rewind(it.rewind)}
                aria-label={`${it.text}. Toca para cambiar la respuesta`}
                title="Cambiar respuesta"
                className={`chat-in group max-w-[85%] self-end rounded-2xl bg-wa-bubble px-3.5 py-2 text-left text-[15px] font-bold leading-snug shadow-[0_1px_0.5px_rgb(11_20_26/0.13)] transition hover:brightness-95 sm:max-w-[70%] ${first ? 'mt-2 rounded-tr-sm' : ''}`}
              >
                {it.text}
                <span className="ml-3 inline-flex translate-y-1 items-center gap-1 text-[11px] font-semibold text-[#667781]">
                  <span className="hidden group-hover:inline">cambiar ·</span>
                  {time} <Ticks read={read} />
                </span>
              </button>
            );
          })}

          {typing && (
            <div className="typing mt-2" aria-label="longsaw está escribiendo">
              <i /><i /><i />
            </div>
          )}
          <div ref={end} />
        </div>
      </div>

      {/* -------------------------- Respuestas / teclado ------------------------- */}
      <footer className="border-t border-ink/5 bg-[#f0ebe4] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-2xl px-3 pt-3 sm:px-5">
          {!settled ? (
            <Composer disabled placeholder="longsaw está escribiendo…" initial="" onSend={() => {}} />
          ) : current === 'me' ? (
            <Choices label="¿Quién eres tú?">
              {s.participants.map((p, i) => (
                <Choice key={i} n={i} disabled={p.messageCount === 0} onClick={() => setA({ me: i as AuthorIndex })}>
                  {p.name}
                  <span className="ml-1.5 font-semibold opacity-60">· {nf.format(p.messageCount)} msj</span>
                </Choice>
              ))}
            </Choices>
          ) : current === 'name' ? (
            <Composer key="name" placeholder="Tu nombre o apodo" initial="" onSend={(v) => setA((p) => ({ ...p, name: v }))} />
          ) : current === 'relation' ? (
            <Choices label="Tipo de relación">
              {RELATIONS.map((r, i) => (
                <Choice key={r.id} n={i} onClick={() => setA((p) => ({ ...p, relation: r.id }))}>
                  {r.emoji} {r.label}
                </Choice>
              ))}
            </Choices>
          ) : current === 'alias' ? (
            <>
              {defaultAlias && (
                <Choices label="Nombre de la otra persona">
                  <Choice n={0} onClick={() => setA((p) => ({ ...p, alias: defaultAlias }))}>
                    Déjalo como «{defaultAlias}»
                  </Choice>
                </Choices>
              )}
              <div className={defaultAlias ? 'mt-2' : ''}>
                <Composer key="alias" placeholder="O escribe un apodo" initial="" onSend={(v) => setA((p) => ({ ...p, alias: v }))} />
              </div>
            </>
          ) : (
            <>
              {advanced && (
                <div className="chat-in mb-3 rounded-2xl bg-white px-4 pb-4 pt-1">
                  <Range label="Nueva conversación tras un silencio de" value={gap} min={1} max={24} unit="h" onChange={setGap} />
                  <Range label="Contar “visto” si no responde en" value={seen} min={2} max={72} unit="h" onChange={setSeen} />
                  <Range label="Silencio largo / posible bloqueo a partir de" value={silence} min={2} max={30} unit="días" onChange={setSilence} />
                </div>
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setAdvanced((v) => !v)} aria-expanded={advanced} className="press chip-in rounded-full bg-white px-5 py-3 font-extrabold text-wa-dark ring-1 ring-wa-teal/30 hover:bg-wa-bubble">
                  ⚙️ {advanced ? 'Ocultar ajustes' : 'Ajustes avanzados'}
                </button>
                <button
                  type="button"
                  onClick={submit}
                  style={{ animationDelay: '60ms' }}
                  className="press chip-in rounded-full bg-wa-green px-7 py-3 text-lg font-extrabold text-wa-ink shadow-[0_14px_30px_-14px_rgb(37_211_102/0.8)] hover:bg-[#3ee07a]"
                >
                  Analizar chat →
                </button>
              </div>
            </>
          )}
        </div>
      </footer>
    </main>
  );
}

/* ------------------------------- Piezas ------------------------------- */

function Choices(p: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={p.label} className="flex flex-wrap justify-end gap-2">
      {p.children}
    </div>
  );
}

function Choice(p: { n: number; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      disabled={p.disabled}
      onClick={p.onClick}
      style={{ animationDelay: `${p.n * 55}ms` }}
      className="press chip-in rounded-full bg-white px-4 py-2.5 font-extrabold text-wa-dark shadow-[0_1px_0.5px_rgb(11_20_26/0.13)] ring-1 ring-wa-teal/30 hover:bg-wa-bubble disabled:opacity-40"
    >
      {p.children}
    </button>
  );
}

/** Barra de escribir como la de WhatsApp. */
function Composer(p: { placeholder: string; initial: string; disabled?: boolean; onSend: (v: string) => void }) {
  const [v, setV] = useState(p.initial);
  const send = (e: FormEvent) => {
    e.preventDefault();
    const t = v.trim();
    if (t) p.onSend(t);
  };
  return (
    <form onSubmit={send} className="flex items-center gap-2">
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        disabled={p.disabled}
        maxLength={24}
        autoFocus={!p.disabled}
        placeholder={p.placeholder}
        aria-label={p.placeholder}
        className="min-w-0 flex-1 rounded-full bg-white px-5 py-3 text-base font-bold outline-none ring-2 ring-transparent transition placeholder:font-semibold placeholder:text-ink/40 focus:ring-wa-teal disabled:bg-white/60"
      />
      <button
        type="submit"
        disabled={p.disabled || !v.trim()}
        aria-label="Enviar"
        className="press grid h-12 w-12 shrink-0 place-items-center rounded-full bg-wa-teal text-white disabled:opacity-40"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 translate-x-px" fill="currentColor" aria-hidden>
          <path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2z" />
        </svg>
      </button>
    </form>
  );
}

function Range(p: { label: string; value: number; min: number; max: number; unit: string; onChange: (n: number) => void }) {
  return (
    <label className="mt-3 block">
      <span className="flex justify-between gap-3 text-sm font-bold">
        <span>{p.label}</span>
        <span className="shrink-0 whitespace-nowrap rounded-full bg-wa-bubble px-2 text-wa-dark">{p.value} {p.unit}</span>
      </span>
      <input type="range" min={p.min} max={p.max} value={p.value} onChange={(e) => p.onChange(Number(e.target.value))} className="mt-2 w-full accent-wa-teal" />
    </label>
  );
}
