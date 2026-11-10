/**
 * Animación de la portada: una conversación inventada se escribe sola
 * ("escribiendo…", ticks que se vuelven azules, emojis que flotan) y después
 * cada burbuja se encoge en una barra de su misma longitud y sube el informe.
 *
 * Ligera a propósito: solo CSS (transiciones en index.css) y un temporizador.
 * - Se pausa fuera de pantalla y con la pestaña oculta.
 * - Con prefers-reduced-motion se muestra el estado final, sin bucle.
 * Es decorativa: aria-hidden, y el texto de la portada dice lo mismo.
 */
import { useEffect, useRef, useState } from 'react';
import { useT } from '../lib/i18n';

interface Line {
  who: 'me' | 'them';
  time: string;
  floats?: string[];
}

/** El texto de cada mensaje está en el diccionario (t.hero.script), en el mismo orden. */
const SCRIPT: Line[] = [
  { who: 'them', time: '21:02' },
  { who: 'me', time: '21:02' },
  { who: 'me', time: '21:03' },
  { who: 'them', time: '21:09', floats: ['😂', '😂', '🤣'] },
  { who: 'me', time: '21:09' },
  { who: 'them', time: '21:15', floats: ['❤️', '💚', '❤️'] },
];

interface State {
  shown: number;
  typing: boolean;
  read: number;
  phase: 'chat' | 'morph' | 'report';
}

const START: State = { shown: 0, typing: false, read: 0, phase: 'chat' };
const FINAL: State = { shown: SCRIPT.length, typing: false, read: SCRIPT.length, phase: 'report' };

/** Guion: [ms desde el inicio, cambio de estado]. */
function timeline(): [number, Partial<State>][] {
  const out: [number, Partial<State>][] = [];
  let t = 500;
  SCRIPT.forEach((m, i) => {
    if (m.who === 'them') {
      out.push([t, { typing: true }]);
      t += 1100;
      out.push([t, { typing: false, shown: i + 1, read: i + 1 }]);
      t += 900;
    } else {
      out.push([t, { shown: i + 1 }]);
      t += 750;
      out.push([t, { read: i + 1 }]);
      t += 450;
    }
  });
  out.push([(t += 900), { phase: 'morph' }]);
  out.push([(t += 1100), { phase: 'report' }]);
  out.push([(t += 4600), START]);
  return out;
}

const STEPS = timeline();
const LOOP_MS = STEPS[STEPS.length - 1][0] + 400;

export function Ticks({ read }: { read: boolean }) {
  return (
    <svg viewBox="0 0 16 11" className={`tick ${read ? 'read' : ''}`} aria-hidden>
      <path d="M11.1 0.7 4.9 7.9 2.3 5.4l-.9 1L4.9 9.8l7.1-8.3z" fill="currentColor" />
      <path d="M15.1 0.7 8.9 7.9l-.9-.9-.9 1 1.8 1.8 7.1-8.3z" fill="currentColor" />
    </svg>
  );
}

export function ChatToChart() {
  const h = useT().hero;
  const reduced = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [s, setS] = useState<State>(reduced ? FINAL : START);
  const [running, setRunning] = useState(false);
  const [cycle, setCycle] = useState(0);
  const root = useRef<HTMLDivElement>(null);

  // Solo se anima mientras se ve y la pestaña está activa.
  useEffect(() => {
    if (reduced) return;
    const el = root.current;
    if (!el) return;
    let visible = false;
    const sync = () => setRunning(visible && !document.hidden);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      sync();
    });
    io.observe(el);
    document.addEventListener('visibilitychange', sync);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, [reduced]);

  useEffect(() => {
    if (!running) return;
    setS(START);
    const timers = STEPS.map(([at, patch]) => setTimeout(() => setS((cur) => ({ ...cur, ...patch })), at));
    timers.push(setTimeout(() => setCycle((c) => c + 1), LOOP_MS));
    return () => timers.forEach(clearTimeout);
  }, [running, cycle]);

  const mine = SCRIPT.filter((m) => m.who === 'me').length;
  const open = s.phase === 'report';

  return (
    <div ref={root} className="phone" aria-hidden>
      <div className="phone-screen">
        <div className="flex items-center gap-2.5 bg-wa-dark px-3 pb-2.5 pt-3.5 text-white">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#dfe5e7] dark:bg-[#2a3942] text-sm font-extrabold text-wa-dark dark:text-wa-green">S</span>
          <span className="min-w-0 leading-tight">
            <span className="block text-sm font-bold">Sam</span>
            <span className="block text-[0.68rem] text-white/75">{s.typing ? h.typing : h.online}</span>
          </span>
        </div>

        <div className={`chat-scroll ${s.phase !== 'chat' ? 'morph' : ''} ${open ? 'lifted' : ''}`}>
          {SCRIPT.slice(0, s.shown).map((m, i) => (
            <div key={`${cycle}-${i}`} className={`msg ${m.who}`}>
              <span className="body block">{h.script[i]}</span>
              <span className="meta">
                {m.time}
                {m.who === 'me' && <Ticks read={s.read > i} />}
              </span>
              {m.floats && s.phase === 'chat' && !reduced &&
                m.floats.map((f, k) => (
                  <span
                    key={k}
                    className="float-emoji"
                    style={{ left: `${30 + k * 22}%`, animationDelay: `${k * 160}ms`, ['--dx' as string]: `${(k - 1) * 9}px`, ['--rot' as string]: `${(k - 1) * 18}deg` }}
                  >
                    {f}
                  </span>
                ))}
            </div>
          ))}
          {s.typing && (
            <div className="typing">
              <i />
              <i />
              <i />
            </div>
          )}
        </div>

        <div className={`report-sheet ${open ? 'open' : ''}`}>
          <p className="text-[0.7rem] font-bold text-wa-teal">{h.yourReport}</p>
          <p className="mt-0.5 text-lg font-extrabold leading-tight text-ink">{h.headline}</p>
          <div className="split mt-3 flex h-2.5 overflow-hidden rounded-full bg-ink/10">
            <span className="bg-wa-dark" style={{ width: open ? `${(mine / SCRIPT.length) * 100}%` : '0%' }} />
            <span className="bg-accent" style={{ width: open ? `${100 - (mine / SCRIPT.length) * 100}%` : '0%' }} />
          </div>
          <div className="mt-1 flex justify-between text-[0.65rem] font-bold text-ink/70">
            <span>{h.you} · {h.pct(50)}</span>
            <span>{h.pct(50)} · Sam</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-ink">
            {h.stats.map(([v, k]) => (
              <div key={k} className="rounded-xl bg-wa-cream px-2 py-1.5">
                <p className="num text-base">{v}</p>
                <p className="mt-0.5 text-[0.6rem] font-bold leading-tight text-ink/70">{k}</p>
              </div>
            ))}
          </div>
          <div className="cols mt-3 flex h-12 items-end gap-1">
            {[18, 30, 22, 45, 60, 38, 75, 92, 64, 40].map((h, i) => (
              <i key={i} style={{ height: `${h}%`, transitionDelay: `${200 + i * 60}ms` }} />
            ))}
          </div>
          <p className="mt-1 text-[0.6rem] font-bold text-ink/60">{h.perHour}</p>
        </div>
      </div>
    </div>
  );
}
