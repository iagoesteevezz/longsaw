/**
 * Tarjetas 14 ("Estilo") y 16 ("The move") por reglas. "Lo que notamos" y
 * los comentarios de cada tarjeta salen del banco de frases (core/phrases).
 *
 * Tono: entretenimiento con matices. Nunca diagnosticamos: hablamos de
 * "estilos" que "recuerdan a" conceptos de la teoría del apego, siempre
 * basados en números visibles. Para familia y trabajo ni siquiera mencionamos
 * el apego: hablamos de estilo de comunicación.
 */
import type { AuthorIndex, Flag, InterestResult, Pair, Relation, Report } from '../types';
import type { Ctx } from './context';
import { other } from './util';
import { dec1, formatDuration } from '../format';
import { tr } from '../i18n';

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

  const traits = tr({
    es: [
      `Responde en una mediana de ${formatDuration(med)}.`,
      `Empieza ${Math.round(initShare * 100)} % de las conversaciones.`,
      `${dec1(avgWords)} palabras por mensaje de media.`,
    ],
    en: [
      `Replies in a median of ${formatDuration(med)}.`,
      `Starts ${Math.round(initShare * 100)}% of conversations.`,
      `${dec1(avgWords)} words per message on average.`,
    ],
  });
  const att = (s: { es: string; en: string }) =>
    romantic
      ? tr({
          es: ` Recuerda a lo que la teoría del apego llama ${s.es}, pero es solo una lectura de cómo escribe, no un diagnóstico.`,
          en: ` It resembles what attachment theory calls ${s.en}, but it’s only a reading of how they text, not a diagnosis.`,
        })
      : '';

  if (chaser >= 2 && chaser >= distant) {
    const note = att({ es: '“ansioso”', en: '“anxious”' });
    return { label: tr({ es: 'Va con todo', en: 'All in' }), emoji: '🏃', traits: [...traits, tr({ es: `Tira del hilo y busca respuesta.${note}`, en: `Keeps the thread going and looks for a reply.${note}` })] };
  }
  if (distant >= 2) {
    const note = att({ es: '“evitativo”', en: '“avoidant”' });
    return { label: tr({ es: 'Va a su ritmo', en: 'Own pace' }), emoji: '🧊', traits: [...traits, tr({ es: `Mantiene cierta distancia y marca los tiempos.${note}`, en: `Keeps some distance and sets the pace.${note}` })] };
  }
  if (intense >= 2) {
    return { label: tr({ es: 'Intensidad máxima', en: 'Maximum intensity' }), emoji: '🔥', traits: [...traits, tr({ es: 'Escribe mucho, largo y a cualquier hora.', en: 'Writes a lot, at length and at any hour.' })] };
  }
  const note = att({ es: '“seguro”', en: '“secure”' });
  return { label: tr({ es: 'Tranqui y presente', en: 'Calm and present' }), emoji: '🌿', traits: [...traits, tr({ es: `Ritmo constante, sin extremos.${note}`, en: `A steady rhythm, no extremes.${note}` })] };
}

type Moves = Record<Group, Record<Situation, { title: string; steps: string[] }>>;

