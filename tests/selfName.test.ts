import { describe, expect, it } from 'vitest';
import { isSelfPlaceholder } from '../src/core/selfName';
import { displayNames, fillNames } from '../src/lib/names';

describe('isSelfPlaceholder', () => {
  it('reconoce "Tú"/"You" y variantes en varios idiomas', () => {
    for (const n of ['Tú', 'tu', 'TÚ', ' Tú ', 'You', 'Yo', 'Você', 'Vous', 'Du', 'Io', '‎Tú']) {
      expect(isSelfPlaceholder(n), n).toBe(true);
    }
  });

  it('no confunde nombres reales', () => {
    for (const n of ['Iago', 'Tura', 'Yolanda', 'Tú y yo', '+34 600 000 000', 'Dani 🌸']) {
      expect(isSelfPlaceholder(n), n).toBe(false);
    }
  });
});

describe('displayNames con nombre propio', () => {
  it('usa el nombre escrito por el usuario en vez de "Tú"', () => {
    const names = displayNames(['Tú', 'Dani'], 0, 'Dani', false, 'Iago');
    expect(fillNames('{0} manda más audios que {1}', names)).toBe('Iago manda más audios que Dani');
  });

  it('al ocultar nombres sigue saliendo "Persona A"', () => {
    expect(displayNames(['Tú', 'Dani'], 0, 'Dani', true, 'Iago')).toEqual(['Persona A', 'Persona B']);
  });

  it('sin nombre propio se comporta como antes', () => {
    expect(displayNames(['Marta López', 'Dani'], 0, 'Dani', false)).toEqual(['Marta', 'Dani']);
  });
});
