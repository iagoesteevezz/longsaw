/**
 * Garantías de producto que no deben romperse sin querer:
 *  - 100 % en el navegador: el código no hace peticiones de red.
 *  - Gratis: no queda rastro del paywall ni de la IA.
 *  - PDF: 2 tarjetas por página.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { layoutTwoUp } from '../src/lib/pdfLayout';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(f) ? [p] : [];
  });
}

const SRC = files(join(__dirname, '..', 'src')).map((p) => ({ p, code: readFileSync(p, 'utf8') }));

describe('sin red, sin pagos, sin IA', () => {
  it.each([
    ['fetch(', /\bfetch\s*\(/],
    ['XMLHttpRequest', /XMLHttpRequest/],
    ['WebSocket', /new\s+WebSocket/],
    ['sendBeacon', /sendBeacon/],
    ['EventSource', /EventSource/],
    ['URLs a /api', /['"`]\/api\//],
  ])('ningún archivo de src usa %s', (_name, re) => {
    expect(SRC.filter((f) => re.test(f.code)).map((f) => f.p)).toEqual([]);
  });

  it.each([/paywall/i, /requestUnlock|PRICE_LABEL|FREE_CARDS/, /2,99/, /AiConsent|interpret\(|AiResult/])('sin rastro de %s', (re) => {
    expect(SRC.filter((f) => re.test(f.code)).map((f) => f.p)).toEqual([]);
  });

  it('no carga nada de otros dominios (scripts, estilos, fuentes)', () => {
    const html = readFileSync(join(__dirname, '..', 'index.html'), 'utf8');
    expect(html).not.toMatch(/<(script|link)[^>]+(src|href)=["']https?:/);
  });
});

describe('PDF: 2 tarjetas por página', () => {
  const page = { width: 210, height: 297, margin: 10, gap: 6 };
  const boxes = layoutTwoUp(
    [
      { width: 576, height: 800 },
      { width: 576, height: 1400 },
      { width: 576, height: 600 },
    ],
    page,
  );

  it('reparte en páginas de dos', () => {
    expect(boxes.map((b) => b.page)).toEqual([0, 0, 1]);
  });

  it('cada tarjeta cabe en su columna sin deformarse ni solaparse', () => {
    const colW = (210 - 20 - 6) / 2;
    for (const b of boxes) {
      expect(b.w).toBeLessThanOrEqual(colW + 1e-9);
      expect(b.y + b.h).toBeLessThanOrEqual(297 - 10 + 1e-9);
    }
    expect(boxes[0].w / boxes[0].h).toBeCloseTo(576 / 800);
    expect(boxes[0].x + boxes[0].w).toBeLessThanOrEqual(boxes[1].x);
  });
});
