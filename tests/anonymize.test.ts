import { describe, expect, it } from 'vitest';
import { makeScrubber } from '../src/core/anonymize';

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
