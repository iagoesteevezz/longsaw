/**
 * Diccionarios (risas, cariño, pullitas, saludos) y banco de frases.
 */
import { describe, expect, it } from 'vitest';
import { parseWhatsApp } from '../src/core/parser';
import { analyze } from '../src/core/analyze';
import { generateDemoChat } from '../src/core/demo';
import { laughFamily } from '../src/core/dictionaries';
import { bankSize, CAPTIONS, NOTICED } from '../src/core/phrases/bank';
import { fillVars } from '../src/core/phrases/engine';
import { DEFAULT_OPTIONS, type AnalysisOptions, type Relation } from '../src/core/types';

const opts = (o: Partial<AnalysisOptions> = {}): AnalysisOptions => ({
  ...DEFAULT_OPTIONS,
  me: 0,
  relation: 'amistad',
  otherAlias: 'B',
  ...o,
});

describe('diccionarios', () => {
  it.each([
    ['jajaja', 'jaja'],
    ['JAJAJAJ'.toLowerCase(), 'jaja'],
    ['ajajaja', 'jaja'],
    ['jsjsjs', 'jsjs'],
    ['jejeje', 'jeje'],
    ['xddd', 'xd'],
    ['hahaha', 'haha'],
    ['lmao', 'lol'],
  ])('%s es una risa de la familia %s', (w, fam) => expect(laughFamily(w)).toBe(fam));

  it.each(['jamón', 'jarra', 'ja', 'hola', 'jefe'])('%s no es una risa', (w) => expect(laughFamily(w)).toBeNull());

  const chat = parseWhatsApp(
    [
      '01/03/2024, 10:00 - Ana: Buenos días cariño ❤️',
      '01/03/2024, 10:01 - Bea: jajajaja tonta, buenos dias 😂',
      '01/03/2024, 10:02 - Ana: te quiero mucho, pesada',
      '01/03/2024, 10:03 - Bea: jsjsjs y yo a ti, besos',
      '01/03/2024, 23:00 - Ana: buenas noches 😘',
      '01/03/2024, 23:01 - Bea: <Multimedia omitido>',
    ].join('\n'),
  );
  const ana = chat.participants.findIndex((p) => p.name === 'Ana');
  const bea = 1 - ana;
  const lx = analyze(chat, opts()).lexicon;

  it('cuenta risas con su estilo (y emojis de risa)', () => {
    expect(lx.laughs[bea]).toBe(3); // jajajaja, 😂, jsjsjs
    expect(lx.laughs[ana]).toBe(0);
    expect(lx.longestLaugh[bea]).toBe('jajajaja');
  });

  it('cuenta cariño sin duplicar expresiones solapadas', () => {
    // cariño, ❤️, "te quiero mucho" (una sola vez), 😘
    expect(lx.affection[ana]).toBe(4);
    expect(lx.affection[bea]).toBe(1); // besos
  });

  it('cuenta insultos suaves y saludos, sin tildes', () => {
    expect(lx.insults[ana]).toBe(1); // pesada
    expect(lx.insults[bea]).toBe(1); // tonta
    expect(lx.goodMorning[ana]).toBe(1);
    expect(lx.goodMorning[bea]).toBe(1); // "buenos dias" sin tilde
    expect(lx.goodNight[ana]).toBe(1);
  });
});

describe('banco de frases', () => {
  it('tiene entre 150 y 200 redacciones distintas', () => {
    const size = bankSize();
    expect(size).toBeGreaterThanOrEqual(150);
    expect(size).toBeLessThanOrEqual(200);
    const all = [...Object.values(CAPTIONS), ...Object.values(NOTICED)].flat().flatMap((s) => s.lines);
    expect(new Set(all).size).toBe(all.length); // ninguna duplicada en el banco
  });

  it('rellena variables y convierte {A}/{B} en marcadores de persona', () => {
    expect(fillVars('{A} manda {n} audios a {B}', { A: 1, B: 0, n: '12' })).toBe('{1} manda 12 audios a {0}');
  });

  const chats = [generateDemoChat(1), generateDemoChat(7), generateDemoChat(42)];
  const relations: Relation[] = ['ligue', 'amistad', 'familia', 'trabajo'];

  it.each(chats.flatMap((_c, i) => relations.map((rel) => [i, rel] as const)))(
    'informe %i (%s): sin frases repetidas y sin huecos sin rellenar',
    (i, relation) => {
      const r = analyze(parseWhatsApp(chats[i]), opts({ relation }));
      const lines = [...Object.values(r.insights.captions), ...r.insights.noticed];
      expect(lines.length).toBeGreaterThan(15);
      expect(new Set(lines).size).toBe(lines.length);
      for (const l of lines) expect(l).not.toMatch(/\{[A-Za-z]+\}|undefined|NaN/);
    },
  );

  it('cada tarjeta principal tiene su comentario', () => {
    const r = analyze(parseWhatsApp(generateDemoChat()), opts({ relation: 'ligue' }));
    for (const k of ['messages', 'response', 'initiator', 'media', 'timeline', 'interest', 'flags', 'laughs', 'affection'] as const) {
      expect(r.insights.captions[k], k).toBeTruthy();
    }
    expect(r.insights.noticed.length).toBeGreaterThanOrEqual(4);
  });

  it('es determinista para el mismo chat y varía entre chats', () => {
    const a = analyze(parseWhatsApp(generateDemoChat(3)), opts()).insights;
    const b = analyze(parseWhatsApp(generateDemoChat(3)), opts()).insights;
    expect(a.captions).toEqual(b.captions);
    const variants = new Set(chats.map((c) => JSON.stringify(analyze(parseWhatsApp(c), opts()).insights.captions)));
    expect(variants.size).toBe(chats.length);
  });

  it('elige la frase según los datos: quien escribe mucho más sale como protagonista', () => {
    const lines = ['01/03/2024, 10:00 - Bea: hola'];
    for (let i = 0; i < 30; i++) lines.push(`01/03/2024, 10:${String(i + 1).padStart(2, '0')} - Ana: mensaje ${i}`);
    const chat = parseWhatsApp(lines.join('\n'));
    const ana = chat.participants.findIndex((p) => p.name === 'Ana');
    const r = analyze(chat, opts());
    expect(r.insights.captions.messages).toContain(`{${ana}}`);
  });

  it('funciona con un chat de una sola persona', () => {
    const r = analyze(parseWhatsApp('12/03/2023, 10:00 - Ana: hola?\n13/03/2023, 10:00 - Ana: sigues ahí'), opts());
    expect(r.insights.captions.messages).toBeTruthy();
    expect(r.insights.captions.response).toBeTruthy();
  });
});
