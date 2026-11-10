/**
 * Primitivas visuales compartidas por todas las tarjetas.
 * Mantenerlas aquí garantiza coherencia (mismo tamaño de número enorme,
 * mismos colores por persona, misma forma de citar un mensaje).
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { AuthorIndex, Excerpt, Pair } from '../core/types';
import { formatDateTime } from '../core/format';
import { useNames } from '../lib/names';
import { LogoMark } from './Logo';

/* ------------------------------ Colores ------------------------------ */

/** Tú siempre en verde oscuro, la otra persona en morado: consistente en todo el informe. */
export const ME_COLOR = '#075e54';
export const OTHER_COLOR = '#7b2cbf';
export function usePersonColor() {
  const { me } = useNames();
  return (a: AuthorIndex) => (a === me ? ME_COLOR : OTHER_COLOR);
}

/* --------------------------- Aparecer al ver -------------------------- */

export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) return el.classList.add('is-visible');
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add('is-visible');
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

/* -------------------------------- Card -------------------------------- */

export function Card(props: {
  id: string;
  /** Posición en la lista: alterna la dirección de entrada. */
  index?: number;
  kicker: string;
  title: string;
  color: string;
  children: ReactNode;
  /** Frase del banco (core/phrases); usa {0}/{1}. */
  caption?: string;
  onShare?: (el: HTMLElement) => void;
  footnote?: ReactNode;
}) {
  const ref = useReveal<HTMLElement>();
  const { fill } = useNames();
  return (
    <section
      ref={ref}
      id={`card-${props.id}`}
      data-card={props.id}
      aria-labelledby={`card-${props.id}-title`}
      className={`reveal card-lift relative overflow-hidden rounded-[2rem] ${props.color} p-6 sm:p-8 ${(props.index ?? 0) % 2 ? 'from-right' : 'from-left'}`}
    >
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] opacity-60">{props.kicker}</p>
          <h2 id={`card-${props.id}-title`} className="mt-1 text-2xl font-extrabold leading-tight sm:text-3xl">
            {props.title}
          </h2>
        </div>
        {props.onShare && (
          <button
            type="button"
            className="export-hide press shrink-0 rounded-full bg-white/60 px-3 py-1.5 text-sm font-bold hover:bg-white"
            onClick={(e) => props.onShare!((e.currentTarget.closest('[data-card]') as HTMLElement)!)}
            aria-label={`Compartir tarjeta: ${props.kicker}`}
          >
            ↗︎ Compartir
          </button>
        )}
      </header>

      {props.caption && <p className="bubble-in mb-5">{fill(props.caption)}</p>}

      {props.children}
      {props.footnote && <div className="mt-5 text-sm leading-snug opacity-70">{props.footnote}</div>}

      <div className="export-only mt-6 items-center justify-between text-xs font-bold opacity-60">
        <span className="inline-flex items-center gap-1.5">
          <LogoMark className="h-5 w-5" />
          <span className="font-brand text-sm font-semibold">longsaw</span>
        </span>
        <span>analizado en el navegador</span>
      </div>
    </section>
  );
}

/* ------------------------------ Números ------------------------------ */

/** Evento global: los contadores saltan a su valor final (antes de exportar). */
export const FINISH_ANIMATIONS = 'longsaw:finish-animations';

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Cuenta hacia arriba cuando el número entra en pantalla (respeta reduced-motion). */
export function CountUp({ value, format = (n: number) => n.toLocaleString('es-ES') }: { value: number; format?: (n: number) => string }) {
  const [shown, setShown] = useState(() => (reducedMotion() || value < 10 ? value : 0));
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (reducedMotion() || value < 10) return setShown(value);
    const el = ref.current;
    let raf = 0;
    // Al exportar (imagen/PDF) todo debe salir con su valor final, se haya visto o no.
    const finish = () => {
      cancelAnimationFrame(raf);
      setShown(value);
    };
    addEventListener(FINISH_ANIMATIONS, finish);
    const run = () => {
      const t0 = performance.now();
      const dur = 1100;
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / dur);
        setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    if (!el || !('IntersectionObserver' in window)) {
      run();
      return () => {
        removeEventListener(FINISH_ANIMATIONS, finish);
        cancelAnimationFrame(raf);
      };
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          io.disconnect();
          run();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      removeEventListener(FINISH_ANIMATIONS, finish);
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);
  return <span ref={ref}>{format(shown)}</span>;
}

