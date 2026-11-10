/**
 * Diccionarios para la tarjeta "Risas, cariño y pullitas" y para las frases.
 *
 * Todo se compara SIN tildes y en minúsculas ("imbécil" = "imbecil"), por
 * palabras completas o expresiones de hasta 3 palabras. Español primero,
 * con lo básico del inglés porque los chats lo mezclan.
 *
 * "Insultos suaves" = los que se usan con cariño entre gente de confianza
 * ("tonta", "pesado"). Nada de insultos graves: la tarjeta es de humor.
 */

/** Familias de risa → regex sobre la palabra en minúsculas. El orden importa. */
export const LAUGH_FAMILIES: [family: string, re: RegExp][] = [
  ['jsjs', /^(?:js){2,}j?s?$/],
  ['jeje', /^(?:je){2,}j?$/],
  ['jiji', /^(?:ji){2,}j?$/],
  ['jaja', /^(?:j+a+){2,}j*$|^a?ja(?:j+a+)+j*$|^jaj+a*$/],
  ['haha', /^(?:ha){2,}h?$|^(?:he){2,}h?$/],
  ['xd', /^x+d+$/],
  ['lol', /^lo+l$|^lmf?ao+$|^rofl$/],
  ['kkk', /^k{3,}$/],
];

/** Emojis de risa (cuentan como risa). */
export const LAUGH_EMOJIS = new Set(['😂', '🤣', '😹', '😆', '😅', '😁']);

export function laughFamily(word: string): string | null {
  if (word.length < 3) return null;
  for (const [fam, re] of LAUGH_FAMILIES) if (re.test(word)) return fam;
  return null;
}

const words = (s: string) => s.split(/\n/).map((x) => x.trim()).filter(Boolean);

/** Cariño: apelativos, frases y despedidas tiernas. */
export const AFFECTION = words(`
cariño
cari
carino
amor
amorcito
mi amor
mi vida
vida mia
cielo
mi cielo
corazon
cora
bonita
bonito
guapa
guapo
guapisima
guapisimo
preciosa
precioso
reina
rey
nene
nena
churri
bebe
te quiero
te quiero mucho
tq
tqm
te amo
te adoro
te echo de menos
te extraño
besos
besitos
besito
beso
un beso
abrazo
abrazos
muak
mua
mil besos
honey
babe
baby
love
love you
miss you
xoxo
`);

export const AFFECTION_EMOJIS = new Set(['❤', '😘', '🥰', '😍', '💕', '💖', '💗', '💓', '💞', '💘', '😚', '😙', '🫶', '🤗', '💋', '🥺', '💜', '💚', '💙', '🧡', '🤍']);

/** Insultos suaves (de confianza). */
export const SOFT_INSULTS = words(`
tonto
tonta
tontito
tontita
tontorron
tontorrona
bobo
boba
bobito
bobita
pesado
pesada
pesadito
pesadita
idiota
payaso
payasa
burro
burra
petardo
petarda
cansino
cansina
capullo
capulla
gilipollas
imbecil
memo
mema
cabezon
cabezona
pringado
pringada
lerdo
lerda
merluzo
merluza
cenutrio
cenutria
zoquete
mamon
mamona
gañan
dumb
dummy
idiot
silly
stupid
loser
jerk
`);

/** Saludos (y despedidas del día). */
export const GREETINGS = words(`
hola
holi
holis
holaa
holaaa
wenas
buenas
buenos dias
buen dia
buenas tardes
buenas noches
hey
ey
eyy
que tal
que pasa
hi
hello
hiya
good morning
good night
gm
gn
`);

export const GOOD_MORNING = new Set(['buenos dias', 'buen dia', 'good morning', 'gm']);
export const GOOD_NIGHT = new Set(['buenas noches', 'good night', 'gn']);

/** Quita tildes y pasa a minúsculas (mantiene la ñ). */
export function fold(s: string): string {
  return s
    .toLowerCase()
    .replace(/ñ/g, '\u0000')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\u0000/g, 'ñ');
}

/** Índice de expresiones por número de palabras (1-3) para buscar n-gramas. */
export function phraseIndex(list: string[]): Map<number, Set<string>> {
  const idx = new Map<number, Set<string>>();
  for (const p of list) {
    const f = fold(p);
    const n = f.split(' ').length;
    if (!idx.has(n)) idx.set(n, new Set());
    idx.get(n)!.add(f);
  }
  return idx;
}
