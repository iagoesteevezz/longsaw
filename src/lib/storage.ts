/**
 * Almacenamiento OPT-IN. Por defecto no guardamos nada: si cierras la
 * pestaña, todo desaparece. Solo si el usuario pulsa "Guardar en este
 * dispositivo" guardamos el INFORME (agregados + extractos), nunca el chat.
 * localStorage puede fallar (modo privado de Safari, cuota): try/catch siempre.
 */
import type { AnalysisOptions, Report } from '../core/types';
import type { AiResult } from '../core/anonymize';

const KEY = 'longsaw:saved-report:v1';

export interface Saved {
  report: Report;
  options: AnalysisOptions;
  ai: AiResult | null;
  unlocked: boolean;
  savedAt: number;
}

export function saveReport(data: Omit<Saved, 'savedAt'>): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
    return true;
  } catch {
    return false;
  }
}

export function loadSaved(): Saved | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

/** Borra todo lo que esta app haya podido guardar en el navegador. */
export function wipeStorage() {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith('longsaw:')) localStorage.removeItem(k);
    for (const k of Object.keys(sessionStorage)) if (k.startsWith('longsaw:')) sessionStorage.removeItem(k);
  } catch {
    /* almacenamiento no disponible: no hay nada que borrar */
  }
}
