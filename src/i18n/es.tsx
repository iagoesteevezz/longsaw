/**
 * Textos de la interfaz en español. en.tsx tiene exactamente la misma forma
 * (tipo `Dict`): si falta una traducción, TypeScript no compila.
 * Los textos que genera el análisis (frases, red flags…) viven en src/core.
 */
import type { ReactNode } from 'react';
import type { ParseWarning, Relation } from '../core/types';
import type { CardId } from '../lib/relations';

const rom = (r: Relation) => r === 'pareja' || r === 'ex' || r === 'ligue';

export const es = {
  meta: {
    title: 'Longsaw · ¿Qué dice vuestro chat?',
    description: 'Analiza tu chat de WhatsApp en tu propio navegador y descubre cómo es vuestra relación en números.',
  },
  common: {
    privacy: 'Privacidad',
    back: '← Volver',
    githubAria: 'GitHub de iagoesteevezz (se abre en otra pestaña)',
    toDark: 'Cambiar a modo oscuro',
    toLight: 'Cambiar a modo claro',
    darkTitle: 'Modo oscuro',
    lightTitle: 'Modo claro',
    switchLang: 'Switch to English',
    switchLangShort: 'EN',
    persons: ['Persona A', 'Persona B'] as [string, string],
    otherPerson: 'Otra persona',
    you: 'Tú',
    howData: 'Cómo tratamos tus datos',
    pct: (n: number) => `${n} %`,
  },
  errors: {
    GROUP: 'Parece un chat de grupo. De momento solo analizamos chats entre dos personas.',
    NO_TXT_IN_ZIP: 'El .zip no contiene el .txt del chat. Vuelve a exportarlo desde WhatsApp.',
    NOT_WHATSAPP: 'No reconocemos el archivo como un chat de WhatsApp. Exporta el chat desde WhatsApp → Más → Exportar chat.',
    EMPTY: 'El chat no tiene mensajes de personas.',
    generic: 'Algo ha fallado al leer el chat. Prueba a exportarlo de nuevo.',
  },
  warning: (w: ParseWarning): string => {
    switch (w.code) {
      case 'single': return 'Solo una persona ha escrito en este chat: muchas comparaciones no aplican.';
      case 'orphans': return `Se ignoraron ${w.n} líneas antes del primer mensaje.`;
      case 'oddLines': return 'Se trataron como aviso del sistema algunas líneas con formato raro.';
      case 'unordered': return 'Algunas fechas no están en orden; revisa que el archivo no esté mezclado.';
    }
  },
  relations: {
    amistad: 'Amigo/a',
    pareja: 'Pareja',
    ex: 'Ex',
    ligue: 'Ligue',
    familia: 'Familiar',
    trabajo: 'Compañero/a',
    otro: 'Otro',
  } as Record<Relation, string>,
  cardCopy: (id: CardId, r: Relation): { kicker: string; title: string } => {
    const table: Record<CardId, { kicker: string; title: string }> = {
      messages: { kicker: 'Mensajes', title: '¿Quién habla más?' },
      response: { kicker: 'Tiempo de respuesta', title: rom(r) ? '¿Quién está más pendiente del móvil?' : '¿Quién contesta antes?' },
      first: { kicker: 'El primer mensaje', title: 'Así empezó todo' },
      initiator: { kicker: 'Quién inicia', title: rom(r) ? '¿Quién escribe primero?' : '¿Quién saca la conversación?' },
      media: { kicker: 'Fotos, audios y stickers', title: 'Lo que no cabe en palabras' },
      lexicon: { kicker: 'Risas, cariño y pullitas', title: r === 'trabajo' ? 'El tono del chat' : 'Cómo os habláis' },
      longest: { kicker: 'Mensaje más largo', title: 'El testamento' },
      deleted: { kicker: 'Mensajes eliminados', title: 'Lo que nunca sabremos' },
      timeline: { kicker: 'Cómo fue', title: 'Vuestra historia en el chat' },
      interest: {
        kicker: 'Nivel de interés',
        title:
          r === 'ligue' ? '¿Le gustas?' : r === 'ex' ? '¿Quién sigue más enganchado?' : r === 'pareja' ? '¿Quién pone más?' : r === 'familia' ? '¿Quién está más pendiente?' : r === 'trabajo' ? 'Implicación en el chat' : '¿Quién tiene más ganas de hablar?',
      },
      seen: { kicker: r === 'trabajo' ? 'Mensajes sin respuesta' : 'Te dejó en visto', title: 'Preguntas al vacío' },
      silence: { kicker: rom(r) ? 'Posible bloqueo' : 'Silencios largos', title: rom(r) ? '¿Te bloqueó o solo desapareció?' : 'Las pausas más largas' },
      words: { kicker: 'Palabras y emojis', title: 'Lo que más decís' },
      shared: { kicker: 'Vuestro idioma', title: 'Cosas que solo decís vosotros' },
      flags: { kicker: 'Red flags y patrones', title: 'Lo que dicen los números' },
      style: { kicker: rom(r) ? 'Estilo de apego (versión ligera)' : 'Estilo de comunicación', title: 'Lo que notamos' },
      meaning: { kicker: 'Lo que quiere decir', title: 'Traducción simultánea' },
      move: { kicker: 'The move', title: '¿Y ahora qué?' },
    };
    return table[id];
  },

  upload: {
    fileAria: 'Archivo de chat exportado de WhatsApp',
    h1: ['¿Qué dice', 'vuestro chat', 'de vosotros?'] as [string, string, string],
    lead: 'Sube un chat exportado de WhatsApp y descubre quién escribe más, quién tarda en contestar, quién se ríe más y quién manda más audios. Gratis, al momento y sin que el chat salga de tu móvil.',
    choose: 'Elegir archivo',
    demo: 'Probar con un chat de ejemplo',
    openSaved: 'Abrir el informe que guardaste →',
    dropHint: '…o arrastra aquí el .txt o el .zip exportado.',
    privacyStrong: 'Todo ocurre en tu navegador. Nada se sube.',
    privacyRest: 'Sin cuentas, sin servidores y sin IA externa.',
    exportTitle: 'Exporta tu chat en 20 segundos',
    exportLead: 'Solo chats entre dos personas. Funciona con iPhone y Android, en español o inglés.',
    steps: [
      ['Abre el chat en WhatsApp', 'El de la persona que quieras analizar.'],
      ['Toca su nombre (iPhone) o ⋮ → Más (Android) → Exportar chat', 'Elige “Sin archivos”: es más rápido y contamos igual las fotos, audios y stickers.'],
      ['Guárdalo y súbelo aquí', 'El .zip del iPhone o el .txt de Android, tal cual.'],
    ] as [string, string][],
    cardsTitle: '18 tarjetas sobre vosotros',
    cardsLead: 'Con números exactos y comentarios con algo de mala leche (y cariño). Todas gratis.',
    discover: [
      '¿Quién habla más?', 'Tiempos de respuesta', 'Quién escribe primero', 'Fotos, audios y stickers', 'Risas, cariño y pullitas', 'El mensaje más largo',
      'Te dejó en visto', 'Silencios largos', 'Vuestras palabras', 'Red flags', 'Nivel de interés', 'Y ahora, ¿qué?',
    ],
    samples: [
      'Sam manda 47 audios. Pódcast propio, sin suscripción.',
      'Alex empieza el 78 % de las conversaciones. Si Alex no escribe, aquí no habla nadie.',
      'La risa de Sam suena a «jsjsjs». Su récord: «jsjsjsjsjsjs».',
    ],
    privacyTitle: 'Tu chat no sale de este dispositivo',
    privacyItems: [
      ['Se analiza aquí', 'El archivo se lee en tu navegador. Puedes mirar la pestaña “Red”: no sale ninguna petición.'],
      ['No guardamos nada', 'Cierra la pestaña y desaparece. Solo se guarda si tú lo pides, y en tu dispositivo.'],
      ['Nombres ocultos al compartir', 'Las tarjetas y el PDF salen con “Persona A” y “Persona B” por defecto.'],
    ] as [string, string][],
    analyzeMine: 'Analizar mi chat',
    footer: 'longsaw no está afiliado a WhatsApp. Las lecturas son entretenimiento, no un diagnóstico.',
  },

  hero: {
    script: [
      '¿al final vienes esta noche? 👀',
      '¡claro! llevo todo el día pensando en ello',
      '¿a qué hora quedamos?',
      'jajaja a las 9, no llegues tarde 😂',
      'yo nunca llego tarde',
      'ya, ya… te veo luego ❤️',
    ],
    typing: 'escribiendo…',
    online: 'en línea',
    yourReport: 'Tu informe',
    headline: 'Escribís lo mismo, pero Sam se ríe más',
    you: 'Tú',
    pct: (n: number) => `${n} %`,
    stats: [
      ['2 min', 'respondes'],
      ['6 min', 'responde Sam'],
      ['3 😂', 'risas'],
    ] as [string, string][],
    perHour: 'mensajes por hora',
  },

  loading: {
    steps: ['Leyendo archivo', 'Anonimizando', 'Calculando estadísticas', 'Generando informe'],
    kicker: 'Un momento',
    h1: ['Leyendo', 'vuestro chat'] as [string, string],
    progress: 'Progreso del análisis',
    done: 'listo',
    privacy: 'Nada de esto sale de tu navegador.',
  },

  setup: {
    backAria: 'Elegir otro archivo',
    online: 'en línea',
    typing: 'escribiendo…',
    typingAria: 'longsaw está escribiendo',
    today: 'Hoy',
    notice: '🔒 Este chat se analiza en tu navegador. Nada se sube y nadie más puede leerlo.',
    hi: '¡Hola! 👋 Ya he leído vuestro chat.',
    stats: (n: string, from: string, to: string): [string, ReactNode] => [
      `Son ${n} mensajes, del ${from} al ${to}. Antes de hacer el informe, unas preguntas rápidas.`,
      <>Son <b>{n} mensajes</b>, del {from} al {to}. Antes de hacer el informe, unas preguntas rápidas.</>,
    ],
    whoQ: '¿Quién de los dos eres tú?',
    guessPlaceholder: (g: string) => `Uno de los dos sale como «${g}» en el archivo: diría que eres tú 👀`,
    guess: (g: string) => `Diría que eres ${g}, pero confírmamelo 👀`,
    iAmPlaceholder: (raw: string) => `Soy «${raw}»`,
    iAm: (raw: string) => `Soy ${raw}`,
    nameQ: (raw: string) => `En el archivo sales como «${raw}» 😅 ¿Cómo te llamas? Así las frases sonarán bien.`,
    relQ: (me: string, other: string) => `${me ? `¡Genial, ${me}! ` : '¡Genial! '}¿Y quién es ${other || 'la otra persona'} para ti?`,
    relHint: 'Cambia el tono, los apartados y los consejos del informe.',
    aliasQ: (other: string) => `¿Cómo quieres que salga ${other || 'la otra persona'} en el informe? Puedes ponerle un apodo.`,
    done: ['¡Listo! Ya tengo todo lo que necesito 🙌', 'Al compartir tarjetas o el PDF los nombres se ocultan por defecto. ¿Lo analizo?'] as [string, string],
    waiting: 'longsaw está escribiendo…',
    whoGroup: '¿Quién eres tú?',
    msgShort: 'msj',
    namePh: 'Tu nombre o apodo',
    relGroup: 'Tipo de relación',
    aliasGroup: 'Nombre de la otra persona',
    keepAs: (n: string) => `Déjalo como «${n}»`,
    aliasPh: 'O escribe un apodo',
    settingsShow: 'Ajustes avanzados',
    settingsHide: 'Ocultar ajustes',
    analyze: 'Analizar chat →',
    change: 'cambiar ·',
    changeTitle: 'Cambiar respuesta',
    changeAria: (t: string) => `${t}. Toca para cambiar la respuesta`,
    send: 'Enviar',
    gap: 'Nueva conversación tras un silencio de',
    seen: 'Contar “visto” si no responde en',
    silence: 'Silencio largo / posible bloqueo a partir de',
    hours: 'h',
    days: 'días',
  },

  report: {
    newAria: 'longsaw: analizar otro chat',
    wipe: 'Borrar todo',
    kicker: 'Informe',
    youAnd: (other: string) => `Tú y ${other}`,
    heroStats: ['mensajes', 'días', 'charlas'] as [string, string, string],
    showNames: 'Mostrar nombres al compartir o descargar',
    hideNames: 'Ocultar nombres también en pantalla',
    saved: '✓ Guardado en este navegador',
    save: 'Guardar informe en este dispositivo',
    saveNote: 'Guarda solo el informe (no el chat). “Borrar todo” lo elimina.',
    creatingImage: 'Creando imagen…',
    generatingPdf: 'Generando PDF…',
    translating: 'Traduciendo el informe…',
    otherLang: 'Este informe guardado se creó en inglés. Para verlo en español, vuelve a analizar el chat.',
  },

  pdf: {
    title: (a: string, b: string) => `${a} y ${b}`,
    kicker: 'INFORME DE CHAT',
    stats: ['mensajes', 'días de chat', 'conversaciones', 'días de racha'] as [string, string, string, string],
    split: 'Reparto de mensajes',
    noticed: 'Lo que notamos',
    footer: 'Generado en tu navegador: el chat no se ha subido a ningún sitio. Las lecturas son entretenimiento, no un diagnóstico.',
    file: 'longsaw-informe.pdf',
    shareTitle: 'Mi informe de Longsaw',
  },

  card: {
    share: '↗︎ Compartir',
    shareAria: (k: string) => `Compartir tarjeta: ${k}`,
    watermark: 'analizado en el navegador',
    explain: '¿Cómo se calcula?',
    split: 'Reparto de mensajes',
  },

  messages: {
    inDays: (n: string) => `mensajes en ${n} días`,
    words: (n: string) => `${n} palabras`,
  },
  response: {
    median: 'Mediana · lo que tarda normalmente',
    meanOf: (name: string) => `Media de ${name}`,
    summary: '¿Mediana o media?',
    explain: (p: { a: string; pa: string; b: string; pb: string }): ReactNode => (
      <>
        <p>La <b>mediana</b> (el número grande) es la respuesta típica: la mitad de las veces contesta más rápido y la otra mitad más lento. Un par de respuestas de 8 horas no la mueven.</p>
        <p>La <b>media</b> (abajo) suma todos los tiempos y divide: unas pocas respuestas muy lentas la disparan. Por eso suele ser bastante mayor que la mediana.</p>
        <p>Solo contamos como respuesta un cambio de persona dentro de la misma conversación. Si pasan más de las horas de “nueva conversación”, eso cuenta como iniciativa, no como respuesta lenta.</p>
        <p>El 10 % de respuestas más lentas: {p.a} {p.pa}, {p.b} {p.pb}.</p>
      </>
    ),
  },
  first: {
    none: 'No encontramos el primer mensaje.',
    by: (year: number, name: string) => `de ${year} · lo escribió ${name}`,
  },
  initiator: {
    writesFirst: 'Escribe primero',
    share: (pct: number, n: string) => `${pct} % de ${n} conversaciones`,
    bar: 'Inicios de conversación',
    closes: (name: string, n: number) => `${name} cierra ${n} conversaciones`,
    explain: (h: number): ReactNode => (
      <p>Una “conversación nueva” empieza cuando alguien escribe tras más de <b>{h} horas</b> de silencio. Puedes cambiar ese umbral en los ajustes del informe.</p>
    ),
  },
  longest: {
    words: (name: string, n: string) => `${name} · ${n} palabras`,
    noText: (name: string) => `${name} no tiene mensajes de texto.`,
  },
  deleted: {
    summary: '¿Cómo lo sabemos?',
    explain: 'WhatsApp deja en el export “Eliminaste este mensaje” / “Se eliminó este mensaje” (y sus versiones en inglés). El contenido borrado no está en el archivo: nadie puede recuperarlo, tampoco nosotros.',
  },
  timeline: {
    days: 'Días en el chat',
    streak: 'Racha más larga',
    daysUnit: 'días',
    activeDays: (n: string) => `${n} días con mensajes`,
    monthsAria: 'Mensajes por mes de cada persona',
    mostActive: (m: string, n: string) => `🔥 Mes más intenso: ${m} (${n} mensajes)`,
    leastActive: (m: string, n: string) => `🧊 Mes más flojo: ${m} (${n})`,
    peak: (d: string, n: number) => `📈 Día récord: ${d} con ${n} mensajes`,
    hoursQ: '¿A qué hora habláis?',
    hoursAria: 'Mensajes por hora del día',
    hourTitle: (h: number, v: number) => `${h}:00 · ${v} mensajes`,
  },
  interest: {
    evolution: 'Evolución (4 tramos del chat)',
    evolutionAria: 'Evolución del interés de cada persona',
    summary: '¿Cómo se calcula? (siempre a la vista)',
    intro: 'Es una puntuación de 0 a 100 hecha con señales objetivas del chat. Cada señal tiene una escala absoluta, así que los dos podéis tener mucho (o poco) interés a la vez:',
    signal: 'Señal (peso)',
    weight: (w: number) => `${w} %`,
    scales: 'Escalas: responder al instante = 100 y tardar 24 h = 0 (escala logarítmica); 12+ palabras por mensaje = 100; 25 % de mensajes con pregunta = 100; empezar 2 de cada 3 conversaciones = 100. No mide sentimientos: mide comportamiento en el chat.',
  },
  seen: {
    lead: 'Veces que cada uno dejó sin contestar un mensaje que pedía respuesta',
    waited: 'Los que más esperaron',
    never: '…nunca tuvo respuesta',
    until: (d: string) => `⏳ ${d} hasta la respuesta`,
    estimate: (h: number) =>
      `Estimación. El export de WhatsApp no incluye si un mensaje se leyó (los ticks azules). Contamos un “visto” cuando alguien hizo una pregunta o insistió con varios mensajes y la otra persona tardó más de ${h} h en contestar (o nunca contestó).`,
  },
  silence: {
    days: (n: number) => `${n} días`,
    endText: (name: string, n: number) => `${name} escribió ${n} mensajes sin respuesta hasta el final del chat.`,
    longestText: 'fue vuestro silencio más largo. Pero el chat no termina con una sola voz.',
    none: (d: number) => `Ningún silencio de más de ${d} días. Nada de desapariciones. 🙌`,
    since: (date: string) => `desde el ${date}`,
    mutual: 'silencio de los dos',
    only: (name: string, n: number) => `solo escribía ${name} (${n} mensajes)`,
    untilEnd: ' · hasta el final',
    estimate: 'Es una inferencia, no un dato: el export no dice si alguien bloqueó a alguien. Un silencio unilateral es compatible con un bloqueo, con que alguien dejó de contestar o con que hablasteis por otro sitio (en persona, llamadas, otra app).',
  },
  words: {
    note: 'Sin palabras vacías (“que”, “de”, “the”…) en español e inglés. Las risas se agrupan: “jajajaj” = “jaja”.',
  },
  shared: {
    none: 'Todavía no tenéis un idioma propio: ninguna expresión la usáis los dos lo bastante.',
    summary: '¿Por qué estas?',
    explain: (): ReactNode => (
      <p>Son palabras y expresiones de dos palabras que <b>los dos</b> usáis al menos 3 veces, ordenadas por lo compartidas que son (no por lo que repite solo uno). No tenemos un diccionario de “lo que dice todo el mundo”, así que tómalo como vuestro idioma dentro de este chat.</p>
    ),
  },
  flags: {
    sev: { red: 'Red flag', yellow: 'Ojo', green: 'Green flag' },
    none: 'Ni red ni green flags claras: un chat bastante neutro.',
    evidence: (n: number) => `Ver evidencia del chat (${n})`,
  },
  style: {
    noticed: 'Lo que notamos',
    disclaimer: 'Esto es entretenimiento, no psicología clínica. Un chat es una parte pequeña de una relación y nadie “es” un estilo de apego por cómo escribe en WhatsApp.',
  },
  meaning: {
    none: 'No hemos encontrado mensajes ambiguos clave. Os entendéis bastante bien.',
    disclaimer: 'Interpretaciones posibles, no certezas. Si de verdad importa, pregunta.',
  },
  media: {
    rows: { photo: 'Fotos', audio: 'Audios', video: 'Vídeos', sticker: 'Stickers y GIF', other: 'Docs, contactos, ubicaciones', unknown: 'Sin especificar' },
    summary: '¿Cómo lo contamos sin ver los archivos?',
    explain: (): ReactNode => (
      <p>
        Al exportar <b>sin archivos</b>, WhatsApp cambia cada foto, audio o sticker por un aviso como “imagen omitida”, “audio omitido” o “&lt;Multimedia omitido&gt;”, en el idioma de tu móvil. Contamos esos avisos y los quitamos del análisis de texto: nunca salen en el ranking de palabras.
      </p>
    ),
    unknown: (): ReactNode => (
      <p>
        <b>“Sin especificar”</b>: el export de Android pone el mismo “&lt;Multimedia omitido&gt;” para todo, así que sabemos cuántos archivos hay pero no si eran fotos, audios o vídeos. El de iPhone sí lo dice.
      </p>
    ),
  },
  lexicon: {
    rows: { laughs: 'Risas', affection: 'Cariño', insults: 'Pullitas', greetings: 'Saludos' },
    quote: (s: string) => `«${s}»`,
    summary: '¿Qué cuenta como cada cosa?',
    explain: (): ReactNode => (
      <>
        <p><b>Risas</b>: jaja, jsjs, jeje, xd, lol, haha… (da igual lo largas que sean) y 😂🤣😆.</p>
        <p><b>Cariño</b>: “te quiero”, “cariño”, “mi vida”, “besos”, “te echo de menos”… y corazones o 😘🥰.</p>
        <p><b>Pullitas</b>: insultos suaves de confianza (“tonta”, “pesado”, “idiota”…). No distinguimos el tono: se cuentan igual en broma que en serio.</p>
        <p><b>Saludos</b>: hola, buenas, buenos días, buenas noches, hey… ☀️ = buenos días, 🌙 = buenas noches.</p>
      </>
    ),
  },

  privacy: {
    title: 'Privacidad, en claro',
    blocks: [
      ['Tu chat no sale de tu dispositivo', 'El archivo se lee y se analiza dentro de tu navegador (en un Web Worker). No hay subida a ningún servidor. Puedes comprobarlo en la pestaña “Red” de las herramientas de desarrollador: al analizar no se hace ninguna petición.'],
      ['No guardamos nada salvo que lo pidas', 'Si cierras la pestaña, todo desaparece. Solo si pulsas “Guardar en este dispositivo” guardamos el informe (estadísticas y algunas frases citadas, nunca el chat entero) en el almacenamiento local de tu navegador. El botón “Borrar todo” lo elimina y destruye el proceso que tenía el chat en memoria.'],
      ['Sin IA externa ni pagos', 'Los textos del informe salen de reglas y de un banco de frases que viaja con la propia web: nada se envía a ningún modelo de IA ni a ningún servidor. La web es gratuita y no hay cuentas, así que no hay nada que pagar ni datos de pago que guardar.'],
      ['Sin rastreadores', 'No usamos cookies, analíticas, píxeles ni fuentes o scripts de terceros. La web no hace ninguna petición a otros dominios.'],
      ['Sobre la otra persona', 'Un chat también es de la otra persona. Úsalo con cabeza: comparte tarjetas con los nombres ocultos (viene así por defecto) y no publiques mensajes suyos sin su permiso.'],
      ['Lo que es (y no es) el informe', 'Las estadísticas son exactas sobre el archivo. “Visto”, “posible bloqueo”, “nivel de interés” y los estilos son estimaciones y lecturas de entretenimiento basadas en tiempos y textos, no un diagnóstico ni una verdad sobre nadie.'],
    ] as [string, string][],
  },
};

export type Dict = typeof es;
