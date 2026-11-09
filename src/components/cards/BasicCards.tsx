/**
 * Cuerpos de las tarjetas gratuitas (1-6 y 12). El marco (color, título,
 * bloqueo, compartir) lo pone <Card> desde la página del informe.
 */
import type { AuthorIndex, Report } from '../../core/types';
import { durationParts, formatDate, formatDuration, formatMonth, nf } from '../../core/format';
import { useNames } from '../../lib/names';
import { BigStat, CountUp, Explain, Pill, Quote, VersusBar, usePersonColor } from '../ui';

export interface BodyProps {
  r: Report;
}

const both = [0, 1] as AuthorIndex[];

/** Ordena para que "tú" salga siempre primero/izquierda. */
function useOrder(): AuthorIndex[] {
  const { me } = useNames();
  return me === 0 ? both : [1, 0];
}

export function MessagesBody({ r }: BodyProps) {
  const { names } = useNames();
  const color = usePersonColor();
  const order = useOrder();
  return (
    <>
      <div className="num text-[5.5rem] sm:text-9xl"><CountUp value={r.meta.totalMessages} /></div>
      <p className="-mt-1 mb-6 text-lg font-bold">mensajes en {nf.format(r.meta.durationDays)} días</p>
      <div className="mb-6 grid grid-cols-2 gap-4">
        {order.map((a) => (
          <BigStat key={a} label={names[a]} value={<CountUp value={r.counts.messages[a]} />} color={color(a)} sub={`${nf.format(r.counts.words[a])} palabras`} />
        ))}
      </div>
      <VersusBar values={r.counts.messages} label="Reparto de mensajes" />
      <div className="mt-5 flex flex-wrap gap-2">
        {order.map((a) => (
          <Pill key={a}>
            {names[a]}: {r.counts.media[a]} 📎 · {r.counts.calls[a]} 📞
          </Pill>
        ))}
      </div>
    </>
  );
}

export function ResponseBody({ r }: BodyProps) {
  const { names } = useNames();
  const color = usePersonColor();
  const order = useOrder();
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        {order.map((a) => {
          const [v, u] = durationParts(r.responses[a].medianMs);
          return (
            <BigStat
              key={a}
              label={names[a]}
              value={v}
              unit={u}
              color={color(a)}
              sub={<>media {formatDuration(r.responses[a].meanMs)}</>}
            />
          );
        })}
      </div>
      <Explain>
        <p>
          Mostramos la <b>mediana</b> (la respuesta “típica”): un par de respuestas de 8 horas no la distorsionan.
          La <b>media</b> sí se dispara con esas respuestas lentas, por eso la ponemos pequeña debajo.
        </p>
        <p>
          Solo contamos como respuesta un cambio de persona dentro de la misma conversación. Si pasan más de
          las horas de “nueva conversación”, eso cuenta como iniciativa, no como respuesta lenta.
        </p>
        <p>
          El 10 % de respuestas más lentas: {names[order[0]]} {formatDuration(r.responses[order[0]].p90Ms)}, {names[order[1]]} {formatDuration(r.responses[order[1]].p90Ms)}.
        </p>
      </Explain>
    </>
  );
}

export function FirstBody({ r }: BodyProps) {
  const { names } = useNames();
  if (!r.firstMessage) return <p>No encontramos el primer mensaje.</p>;
  return (
    <>
      <p className="num mb-1 text-5xl sm:text-6xl">{formatDate(r.firstMessage.ts, { day: 'numeric', month: 'long' })}</p>
      <p className="mb-6 text-lg font-bold">
        de {new Date(r.firstMessage.ts).getFullYear()} · lo escribió {names[r.firstMessage.author]}
      </p>
      <Quote e={r.firstMessage} />
    </>
  );
}

export function InitiatorBody({ r, gapHours }: BodyProps & { gapHours: number }) {
  const { names } = useNames();
  const color = usePersonColor();
  const order = useOrder();
  const t = r.initiations.total;
  const total = t[0] + t[1] || 1;
  const top: AuthorIndex = t[0] >= t[1] ? 0 : 1;
  return (
    <>
      <p className="mb-1 text-lg font-bold">Escribe primero</p>
      <p className="num mb-2 text-6xl sm:text-7xl" style={{ color: color(top) }}>{names[top]}</p>
      <p className="mb-6 text-lg font-bold">{Math.round((t[top] / total) * 100)} % de {nf.format(r.initiations.sessions)} conversaciones</p>
      <VersusBar values={t} label="Inicios de conversación" />
      <div className="mt-4 flex flex-wrap gap-2">
        {order.map((a) => (
          <Pill key={a}>{names[a]} cierra {r.endings[a]} conversaciones</Pill>
        ))}
      </div>
      <Explain>
        <p>Una “conversación nueva” empieza cuando alguien escribe tras más de <b>{gapHours} horas</b> de silencio. Puedes cambiar ese umbral en los ajustes del informe.</p>
      </Explain>
    </>
  );
}

export function LongestBody({ r }: BodyProps) {
  const { names } = useNames();
  const order = useOrder();
  return (
    <div className="space-y-6">
      {order.map((a) =>
        r.longest[a] ? (
          <div key={a}>
            <p className="mb-2 text-sm font-bold opacity-70">
              {names[a]} · {nf.format(r.longest[a]!.text.split(/\s+/).length)}{r.longest[a]!.text.endsWith('…') ? '+' : ''} palabras
            </p>
            <Quote e={r.longest[a]!} maxLines={10} />
          </div>
        ) : (
          <p key={a} className="font-bold">{names[a]} no tiene mensajes de texto.</p>
        ),
      )}
    </div>
  );
}

