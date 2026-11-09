/**
 * Tarjetas 14 ("Estilo y lo que notamos") y 16 ("The move") en versión por
 * reglas. Funcionan SIN IA; la IA (opt-in) solo las enriquece.
 *
 * Tono: entretenimiento con matices. Nunca diagnosticamos: hablamos de
 * "estilos" que "recuerdan a" conceptos de la teoría del apego, siempre
 * basados en números visibles. Para familia y trabajo ni siquiera mencionamos
 * el apego: hablamos de estilo de comunicación.
 */
import type { AuthorIndex, Flag, InterestResult, Pair, Relation, Report } from '../types';
import type { Ctx } from './context';
import { other } from './util';
import { formatDuration } from '../format';

type Style = Report['insights']['styles'][number];
type Situation = 'balanced' | 'meMore' | 'otherMore' | 'cold' | 'ended';
type Group = 'pareja' | 'ligue' | 'ex' | 'amistad' | 'familia' | 'trabajo';

const groupOf = (r: Relation): Group => (r === 'otro' ? 'amistad' : r);
const P = (a: AuthorIndex) => `{${a}}`;

interface Inputs {
  ctx: Ctx;
  interest: InterestResult;
  responses: Report['responses'];
  init: { total: Pair<number>; sessions: number; endings: Pair<number> };
  counts: Report['counts'];
  deleted: Pair<number>;
  seen: Report['seen'];
  timeline: Report['timeline'];
  flags: Flag[];
}

function styleFor(a: AuthorIndex, i: Inputs): Style {
  const o = other(a);
  const romantic = ['pareja', 'ligue', 'ex'].includes(i.ctx.opts.relation);
  const med = i.responses[a].medianMs;
  const medO = i.responses[o].medianMs;
  const initShare = i.init.sessions ? i.init.total[a] / i.init.sessions : 0.5;
  const volShare = i.counts.messages[a] / Math.max(1, i.counts.messages[0] + i.counts.messages[1]);
  const avgWords = i.counts.words[a] / Math.max(1, i.counts.messages[a]);
  const has = (id: string) => i.flags.some((f) => f.id === id && f.who === a);
  const hours = i.timeline.hours[a];
  const lateShare = hours.slice(0, 6).reduce((s, x) => s + x, 0) / Math.max(1, hours.reduce((s, x) => s + x, 0));

  const chaser =
    Number(initShare > 0.6) +
    Number(med !== null && medO !== null && med < medO / 2) +
    Number(has('double-text')) +
    Number(i.seen.counts[o] > i.seen.counts[a] * 2 && i.seen.counts[o] >= 3);
  const distant =
    Number(initShare < 0.35) +
    Number(med !== null && medO !== null && med > medO * 2 && med > 30 * 60_000) +
    Number(i.seen.counts[a] > i.seen.counts[o] * 2 && i.seen.counts[a] >= 3) +
    Number(avgWords < 4);
  const intense = Number(volShare > 0.62) + Number(avgWords > 14) + Number(lateShare > 0.2);

  const traits = [
    `Responde en una mediana de ${formatDuration(med)}.`,
    `Empieza ${Math.round(initShare * 100)} % de las conversaciones.`,
    `${avgWords.toFixed(1).replace('.', ',')} palabras por mensaje de media.`,
  ];
  const att = (s: string) => (romantic ? ` Recuerda a lo que la teoría del apego llama ${s}, pero es solo una lectura de cómo escribe, no un diagnóstico.` : '');

  if (chaser >= 2 && chaser >= distant) {
    return { label: 'Va con todo', emoji: '🏃', traits: [...traits, `Tira del hilo y busca respuesta.${att('“ansioso”')}`] };
  }
  if (distant >= 2) {
    return { label: 'Va a su ritmo', emoji: '🧊', traits: [...traits, `Mantiene cierta distancia y marca los tiempos.${att('“evitativo”')}`] };
  }
  if (intense >= 2) {
    return { label: 'Intensidad máxima', emoji: '🔥', traits: [...traits, 'Escribe mucho, largo y a cualquier hora.'] };
  }
  return { label: 'Tranqui y presente', emoji: '🌿', traits: [...traits, `Ritmo constante, sin extremos.${att('“seguro”')}`] };
}

