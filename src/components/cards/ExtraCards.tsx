/**
 * Tarjetas de multimedia (fotos, audios, vídeos, stickers por persona) y de
 * léxico (risas, cariño, insultos suaves y saludos).
 */
import type { AuthorIndex, CaptionKey, MediaBreakdown, Pair, Report } from '../../core/types';
import { nf } from '../../core/format';
import { useNames } from '../../lib/names';
import { BigStat, CountUp, Explain, usePersonColor } from '../ui';

interface P {
  r: Report;
}

function useOrder(): AuthorIndex[] {
  const { me } = useNames();
  return me === 0 ? [0, 1] : [1, 0];
}

/** Fila "versus": barra de cada persona creciendo hacia el centro. */
function VersusRow({ icon, label, values, delay = 0 }: { icon: string; label: string; values: Pair<number>; delay?: number }) {
  const order = useOrder();
  const color = usePersonColor();
  const max = Math.max(1, values[0], values[1]);
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
      {order.map((a, side) => {
        const bar = (
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/50">
            <div
              className={`bar-fill h-full rounded-full ${side === 0 ? 'ml-auto' : ''}`}
              style={{ width: `${(values[a] / max) * 100}%`, background: color(a), animationDelay: `${delay}ms` }}
            />
          </div>
        );
        const num = <span className="num w-9 shrink-0 text-xl sm:w-12 sm:text-2xl" style={{ textAlign: side === 0 ? 'left' : 'right' }}>{nf.format(values[a])}</span>;
        return (
          <div key={a} className={`flex items-center gap-2 ${side === 1 ? 'col-start-3 row-start-1' : ''}`}>
            {side === 0 ? <>{num}{bar}</> : <>{bar}{num}</>}
          </div>
        );
      })}
      <div className="col-start-2 row-start-1 flex w-16 flex-col items-center text-center sm:w-24">
        <span className="text-2xl" aria-hidden>{icon}</span>
        <span className="text-xs font-bold leading-tight">{label}</span>
      </div>
    </div>
  );
}

const MEDIA_ROWS: { key: keyof MediaBreakdown; icon: string; label: string }[] = [
  { key: 'photo', icon: '📷', label: 'Fotos' },
  { key: 'audio', icon: '🎤', label: 'Audios' },
  { key: 'video', icon: '🎬', label: 'Vídeos' },
  { key: 'sticker', icon: '🐸', label: 'Stickers y GIF' },
  { key: 'other', icon: '📄', label: 'Docs, contactos, ubicaciones' },
  { key: 'unknown', icon: '📎', label: 'Sin especificar' },
];

export function MediaBody({ r }: P) {
  const { names } = useNames();
  const color = usePersonColor();
  const order = useOrder();
  const total = (a: AuthorIndex) => Object.values(r.media[a]).reduce((s, x) => s + x, 0);
  const rows = MEDIA_ROWS.filter((row) => r.media[0][row.key] + r.media[1][row.key] > 0);
  const hasUnknown = r.media[0].unknown + r.media[1].unknown > 0;

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        {order.map((a) => (
          <BigStat key={a} label={names[a]} value={<CountUp value={total(a)} />} unit="📎" color={color(a)} />
        ))}
      </div>
      {rows.length > 0 && (
        <div className="mt-6 space-y-4">
          {rows.map((row, i) => (
            <VersusRow key={row.key} icon={row.icon} label={row.label} values={[r.media[0][row.key], r.media[1][row.key]]} delay={i * 90} />
          ))}
        </div>
      )}
      <Explain summary="¿Cómo lo contamos sin ver los archivos?">
        <p>
          Al exportar <b>sin archivos</b>, WhatsApp cambia cada foto, audio o sticker por un aviso como “imagen omitida”, “audio
          omitido” o “&lt;Multimedia omitido&gt;”, en el idioma de tu móvil. Contamos esos avisos y los quitamos del análisis de
          texto: nunca salen en el ranking de palabras.
        </p>
        {hasUnknown && (
          <p>
            <b>“Sin especificar”</b>: el export de Android pone el mismo “&lt;Multimedia omitido&gt;” para todo, así que sabemos
            cuántos archivos hay pero no si eran fotos, audios o vídeos. El de iPhone sí lo dice.
          </p>
        )}
      </Explain>
    </>
  );
}

const LEXICON: { key: CaptionKey & keyof Report['lexicon']; icon: string; label: string }[] = [
  { key: 'laughs', icon: '😂', label: 'Risas' },
  { key: 'affection', icon: '❤️', label: 'Cariño' },
  { key: 'insults', icon: '😤', label: 'Pullitas' },
  { key: 'greetings', icon: '👋', label: 'Saludos' },
];

export function LexiconBody({ r }: P) {
  const { names, fill } = useNames();
  const order = useOrder();
  const lx = r.lexicon;
  const chips = (key: string): string[] => {
    const out: string[] = [];
    for (const a of order) {
      if (key === 'laughs' && lx.laughStyle[a]) out.push(`${names[a]}: «${lx.laughStyle[a]}»`);
      if (key === 'affection' && lx.topAffection[a][0]) out.push(`${names[a]}: «${lx.topAffection[a][0].word}»`);
      if (key === 'insults' && lx.topInsults[a][0]) out.push(`${names[a]}: «${lx.topInsults[a][0].word}»`);
      if (key === 'greetings' && lx.goodMorning[a] + lx.goodNight[a] > 0) {
        out.push(`${names[a]}: ☀️ ${lx.goodMorning[a]} · 🌙 ${lx.goodNight[a]}`);
      }
    }
    return out;
  };

  return (
    <>
      <div className="space-y-6">
        {LEXICON.map((row, i) => {
          const caption = r.insights.captions[row.key];
          const c = chips(row.key);
          return (
            <section key={row.key} className="tile-hover rounded-3xl bg-white/45 p-4">
              <VersusRow icon={row.icon} label={row.label} values={lx[row.key] as Pair<number>} delay={i * 120} />
              {caption && <p className="mt-3 font-semibold leading-snug">{fill(caption)}</p>}
              {c.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {c.map((t) => <span key={t} className="rounded-full bg-white/80 px-3 py-1 text-sm font-bold">{t}</span>)}
                </div>
              )}
            </section>
          );
        })}
      </div>
      <Explain summary="¿Qué cuenta como cada cosa?">
        <p><b>Risas</b>: jaja, jsjs, jeje, xd, lol, haha… (da igual lo largas que sean) y 😂🤣😆.</p>
        <p><b>Cariño</b>: “te quiero”, “cariño”, “mi vida”, “besos”, “te echo de menos”… y corazones o 😘🥰.</p>
        <p><b>Pullitas</b>: insultos suaves de confianza (“tonta”, “pesado”, “idiota”…). No distinguimos el tono: se cuentan igual en broma que en serio.</p>
        <p><b>Saludos</b>: hola, buenas, buenos días, buenas noches, hey… ☀️ = buenos días, 🌙 = buenas noches.</p>
      </Explain>
    </>
  );
}
