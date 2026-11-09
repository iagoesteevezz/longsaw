/**
 * Pantalla de carga con pasos. Los pasos reflejan lo que de verdad ocurre en
 * el Worker (no es un spinner decorativo):
 *  1. Leyendo archivo  — descompresión del zip y lectura del .txt
 *  2. Anonimizando     — los nombres se separan de los mensajes (índices 0/1)
 *  3. Calculando       — estadísticas
 *  4. Generando informe — patrones, flags e interpretación por reglas
 */
export const LOADING_STEPS = ['Leyendo archivo', 'Anonimizando', 'Calculando estadísticas', 'Generando informe'];

export function LoadingPage({ step, pct }: { step: number; pct: number }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6" aria-live="polite" aria-busy="true">
      <p className="text-6xl" aria-hidden>
        <span className="inline-block animate-bounce">💬</span>
      </p>
      <h1 className="mt-4 text-4xl font-extrabold leading-tight">Analizando en tu dispositivo…</h1>
      <div className="mt-6 h-3 overflow-hidden rounded-full bg-white" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-ink transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
      <ol className="mt-8 space-y-3">
        {LOADING_STEPS.map((s, i) => (
          <li
            key={s}
            className={`flex items-center gap-3 rounded-3xl px-5 py-4 text-lg font-extrabold transition ${
              i < step ? 'bg-card-green' : i === step ? 'bg-card-yellow' : 'bg-white opacity-50'
            }`}
          >
            <span aria-hidden>{i < step ? '✅' : i === step ? '⏳' : '○'}</span>
            {s}
          </li>
        ))}
      </ol>
      <p className="mt-6 text-sm font-semibold opacity-60">Nada de esto sale de tu navegador.</p>
    </main>
  );
}
