/**
 * Tests del parser con exports sintéticos de cada formato (tests/fixtures).
 * Cada fixture reproduce un caso límite real: caracteres invisibles de iOS,
 * U+202F antes de "PM", "p. m." en español, CRLF + BOM, nombres con emojis,
 * teléfonos con marcas bidi, grupos, chats de una sola persona...
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { zipSync, strToU8 } from 'fflate';
import { parseWhatsApp, ParseError } from '../src/core/parser';
import { extractChatText } from '../src/core/zip';

const fx = (name: string) => readFileSync(resolve(__dirname, 'fixtures', name), 'utf-8');
const d = (ts: number) => {
  const x = new Date(ts);
  return [x.getFullYear(), x.getMonth() + 1, x.getDate(), x.getHours(), x.getMinutes()];
};

describe('Android · español · 24 h', () => {
  const chat = parseWhatsApp(fx('android_es_24h.txt'));

  it('detecta idioma, plataforma y orden de fecha', () => {
    expect(chat.locale).toBe('es');
    expect(chat.platform).toBe('android');
    expect(chat.dateOrder).toBe('DMY');
  });

  it('extrae los dos participantes, con emoji en el nombre', () => {
    expect(chat.participants.map((p) => p.name).sort()).toEqual(['Lucía 🌸', 'Marcos']);
  });

  it('el aviso de cifrado es de sistema y no tiene autor', () => {
    expect(chat.messages[0].kind).toBe('system');
    expect(chat.messages[0].author).toBeNull();
  });

  it('une mensajes multilínea', () => {
    const m = chat.messages.find((x) => x.text.startsWith('Bien!'))!;
    expect(m.text).toBe('Bien! Acabo de llegar\ndel trabajo, estoy muerto\ny con hambre');
    expect(d(m.ts)).toEqual([2023, 3, 12, 10, 5]);
  });

  it('clasifica multimedia, borrados, llamadas, ubicación y editados', () => {
    const kinds = chat.messages.map((m) => m.kind);
    expect(kinds.filter((k) => k === 'media')).toHaveLength(2); // multimedia + ubicación
    expect(kinds.filter((k) => k === 'deleted')).toHaveLength(2);
    expect(kinds.filter((k) => k === 'call')).toHaveLength(1);
    const edited = chat.messages.find((m) => m.edited)!;
    expect(edited.text).toBe('Buenos días');
  });

  it('deduce quién exportó por "Eliminaste este mensaje"', () => {
    const lucia = chat.participants.findIndex((p) => p.name === 'Lucía 🌸');
    expect(chat.exporterGuess).toBe(lucia);
  });
});

describe('iOS · español · 24 h con caracteres invisibles', () => {
  const chat = parseWhatsApp(fx('ios_es_24h.txt'));
  it('plataforma iOS y fechas DMY con año de 2 cifras', () => {
    expect(chat.platform).toBe('ios');
    expect(d(chat.messages[1].ts)).toEqual([2023, 3, 12, 10, 0]);
  });
  it('el aviso de cifrado con remitente (iOS) es sistema', () => {
    expect(chat.messages[0].kind).toBe('system');
    expect(chat.messages[0].author).toBeNull();
  });
  it('clasifica imagen/audio/adjunto/borrados y quita marcas invisibles', () => {
    expect(chat.messages.filter((m) => m.kind === 'media').map((m) => m.mediaType)).toEqual([
      'image',
      'audio',
      'image',
    ]);
    expect(chat.messages.filter((m) => m.kind === 'deleted')).toHaveLength(2);
    const last = chat.messages.at(-1)!;
    expect(last.text).toBe('Vale');
    expect(last.edited).toBe(true);
    expect(chat.messages.every((m) => !/[‎‏]/.test(m.text))).toBe(true);
  });
});

describe('Android · inglés · 12 h', () => {
  const chat = parseWhatsApp(fx('android_en_12h.txt'));
  it('inglés, MDY', () => {
    expect(chat.locale).toBe('en');
    expect(chat.dateOrder).toBe('MDY');
  });
  it('convierte AM/PM (12:05 AM = 00:05, 12:30 PM = 12:30)', () => {
    const media = chat.messages.find((m) => m.kind === 'media')!;
    expect(d(media.ts)).toEqual([2023, 3, 12, 12, 30]);
    const del = chat.messages.find((m) => m.kind === 'deleted')!;
    expect(d(del.ts)).toEqual([2023, 3, 13, 0, 5]);
  });
  it('llamada perdida y multilínea', () => {
    expect(chat.messages.some((m) => m.kind === 'call')).toBe(true);
    expect(chat.messages.at(-1)!.text).toBe('sounds good\nsee you there');
  });
});

describe('iOS · inglés · 12 h con U+202F', () => {
  const chat = parseWhatsApp(fx('ios_en_12h.txt'));
  it('parsea la hora con espacio estrecho antes de PM', () => {
    const noon = chat.messages.find((m) => m.text === 'noon')!;
    expect(d(noon.ts)).toEqual([2023, 3, 12, 12, 0]);
    const late = chat.messages.find((m) => m.text === 'past midnight')!;
    expect(d(late.ts)).toEqual([2023, 3, 13, 0, 30]);
  });
  it('sticker e imagen, editado', () => {
    expect(chat.messages.filter((m) => m.kind === 'media').map((m) => m.mediaType)).toEqual(['image', 'sticker']);
    expect(chat.messages.at(-1)!.edited).toBe(true);
  });
});

describe('Android · español · 12 h ("p. m.")', () => {
  const chat = parseWhatsApp(fx('android_es_12h.txt'));
  it('interpreta a. m./p. m.', () => {
    expect(d(chat.messages[0].ts)).toEqual([2023, 3, 12, 14, 5]);
    expect(d(chat.messages[2].ts)).toEqual([2023, 3, 13, 0, 15]);
    expect(d(chat.messages[3].ts)).toEqual([2023, 3, 13, 12, 45]);
  });
});

describe('Formatos de fecha alternativos', () => {
  it('fechas ambiguas: elige el orden con menos saltos atrás en el tiempo', () => {
    const chat = parseWhatsApp(fx('ambiguous_dates.txt'));
    expect(chat.dateOrder).toBe('DMY');
    expect(d(chat.messages[0].ts).slice(0, 3)).toEqual([2023, 2, 5]);
  });
  it('fechas con puntos', () => {
    const chat = parseWhatsApp(fx('dotted_and_iso.txt'));
    expect(d(chat.messages[0].ts)).toEqual([2023, 3, 12, 14, 5]);
  });
  it('fechas ISO (YYYY-MM-DD)', () => {
    const chat = parseWhatsApp(fx('iso.txt'));
    expect(chat.dateOrder).toBe('YMD');
    expect(d(chat.messages[1].ts)).toEqual([2023, 3, 13, 14, 5]);
  });
  it('CRLF + BOM se comportan igual que LF', () => {
    const a = parseWhatsApp(fx('android_es_24h.txt'));
    const b = parseWhatsApp(fx('android_es_crlf_bom.txt'));
    expect(b.messages.map((m) => [m.ts, m.text, m.kind])).toEqual(a.messages.map((m) => [m.ts, m.text, m.kind]));
  });
});

describe('Casos límite', () => {
  it('rechaza grupos', () => {
    expect(() => parseWhatsApp(fx('group.txt'))).toThrowError(ParseError);
    try {
      parseWhatsApp(fx('group.txt'));
    } catch (e) {
      expect((e as ParseError).code).toBe('GROUP');
    }
  });
  it('chat de una sola persona: añade participante vacío y avisa', () => {
    const chat = parseWhatsApp(fx('single_person.txt'));
    expect(chat.participants).toHaveLength(2);
    expect(chat.participants[1].messageCount).toBe(0);
    expect(chat.warnings.length).toBeGreaterThan(0);
  });
  it('quita marcas bidi alrededor de números de teléfono', () => {
    const chat = parseWhatsApp(fx('phone_names.txt'));
    expect(chat.participants.map((p) => p.name)).toContain('+34 600 11 22 33');
    expect(chat.participants.map((p) => p.name)).toContain('Yo 😎🔥');
  });
  it('rechaza archivos que no son de WhatsApp', () => {
    expect(() => parseWhatsApp(fx('not_whatsapp.txt'))).toThrowError(/No reconocemos/);
  });
});

describe('ZIP', () => {
  it('extrae el .txt de un zip (prioriza _chat.txt y descarta ._ de macOS)', () => {
    const zip = zipSync({
      '_chat.txt': strToU8(fx('ios_es_24h.txt')),
      '__MACOSX/._chat.txt': strToU8('basura'),
      '00000012-PHOTO.jpg': new Uint8Array([1, 2, 3]),
    });
    const text = extractChatText(zip);
    expect(parseWhatsApp(text).platform).toBe('ios');
  });
  it('zip sin txt → error claro', () => {
    const zip = zipSync({ 'foto.jpg': new Uint8Array([1]) });
    expect(() => extractChatText(zip)).toThrowError(/no contiene/);
  });
});
