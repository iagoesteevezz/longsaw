/**
 * Idiomas: el banco de frases en inglés está completo y es coherente con el
 * español, y un análisis en inglés no deja textos en español.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { parseWhatsApp } from '../src/core/parser';
import { analyze } from '../src/core/analyze';
import { generateDemoChat } from '../src/core/demo';
import { CAPTIONS, NOTICED } from '../src/core/phrases/bank';
import { EN_LINES } from '../src/core/phrases/bank.en';
import { setCoreLang } from '../src/core/i18n';
import { dec1, formatDuration, nf } from '../src/core/format';
import { DEFAULT_OPTIONS, type AnalysisOptions, type Report } from '../src/core/types';

const opts = (o: Partial<AnalysisOptions> = {}): AnalysisOptions => ({ ...DEFAULT_OPTIONS, me: 0, relation: 'pareja', otherAlias: 'B', ...o });
const situations = [...Object.values(CAPTIONS), ...Object.values(NOTICED)].flat();
const markers = (s: string) => new Set(s.match(/\{[A-Za-z]+\}/g) ?? []);

afterEach(() => setCoreLang('es'));

describe('banco de frases en inglés', () => {
  it('cubre todas las situaciones y no tiene ids sobrantes', () => {
    const ids = situations.map((s) => s.id);
    for (const id of ids) expect(EN_LINES[id]?.length, id).toBeGreaterThan(0);
    expect(Object.keys(EN_LINES).sort()).toEqual([...new Set(ids)].sort());
  });

  it('solo usa marcadores que también usa la versión española', () => {
    for (const s of situations) {
      const allowed = new Set(s.lines.flatMap((l) => [...markers(l)]));
      for (const line of EN_LINES[s.id]) {
        for (const m of markers(line)) expect(allowed.has(m), `${s.id}: ${m} en «${line}»`).toBe(true);
      }
    }
  });

  it('no repite redacciones', () => {
    const all = Object.values(EN_LINES).flat();
    expect(new Set(all).size).toBe(all.length);
  });
});

describe('formato según idioma', () => {
  it('números, decimales y duraciones', () => {
    setCoreLang('es');
    expect([nf.format(12345), dec1(2.5), formatDuration(3 * 86_400_000)]).toEqual(['12.345', '2,5', '3 días']);
    setCoreLang('en');
    expect([nf.format(12345), dec1(2.5), formatDuration(3 * 86_400_000)]).toEqual(['12,345', '2.5', '3 days']);
  });
});

/** Todos los textos que genera el core dentro de un informe. */
function texts(r: Report): string[] {
  return [
    ...Object.values(r.insights.captions),
    ...r.insights.noticed,
    r.insights.move.title,
    ...r.insights.move.steps,
    ...r.insights.styles.flatMap((s) => [s.label, ...s.traits]),
    ...r.flags.flatMap((f) => [f.title, f.detail, f.metric]),
    ...r.ambiguous.flatMap((a) => [a.pattern, a.reading]),
    ...r.interest.components.flatMap((c) => [c.label, ...c.raw]),
  ].filter((x): x is string => typeof x === 'string');
}

describe('informe en inglés', () => {
  const SPANISH = /[áéíóúñ¿¡]|\b(de|que|los|las|mensajes|días|veces|mediana|conversaciones)\b/i;

  it.each(['es', 'en'] as const)('el chat de ejemplo en inglés analizado en %s', (chatLang) => {
    const chat = parseWhatsApp(generateDemoChat(42, chatLang));
    const r = analyze(chat, opts({ lang: 'en' }));
    const leaks = texts(r).filter((t) => SPANISH.test(t.replace(/«[^»]*»|“[^”]*”/g, '')));
    expect(leaks).toEqual([]);
  });

  it('el chat de ejemplo en inglés se reconoce como export en inglés', () => {
    const chat = parseWhatsApp(generateDemoChat(42, 'en'));
    expect(chat.locale).toBe('en');
    expect(chat.messages.filter((m) => m.kind === 'deleted').length).toBeGreaterThan(0);
    expect(chat.messages.filter((m) => m.kind === 'media').length).toBeGreaterThan(0);
  });

  it('en español sigue saliendo en español', () => {
    const r = analyze(parseWhatsApp(generateDemoChat()), opts({ lang: 'es' }));
    expect(texts(r).some((t) => SPANISH.test(t))).toBe(true);
  });
});

describe('avisos del parser', () => {
  it('son códigos, no texto', () => {
    const chat = parseWhatsApp('basura\n12/03/2023, 10:00 - Ana: hola\n12/03/2023, 10:01 - Ana: ¿hay alguien?\n');
    expect(chat.warnings).toContainEqual({ code: 'single' });
    expect(chat.warnings).toContainEqual({ code: 'orphans', n: 1 });
  });
});
