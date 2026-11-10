/**
 * App: máquina de estados sencilla (subida → carga → setup → carga → informe).
 *
 * DECISIÓN: sin react-router ni gestor de estado. Hay 4 pantallas y una ruta
 * extra (#/privacidad); un `useState` con un tipo discriminado es más simple,
 * más pequeño y más fácil de razonar que añadir dependencias.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AnalysisOptions, Report } from './core/types';
import { generateDemoChat } from './core/demo';
import { AnalysisWorker, type ChatSummary, type ProgressStep } from './lib/workerClient';
import { loadSaved, saveReport, wipeStorage, type Saved } from './lib/storage';
import { UploadPage } from './pages/UploadPage';
import { SetupPage } from './pages/SetupPage';
import { LoadingPage } from './pages/LoadingPage';
import { ReportPage } from './pages/ReportPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { useI18n } from './lib/i18n';

type Stage =
  | { name: 'upload' }
  | { name: 'loading'; step: number; pct: number }
  | { name: 'setup'; summary: ChatSummary }
  // live: el chat de este informe sigue en el worker (se puede regenerar).
  | { name: 'report'; report: Report; options: AnalysisOptions; live: boolean };

const STEP_INDEX: Record<ProgressStep, number> = { read: 0, stats: 2, patterns: 3, report: 3 };
/** Tiempo mínimo de la pantalla de carga: que los pasos se lean, sin hacer esperar de más. */
const MIN_LOADING_MS = 1100;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const ERROR_CODES = ['GROUP', 'NO_TXT_IN_ZIP', 'NOT_WHATSAPP', 'EMPTY'] as const;
type ErrorCode = (typeof ERROR_CODES)[number] | 'generic';
const errorCode = (e: unknown): ErrorCode => {
  const c = (e as { code?: string }).code;
  return ERROR_CODES.find((x) => x === c) ?? 'generic';
};

export default function App() {
  const [route, setRoute] = useState(location.hash);
  const [stage, setStage] = useState<Stage>({ name: 'upload' });
  const { lang, t } = useI18n();
  const [error, setError] = useState<ErrorCode | null>(null);
  const [translating, setTranslating] = useState(false);
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
      setError(errorCode(e));
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
      setStage({ name: 'report', report, options, live: true });
      scrollTo(0, 0);
    } catch (e) {
      setError(errorCode(e));
      setStage({ name: 'upload' });
    }
  };

  // Cambio de idioma con el informe abierto: se regenera en segundo plano
  // (el chat sigue en el worker). Un informe guardado ya no tiene worker.
  useEffect(() => {
    if (stage.name !== 'report' || !stage.live || (stage.options.lang ?? 'es') === lang || !worker.current) return;
    let alive = true;
    const options = { ...stage.options, lang };
    setTranslating(true);
    worker.current
      .analyze(options)
      .then((report) => alive && setStage({ name: 'report', report, options, live: true }))
      .catch(() => {})
      .finally(() => alive && setTranslating(false));
    return () => {
      alive = false;
    };
  }, [lang, stage]);

  const onDemo = () => {
    const bytes = new TextEncoder().encode(generateDemoChat(42, lang));
    onFile(bytes.buffer as ArrayBuffer);
  };

  /** "Borrar todo": worker (chat en memoria), estado de React y almacenamiento. */
  const wipe = useCallback(() => {
    worker.current?.destroy();
    worker.current = null;
    wipeStorage();
    setSaved(null);
    setError(null);
    setStage({ name: 'upload' });
    scrollTo(0, 0);
  }, []);

  if (route === '#/privacidad') return <PrivacyPage onBack={() => (location.hash = '')} />;

  return (
    // La clave cambia con la pantalla: React la remonta y la animación de entrada se repite.
    <div key={stage.name} className="animate-stage">
      {stage.name === 'upload' && (
        <UploadPage
          onFile={onFile}
          onDemo={onDemo}
          error={error && t.errors[error]}
          saved={saved}
          onOpenSaved={() => {
            if (!saved) return;
            setStage({ name: 'report', report: saved.report, options: saved.options, live: false });
          }}
        />
      )}
      {stage.name === 'loading' && <LoadingPage step={stage.step} pct={stage.pct} />}
      {stage.name === 'setup' && <SetupPage summary={stage.summary} onSubmit={onAnalyze} onCancel={wipe} />}
      {stage.name === 'report' && (
        <ReportPage
          report={stage.report}
          options={stage.options}
          translating={translating}
          canTranslate={stage.live}
          onWipe={wipe}
          onNew={() => setStage({ name: 'upload' })}
          onSave={() => {
            const ok = saveReport({ report: stage.report, options: stage.options });
            if (ok) setSaved(loadSaved());
            return ok;
          }}
        />
      )}
    </div>
  );
}
