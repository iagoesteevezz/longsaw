/**
 * Paquete de idioma: inglés. Los informes se muestran en español (la UI es
 * es-ES), pero el parser entiende exports en inglés: textos de sistema,
 * multimedia, palabras vacías y respuestas ambiguas en inglés.
 */
import type { LocalePack } from './types';

const STOP = `
a about above after again against all am an and any are aren as at be because been before being below between both but by can cant could couldnt did didnt do does doesnt doing dont down during each few for from further had hadnt has hasnt have havent having he hed hell hes her here heres hers herself him himself his how hows i id ill im ive if in into is isnt it its itself lets me more most mustnt my myself no nor not of off on once only or other ought our ours ourselves out over own same shant she shed shell shes should shouldnt so some such than that thats the their theirs them themselves then there theres these they theyd theyll theyre theyve this those through to too under until up very was wasnt we wed well were weve werent what whats when whens where wheres which while who whos whom why whys with wont would wouldnt you youd youll youre youve your yours yourself yourselves
just like get got go going gonna wanna yeah yes yep ok okay oh ah um so also now today tomorrow yesterday know think really one u ur r im dont thats its gotta
`;

export const en: LocalePack = {
  code: 'en',
  defaultDateOrder: 'MDY',
  deletedByMe: [/^you deleted this message\.?$/i],
  deletedByOther: [/^this message was deleted\.?$/i],
  media: [
    { re: /^<media omitted>$/i, type: 'other' },
    { re: /^image omitted$/i, type: 'image' },
    { re: /^video omitted$/i, type: 'video' },
    { re: /^audio omitted$/i, type: 'audio' },
    { re: /^sticker omitted$/i, type: 'sticker' },
    { re: /^gif omitted$/i, type: 'gif' },
    { re: /^document omitted$/i, type: 'document' },
    { re: /^contact card omitted$/i, type: 'contact' },
    { re: /^location: https?:\/\//i, type: 'location' },
    { re: /\.(jpe?g|png|webp|heic)\s*\(file attached\)$/i, type: 'image' },
    { re: /\.(opus|m4a|mp3|aac)\s*\(file attached\)$/i, type: 'audio' },
    { re: /\.(mp4|mov|3gp)\s*\(file attached\)$/i, type: 'video' },
    { re: /\(file attached\)$/i, type: 'document' },
    { re: /^<attached: .*(photo|\.jpe?g|\.png)/i, type: 'image' },
    { re: /^<attached: .*(audio|\.opus|\.m4a)/i, type: 'audio' },
    { re: /^<attached: .*(video|\.mp4|\.mov)/i, type: 'video' },
    { re: /^<attached: .*(sticker|\.webp)/i, type: 'sticker' },
    { re: /^<attached: /i, type: 'document' },
    { re: /^<view once (voice message|media) omitted>$/i, type: 'other' },
  ],
  missedCall: [/^missed (voice|video) call/i],
  edited: /\s*<this message was edited>\s*$/i,
  systemWithAuthor: [/^changed (their|his|her) phone number/i],
  systemHints: [
    /end-to-end encrypted/i,
    /messages and calls are/i,
    /you blocked this contact|you unblocked this contact/i,
  ],
  stopwords: new Set(STOP.split(/\s+/).filter(Boolean)),
  ambiguous: [
    {
      re: /^(ok|okay|k|kk|sure|fine|alright)\.?$/,
      pattern: '“ok / fine” seco',
      reading: 'Confirmación mínima. Si cierra un mensaje largo tuyo, puede ser poco entusiasmo o simple prisa.',
      en: { pattern: 'a dry “ok / fine”', reading: 'A bare-minimum confirmation. After a long message from you, it may mean little enthusiasm or just being in a hurry.' },
    },
    {
      re: /^(whatever|if you say so|do what you want)\.?$/,
      pattern: '“whatever”',
      reading: 'Molestia pasiva: cede sin estar de acuerdo. Pregunta directamente.',
      en: { pattern: '“whatever”', reading: 'Passive annoyance: giving in without agreeing. Ask directly.' },
    },
    {
      re: /^(we'?ll see|maybe|perhaps|possibly)\.?$/,
      pattern: '“we’ll see / maybe”',
      reading: 'Ni sí ni no: evita comprometerse ahora.',
      en: { pattern: '“we’ll see / maybe”', reading: 'Neither yes nor no: avoiding committing right now.' },
    },
    {
      re: /^(i'?m (tired|busy|so busy)|busy day)\.?$/,
      pattern: '“I’m busy/tired”',
      reading: 'Puede ser literal; si se repite cada vez que propones algo, no eres prioridad ahora.',
      en: { pattern: '“I’m busy/tired”', reading: 'Could be literal; if it comes up every time you suggest something, you’re not a priority right now.' },
    },
    {
      re: /^(ttyl|talk later|later|talk soon)\.?$/,
      pattern: '“talk later”',
      reading: 'Aplaza. Mira quién retoma después.',
      en: { pattern: '“talk later”', reading: 'Puts it off. Watch who picks it up again.' },
    },
    {
      re: /^(lol|lmao|haha+|ha(ha)+)\.?$/,
      pattern: 'risa sola',
      reading: 'Le hace gracia, pero no deja hilo del que tirar.',
      en: { pattern: 'a lone laugh', reading: 'They found it funny, but left no thread to pull.' },
    },
    {
      re: /^(nothing|nm|idk|nvm)\.?$/,
      pattern: '“nothing / idk”',
      reading: 'Respuesta cerrada: cansancio o “no quiero hablarlo por aquí”.',
      en: { pattern: '“nothing / idk”', reading: 'A closed answer: tiredness, or “I don’t want to talk about it here”.' },
    },
    {
      re: /^(👍|👌|🙂|😊)$/u,
      pattern: 'emoji suelto',
      reading: 'Cierra con cordialidad, sin abrir nada nuevo.',
      en: { pattern: 'a lone emoji', reading: 'Closes politely, without opening anything new.' },
    },
  ],
};
