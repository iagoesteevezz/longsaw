/**
 * Informe: cabecera + tarjetas de arriba abajo + acciones (PDF, guardar,
 * borrar todo). Todo gratis y todo en el navegador.
 *
 * Exportación: al compartir/descargar activamos (1) `data-exporting` en <html>
 * para ocultar botones y mostrar la marca, y (2) el modo de nombres ocultos
 * (por defecto). `flushSync` fuerza a React a pintar ese estado ANTES de la
 * captura; si no, la imagen saldría con los nombres reales.
 */
import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { AnalysisOptions, CaptionKey, Report } from '../core/types';
import { NamesProvider, displayNames, fillNames } from '../lib/names';
import { Wordmark } from '../components/Logo';
import { ThemeToggle } from '../components/ThemeToggle';
import { LangToggle } from '../components/LangToggle';
import { useI18n } from '../lib/i18n';
import { applyTheme, currentTheme } from '../lib/theme';
import { CARD_COLOR, CARD_ORDER, RELATIONS, isCardVisible, type CardId } from '../lib/relations';
import { exportPdf, nodeToPng, shareOrDownload } from '../lib/exporters';
import { Card, CountUp, FINISH_ANIMATIONS, useReveal } from '../components/ui';
import { DeletedBody, FirstBody, InitiatorBody, LongestBody, MessagesBody, ResponseBody, TimelineBody } from '../components/cards/BasicCards';
import { FlagsBody, InterestBody, SeenBody, SharedBody, SilenceBody, WordsBody } from '../components/cards/PatternCards';
import { MeaningBody, MoveBody, StyleBody } from '../components/cards/InsightCards';
import { LexiconBody, MediaBody } from '../components/cards/ExtraCards';
import { formatDate, nf } from '../core/format';