function noticed(i: Inputs): string[] {
  const out: string[] = [];
  const [c0, c1] = i.counts.messages;
  const more: AuthorIndex = c0 >= c1 ? 0 : 1;
  const ratio = Math.max(c0, c1) / Math.max(1, Math.min(c0, c1));
  if (ratio >= 1.3) out.push(`${P(more)} escribe ${ratio.toFixed(1).replace('.', ',')} veces más mensajes.`);
  else out.push('Escribís prácticamente lo mismo: el volumen está muy repartido.');

  for (const a of [0, 1] as AuthorIndex[]) {
    const h = i.timeline.hours[a];
    const peak = h.indexOf(Math.max(...h));
    if (Math.max(...h) > 0) out.push(`La hora favorita de ${P(a)} para escribir: las ${peak}:00.`);
  }
  const [e0, e1] = i.init.endings;
  if (e0 + e1 >= 10) {
    const closer: AuthorIndex = e0 >= e1 ? 0 : 1;
    out.push(`${P(closer)} suele tener la última palabra (${Math.round((Math.max(e0, e1) / (e0 + e1)) * 100)} % de las conversaciones).`);
  }
  const [md0, md1] = i.counts.media;
  if (md0 + md1 >= 20) {
    const m: AuthorIndex = md0 >= md1 ? 0 : 1;
    out.push(`${P(m)} es quien más fotos, audios y stickers manda (${Math.max(md0, md1)}).`);
  }
  const wd = i.timeline.weekdays[0].map((x, k) => x + i.timeline.weekdays[1][k]);
  const days = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados', 'domingos'];
  out.push(`Vuestro día: los ${days[wd.indexOf(Math.max(...wd))]}.`);
  return out.slice(0, 6);
}