export function BigStat(props: { label: ReactNode; value: ReactNode; unit?: string; sub?: ReactNode; color?: string }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-sm font-bold opacity-70">{props.label}</div>
      <div className="num mt-1 text-6xl sm:text-7xl" style={{ color: props.color }}>
        {props.value}
        {props.unit && <span className="ml-1 text-2xl font-extrabold tracking-normal sm:text-3xl">{props.unit}</span>}
      </div>
      {props.sub && <div className="mt-2 text-sm font-semibold opacity-70">{props.sub}</div>}
    </div>
  );
}

/** Barra comparativa 0 vs 1 con el % de cada uno. */
export function VersusBar({ values, label }: { values: Pair<number>; label?: string }) {
  const { names } = useNames();
  const color = usePersonColor();
  const total = values[0] + values[1] || 1;
  const pct0 = Math.round((values[0] / total) * 100);
  return (
    <div>
      <div
        className="flex h-5 w-full overflow-hidden rounded-full bg-white/50"
        role="img"
        aria-label={`${label ?? ''} ${names[0]} ${pct0} %, ${names[1]} ${100 - pct0} %`}
      >
        <div style={{ width: `${pct0}%`, background: color(0) }} className="transition-[width] duration-700" />
        <div style={{ width: `${100 - pct0}%`, background: color(1) }} className="transition-[width] duration-700" />
      </div>
      <div className="mt-1.5 flex justify-between text-sm font-bold">
        <span>{names[0]} · {pct0} %</span>
        <span>{100 - pct0} % · {names[1]}</span>
      </div>
    </div>
  );
}

/* ------------------------------ Citas -------------------------------- */

export function Quote({ e, maxLines, compact }: { e: Excerpt; maxLines?: number; compact?: boolean }) {
  const { names, me, quote } = useNames();
  const mine = e.author === me;
  return (
    <figure className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
      <blockquote
        className={`max-w-[90%] whitespace-pre-line rounded-3xl px-4 py-3 font-semibold leading-snug shadow-sm ${
          mine ? 'rounded-br-md bg-wa-bubble' : 'rounded-bl-md bg-white'
        } ${compact ? 'text-sm' : 'text-base'}`}
        style={maxLines ? { display: '-webkit-box', WebkitLineClamp: maxLines, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : undefined}
      >
        {quote(e.text)}
      </blockquote>
      <figcaption className="mt-1 px-2 text-xs font-semibold opacity-60">
        {names[e.author]} · {formatDateTime(e.ts)}
      </figcaption>
    </figure>
  );
}

export function Pill({ children, tone = 'white' }: { children: ReactNode; tone?: 'white' | 'ink' }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-bold ${tone === 'ink' ? 'bg-ink text-white' : 'bg-white/70'}`}>
      {children}
    </span>
  );
}

export function Explain({ children, summary = '¿Cómo se calcula?' }: { children: ReactNode; summary?: string }) {
  return (
    <details className="group mt-5 rounded-2xl bg-white/50 px-4 py-3 text-sm">
      <summary className="cursor-pointer list-none font-bold">
        <span className="mr-1 inline-block transition group-open:rotate-90">›</span> {summary}
      </summary>
      <div className="mt-2 space-y-2 leading-snug">{children}</div>
    </details>
  );
}

export function Estimate({ children }: { children: ReactNode }) {
  return (
    <p className="mt-4 flex gap-2 rounded-2xl bg-ink/5 px-4 py-3 text-sm font-semibold leading-snug">
      <span aria-hidden>⚠️</span>
      <span>{children}</span>
    </p>
  );
}
