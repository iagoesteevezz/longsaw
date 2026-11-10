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
import { ThemeToggle } from '../components/ThemeToggle';
import { LangToggle } from '../components/LangToggle';
import { useT } from '../lib/i18n';

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

function GitHubIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
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

/** Color y giro de cada pegatina de “qué descubrirás” (los textos van en el diccionario). */
const DISCOVER_STYLE: { c: string; r: number }[] = [
  { c: 'bg-card-mint', r: -3 },
  { c: 'bg-card-blue', r: 2 },
  { c: 'bg-card-green', r: -1 },
  { c: 'bg-card-sky', r: 3 },
  { c: 'bg-card-pink', r: -2 },
  { c: 'bg-card-lavender', r: 1 },
  { c: 'bg-card-yellow', r: -3 },
  { c: 'bg-card-periwinkle', r: 2 },
  { c: 'bg-card-lilac', r: -1 },
  { c: 'bg-card-red', r: 3 },
  { c: 'bg-card-peach', r: -2 },
  { c: 'bg-card-cream', r: 1 },
];

export function UploadPage(props: {
  onFile: (buf: ArrayBuffer) => void;
  onDemo: () => void;
  saved: Saved | null;
  onOpenSaved: () => void;
  error: string | null;
}) {
  const t = useT();
  const u = t.upload;
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
        aria-label={u.fileAria}
      />

      {/* ------------------------------- Hero ------------------------------- */}
      <section className={`wa-gradient relative overflow-hidden text-white transition-shadow ${drag ? 'drop-glow' : ''}`}>
        <div className="mx-auto max-w-6xl px-5 pb-16 pt-6 sm:px-8 lg:pb-24">
          <header className="flex items-center justify-between">
            <Wordmark className="text-[1.7rem]" markClassName="h-10 w-10 rounded-[0.6rem] ring-1 ring-white/15" />
            <nav className="flex items-center gap-2">
              {/* En móvil no cabe: la privacidad tiene su enlace en la sección de abajo. */}
              <a href="#/privacidad" className="press hidden rounded-full bg-white/12 px-4 py-2 text-sm font-bold ring-1 ring-white/20 hover:bg-white/20 sm:inline-block">
                {t.common.privacy}
              </a>
              <a
                href="https://github.com/iagoesteevezz"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t.common.githubAria}
                className="press inline-flex items-center gap-2 rounded-full bg-white/12 p-2 text-sm font-bold ring-1 ring-white/20 hover:bg-white/20 sm:px-4"
              >
                <GitHubIcon className="h-5 w-5" />
                <span className="hidden sm:inline">iagoesteevezz</span>
              </a>
              <LangToggle />
              <ThemeToggle />
            </nav>
          </header>

          <div className="mt-10 grid items-center gap-12 lg:mt-14 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <h1 className="text-balance text-[3.1rem] font-extrabold leading-[0.92] tracking-[-0.035em] sm:text-7xl lg:text-[5.4rem]">
                {u.h1[0]}{' '}
                <span className="relative inline-block -rotate-2 rounded-2xl bg-wa-green px-3 text-wa-ink">{u.h1[1]}</span>{' '}
                {u.h1[2]}
              </h1>
              <p className="mt-6 max-w-[34rem] text-lg font-semibold leading-snug text-white/85 sm:text-xl">
                {u.lead}
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
                  <UploadIcon className="h-5 w-5" /> {u.choose}
                </button>
                <button type="button" onClick={props.onDemo} className="press rounded-full px-7 py-4 text-lg font-extrabold ring-2 ring-white/40 hover:bg-white/10">
                  {u.demo}
                </button>
              </div>
              {props.saved && (
                <button type="button" onClick={props.onOpenSaved} className="press mt-3 text-base font-bold underline hover:text-wa-green">
                  {u.openSaved}
                </button>
              )}
              <p className="mt-3 hidden text-sm font-semibold text-white/65 sm:block">{u.dropHint}</p>

              <p className="mt-8 flex max-w-[34rem] items-start gap-3 rounded-2xl bg-black/15 px-4 py-3 font-semibold leading-snug ring-1 ring-white/10">
                <LockIcon className="mt-0.5 h-5 w-5 shrink-0 text-wa-green" />
                <span>
                  <b>{u.privacyStrong}</b> <span className="text-white/75">{u.privacyRest}</span>
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
          <h2 className="text-balance text-4xl font-extrabold leading-none tracking-tight sm:text-5xl">{u.exportTitle}</h2>
          <p className="mt-3 max-w-xl text-lg font-semibold opacity-75">{u.exportLead}</p>
        </Reveal>
        <ol className="mt-10 flex flex-col gap-3">
          {u.steps.map(([title, d], i) => (
            <li key={title} className={i % 2 ? 'self-end' : 'self-start'}>
              <Reveal variant={i % 2 ? 'from-right' : 'from-left'}>
                <div className={`max-w-md px-5 py-4 shadow-[0_2px_0_rgb(0_0_0/0.05)] ${i % 2 ? 'rounded-3xl rounded-tr-md bg-wa-bubble' : 'rounded-3xl rounded-tl-md bg-surface'}`}>
                  <p className="text-lg font-extrabold leading-tight">
                    <span className="mr-2 text-wa-teal">{i + 1}.</span>
                    {title}
                  </p>
                  <p className="mt-1 font-semibold leading-snug opacity-70">{d}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      {/* --------------------------- Qué descubrirás -------------------------- */}
      <section className="bg-surface/55 py-20">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <Reveal>
            <h2 className="text-balance text-4xl font-extrabold leading-none tracking-tight sm:text-5xl">{u.cardsTitle}</h2>
            <p className="mt-3 max-w-xl text-lg font-semibold opacity-75">{u.cardsLead}</p>
          </Reveal>
          <Reveal variant="zoom" className="mt-10">
            <ul className="flex flex-wrap gap-3">
              {u.discover.map((label, i) => (
                <li key={label} className={`sticker rounded-2xl px-5 py-3 text-lg font-extrabold ${DISCOVER_STYLE[i].c}`} style={{ transform: `rotate(${DISCOVER_STYLE[i].r}deg)` }}>
                  {label}
                </li>
              ))}
            </ul>
          </Reveal>
          <div className="mt-12 flex flex-col gap-3">
            {u.samples.map((l, i) => (
              <Reveal key={l} variant={i % 2 ? 'from-right' : 'from-left'} className={i % 2 ? 'self-end' : 'self-start'}>
                <p className="bubble-in max-w-md text-lg !bg-surface">{l}</p>
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
            <h2 className="mt-4 max-w-2xl text-balance text-4xl font-extrabold leading-none tracking-tight sm:text-6xl">{u.privacyTitle}</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              {u.privacyItems.map(([title, d]) => (
                <p key={title} className="font-semibold leading-snug text-white/85"><b className="block text-lg text-white">{title}</b>{d}</p>
              ))}
            </div>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button type="button" onClick={pick} className="press inline-flex items-center justify-center gap-2 rounded-full bg-wa-green px-7 py-4 text-lg font-extrabold text-wa-ink hover:bg-[#3ee07a]">
                <UploadIcon className="h-5 w-5" /> {u.analyzeMine}
              </button>
              <a href="#/privacidad" className="px-2 font-bold text-white underline hover:text-wa-green">{t.common.howData}</a>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="mx-auto max-w-5xl px-5 pb-10 text-sm font-semibold opacity-60 sm:px-8">
        {u.footer}
      </footer>
    </main>
  );
}
