/**
 * Exports "sin archivos": los marcadores de multimedia se detectan en varios
 * idiomas y variantes, se cuentan por tipo y NO contaminan el análisis de texto.
 */
import { describe, expect, it } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { detectMediaMarker, stripMediaMarkers } from '../src/core/media';
import { extractChatText } from '../src/core/zip';
import { parseWhatsApp } from '../src/core/parser';
import { analyze } from '../src/core/analyze';
import { DEFAULT_OPTIONS, type AnalysisOptions } from '../src/core/types';

const opts: AnalysisOptions = { ...DEFAULT_OPTIONS, me: 0, relation: 'amistad', otherAlias: 'B' };

describe('detectMediaMarker', () => {
  it.each([
    ['<Multimedia omitido>', 'other'],
    ['<multimedia omitida>', 'other'],
    ['<Media omitted>', 'other'],
    ['<Mídia oculta>', 'other'],
    ['<Médias omis>', 'other'],
    ['<Medien ausgeschlossen>', 'other'],
    ['<Media omessi>', 'other'],
    ['imagen omitida', 'image'],
    ['Imagen omitida.', 'image'],
    ['image omitted', 'image'],
    ['imagem ocultada', 'image'],
    ['Bild weggelassen', 'image'],
    ['audio omitido', 'audio'],
    ['áudio ocultado', 'audio'],
    ['audio omitted', 'audio'],
    ['vídeo omitido', 'video'],
    ['video omitted', 'video'],
    ['sticker omitido', 'sticker'],
    ['figurinha omitida', 'sticker'],
    ['GIF omitido', 'gif'],
    ['tarjeta de contacto omitida', 'contact'],
    ['factura.pdf • 2 páginas documento omitido', 'document'],
    ['notas.docx • document omitted', 'document'],
    ['<Se omitió un archivo multimedia>', 'other'],
  ])('%s → %s', (text, type) => {
    expect(detectMediaMarker(text)).toBe(type);
  });

  it.each(['hola qué tal', 'mándame la foto', 'el audio de ayer era buenísimo', 'omitido', 'media hora y llego'])(
    'no confunde texto normal: %s',
    (text) => expect(detectMediaMarker(text)).toBeNull(),
  );

  it('limpia marcadores incrustados en un texto', () => {
    expect(stripMediaMarkers('mira esto <Multimedia omitido> jaja').replace(/\s+/g, ' ')).toBe('mira esto jaja');
  });
});

/* Chat inventado de iPhone exportado SIN archivos, metido en un .zip como hace WhatsApp. */
const IOS_NO_MEDIA = [
  '[12/03/24, 10:00:00] Lucía: hola! te paso las fotos del viaje',
  '[12/03/24, 10:00:30] Lucía: ‎imagen omitida',
  '[12/03/24, 10:00:40] Lucía: ‎imagen omitida',
  '[12/03/24, 10:01:00] Lucía: ‎imagen omitida',
  '[12/03/24, 10:02:00] Marcos: ‎audio omitido',
  '[12/03/24, 10:03:00] Marcos: ‎audio omitido',
  '[12/03/24, 10:04:00] Marcos: ‎sticker omitido',
  '[12/03/24, 10:05:00] Lucía: ‎vídeo omitido',
  '[12/03/24, 10:06:00] Marcos: jajaja qué bonito todo',
  '[12/03/24, 10:07:00] Lucía: ‎GIF omitido',
  '[12/03/24, 10:08:00] Marcos: ‎planes.pdf • 3 páginas ‎documento omitido',
  '[12/03/24, 10:09:00] Lucía: bonito bonito',
].join('\n');

describe('zip sin multimedia (iPhone)', () => {
  const zip = zipSync({ '_chat.txt': strToU8(IOS_NO_MEDIA) });
  const chat = parseWhatsApp(extractChatText(zip));
  const lucia = chat.participants.findIndex((p) => p.name === 'Lucía');
  const marcos = 1 - lucia;
  const r = analyze(chat, opts);

  it('cuenta fotos, audios, vídeos y stickers por persona', () => {
    expect(r.media[lucia]).toMatchObject({ photo: 3, video: 1, sticker: 1, audio: 0 });
    expect(r.media[marcos]).toMatchObject({ audio: 2, sticker: 1, other: 1, photo: 0 });
  });

  it('los marcadores no salen en el ranking de palabras ni cuentan como palabras', () => {
    const all = [...r.words.top[0], ...r.words.top[1]].map((w) => w.word);
    for (const bad of ['omitido', 'omitida', 'imagen', 'audio', 'sticker', 'multimedia', 'documento', 'páginas', 'planes']) {
      expect(all).not.toContain(bad);
    }
    expect(all).toContain('bonito');
    // Solo cuentan las palabras de los 3 mensajes de texto reales.
    expect(r.counts.words[lucia] + r.counts.words[marcos]).toBe(7 + 4 + 2);
  });
});

describe('Android sin multimedia', () => {
  const chat = parseWhatsApp(
    [
      '12/03/2024, 10:00 - Ana: hola',
      '12/03/2024, 10:01 - Ana: <Multimedia omitido>',
      '12/03/2024, 10:02 - Pablo: <Multimedia omitido>',
      '12/03/2024, 10:03 - Pablo: <Media omitted>',
      '12/03/2024, 10:04 - Pablo: vale perfecto',
    ].join('\n'),
  );
  const ana = chat.participants.findIndex((p) => p.name === 'Ana');
  const r = analyze(chat, opts);

  it('el marcador genérico cuenta como "sin especificar" y nunca como texto', () => {
    expect(r.media[ana].unknown).toBe(1);
    expect(r.media[1 - ana].unknown).toBe(2);
    const all = [...r.words.top[0], ...r.words.top[1]].map((w) => w.word);
    expect(all).not.toContain('multimedia');
    expect(all).not.toContain('omitido');
    expect(all).not.toContain('media');
  });
});