export function ReportPage(props: {
  report: Report;
  options: AnalysisOptions;
  onSave: () => boolean;
  onWipe: () => void;
  onNew: () => void;
  /** Se está regenerando en otro idioma. */
  translating: boolean;
  /** El chat sigue cargado: se puede regenerar al cambiar de idioma. */
  canTranslate: boolean;
}) {
  const { report: r, options: o } = props;
  const { lang, t } = useI18n();
  const rt = t.report;
  const [hidden, setHidden] = useState(false);
  const [showNamesOnShare, setShowNamesOnShare] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const relation = RELATIONS.find((x) => x.id === o.relation)!;
  const heroRef = useReveal<HTMLElement>();

  /** Ejecuta `fn` con la UI en "modo exportación" y la restaura siempre. */
  async function withExportMode<T>(fn: () => Promise<T>): Promise<T> {
    flushSync(() => setHidden(!showNamesOnShare));
    // Imágenes y PDF siempre en tema claro, como la portada del PDF.
    const theme = currentTheme();
    applyTheme('light');
    document.documentElement.dataset.exporting = 'true';
    dispatchEvent(new Event(FINISH_ANIMATIONS));
    // Dos frames: uno para aplicar estilos, otro para que el layout se asiente.
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
    try {
      return await fn();
    } finally {
      delete document.documentElement.dataset.exporting;
      applyTheme(theme);
      setHidden(false);
    }
  }

  const shareCard = (el: HTMLElement) =>
    withExportMode(async () => {
      setBusy(rt.creatingImage);
      try {
        await shareOrDownload(await nodeToPng(el), `longsaw-${el.dataset.card}.png`, t.pdf.shareTitle);
      } finally {
        setBusy(null);
      }
    });

  const downloadPdf = () =>
    withExportMode(async () => {
      setBusy(rt.generatingPdf);
      try {
        const names = displayNames(r.meta.participants, o.me, o.otherAlias, !showNamesOnShare, o.myAlias);
        const fill = (s: string) => fillNames(s, names);
        const nodes = [...(list.current?.querySelectorAll<HTMLElement>('[data-card]') ?? [])];
        await exportPdf(nodes, {
          title: t.pdf.title(names[o.me], names[o.me === 0 ? 1 : 0]),
          subtitle: `${t.relations[o.relation]} · ${formatDate(r.meta.firstTs)} – ${formatDate(r.meta.lastTs)}`,
          stats: [
            [t.pdf.stats[0], nf.format(r.meta.totalMessages)],
            [t.pdf.stats[1], nf.format(r.meta.durationDays)],
            [t.pdf.stats[2], nf.format(r.initiations.sessions)],
            [t.pdf.stats[3], nf.format(r.timeline.longestStreakDays)],
          ],
          split: { label: t.pdf.split, names, values: r.counts.messages },
          highlights: r.insights.noticed.slice(0, 4).map(fill),
          labels: { kicker: t.pdf.kicker, noticed: t.pdf.noticed, footer: t.pdf.footer, file: t.pdf.file, pct: t.common.pct },
        });
      } finally {
        setBusy(null);
      }
    });

  const body = (id: CardId) => {
    switch (id) {
      case 'messages': return <MessagesBody r={r} />;
      case 'response': return <ResponseBody r={r} />;
      case 'first': return <FirstBody r={r} />;
      case 'initiator': return <InitiatorBody r={r} gapHours={o.sessionGapHours} />;
      case 'media': return <MediaBody r={r} />;
      case 'lexicon': return <LexiconBody r={r} />;
      case 'longest': return <LongestBody r={r} />;
      case 'deleted': return <DeletedBody r={r} />;
      case 'timeline': return <TimelineBody r={r} />;
      case 'interest': return <InterestBody r={r} />;
      case 'seen': return <SeenBody r={r} hours={o.seenThresholdHours} />;
      case 'silence': return <SilenceBody r={r} days={o.silenceDays} />;
      case 'words': return <WordsBody r={r} />;
      case 'shared': return <SharedBody r={r} />;
      case 'flags': return <FlagsBody r={r} />;
      case 'style': return <StyleBody r={r} />;
      case 'meaning': return <MeaningBody r={r} />;
      case 'move': return <MoveBody r={r} />;
    }
  };

  const otherName = hidden ? t.common.persons[1] : o.otherAlias;
  const otherLang = (o.lang ?? 'es') !== lang;

  return (
    <NamesProvider realNames={r.meta.participants} me={o.me} alias={o.otherAlias} myAlias={o.myAlias} hidden={hidden}>
      <div className="mx-auto max-w-xl px-4 pb-24">
        {/* Barra superior */}
        <nav className="export-hide sticky top-0 z-30 -mx-4 flex items-center gap-2 overflow-x-auto bg-paper/85 px-4 py-3 backdrop-blur">
          <button type="button" onClick={props.onNew} className="press shrink-0 text-xl text-wa-dark dark:text-wa-green" aria-label={rt.newAria}>
            <Wordmark markClassName="h-8 w-8" />
          </button>
          <span className="flex-1" />
          <LangToggle variant="solid" />
          <ThemeToggle variant="solid" />
          <button type="button" onClick={downloadPdf} className="press shrink-0 rounded-full bg-surface px-4 py-2 text-sm font-bold">⬇︎ PDF</button>
          <button type="button" onClick={props.onWipe} className="press shrink-0 rounded-full bg-card-red px-4 py-2 text-sm font-bold" aria-label={rt.wipe}>🗑️<span className="hidden sm:inline"> {rt.wipe}</span></button>
        </nav>

        {otherLang && (
          <p role="status" className="export-hide mt-4 rounded-2xl bg-card-yellow px-4 py-3 text-sm font-bold">
            {props.translating || props.canTranslate ? `⏳ ${rt.translating}` : rt.otherLang}
          </p>
        )}

        {/* Portada del informe */}
        <header ref={heroRef} className="reveal wa-gradient relative mt-4 overflow-hidden rounded-[2rem] p-7 text-white">
          <span aria-hidden className="pointer-events-none absolute -right-6 -top-8 text-[9rem] leading-none opacity-15">💬</span>
          <p className="text-sm font-bold uppercase tracking-widest text-white/70">{rt.kicker} · {relation.emoji} {t.relations[o.relation]}</p>
          <h1 className="mt-3 text-5xl font-extrabold leading-[0.95]">{rt.youAnd(otherName)}</h1>
          <p className="mt-3 font-semibold text-white/80">{formatDate(r.meta.firstTs)} → {formatDate(r.meta.lastTs)}</p>
          <dl className="mt-6 grid grid-cols-3 gap-3">
            {([[rt.heroStats[0], r.meta.totalMessages], [rt.heroStats[1], r.meta.durationDays], [rt.heroStats[2], r.initiations.sessions]] as const).map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-white/12 px-3 py-3">
                <dd className="num text-3xl"><CountUp value={v} /></dd>
                <dt className="mt-1 text-xs font-bold uppercase tracking-wider text-white/70">{k}</dt>
              </div>
            ))}
          </dl>
          {r.meta.warnings.map((w) => <p key={w.code} className="mt-3 text-sm font-semibold text-white/80">⚠️ {t.warning(w)}</p>)}
        </header>

        <div ref={list} className="mt-4 flex flex-col gap-4">
          {CARD_ORDER.filter((id) => isCardVisible(id, o.relation)).map((id, i) => {
            const copy = t.cardCopy(id, o.relation);
            return (
              <Card
                key={id}
                id={id}
                index={i}
                kicker={copy.kicker}
                title={copy.title}
                color={CARD_COLOR[id]}
                caption={r.insights.captions[id as CaptionKey]}
                onShare={shareCard}
              >
                {body(id)}
              </Card>
            );
          })}
        </div>

        {/* Ajustes de privacidad del informe */}
        <section className="export-hide mt-6 space-y-3 rounded-[2rem] bg-surface p-6">
          <label className="flex items-center justify-between gap-4 font-bold">
            <span>{rt.showNames}</span>
            <input type="checkbox" checked={showNamesOnShare} onChange={(e) => setShowNamesOnShare(e.target.checked)} className="h-6 w-6 accent-wa-dark" />
          </label>
          <label className="flex items-center justify-between gap-4 font-bold">
            <span>{rt.hideNames}</span>
            <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} className="h-6 w-6 accent-wa-dark" />
          </label>
          <button type="button" onClick={() => setSaved(props.onSave())} className="press w-full rounded-full bg-wa-green px-5 py-3 font-extrabold text-wa-ink">
            {saved ? rt.saved : rt.save}
          </button>
          <p className="text-sm font-semibold opacity-60">{rt.saveNote}</p>
          <a href="#/privacidad" className="block text-sm font-bold underline">{t.common.howData}</a>
        </section>
      </div>

      {busy && (
        <div className="export-hide fixed inset-x-0 bottom-4 z-40 mx-auto w-fit rounded-full bg-wa-dark px-5 py-3 font-bold text-white shadow-xl" role="status">
          {busy}
        </div>
      )}
    </NamesProvider>
  );
}