export function DeletedBody({ r }: BodyProps) {
  const { names } = useNames();
  const color = usePersonColor();
  const order = useOrder();
  const d = r.deleted;
  const top: AuthorIndex = d[0] >= d[1] ? 0 : 1;
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        {order.map((a) => (
          <BigStat key={a} label={names[a]} value={d[a]} unit="🗑️" color={color(a)} />
        ))}
      </div>
      <p className="mt-6 text-lg font-bold">
        {d[0] + d[1] === 0
          ? 'Nadie ha borrado nada. Transparencia total (o mucha seguridad en sí mismos).'
          : d[0] === d[1]
            ? 'Empate técnico en arrepentimientos.'
            : `${names[top]} es quien más se arrepiente.`}
      </p>
      <Explain summary="¿Cómo lo sabemos?">
        <p>WhatsApp deja en el export “Eliminaste este mensaje” / “Se eliminó este mensaje” (y sus versiones en inglés). El contenido borrado no está en el archivo: nadie puede recuperarlo, tampoco nosotros.</p>
      </Explain>
    </>
  );
}

/* ---------------------------- Línea temporal --------------------------- */

export function TimelineBody({ r }: BodyProps) {
  const { names } = useNames();
  const color = usePersonColor();
  const order = useOrder();
  const tl = r.timeline;
  const months = tl.months;
  const max = Math.max(1, ...months.map((m) => m.counts[0] + m.counts[1]));
  const W = 320;
  const H = 120;
  const bw = W / Math.max(1, months.length);
  const hoursTotal = tl.hours[0].map((x, i) => x + tl.hours[1][i]);
  const hMax = Math.max(1, ...hoursTotal);

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-4">
        <BigStat label="Días en el chat" value={<CountUp value={r.meta.durationDays} />} sub={`${formatDate(r.meta.firstTs)} → ${formatDate(r.meta.lastTs)}`} />
        <BigStat label="Racha más larga" value={tl.longestStreakDays} unit="días" sub={`${nf.format(tl.activeDays)} días con mensajes`} />
      </div>

      <figure>
        <svg viewBox={`0 0 ${W} ${H + 18}`} className="w-full" role="img" aria-label="Mensajes por mes de cada persona">
          {months.map((m, i) => {
            const h0 = (m.counts[order[0]] / max) * H;
            const h1 = (m.counts[order[1]] / max) * H;
            const x = i * bw + bw * 0.12;
            const w = Math.max(1.5, bw * 0.76);
            return (
              <g key={m.month}>
                <title>{`${formatMonth(m.month)}: ${names[order[0]]} ${m.counts[order[0]]}, ${names[order[1]]} ${m.counts[order[1]]}`}</title>
                <rect x={x} y={H - h0} width={w} height={h0} rx={Math.min(3, w / 2)} fill={color(order[0])} />
                <rect x={x} y={H - h0 - h1} width={w} height={h1} rx={Math.min(3, w / 2)} fill={color(order[1])} opacity={0.85} />
              </g>
            );
          })}
          <text x={0} y={H + 14} fontSize={10} fontWeight={700} opacity={0.6}>{months[0] && formatMonth(months[0].month, true)}</text>
          <text x={W} y={H + 14} fontSize={10} fontWeight={700} opacity={0.6} textAnchor="end">
            {months.at(-1) && formatMonth(months.at(-1)!.month, true)}
          </text>
        </svg>
      </figure>

      <div className="mt-5 flex flex-col gap-2 text-base font-bold">
        {tl.mostActiveMonth && <p>🔥 Mes más intenso: {formatMonth(tl.mostActiveMonth.month)} ({nf.format(tl.mostActiveMonth.counts[0] + tl.mostActiveMonth.counts[1])} mensajes)</p>}
        {tl.leastActiveMonth && months.length > 1 && <p>🧊 Mes más flojo: {formatMonth(tl.leastActiveMonth.month)} ({nf.format(tl.leastActiveMonth.counts[0] + tl.leastActiveMonth.counts[1])})</p>}
        {tl.peakDay && <p>📈 Día récord: {formatDate(new Date(tl.peakDay.date + 'T12:00:00').getTime())} con {tl.peakDay.count} mensajes</p>}
      </div>

      <p className="mt-6 mb-2 text-sm font-bold opacity-70">¿A qué hora habláis?</p>
      <svg viewBox="0 0 240 50" className="w-full" role="img" aria-label="Mensajes por hora del día">
        {hoursTotal.map((v, h) => (
          <rect key={h} x={h * 10 + 1} y={40 - (v / hMax) * 38} width={8} height={(v / hMax) * 38 + 1} rx={2} fill="#1b1523" opacity={0.25 + 0.75 * (v / hMax)}>
            <title>{`${h}:00 · ${v} mensajes`}</title>
          </rect>
        ))}
        {[0, 6, 12, 18, 23].map((h) => (
          <text key={h} x={h * 10 + 5} y={49} fontSize={7} textAnchor={h === 23 ? 'end' : 'middle'} fontWeight={700} opacity={0.6}>{h}h</text>
        ))}
      </svg>
    </>
  );
}
