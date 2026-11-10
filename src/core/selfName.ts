/**
 * Algunos exports ponen al autor del export como "Tú" / "You" en vez de su
 * nombre. Ese texto no sirve como nombre en las frases ("Tú manda 40 audios"),
 * así que la pantalla de ajustes pide el nombre real cuando aparece.
 */
const SELF_PLACEHOLDERS = new Set(['tu', 'yo', 'you', 'me', 'voce', 'eu', 'vous', 'toi', 'moi', 'du', 'ich', 'io']);

export function isSelfPlaceholder(name: string): boolean {
  const key = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}]/gu, '')
    .toLowerCase();
  return SELF_PLACEHOLDERS.has(key);
}
