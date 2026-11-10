/**
 * Portada + subida del archivo. El archivo se lee con arrayBuffer y se
 * transfiere al Worker: no hay <form> ni petición de red. Toda la página es
 * zona de arrastre.
 */
import { useRef, useState, type ReactNode } from 'react';
import type { Saved } from '../lib/storage';
import { ChatToChart } from '../components/ChatToChart';
import { useReveal } from '../components/ui';
import { Wordmark } from '../components/Logo';

function Reveal({ children, className = '', variant = '' }: { children: ReactNode; className?: string; variant?: '' | 'from-left' | 'from-right' | 'zoom' }) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={`reveal ${variant} ${className}`}>
      {children}
    </div>
  );
}

function LockIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function UploadIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 15V4M7.5 8.5 12 4l4.5 4.5" />
      <path d="M4.5 14.5v3a2.5 2.5 0 0 0 2.5 2.5h10a2.5 2.5 0 0 0 2.5-2.5v-3" />
    </svg>
  );
}

const DISCOVER: { t: string; c: string; r: number }[] = [
  { t: '¿Quién habla más?', c: 'bg-card-mint', r: -3 },
  { t: 'Tiempos de respuesta', c: 'bg-card-blue', r: 2 },
  { t: 'Quién escribe primero', c: 'bg-card-green', r: -1 },
  { t: 'Fotos, audios y stickers', c: 'bg-card-sky', r: 3 },
  { t: 'Risas, cariño y pullitas', c: 'bg-card-pink', r: -2 },
  { t: 'El mensaje más largo', c: 'bg-card-lavender', r: 1 },
  { t: 'Te dejó en visto', c: 'bg-card-yellow', r: -3 },
  { t: 'Silencios largos', c: 'bg-card-periwinkle', r: 2 },
  { t: 'Vuestras palabras', c: 'bg-card-lilac', r: -1 },
  { t: 'Red flags', c: 'bg-card-red', r: 3 },
  { t: 'Nivel de interés', c: 'bg-card-peach', r: -2 },
  { t: 'Y ahora, ¿qué?', c: 'bg-card-cream', r: 1 },
];

const SAMPLE_LINES = [
  'Sam manda 47 audios. Pódcast propio, sin suscripción.',
  'Alex empieza el 78 % de las conversaciones. Si Alex no escribe, aquí no habla nadie.',
  'La risa de Sam suena a «jsjsjs». Su récord: «jsjsjsjsjsjs».',
];

