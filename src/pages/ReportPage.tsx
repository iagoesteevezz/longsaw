/**
 * Informe: cabecera + tarjetas de arriba abajo + acciones (IA, PDF, guardar,
 * borrar todo).
 *
 * Exportación: al compartir/descargar activamos (1) `data-exporting` en <html>
 * para ocultar botones y mostrar la marca, y (2) el modo de nombres ocultos
 * (por defecto). `flushSync` fuerza a React a pintar ese estado ANTES de la
 * captura; si no, la imagen saldría con los nombres reales.
 */
import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { AnalysisOptions, Report } from '../core/types';
import { buildAiPayload, type AiPayload, type AiResult } from '../core/anonymize';
import { NamesProvider } from '../lib/names';
import { CARD_COLOR, CARD_ORDER, RELATIONS, cardCopy, isCardVisible, type CardId } from '../lib/relations';
import { FREE_CARDS, PRICE_LABEL } from '../lib/entitlements';
import { exportPdf, nodeToPng, shareOrDownload } from '../lib/exporters';
import { interpret } from '../lib/ai';
import { Card } from '../components/ui';
import { AiConsentModal } from '../components/AiConsentModal';
import { DeletedBody, FirstBody, InitiatorBody, LongestBody, MessagesBody, ResponseBody, TimelineBody } from '../components/cards/BasicCards';
import { FlagsBody, InterestBody, SeenBody, SharedBody, SilenceBody, WordsBody } from '../components/cards/PatternCards';
import { MeaningBody, MoveBody, StyleBody } from '../components/cards/InsightCards';
import { formatDate } from '../core/format';

