/**
 * Tarjeta 12 "Cómo fue": meses, picos, rachas, horas y días de la semana.
 */
import type { Pair, Report, TimelinePoint } from '../types';
import type { Ctx } from './context';
import { DAY, dayKey, monthKey, pair } from './util';

export function timeline(ctx: Ctx): Report['timeline'] {
  const byMonth = new Map<string, Pair<number>>();
  const byDay = new Map<string, number>();
  const hours = pair(() => new Array(24).fill(0) as number[]);
  const weekdays = pair(() => new Array(7).fill(0) as number[]);

  for (const m of ctx.msgs) {
    const a = m.author!;
    const mk = monthKey(m.ts);
    const cur = byMonth.get(mk) ?? [0, 0];
    cur[a]++;
    byMonth.set(mk, cur);
    const dk = dayKey(m.ts);
    byDay.set(dk, (byDay.get(dk) ?? 0) + 1);
    const d = new Date(m.ts);
    hours[a][d.getHours()]++;
    weekdays[a][(d.getDay() + 6) % 7]++; // 0 = lunes (convención española)
  }

  // Rellenamos meses vacíos: un mes con 0 mensajes es información ("el mes muerto").
  const months: TimelinePoint[] = [];
  if (ctx.msgs.length) {
    const first = new Date(ctx.msgs[0].ts);
    const last = new Date(ctx.msgs[ctx.msgs.length - 1].ts);
    const cursor = new Date(first.getFullYear(), first.getMonth(), 1);
    while (cursor <= last) {
      const k = monthKey(cursor.getTime());
      months.push({ month: k, counts: byMonth.get(k) ?? [0, 0] });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  let peakDay: { date: string; count: number } | null = null;
  for (const [date, count] of byDay) if (!peakDay || count > peakDay.count) peakDay = { date, count };

  // Racha: días naturales consecutivos con al menos un mensaje.
  const days = [...byDay.keys()].sort();
  let longestStreakDays = days.length ? 1 : 0;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    // Usamos mediodía para que los cambios de hora (DST) no rompan la diferencia.
    const prev = new Date(days[i - 1] + 'T12:00:00').getTime();
    const cur = new Date(days[i] + 'T12:00:00').getTime();
    run = Math.round((cur - prev) / DAY) === 1 ? run + 1 : 1;
    longestStreakDays = Math.max(longestStreakDays, run);
  }

  const total = (p: TimelinePoint) => p.counts[0] + p.counts[1];
  const mostActiveMonth = months.reduce<TimelinePoint | null>((b, p) => (!b || total(p) > total(b) ? p : b), null);
  // Para el "menos activo" ignoramos el primer y último mes si hay más de 2 (suelen estar incompletos).
  const inner = months.length > 2 ? months.slice(1, -1) : months;
  const leastActiveMonth = inner.reduce<TimelinePoint | null>((b, p) => (!b || total(p) < total(b) ? p : b), null);

  return {
    months,
    peakDay,
    longestStreakDays,
    activeDays: byDay.size,
    mostActiveMonth,
    leastActiveMonth,
    hours,
    weekdays,
  };
}
