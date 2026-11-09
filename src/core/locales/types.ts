/**
 * Contrato de un "paquete de idioma" del parser.
 *
 * DECISIÓN: todo lo que depende del idioma del export (textos de sistema,
 * marcadores de multimedia, palabras vacías...) vive en datos, no en código.
 * Añadir portugués = crear `pt.ts` con esta forma y registrarlo en `index.ts`.
 * El parser y las estadísticas no cambian.
 */
import type { LocaleCode, MediaType } from '../types';

export interface LocalePack {
  code: LocaleCode;
  /** Orden de fecha por defecto si el archivo es ambiguo (todas las partes ≤ 12). */
  defaultDateOrder: 'DMY' | 'MDY';
  /** El exportador borró su propio mensaje. */
  deletedByMe: RegExp[];
  /** La otra persona borró el mensaje. */
  deletedByOther: RegExp[];
  /** Marcadores de multimedia → tipo. Se prueban en orden. */
  media: { re: RegExp; type: MediaType }[];
  missedCall: RegExp[];
  /** Sufijo de mensaje editado (se elimina del texto). */
  edited: RegExp;
  /** Mensajes de sistema que, en Android, sí llevan "Nombre: " delante. */
  systemWithAuthor: RegExp[];
  /** Mensajes de sistema sin autor (aviso de cifrado, etc.). Solo para detección de idioma. */
  systemHints: RegExp[];
  /** Palabras vacías para el ranking de palabras. */
  stopwords: Set<string>;
  /**
   * Respuestas típicamente ambiguas → lectura "por reglas".
   * `re` se prueba contra el mensaje completo normalizado (minúsculas).
   */
  ambiguous: { re: RegExp; pattern: string; reading: string }[];
}