export function ReportPage(props: {
  report: Report;
  options: AnalysisOptions;
  ai: AiResult | null;
  setAi: (a: AiResult) => void;
  unlocked: boolean;
  onUnlock: () => void;
  onSave: () => boolean;
  onWipe: () => void;
  onNew: () => void;
}) {
  const { report: r, options: o, ai } = props;
  const [hidden, setHidden] = useState(false);
  const [showNamesOnShare, setShowNamesOnShare] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiErr, setAiErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const relation = RELATIONS.find((x) => x.id === o.relation)!;
  const isLocked = (id: CardId) => !props.unlocked && !FREE_CARDS.has(id);

  /** Ejecuta `fn` con la UI en "modo exportación" y la restaura siempre. */
  async function withExportMode<T>(fn: () => Promise<T>): Promise<T> {
    flushSync(() => setHidden(!showNamesOnShare));
    document.documentElement.dataset.exporting = 'true';
    // Dos frames: uno para aplicar estilos, otro para que el layout se asiente.
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
    try {
      return await fn();
    } finally {
      delete document.documentElement.dataset.exporting;
      setHidden(false);
    }
  }

  const shareCard = (el: HTMLElement) =>
    withExportMode(async () => {
      setBusy('Creando imagen…');
      try {
        await shareOrDownload(await nodeToPng(el), `longsaw-${el.dataset.card}.png`);
      } finally {
        setBusy(null);
      }
    });

  const downloadPdf = () => {
    if (!props.unlocked) return props.onUnlock();
    return withExportMode(async () => {
      setBusy('Generando PDF…');
      try {
        const nodes = [...(list.current?.querySelectorAll<HTMLElement>('[data-card][data-locked="false"]') ?? [])];
        await exportPdf(nodes, `Informe de chat · ${formatDate(r.meta.firstTs)} – ${formatDate(r.meta.lastTs)}`);
      } finally {
        setBusy(null);
      }
    });
  };

  const sendAi = async (payload: AiPayload) => {
    setBusy('La IA está leyendo los fragmentos…');
    setAiErr(null);
    try {
      props.setAi(await interpret(payload));
      setAiOpen(false);
    } catch (e) {
      setAiErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const body = (id: CardId) => {
    switch (id) {
      case 'messages': return <MessagesBody r={r} />;
      case 'response': return <ResponseBody r={r} />;
      case 'first': return <FirstBody r={r} />;
      case 'initiator': return <InitiatorBody r={r} gapHours={o.sessionGapHours} />;
      case 'longest': return <LongestBody r={r} />;
      case 'deleted': return <DeletedBody r={r} />;
      case 'timeline': return <TimelineBody r={r} />;
      case 'interest': return <InterestBody r={r} />;
      case 'seen': return <SeenBody r={r} hours={o.seenThresholdHours} />;
      case 'silence': return <SilenceBody r={r} days={o.silenceDays} />;
      case 'words': return <WordsBody r={r} />;
      case 'shared': return <SharedBody r={r} />;
      case 'flags': return <FlagsBody r={r} ai={ai} />;
      case 'style': return <StyleBody r={r} ai={ai} />;
      case 'meaning': return <MeaningBody r={r} ai={ai} />;
      case 'move': return <MoveBody r={r} ai={ai} />;
    }
  };
  const aiCards: CardId[] = ['flags', 'style', 'meaning', 'move'];

  return (
    <NamesProvider realNames={r.meta.participants} me={o.me} alias={o.otherAlias} hidden={hidden}>
      <div className="mx-auto max-w-xl px-4 pb-24">
        {/* Barra superior */}
        <nav className="export-hide sticky top-0 z-30 -mx-4 flex items-center gap-2 overflow-x-auto bg-paper/90 px-4 py-3 backdrop-blur">
          <button type="button" onClick={props.onNew} className="shrink-0 font-extrabold">💬 longsaw</button>
          <span className="flex-1" />
          <button type="button" onClick={() => (props.unlocked ? setAiOpen(true) : props.onUnlock())} className="shrink-0 rounded-full bg-card-lavender px-4 py-2 text-sm font-bold">
            ✨ {ai ? 'IA aplicada' : 'IA'}
          </button>
          <button type="button" onClick={downloadPdf} className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-bold">⬇︎ PDF</button>
          <button type="button" onClick={props.onWipe} className="shrink-0 rounded-full bg-card-red px-4 py-2 text-sm font-bold" aria-label="Borrar todo">🗑️<span className="hidden sm:inline"> Borrar todo</span></button>
        </nav>

        {/* Portada del informe */}
        <header className="mt-4 rounded-[2rem] bg-ink p-7 text-white">
          <p className="text-sm font-bold uppercase tracking-widest opacity-60">Informe · {relation.emoji} {relation.label}</p>
          <h1 className="mt-3 text-5xl font-extrabold leading-[0.95]">
            Tú y {hidden ? 'Persona B' : o.otherAlias}
          </h1>
          <p className="mt-3 font-semibold opacity-80">{formatDate(r.meta.firstTs)} → {formatDate(r.meta.lastTs)}</p>
          {r.meta.warnings.map((w) => <p key={w} className="mt-2 text-sm font-semibold opacity-80">⚠️ {w}</p>)}
        </header>

        <div ref={list} className="mt-4 flex flex-col gap-4">
          {CARD_ORDER.filter((id) => isCardVisible(id, o.relation)).map((id) => {
            const copy = cardCopy(id, o.relation);
            return (
              <Card
                key={id}
                id={id}
                kicker={copy.kicker}
                title={copy.title}
                color={CARD_COLOR[id]}
                locked={isLocked(id)}
                onUnlock={props.onUnlock}
                onShare={shareCard}
                badge={ai && aiCards.includes(id) ? <span className="rounded-full bg-white/70 px-2 py-1 text-xs font-bold">✨ IA</span> : undefined}
              >
                {body(id)}
              </Card>
            );
          })}
        </div>

        {!props.unlocked && (
          <section className="mt-6 rounded-[2rem] bg-card-pink p-7 text-center">
            <p className="text-3xl font-extrabold leading-tight">Ver el informe completo</p>
            <p className="mt-2 font-semibold">Interés, vistos, red flags, estilo, interpretación, the move y PDF. Pago único por informe.</p>
            <button type="button" onClick={props.onUnlock} className="mt-5 rounded-full bg-ink px-7 py-4 text-lg font-extrabold text-white">
              Desbloquear · {PRICE_LABEL}
            </button>
          </section>
        )}

        {/* Ajustes de privacidad del informe */}
        <section className="export-hide mt-6 space-y-3 rounded-[2rem] bg-white p-6">
          <label className="flex items-center justify-between gap-4 font-bold">
            <span>Mostrar nombres al compartir o descargar</span>
            <input type="checkbox" checked={showNamesOnShare} onChange={(e) => setShowNamesOnShare(e.target.checked)} className="h-6 w-6 accent-ink" />
          </label>
          <label className="flex items-center justify-between gap-4 font-bold">
            <span>Ocultar nombres también en pantalla</span>
            <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} className="h-6 w-6 accent-ink" />
          </label>
          <button
            type="button"
            onClick={() => setSaved(props.onSave())}
            className="w-full rounded-full bg-card-green px-5 py-3 font-extrabold"
          >
            {saved ? '✓ Guardado en este navegador' : 'Guardar informe en este dispositivo'}
          </button>
          <p className="text-sm font-semibold opacity-60">Guarda solo el informe (no el chat). “Borrar todo” lo elimina.</p>
          <a href="#/privacidad" className="block text-sm font-bold underline">Cómo tratamos tus datos</a>
        </section>
      </div>

      {busy && (
        <div className="export-hide fixed inset-x-0 bottom-4 z-40 mx-auto w-fit rounded-full bg-ink px-5 py-3 font-bold text-white shadow-xl" role="status">
          {busy}
        </div>
      )}

      {aiOpen && (
        <AiConsentModal
          payload={buildAiPayload(r, o)}
          onCancel={() => setAiOpen(false)}
          onSend={sendAi}
          sending={!!busy}
          error={aiErr}
        />
      )}
    </NamesProvider>
  );
}
