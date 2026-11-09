/**
 * Generador de un chat SINTÉTICO (formato Android, español) para:
 *  - el botón "Probar con un chat de ejemplo" (nadie tiene que subir nada real), y
 *  - tests de integración de las estadísticas.
 *
 * Es determinista (PRNG con semilla) para que los tests sean estables.
 * La historia: empieza con mucha chispa, Sam se va enfriando (respuestas más
 * lentas y cortas) y el chat acaba con Alex escribiendo sin respuesta.
 */

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const A = 'Alex';
const B = 'Sam 🌙';

const A_LINES = [
  '¿Qué tal tu día?', 'jajaja no puedo contigo', 'Oye, ¿te apetece ir al concierto del viernes?', 'buenas noches 🌙',
  'Hoy me he acordado de ti en el metro jaja', '¿Has visto lo que ha pasado con la serie?', 'te echo de menos 🥺',
  'Mañana tengo examen, deséame suerte', 'qué guay!! 😍', '¿Cuándo nos vemos?', 'jajaja literal', 'pizza o sushi?',
  'Me encanta hablar contigo, de verdad, se me pasan las horas volando y no me doy ni cuenta', 'ya estoy en casa',
  '¿Sigues despierta?', 'buenos días ☀️', 'jajaja eres lo peor', '¿Todo bien? Te noto rara', 'te echo de menos',
];
const B_EARLY = [
  'Bien!! Ha sido un día largo pero bonito, ¿y el tuyo qué tal?', 'jajaja 😂😂', 'Sii me apetece muchísimo, ¿a qué hora?',
  'buenas noches 🌙 que descanses', 'Jajaja qué mona', 'Nooo todavía no, no me hagas spoiler!!', 'yo también te echo de menos',
  'Mucha suerte!! Seguro que lo bordas 💪', 'pizza siempre', '¿El sábado te viene bien?', 'jajaja literal', 'buenos días ☀️',
  'Me pasa igual, es muy fácil hablar contigo', 'Acabo de salir del gym, estoy muerta jaja', '¿Y tú qué haces?',
];
const B_LATE = ['vale', 'jaja', 'ok', 'estoy liada', 'luego hablamos', 'como quieras', 'ya veremos', 'bien', 'sí', 'ya', 'buenas noches'];

function fmt(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}, ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function generateDemoChat(seed = 42): string {
  const rnd = mulberry32(seed);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
  const lines: string[] = [];
  const start = new Date(2024, 0, 8, 19, 30);
  lines.push(`${fmt(start)} - Los mensajes y las llamadas están cifrados de extremo a extremo. Nadie fuera de este chat, ni siquiera WhatsApp, puede leerlos ni escucharlos.`);
  let t = start.getTime() + 60_000;
  const add = (who: string, text: string) => lines.push(`${fmt(new Date(t))} - ${who}: ${text}`);
  const totalDays = 150;
  for (let day = 0; day < totalDays; day++) {
    const phase = day / totalDays; // 0 = principio, 1 = final
    const dayStart = start.getTime() + day * 86_400_000;
    if (phase > 0.8 && rnd() < 0.55) continue; // al final hay días sin hablar
    // Sesiones al día: muchas al principio, pocas al final
    const sessions = Math.max(1, Math.round((1 - phase) * 3 + rnd()));
    for (let s = 0; s < sessions; s++) {
      t = Math.max(t, dayStart + (9 + s * 5 + rnd() * 4) * 3_600_000);
      // A veces madrugada (sobre todo Sam al principio)
      if (rnd() < 0.08) t = dayStart + 86_400_000 - 3_600_000 + rnd() * 3 * 3_600_000;
      const initiator = rnd() < 0.35 + phase * 0.5 ? A : B;
      const turns = Math.round(4 + (1 - phase) * 14 * rnd());
      let who = initiator;
      for (let k = 0; k < turns; k++) {
        if (who === A) {
          if (rnd() < 0.03) add(A, 'Eliminaste este mensaje');
          else if (rnd() < 0.05) add(A, '<Multimedia omitido>');
          else add(A, pick(A_LINES));
          if (rnd() < 0.25 + phase * 0.3) {
            t += 60_000 * (1 + rnd() * 20);
            add(A, pick(A_LINES)); // doble mensaje
          }
          // Sam tarda más con el tiempo
          t += 60_000 * (0.5 + rnd() * (2 + phase * phase * 600));
          who = B;
        } else {
          if (rnd() < 0.02) add(B, 'Se eliminó este mensaje');
          else if (rnd() < 0.06) add(B, '<Multimedia omitido>');
          else add(B, rnd() < phase * 0.9 ? pick(B_LATE) : pick(B_EARLY));
          t += 60_000 * (0.3 + rnd() * 3);
          who = A;
        }
      }
    }
  }
  // Final: Alex escribe durante 12 días sin respuesta.
  t += 86_400_000;
  add(A, '¿Todo bien? Te noto rara');
  t += 2 * 86_400_000;
  add(A, 'Bueno, cuando puedas me dices algo');
  t += 4 * 86_400_000;
  add(A, '¿Sigues ahí?');
  t += 6 * 86_400_000;
  add(A, 'Vale, entiendo 🙂');
  return lines.join('\n') + '\n';
}
