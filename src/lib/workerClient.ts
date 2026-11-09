/**
 * Cliente tipado del Web Worker. Envuelve postMessage en promesas para que la
 * UI pueda hacer `await client.parse(file)` y `await client.analyze(opts)`.
 */
import type { AnalysisOptions, AuthorIndex, LocaleCode, Participant, Platform, Report } from '../core/types';

export interface ChatSummary {
  participants: Participant[];
  exporterGuess: AuthorIndex | null;
  locale: LocaleCode;
  platform: Platform;
  totalMessages: number;
  firstTs: number;
  lastTs: number;
  warnings: string[];
}

export type ProgressStep = 'read' | 'stats' | 'patterns' | 'report';
export type OnProgress = (step: ProgressStep, pct: number) => void;

export class AnalysisWorker {
  private worker: Worker;
  private onProgress: OnProgress = () => {};

  constructor() {
    // Sintaxis que Vite entiende para empaquetar el worker como módulo ES.
    this.worker = new Worker(new URL('../worker/analysis.worker.ts', import.meta.url), { type: 'module' });
  }

  setProgress(fn: OnProgress) {
    this.onProgress = fn;
  }

  private request<T>(msg: unknown, transfer: Transferable[], expect: string, key: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const handler = (e: MessageEvent) => {
        const d = e.data;
        if (d.type === 'progress') return this.onProgress(d.step, d.pct);
        this.worker.removeEventListener('message', handler);
        if (d.type === expect) resolve(d[key]);
        else if (d.type === 'error') reject(Object.assign(new Error(d.message), { code: d.code }));
      };
      this.worker.addEventListener('message', handler);
      this.worker.postMessage(msg, transfer);
    });
  }

  /** El ArrayBuffer se TRANSFIERE (no se copia): el hilo principal deja de tenerlo. */
  parse(file: ArrayBuffer) {
    return this.request<ChatSummary>({ type: 'parse', file }, [file], 'parsed', 'summary');
  }

  analyze(options: AnalysisOptions) {
    return this.request<Report>({ type: 'analyze', options }, [], 'report', 'report');
  }

  /** Destruye el worker y con él todos los mensajes en memoria. */
  destroy() {
    this.worker.terminate();
  }
}