const MOVES: Record<Group, Record<Situation, { title: string; steps: string[] }>> = {
  pareja: {
    balanced: { title: 'Cuidad lo que funciona', steps: ['Mantened el ritmo: está equilibrado.', 'Saca algún tema nuevo de los que salen en “vuestro idioma”.', 'Proponed un plan fuera del móvil esta semana.'] },
    meMore: { title: 'Habla de ello, no por WhatsApp', steps: ['Los números dicen que tú tiras más. Coméntalo en persona, sin reproches.', 'Pregunta cómo lo vive {o}: a veces es solo estilo.', 'No compenses escribiendo aún más.'] },
    otherMore: { title: 'Devuelve un poco de lo que recibes', steps: ['{o} pone más energía en el chat que tú.', 'Toma tú la iniciativa un par de veces esta semana.', 'Responde a sus preguntas con preguntas.'] },
    cold: { title: 'Reconectad', steps: ['El chat está más frío que antes.', 'Propón un plan concreto (día y hora).', 'Hablad cara a cara de cómo estáis.'] },
    ended: { title: 'Antes de escribir otra vez, pregunta en persona', steps: ['El chat termina sin respuesta.', 'Si podéis veros, habladlo en persona.', 'No mandes más mensajes seguidos.'] },
  },
  ligue: {
    balanced: { title: 'Pasa al plan', steps: ['Hay interés por las dos partes.', 'Propón algo concreto: día, hora y sitio.', 'No alargues el chat infinito: el móvil enfría.'] },
    meMore: { title: 'Baja el ritmo', steps: ['Tu nivel de interés va por delante del de {o}.', 'Deja que sea {o} quien abra la próxima conversación.', 'Si no lo hace en una semana, ya tienes respuesta.'] },
    otherMore: { title: 'Decide si te interesa', steps: ['{o} va con más ganas que tú.', 'Si te gusta, demuéstralo con una propuesta.', 'Si no, sé claro con amabilidad: no dejes en visto.'] },
    cold: { title: 'Un último intento (o ninguno)', steps: ['Ninguno de los dos empuja mucho.', 'Un mensaje con un plan concreto y ligero.', 'Si no hay respuesta con ganas, déjalo ir.'] },
    ended: { title: 'Acepta el silencio', steps: ['El chat termina con mensajes sin respuesta.', 'No insistas: el silencio también es una respuesta.', 'Silencia el chat y céntrate en ti.'] },
  },
  ex: {
    balanced: { title: 'Pregúntate para qué', steps: ['Seguís hablando con bastante equilibrio.', '¿Os ayuda o mantiene una puerta abierta que duele?', 'Si es amistad real, poned límites claros.'] },
    meMore: { title: 'Protege tu paz', steps: ['Tú buscas más el contacto que {o}.', 'Prueba unas semanas sin escribir primero.', 'Fíjate en cómo te sientes sin esperar respuesta.'] },
    otherMore: { title: 'Pon límites claros', steps: ['{o} busca más el contacto que tú.', 'Si no quieres volver, dilo con claridad.', 'Responder “a medias” alarga la confusión.'] },
    cold: { title: 'Cierra el ciclo', steps: ['La conversación se ha ido apagando sola.', 'No hace falta un mensaje de cierre épico.', 'Archiva el chat: no lo borres en caliente.'] },
    ended: { title: 'No escribas ese mensaje (todavía)', steps: ['El chat termina con una sola voz.', 'Escribe lo que querrías decir… en notas, no en WhatsApp.', 'Si en 48 h sigues queriendo enviarlo, piénsalo con alguien de confianza.'] },
  },
  amistad: {
    balanced: { title: 'Amistad en forma', steps: ['Os escribís con equilibrio.', 'Convierte un “a ver si quedamos” en fecha.', 'Mándale ese meme que te recordó a {o}.'] },
    meMore: { title: 'Pregunta qué tal está', steps: ['Tú tiras más del chat últimamente.', 'Puede que {o} esté en una época liada.', 'Un “¿todo bien?” sincero vale más que diez memes.'] },
    otherMore: { title: 'Devuélvele la llamada', steps: ['{o} te busca más que tú a {o}.', 'Escríbele tú primero esta semana.', 'Propón un plan, aunque sea un café.'] },
    cold: { title: 'Reaviva la amistad', steps: ['El chat ha ido a menos.', 'Un audio de 30 segundos rompe el hielo mejor que un texto.', 'Plan pequeño y concreto.'] },
    ended: { title: 'Un mensaje sin presión', steps: ['La conversación se cortó.', 'Un “me acordé de ti” sin exigir respuesta.', 'Si no contesta, no lo tomes como algo personal.'] },
  },
  familia: {
    balanced: { title: 'Familia bien conectada', steps: ['Os mantenéis al día con equilibrio.', 'Una llamada de vez en cuando suma mucho.', 'Comparte alguna foto de tu día.'] },
    meMore: { title: 'Cambia de canal', steps: ['Tú escribes más que {o}.', 'Quizá {o} prefiera llamadas a mensajes.', 'Prueba con una llamada corta.'] },
    otherMore: { title: 'Un poco más de ti', steps: ['{o} te escribe más de lo que tú respondes.', 'Contesta aunque sea con un audio corto.', 'Pregunta por sus cosas.'] },
    cold: { title: 'Rompe el silencio familiar', steps: ['El chat está muy tranquilo.', 'Una llamada sin motivo.', 'Propón una comida.'] },
    ended: { title: 'Da tú el paso', steps: ['La conversación se quedó a medias.', 'Un mensaje breve y cariñoso.', 'Si hubo un roce, mejor hablarlo en persona.'] },
  },
  trabajo: {
    balanced: { title: 'Comunicación eficiente', steps: ['Los tiempos están equilibrados.', 'Agrupa temas en un solo mensaje.', 'Respeta horarios fuera del trabajo.'] },
    meMore: { title: 'Menos mensajes, más claros', steps: ['Tú escribes más que {o}.', 'Resume en un mensaje con lo que necesitas y cuándo.', 'Para temas largos, mejor una llamada.'] },
    otherMore: { title: 'Responde con tiempos claros', steps: ['{o} te escribe más.', 'Si no puedes contestar, dilo: “te digo mañana”.', 'Propón un canal mejor si se acumula.'] },
    cold: { title: 'Todo en orden', steps: ['Poca actividad: normal entre compañeros.', 'Nada que hacer.', ''] },
    ended: { title: 'Cierra los temas pendientes', steps: ['Quedó algo sin respuesta.', 'Retoma con un mensaje concreto.', 'Si no hay respuesta, por correo.'] },
  },
};

export function insights(i: Inputs): Report['insights'] {
  const me = i.ctx.opts.me;
  const o = other(me);
  const [im, io] = [i.interest.total[me], i.interest.total[o]];
  const ended = i.flags.some((f) => f.id === 'end-silence');
  const situation: Situation = ended
    ? 'ended'
    : im < 40 && io < 40
      ? 'cold'
      : im - io >= 12
        ? 'meMore'
        : io - im >= 12
          ? 'otherMore'
          : 'balanced';
  const tpl = MOVES[groupOf(i.ctx.opts.relation)][situation];
  const move = {
    title: tpl.title.replaceAll('{o}', P(o)),
    steps: tpl.steps.filter(Boolean).map((s) => s.replaceAll('{o}', P(o))),
  };
  return {
    styles: [styleFor(0, i), styleFor(1, i)],
    noticed: noticed(i),
    move,
  };
}
