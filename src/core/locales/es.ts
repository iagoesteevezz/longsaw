/**
 * Paquete de idioma: español (exports de WhatsApp en español, iOS y Android).
 * Los textos de sistema varían un poco entre versiones de la app; por eso las
 * expresiones son tolerantes (punto final opcional, mayúsculas, etc.).
 */
import type { LocalePack } from './types';

const STOP = `
a al algo algun alguna algunas alguno algunos ante antes aqui asi aun aunque bien cada casi como con contra cual cuales cuando cuanto de del desde donde dos el ella ellas ello ellos en entre era eran eres es esa esas ese eso esos esta estaba estaban estamos estan estar estas este esto estos estoy fue fueron fui ha habia han has hasta hay he la las le les lo los mas me mi mis mucho muy nada ni no nos nosotros o os otra otro para pero poco por porque que quien se sea ser si sido sin sobre solo son soy su sus tambien tan te tenemos tener tengo ti tiene tienen todo todos tu tus un una unas uno unos usted vosotros y ya yo
qué cómo cuándo dónde quién más también aquí así aún está están estás sí tú él mí sé ya vale pues bueno osea tipo igual eh ah oh luego ahora hoy mañana ayer
voy vas va vamos van hace hacer hago haces hizo puedo puede puedes poder quiero quieres quiere dice dije dijo digo creo sea ser estar estoy estaba tengo tienes tiene hay había
q k xq pq porq tb tmb xd d x
`;