const MOVES_EN: Moves = {
  pareja: {
    balanced: { title: 'Look after what works', steps: ['Keep the rhythm: it’s balanced.', 'Bring up a new topic from your “shared language”.', 'Plan something away from your phones this week.'] },
    meMore: { title: 'Talk about it, not over WhatsApp', steps: ['The numbers say you pull more. Mention it in person, without blame.', 'Ask how {o} sees it: sometimes it’s just style.', 'Don’t make up for it by writing even more.'] },
    otherMore: { title: 'Give back some of what you get', steps: ['{o} puts more energy into the chat than you.', 'Take the initiative a couple of times this week.', 'Answer their questions with questions.'] },
    cold: { title: 'Reconnect', steps: ['The chat is colder than it used to be.', 'Suggest a concrete plan (day and time).', 'Talk face to face about how you’re doing.'] },
    ended: { title: 'Before writing again, ask in person', steps: ['The chat ends without a reply.', 'If you can see each other, talk it through in person.', 'Don’t send more messages in a row.'] },
  },
  ligue: {
    balanced: { title: 'Move to the plan', steps: ['There’s interest on both sides.', 'Suggest something concrete: day, time and place.', 'Don’t drag out the endless chat: phones cool things down.'] },
    meMore: { title: 'Slow down', steps: ['Your interest is ahead of {o}’s.', 'Let {o} open the next conversation.', 'If that doesn’t happen within a week, you have your answer.'] },
    otherMore: { title: 'Decide if you’re interested', steps: ['{o} is keener than you.', 'If you like them, show it with a plan.', 'If not, be clear and kind: don’t leave them on read.'] },
    cold: { title: 'One last try (or none)', steps: ['Neither of you is pushing much.', 'One message with a concrete, low-key plan.', 'If there’s no keen reply, let it go.'] },
    ended: { title: 'Accept the silence', steps: ['The chat ends with unanswered messages.', 'Don’t insist: silence is an answer too.', 'Mute the chat and focus on yourself.'] },
  },
  ex: {
    balanced: { title: 'Ask yourself what it’s for', steps: ['You still talk in a fairly balanced way.', 'Does it help, or keep a door open that hurts?', 'If it’s real friendship, set clear boundaries.'] },
    meMore: { title: 'Protect your peace', steps: ['You seek contact more than {o} does.', 'Try a few weeks without writing first.', 'Notice how you feel when you’re not waiting for a reply.'] },
    otherMore: { title: 'Set clear boundaries', steps: ['{o} seeks contact more than you do.', 'If you don’t want to get back together, say so clearly.', 'Half-hearted replies drag out the confusion.'] },
    cold: { title: 'Close the chapter', steps: ['The conversation has faded on its own.', 'No need for an epic goodbye message.', 'Archive the chat: don’t delete it in the heat of the moment.'] },
    ended: { title: 'Don’t send that message (yet)', steps: ['The chat ends with a single voice.', 'Write what you’d want to say… in your notes, not on WhatsApp.', 'If you still want to send it in 48 h, talk it over with someone you trust.'] },
  },
  amistad: {
    balanced: { title: 'A friendship in good shape', steps: ['You write to each other evenly.', 'Turn a “we should meet up” into a date.', 'Send them that meme that reminded you of {o}.'] },
    meMore: { title: 'Ask how they’re doing', steps: ['You’ve been carrying the chat lately.', '{o} might be going through a busy patch.', 'A sincere “all good?” is worth more than ten memes.'] },
    otherMore: { title: 'Return the call', steps: ['{o} reaches out to you more than you do.', 'Write first this week.', 'Suggest a plan, even just a coffee.'] },
    cold: { title: 'Rekindle the friendship', steps: ['The chat has slowed down.', 'A 30-second voice note breaks the ice better than text.', 'A small, concrete plan.'] },
    ended: { title: 'A no-pressure message', steps: ['The conversation was cut short.', 'A “thought of you” without demanding a reply.', 'If they don’t answer, don’t take it personally.'] },
  },
  familia: {
    balanced: { title: 'A well-connected family', steps: ['You keep each other up to date evenly.', 'A call now and then goes a long way.', 'Share a photo from your day.'] },
    meMore: { title: 'Switch channels', steps: ['You write more than {o}.', 'Maybe {o} prefers calls to messages.', 'Try a short call.'] },
    otherMore: { title: 'A little more of you', steps: ['{o} writes to you more than you reply.', 'Answer, even with a short voice note.', 'Ask about their things.'] },
    cold: { title: 'Break the family silence', steps: ['The chat is very quiet.', 'A call for no reason.', 'Suggest a meal together.'] },
    ended: { title: 'Take the first step', steps: ['The conversation was left hanging.', 'A short, warm message.', 'If there was friction, better to talk in person.'] },
  },
  trabajo: {
    balanced: { title: 'Efficient communication', steps: ['Reply times are balanced.', 'Group topics into a single message.', 'Respect out-of-hours time.'] },
    meMore: { title: 'Fewer, clearer messages', steps: ['You write more than {o}.', 'Sum up in one message what you need and by when.', 'For long topics, a call works better.'] },
    otherMore: { title: 'Reply with clear timings', steps: ['{o} writes to you more.', 'If you can’t answer, say so: “I’ll get back to you tomorrow”.', 'Suggest a better channel if things pile up.'] },
    cold: { title: 'All in order', steps: ['Little activity: normal between colleagues.', 'Nothing to do.', ''] },
    ended: { title: 'Close pending topics', steps: ['Something was left unanswered.', 'Pick it up with a concrete message.', 'If there’s no reply, try email.'] },
  },
};

const MOVES_ES: Moves = {
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

export function insights(i: Inputs): Pick<Report['insights'], 'styles' | 'move'> {
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
  const tpl = tr({ es: MOVES_ES, en: MOVES_EN })[groupOf(i.ctx.opts.relation)][situation];
  const move = {
    title: tpl.title.replaceAll('{o}', P(o)),
    steps: tpl.steps.filter(Boolean).map((s) => s.replaceAll('{o}', P(o))),
  };
  return {
    styles: [styleFor(0, i), styleFor(1, i)] as Pair<Style>,
    move,
  };
}