export function UploadPage(props: {
  onFile: (buf: ArrayBuffer) => void;
  onDemo: () => void;
  saved: Saved | null;
  onOpenSaved: () => void;
  error: string | null;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const handle = async (file: File | undefined) => {
    if (!file) return;
    props.onFile(await file.arrayBuffer());
  };
  const pick = () => input.current?.click();

  return (
    <main
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDrag(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        handle(e.dataTransfer.files[0]);
      }}
    >
      <input
        ref={input}
        type="file"
        accept=".txt,.zip,text/plain,application/zip"
        className="sr-only"
        onChange={(e) => handle(e.target.files?.[0])}
        aria-label="Archivo de chat exportado de WhatsApp"
      />

      {/* ------------------------------- Hero ------------------------------- */}
      <section className={`wa-gradient relative overflow-hidden text-white transition-shadow ${drag ? 'drop-glow' : ''}`}>
        <div className="mx-auto max-w-6xl px-5 pb-16 pt-6 sm:px-8 lg:pb-24">
          <header className="flex items-center justify-between">
            <Wordmark className="text-[1.7rem]" markClassName="h-10 w-10 rounded-[0.6rem] ring-1 ring-white/15" />
            <a href="#/privacidad" className="press rounded-full bg-white/12 px-4 py-2 text-sm font-bold ring-1 ring-white/20 hover:bg-white/20">
              Privacidad
            </a>
          </header>

          <div className="mt-10 grid items-center gap-12 lg:mt-14 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <h1 className="text-balance text-[3.1rem] font-extrabold leading-[0.92] tracking-[-0.035em] sm:text-7xl lg:text-[5.4rem]">
                ¿Qué dice{' '}
                <span className="relative inline-block -rotate-2 rounded-2xl bg-wa-green px-3 text-wa-ink">vuestro chat</span>{' '}
                de vosotros?
              </h1>
              <p className="mt-6 max-w-[34rem] text-lg font-semibold leading-snug text-white/85 sm:text-xl">
                Sube un chat exportado de WhatsApp y descubre quién escribe más, quién tarda en contestar, quién se ríe más y
                quién manda más audios. Gratis, al momento y sin que el chat salga de tu móvil.
              </p>

              {props.error && (
                <div role="alert" className="mt-6 max-w-[34rem] rounded-2xl bg-card-red px-5 py-4 font-bold text-ink">
                  {props.error}
                </div>
              )}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={pick}
                  className="press inline-flex items-center justify-center gap-2 rounded-full bg-wa-green px-7 py-4 text-lg font-extrabold text-wa-ink shadow-[0_14px_30px_-14px_rgb(37_211_102/0.8)] hover:bg-[#3ee07a]"
                >
                  <UploadIcon className="h-5 w-5" /> Elegir archivo
                </button>
                <button type="button" onClick={props.onDemo} className="press rounded-full px-7 py-4 text-lg font-extrabold ring-2 ring-white/40 hover:bg-white/10">
                  Probar con un chat de ejemplo
                </button>
              </div>
              {props.saved && (
                <button type="button" onClick={props.onOpenSaved} className="press mt-3 text-base font-bold underline hover:text-wa-green">
                  Abrir el informe que guardaste →
                </button>
              )}
              <p className="mt-3 hidden text-sm font-semibold text-white/65 sm:block">…o arrastra aquí el .txt o el .zip exportado.</p>

              <p className="mt-8 flex max-w-[34rem] items-start gap-3 rounded-2xl bg-black/15 px-4 py-3 font-semibold leading-snug ring-1 ring-white/10">
                <LockIcon className="mt-0.5 h-5 w-5 shrink-0 text-wa-green" />
                <span>
                  <b>Todo ocurre en tu navegador. Nada se sube.</b> <span className="text-white/75">Sin cuentas, sin servidores y sin IA externa.</span>
                </span>
              </p>
            </div>

            <div className="flex justify-center lg:justify-end">
              <div className="relative">
                <span aria-hidden className="absolute -inset-10 -z-0 rounded-full bg-wa-green/20 blur-3xl" />
                <div className="relative">
                  <ChatToChart />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------- Cómo exportar --------------------------- */}
      <section className="mx-auto max-w-3xl px-5 py-20 sm:px-8">
        <Reveal>
          <h2 className="text-balance text-4xl font-extrabold leading-none tracking-tight sm:text-5xl">Exporta tu chat en 20 segundos</h2>
          <p className="mt-3 max-w-xl text-lg font-semibold opacity-75">Solo chats entre dos personas. Funciona con iPhone y Android, en español o inglés.</p>
        </Reveal>
        <ol className="mt-10 flex flex-col gap-3">
          {[
            ['Abre el chat en WhatsApp', 'El de la persona que quieras analizar.'],
            ['Toca su nombre (iPhone) o ⋮ → Más (Android) → Exportar chat', 'Elige “Sin archivos”: es más rápido y contamos igual las fotos, audios y stickers.'],
            ['Guárdalo y súbelo aquí', 'El .zip del iPhone o el .txt de Android, tal cual.'],
          ].map(([t, d], i) => (
            <li key={t} className={i % 2 ? 'self-end' : 'self-start'}>
              <Reveal variant={i % 2 ? 'from-right' : 'from-left'}>
                <div className={`max-w-md px-5 py-4 shadow-[0_2px_0_rgb(0_0_0/0.05)] ${i % 2 ? 'rounded-3xl rounded-tr-md bg-wa-bubble' : 'rounded-3xl rounded-tl-md bg-white'}`}>
                  <p className="text-lg font-extrabold leading-tight">
                    <span className="mr-2 text-wa-teal">{i + 1}.</span>
                    {t}
                  </p>
                  <p className="mt-1 font-semibold leading-snug opacity-70">{d}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      {/* --------------------------- Qué descubrirás -------------------------- */}
      <section className="bg-white/55 py-20">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <Reveal>
            <h2 className="text-balance text-4xl font-extrabold leading-none tracking-tight sm:text-5xl">18 tarjetas sobre vosotros</h2>
            <p className="mt-3 max-w-xl text-lg font-semibold opacity-75">Con números exactos y comentarios con algo de mala leche (y cariño). Todas gratis.</p>
          </Reveal>
          <Reveal variant="zoom" className="mt-10">
            <ul className="flex flex-wrap gap-3">
              {DISCOVER.map((d) => (
                <li key={d.t} className={`sticker rounded-2xl px-5 py-3 text-lg font-extrabold ${d.c}`} style={{ transform: `rotate(${d.r}deg)` }}>
                  {d.t}
                </li>
              ))}
            </ul>
          </Reveal>
          <div className="mt-12 flex flex-col gap-3">
            {SAMPLE_LINES.map((l, i) => (
              <Reveal key={l} variant={i % 2 ? 'from-right' : 'from-left'} className={i % 2 ? 'self-end' : 'self-start'}>
                <p className="bubble-in max-w-md text-lg !bg-white">{l}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------ Privacidad ----------------------------- */}
      <section className="px-5 py-20 sm:px-8">
        <Reveal variant="zoom" className="mx-auto max-w-5xl">
          <div className="wa-gradient rounded-[2.5rem] px-7 py-12 text-white sm:px-12">
            <LockIcon className="h-10 w-10 text-wa-green" />
            <h2 className="mt-4 max-w-2xl text-balance text-4xl font-extrabold leading-none tracking-tight sm:text-6xl">Tu chat no sale de este dispositivo</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              <p className="font-semibold leading-snug text-white/85"><b className="block text-lg text-white">Se analiza aquí</b>El archivo se lee en tu navegador. Puedes mirar la pestaña “Red”: no sale ninguna petición.</p>
              <p className="font-semibold leading-snug text-white/85"><b className="block text-lg text-white">No guardamos nada</b>Cierra la pestaña y desaparece. Solo se guarda si tú lo pides, y en tu dispositivo.</p>
              <p className="font-semibold leading-snug text-white/85"><b className="block text-lg text-white">Nombres ocultos al compartir</b>Las tarjetas y el PDF salen con “Persona A” y “Persona B” por defecto.</p>
            </div>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button type="button" onClick={pick} className="press inline-flex items-center justify-center gap-2 rounded-full bg-wa-green px-7 py-4 text-lg font-extrabold text-wa-ink hover:bg-[#3ee07a]">
                <UploadIcon className="h-5 w-5" /> Analizar mi chat
              </button>
              <a href="#/privacidad" className="px-2 font-bold text-white underline hover:text-wa-green">Cómo tratamos tus datos</a>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="mx-auto max-w-5xl px-5 pb-10 text-sm font-semibold opacity-60 sm:px-8">
        longsaw no está afiliado a WhatsApp. Las lecturas son entretenimiento, no un diagnóstico.
      </footer>
    </main>
  );
}