export const es: LocalePack = {
  code: 'es',
  defaultDateOrder: 'DMY',
  deletedByMe: [/^eliminaste este mensaje\.?$/i],
  deletedByOther: [/^se elimin[oó] este mensaje\.?$/i, /^este mensaje fue eliminado\.?$/i],
  media: [
    { re: /^<multimedia omitido>$/i, type: 'other' },
    { re: /^imagen omitida$/i, type: 'image' },
    { re: /^(v[ií]deo|video) omitido$/i, type: 'video' },
    { re: /^audio omitido$/i, type: 'audio' },
    { re: /^sticker omitido$/i, type: 'sticker' },
    { re: /^gif omitido$/i, type: 'gif' },
    { re: /^documento omitido$/i, type: 'document' },
    { re: /^tarjeta de contacto omitida$/i, type: 'contact' },
    { re: /^ubicaci[oó]n: https?:\/\//i, type: 'location' },
    // Exports "con multimedia": Android → "IMG-...jpg (archivo adjunto)", iOS → "<adjunto: ...>"
    { re: /\.(jpe?g|png|webp|heic)\s*\(archivo adjunto\)$/i, type: 'image' },
    { re: /\.(opus|m4a|mp3|aac)\s*\(archivo adjunto\)$/i, type: 'audio' },
    { re: /\.(mp4|mov|3gp)\s*\(archivo adjunto\)$/i, type: 'video' },
    { re: /\(archivo adjunto\)$/i, type: 'document' },
    { re: /^<adjunto: .*(photo|\.jpe?g|\.png|\.webp)/i, type: 'image' },
    { re: /^<adjunto: .*(audio|\.opus|\.m4a)/i, type: 'audio' },
    { re: /^<adjunto: .*(video|\.mp4|\.mov)/i, type: 'video' },
    { re: /^<adjunto: .*(sticker|\.webp)/i, type: 'sticker' },
    { re: /^<adjunto: /i, type: 'document' },
    { re: /^<se omiti[oó] un archivo multimedia/i, type: 'other' },
  ],
  missedCall: [/^(llamada de voz|videollamada|llamada) perdida/i],
  edited: /\s*<se edit[oó] este mensaje\.?>\s*$/i,
  systemWithAuthor: [
    /^cambi[oó] su n[uú]mero/i,
    /^ahora es un contacto/i,
  ],
  systemHints: [
    /cifrados de extremo a extremo/i,
    /los mensajes y las llamadas/i,
    /bloqueaste a este contacto|desbloqueaste a este contacto/i,
  ],
  stopwords: new Set(STOP.split(/\s+/).filter(Boolean)),
  ambiguous: [
    {
      re: /^(ok|okay|oki|vale|va|bueno|bn)\.?$/,
      pattern: '“ok/vale” seco',
      reading: 'Puede ser simple confirmación… o fin de la conversación con poco entusiasmo. Mira si después pregunta algo o no.',
      en: { pattern: 'a dry “ok/vale”', reading: 'Could be a simple confirmation… or the end of the conversation with little enthusiasm. See whether they ask anything afterwards.' },
    },
    {
      re: /^(ya|aja|ajá|ah|ah vale|ah ok)\.?$/,
      pattern: '“ya / ajá”',
      reading: 'Acuse de recibo sin aportar nada. Si aparece tras un mensaje largo tuyo, suele leerse como desinterés o cansancio.',
      en: { pattern: '“ya / ajá”', reading: 'Acknowledged, nothing added. After a long message from you, it usually reads as disinterest or tiredness.' },
    },
    {
      re: /^(como quieras|lo que tu digas|lo que tú digas|si tu lo dices|si tú lo dices)\.?$/,
      pattern: '“como quieras”',
      reading: 'Clásico de molestia pasiva: cede, pero no está de acuerdo. Mejor preguntar directamente qué le parece.',
      en: { pattern: '“como quieras” (whatever you want)', reading: 'Classic passive annoyance: giving in without agreeing. Better to ask directly what they think.' },
    },
    {
      re: /^(ya veremos|quiz[aá]s?|puede|puede ser|a lo mejor|igual)\.?$/,
      pattern: '“ya veremos / puede”',
      reading: 'No es un no, pero tampoco un sí. Suele significar que no quiere comprometerse ahora mismo.',
      en: { pattern: '“ya veremos / puede” (we’ll see / maybe)', reading: 'Not a no, but not a yes either. Usually means they don’t want to commit right now.' },
    },
    {
      re: /^(estoy cansad[oa]|estoy liad[oa]|ando liad[oa]|mucho lio|mucho lío)\.?$/,
      pattern: '“estoy liad@/cansad@”',
      reading: 'Puede ser literal. Si se repite siempre que propones algo, es una forma suave de decir que no es prioridad.',
      en: { pattern: '“estoy liad@/cansad@” (busy/tired)', reading: 'Could be literal. If it comes up every time you suggest something, it’s a soft way of saying it’s not a priority.' },
    },
    {
      re: /^(hablamos|luego hablamos|ya hablamos|te digo algo|te digo)\.?$/,
      pattern: '“luego hablamos”',
      reading: 'Aplaza la conversación. Fíjate en quién retoma después: eso dice más que la frase.',
      en: { pattern: '“luego hablamos” (talk later)', reading: 'Puts the conversation off. Notice who picks it up again: that says more than the phrase.' },
    },
    {
      re: /^(j+a+j*a*|ja(ja)+|jsjs+|xd+)\.?$/,
      pattern: 'risa sola',
      reading: 'Una risa sin nada más tras un mensaje tuyo: le ha hecho gracia, pero no deja hilo del que tirar.',
      en: { pattern: 'a lone laugh', reading: 'Just a laugh after your message: they found it funny, but left no thread to pull.' },
    },
    {
      re: /^(nada|na|nah|no se|no sé|nose)\.?$/,
      pattern: '“nada / no sé”',
      reading: 'Respuesta cerrada. A veces es cansancio; a veces “sí pasa algo, pero no quiero hablarlo por aquí”.',
      en: { pattern: '“nada / no sé” (nothing / dunno)', reading: 'A closed answer. Sometimes it’s tiredness; sometimes “something is up, but I don’t want to discuss it here”.' },
    },
    {
      re: /^(👍|👌|🙂|😊)$/u,
      pattern: 'emoji suelto',
      reading: 'Un emoji como respuesta completa cierra la conversación con cordialidad, pero sin abrir nada nuevo.',
      en: { pattern: 'a lone emoji', reading: 'An emoji as a full reply closes the conversation politely, without opening anything new.' },
    },
  ],
};
