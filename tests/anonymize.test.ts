import { describe, expect, it } from 'vitest';
import { makeScrubber, buildAiPayload } from '../src/core/anonymize';
import { parseWhatsApp } from '../src/core/parser';
import { analyze } from '../src/core/analyze';
import { generateDemoChat } from '../src/core/demo';
import { DEFAULT_OPTIONS } from '../src/core/types';

describe('anonimizador', () => {
  const scrub = makeScrubber(['María José 🌸', 'Pablo Ruiz'], 'Mari', 1);

  it('sustituye nombres completos, partes y alias (con acentos)', () => {
    expect(scrub('Oye María José, dile a Pablo que Mari llega tarde')).toBe(
      'Oye Persona A, dile a Persona B que Persona A llega tarde',
    );
  });
  it('no toca palabras que contienen el nombre', () => {
    expect(scrub('Pablito y Mariano')).toBe('Pablito y Mariano');
  });
  it('quita teléfonos, emails, enlaces, DNI e IBAN', () => {
    const t = scrub('llámame al +34 600 11 22 33 o maria@mail.com, mira https://x.com/a, DNI 12345678Z, ES91 2100 0418 4502 0005 1332');
    expect(t).not.toMatch(/600|maria@|https|12345678|2100/);
    expect(t).toContain('[TELÉFONO]');
    expect(t).toContain('[EMAIL]');
    expect(t).toContain('[ENLACE]');
    expect(t).toContain('[DNI]');
    expect(t).toContain('[IBAN]');
  });
});

describe('payload para la IA', () => {
  const chat = parseWhatsApp(generateDemoChat());
  const r = analyze(chat, { ...DEFAULT_OPTIONS, me: 0, relation: 'ligue', otherAlias: 'Samu' });
  const payload = buildAiPayload(r, { me: 0, relation: 'ligue', otherAlias: 'Samu' });
  const json = JSON.stringify(payload);

  it('no contiene los nombres reales', () => {
    expect(json).not.toMatch(/Alex|Sam\b|Samu/);
  });
  it('es pequeño (minimización): < 6 KB', () => {
    expect(json.length).toBeLessThan(6000);
  });
});
