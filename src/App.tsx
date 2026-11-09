/**
 * App: máquina de estados sencilla (subida → carga → setup → carga → informe).
 *
 * DECISIÓN: sin react-router ni gestor de estado. Hay 4 pantallas y una ruta
 * extra (#/privacidad); un `useState` con un tipo discriminado es más simple,
 * más pequeño y más fácil de razonar que añadir dependencias.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AnalysisOptions, Report } from './core/types';
import type { AiResult } from './core/anonymize';
import { generateDemoChat } from './core/demo';
import { AnalysisWorker, type ChatSummary, type ProgressStep } from './lib/workerClient';
import { loadSaved, saveReport, wipeStorage, type Saved } from './lib/storage';
import { requestUnlock, PRICE_LABEL } from './lib/entitlements';
import { UploadPage } from './pages/UploadPage';
import { SetupPage } from './pages/SetupPage';
import { LoadingPage } from './pages/LoadingPage';
import { ReportPage } from './pages/ReportPage';
import { PrivacyPage } from './pages/PrivacyPage';

type Stage =
  | { name: 'upload' }
  | { name: 'loading'; step: number; pct: number }
  | { name: 'setup'; summary: ChatSummary }
  | { name: 'report'; report: Report; options: AnalysisOptions };

const STEP_INDEX: Record<ProgressStep, number> = { read: 0, stats: 2, patterns: 3, report: 3 };
/** Tiempo mínimo de la pantalla de carga: que los pasos se lean, sin hacer esperar de más. */
const MIN_LOADING_MS = 1100;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const ERRORS: Record<string, string> = {
  GROUP: 'Parece un chat de grupo. De momento solo analizamos chats entre dos personas.',
  NO_TXT_IN_ZIP: 'El .zip no contiene el .txt del chat. Vuelve a exportarlo desde WhatsApp.',
  NOT_WHATSAPP: 'No reconocemos el archivo como un chat de WhatsApp. Exporta el chat desde WhatsApp → Más → Exportar chat.',
  EMPTY: 'El chat no tiene mensajes de personas.',
};

export default function App() {
  const [route, setRoute] = useState(location.hash);
  const [stage, setStage] = useState<Stage>({ name: 'upload' });
  const [error, setError] = useState<string | null>(null);
  const [ai, setAi] = useState<AiResult | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [paywallMsg, setPaywallMsg] = useState(false);
  const [saved, setSaved] = useState<Saved | null>(() => loadSaved());
  const worker = useRef<AnalysisWorker | null>(null);

  useEffect(() => {
    const on = () => setRoute(location.hash);
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);

  /** Un worker nuevo por chat: al destruirlo se libera el chat de memoria. */
  const freshWorker = () => {
    worker.current?.destroy();
    const w = new AnalysisWorker();
    w.setProgress((step, pct) =>
      setStage((s) => (s.name === 'loading' ? { name: 'loading', step: Math.max(s.step, STEP_INDEX[step]), pct: Math.max(s.pct, pct) } : s)),
    );
    worker.current = w;
    return w;
  };

  const onFile = async (buf: ArrayBuffer) => {
    setError(null);
    setAi(null);
    setUnlocked(false);
    const t0 = performance.now();
    setStage({ name: 'loading', step: 0, pct: 2 });
    try {
      const summary = await freshWorker().parse(buf);
      setStage({ name: 'loading', step: 1, pct: 25 });
      await wait(Math.max(300, MIN_LOADING_MS / 2 - (performance.now() - t0)));
      setStage({ name: 'setup', summary });
    } catch (e) {
      worker.current?.destroy();
      worker.current = null;
      setError(ERRORS[(e as { code?: string }).code ?? ''] ?? (e as Error).message);
      setStage({ name: 'upload' });
    }
  };

  const onAnalyze = async (options: AnalysisOptions) => {
    const t0 = performance.now();
    setStage({ name: 'loading', step: 2, pct: 30 });
    try {
      const report = await worker.current!.analyze(options);
      setStage({ name: 'loading', step: 4, pct: 100 });
      await wait(Math.max(250, MIN_LOADING_MS - (performance.now() - t0)));
      setStage({ name: 'report', report, options });
      scrollTo(0, 0);
    } catch (e) {
      setError((e as Error).message);
      setStage({ name: 'upload' });
    }
  };

  const onDemo = () => {
    const bytes = new TextEncoder().encode(generateDemoChat());
    onFile(bytes.buffer as ArrayBuffer);
  };

  const onUnlock = async () => {
    if (await requestUnlock()) setUnlocked(true);
    else setPaywallMsg(true);
  };

  /** "Borrar todo": worker (chat en memoria), estado de React y almacenamiento. */
  const wipe = useCallback(() => {
    worker.current?.destroy();
    worker.current = null;
    wipeStorage();
    setSaved(null);
    setAi(null);
    setUnlocked(false);
    setError(null);
    setStage({ name: 'upload' });
    scrollTo(0, 0);
  }, []);

  if (route === '#/privacidad') return <PrivacyPage onBack={() => (location.hash = '')} />;

  return (
    <>
      {stage.name === 'upload' && (
        <UploadPage
          onFile={onFile}
          onDemo={onDemo}
          error={error}
          saved={saved}
          onOpenSaved={() => {
            if (!saved) return;
            setAi(saved.ai);
            setUnlocked(saved.unlocked);
            setStage({ name: 'report', report: saved.report, options: saved.options });
          }}
        />
      )}
      {stage.name === 'loading' && <LoadingPage step={stage.step} pct={stage.pct} />}
      {stage.name === 'setup' && <SetupPage summary={stage.summary} onSubmit={onAnalyze} onCancel={wipe} />}
      {stage.name === 'report' && (
        <ReportPage
          report={stage.report}
          options={stage.options}
          ai={ai}
          setAi={setAi}
          unlocked={unlocked}
          onUnlock={onUnlock}
          onWipe={wipe}
          onNew={() => setStage({ name: 'upload' })}
          onSave={() => {
            const ok = saveReport({ report: stage.report, options: stage.options, ai, unlocked });
            if (ok) setSaved(loadSaved());
            return ok;
          }}
        />
      )}
      {paywallMsg && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-6" role="dialog" aria-modal="true" onClick={() => setPaywallMsg(false)}>
          <div className="max-w-sm rounded-[2rem] bg-paper p-7 text-center" onClick={(e) => e.stopPropagation()}>
            <p className="text-4xl">🔓</p>
            <p className="mt-2 text-2xl font-extrabold">Pago único de {PRICE_LABEL}</p>
            <p className="mt-2 font-semibold">Los pagos llegan muy pronto. Esta versión es una demo del modelo freemium.</p>
            <button type="button" className="mt-5 rounded-full bg-ink px-6 py-3 font-extrabold text-white" onClick={() => setPaywallMsg(false)}>Vale</button>
          </div>
        </div>
      )}
    </>
  );
}
