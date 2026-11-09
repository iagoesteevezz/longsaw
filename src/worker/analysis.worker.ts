/**
 * Web Worker de análisis.
 *
 * POR QUÉ UN WORKER: un chat de varios años puede tener 200k+ mensajes. Parsear
 * y calcular en el hilo principal congelaría la UI (y la animación de carga).
 *
 * PRIVACIDAD: el chat parseado (todos los mensajes) vive SOLO aquí dentro.
 * Al hilo principal solo devolvemos los participantes (para el setup) y luego
 * el informe agregado. Al pulsar "Borrar todo" la UI termina el worker
 * (`worker.terminate()`), lo que libera esa memoria de inmediato.
 *
 * Protocolo (mensajes tipados en src/lib/workerClient.ts):
 *   → { type: 'parse', file: ArrayBuffer }   ← { type: 'parsed', summary }
 *   → { type: 'analyze', options }           ← { type: 'progress' }* , { type: 'report' }
 *   ← { type: 'error', code, message }
 */
/// <reference lib="webworker" />
import { parseWhatsApp, ParseError } from '../core/parser';
import { extractChatText } from '../core/zip';
import { analyze } from '../core/analyze';
import type { AnalysisOptions, ParsedChat } from '../core/types';

declare const self: DedicatedWorkerGlobalScope;

let chat: ParsedChat | null = null;

const post = (msg: unknown) => self.postMessage(msg);

self.onmessage = (e: MessageEvent) => {
  const msg = e.data as { type: 'parse'; file: ArrayBuffer } | { type: 'analyze'; options: AnalysisOptions };
  try {
    if (msg.type === 'parse') {
      post({ type: 'progress', step: 'read', pct: 5 });
      const text = extractChatText(new Uint8Array(msg.file));
      post({ type: 'progress', step: 'read', pct: 15 });
      chat = parseWhatsApp(text);
      post({
        type: 'parsed',
        summary: {
          participants: chat.participants,
          exporterGuess: chat.exporterGuess,
          locale: chat.locale,
          platform: chat.platform,
          totalMessages: chat.messages.length,
          firstTs: chat.messages[0]?.ts ?? 0,
          lastTs: chat.messages.at(-1)?.ts ?? 0,
          warnings: chat.warnings,
        },
      });
    } else if (msg.type === 'analyze') {
      if (!chat) throw new Error('No hay chat cargado.');
      const report = analyze(chat, msg.options, (step, pct) => post({ type: 'progress', step, pct }));
      post({ type: 'report', report });
    }
  } catch (err) {
    const code = err instanceof ParseError ? err.code : 'UNKNOWN';
    post({ type: 'error', code, message: (err as Error).message || 'Error desconocido' });
  }
};
