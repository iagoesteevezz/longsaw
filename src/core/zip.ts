/**
 * Lectura del archivo subido (.txt o .zip) → texto del chat.
 *
 * DECISIÓN: `fflate` (8 KB gz) en lugar de JSZip (~100 KB). Descomprimimos
 * SOLO la entrada .txt (filtro en `unzipSync`), así un zip "con multimedia"
 * de 500 MB no revienta la memoria del navegador descomprimiendo fotos.
 */
import { unzipSync } from 'fflate';
import { ParseError } from './parser';

function isChatTxt(name: string): boolean {
  const base = name.split('/').pop() ?? name;
  return base.toLowerCase().endsWith('.txt') && !base.startsWith('._'); // ._ = basura de macOS
}

/** Prioridad: _chat.txt (iOS) > "WhatsApp Chat ..."/"Chat de WhatsApp ..." (Android) > cualquier .txt */
function rank(name: string): number {
  const base = (name.split('/').pop() ?? name).toLowerCase();
  if (base === '_chat.txt') return 0;
  if (base.includes('whatsapp')) return 1;
  return 2;
}

export function looksLikeZip(bytes: Uint8Array): boolean {
  return bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b; // "PK"
}

export function decodeText(bytes: Uint8Array): string {
  // Algunos exports antiguos de Android vienen en UTF-16 con BOM.
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes);
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes);
  return new TextDecoder('utf-8').decode(bytes);
}

export function extractChatText(bytes: Uint8Array): string {
  if (!looksLikeZip(bytes)) return decodeText(bytes);
  const files = unzipSync(bytes, { filter: (f) => isChatTxt(f.name) });
  const names = Object.keys(files).sort((a, b) => rank(a) - rank(b));
  if (names.length === 0) {
    throw new ParseError('NO_TXT_IN_ZIP', 'El .zip no contiene ningún .txt de chat de WhatsApp.');
  }
  return decodeText(files[names[0]]);
}
