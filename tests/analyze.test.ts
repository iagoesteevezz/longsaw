/**
 * Tests de estadísticas: casos pequeños construidos a mano (cálculo exacto) +
 * integración con el chat de demo (los patrones esperados aparecen).
 */
import { describe, expect, it } from 'vitest';
import { parseWhatsApp } from '../src/core/parser';
import { analyze } from '../src/core/analyze';
import { generateDemoChat } from '../src/core/demo';
import { DEFAULT_OPTIONS, type AnalysisOptions } from '../src/core/types';
import { tokenize, extractEmojis } from '../src/core/stats/util';

const opts = (o: Partial<AnalysisOptions> = {}): AnalysisOptions => ({
  ...DEFAULT_OPTIONS,
  me: 0,
  relation: 'amistad',
  otherAlias: 'B',
  ...o,
});

const CHAT = `01/03/2024, 10:00 - Ana: hola ¿qué tal?
01/03/2024, 10:04 - Bea: bien!
01/03/2024, 10:05 - Ana: genial 😀😀
01/03/2024, 10:15 - Bea: ¿y tú?
01/03/2024, 22:00 - Ana: perdona, estaba liada
02/03/2024, 09:00 - Bea: buenos días
02/03/2024, 09:01 - Bea: Se eliminó este mensaje
02/03/2024, 09:02 - Ana: buenos días! este es mi mensaje más largo con muchas palabras
`;

describe('estadísticas básicas (cálculo exacto)', () => {
  const chat = parseWhatsApp(CHAT);
  const r = analyze(chat, opts());
  const ana = chat.participants.findIndex((p) => p.name === 'Ana');
  const bea = 1 - ana;

  it('cuenta mensajes y borrados por persona', () => {
    expect(r.counts.messages[ana]).toBe(4);
    expect(r.counts.messages[bea]).toBe(4);
    expect(r.deleted[bea]).toBe(1);
  });

  it('sesiones con umbral de 6 h: 3 conversaciones', () => {
    // 10:00-10:15 | 22:00 (tras 11 h 45) | 09:00 (tras 11 h)
    expect(r.initiations.sessions).toBe(3);
    expect(r.initiations.total[ana]).toBe(2);
    expect(r.initiations.total[bea]).toBe(1);
  });

  it('tiempos de respuesta: solo dentro de la conversación', () => {
    // Bea responde a 10:04 (4 min) y 10:15 (10 min) → mediana 7 min
    expect(r.responses[bea].medianMs).toBe(7 * 60_000);
    // Ana responde a 10:05 (1 min) y 09:02 (1 min; desde el último mensaje de Bea)
    expect(r.responses[ana].medianMs).toBe(60_000);
  });

  it('primer mensaje y mensaje más largo', () => {
    expect(r.firstMessage?.text).toBe('hola ¿qué tal?');
    expect(r.longest[ana]?.text).toContain('mensaje más largo');
  });

  it('emojis', () => {
    expect(r.words.emojis[ana][0]).toEqual({ word: '😀', count: 2 });
  });

  it('cambiar el umbral de sesión cambia las iniciativas', () => {
    const r2 = analyze(chat, opts({ sessionGapHours: 12 }));
    expect(r2.initiations.sessions).toBe(1);
  });
});

describe('utilidades de texto', () => {
  it('normaliza risas y alargamientos', () => {
    expect(tokenize('JAJAJAJ holaaaa https://x.com jajaja')).toEqual(['jaja', 'holaa', 'jaja']);
  });
  it('emojis compuestos cuentan como uno', () => {
    expect(extractEmojis('👨‍👩‍👧 y 👍🏽')).toEqual(['👨‍👩‍👧', '👍🏽']);
  });
});

describe('integración con el chat de demo', () => {
  const chat = parseWhatsApp(generateDemoChat());
  const alex = chat.participants.findIndex((p) => p.name === 'Alex');
  const sam = 1 - alex;
  const r = analyze(chat, opts({ me: alex as 0 | 1, relation: 'ligue' }));

  it('detecta a Alex como quien exporta (por "Eliminaste")', () => {
    expect(chat.exporterGuess).toBe(alex);
  });

  it('Sam responde más lento que Alex', () => {
    expect(r.responses[sam].medianMs!).toBeGreaterThan(r.responses[alex].medianMs!);
  });

  it('marca el silencio final como posible bloqueo/ghosting (inferencia)', () => {
    const f = r.flags.find((x) => x.id === 'end-silence');
    expect(f).toBeDefined();
    expect(f!.who).toBe(sam);
    expect(f!.evidence.length).toBeGreaterThan(0);
  });

  it('cada red/yellow flag cita evidencia o métrica', () => {
    for (const f of r.flags.filter((x) => x.severity !== 'green')) {
      expect(f.metric.length).toBeGreaterThan(0);
      expect(f.detail).toMatch(/\{0\}|\{1\}|mensajes|De /);
    }
  });

  it('el interés de Alex supera al de Sam al final', () => {
    const last = r.interest.evolution.at(-1)!;
    expect(last.total[alex]).toBeGreaterThan(last.total[sam]);
  });

  it('encuentra mensajes ambiguos ("vale", "como quieras"…)', () => {
    expect(r.ambiguous.length).toBeGreaterThan(0);
  });

  it('"the move" se adapta a la relación', () => {
    expect(r.insights.move.title.length).toBeGreaterThan(0);
    const fam = analyze(chat, opts({ me: alex as 0 | 1, relation: 'familia' }));
    expect(fam.insights.move.title).not.toBe(r.insights.move.title);
  });

  it('timeline cubre todos los meses sin huecos', () => {
    const months = r.timeline.months.map((m) => m.month);
    expect(months[0]).toBe('2024-01');
    expect(new Set(months).size).toBe(months.length);
  });

  it('rendimiento: 50 copias del demo (~100k mensajes) en < 3 s', () => {
    const big = Array.from({ length: 50 }, (_, i) => generateDemoChat(i)).join('');
    const t0 = performance.now();
    const c = parseWhatsApp(big);
    analyze(c, opts());
    expect(performance.now() - t0).toBeLessThan(3000);
  });
});
