/**
 * Pantalla de carga con pasos. Los pasos reflejan lo que de verdad ocurre en
 * el Worker (no es un spinner decorativo):
 *  1. Leyendo archivo  — descompresión del zip y lectura del .txt
 *  2. Anonimizando     — los nombres se separan de los mensajes (índices 0/1)
 *  3. Calculando       — estadísticas
 *  4. Generando informe — patrones, flags y frases por reglas
 * Cada paso es un mensaje: el actual "se está escribiendo" y los hechos
 * llevan el doble tick azul.
 */
import { Ticks } from '../components/ChatToChart';

export const LOADING_STEPS = ['Leyendo archivo', 'Anonimizando', 'Calculando estadísticas', 'Generando informe'];

export function LoadingPage({ step, pct }: { step: number; pct: number }) {
  return (
    <main className="wa-gradient relative flex min-h-dvh flex-col justify-center overflow-hidden px-5 text-white" aria-live="polite" aria-busy="true">
      <span aria-hidden className="pointer-events-none absolute -right-10 top-10 text-[12rem] leading-none opacity-10">💬</span>
      <div className="mx-auto w-full max-w-md">
        <p className="text-sm font-bold uppercase tracking-widest text-white/70">Un momento</p>
        <h1 className="mt-3 text-balance text-5xl font-extrabold leading-[0.95] tracking-[-0.03em]">
          Leyendo <span className="inline-block -rotate-2 rounded-2xl bg-wa-green px-2 text-wa-ink">vuestro chat</span>…
        </h1>

        <div className="mt-8 h-2.5 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progreso del análisis">
          <div className="h-full rounded-full bg-wa-green transition-[width] duration-500 ease-out" style={{ width: `${pct}%` }} />
        </div>

        <ol className="phone-screen mt-6 flex min-h-[15.5rem] flex-col gap-2 rounded-[1.75rem] p-4 shadow-[0_30px_60px_-30px_rgb(0_0_0/0.6)]">
          {LOADING_STEPS.map((s, i) => {
            if (i > step) return null;
            if (i === step) {
              return (
                <li key={s} className="flex items-center gap-2">
                  <span className="typing" aria-hidden><i /><i /><i /></span>
                  <span className="text-sm font-bold text-ink/60">{s}…</span>
                </li>
              );
            }
            return (
              <li key={s} className="msg me !max-w-[85%] text-base font-bold">
                <span className="body">{s}</span>
                <span className="meta">
                  listo <Ticks read />
                </span>
              </li>
            );
          })}
        </ol>

        <p className="mt-6 flex items-center gap-2 text-sm font-semibold text-white/75">
          <span aria-hidden className="text-wa-green">🔒</span> Nada de esto sale de tu navegador.
        </p>
      </div>
    </main>
  );
}
