/**
 * Tema claro/oscuro. Por defecto sigue al sistema; si el usuario elige uno,
 * se recuerda en localStorage. La clave no empieza por "longsaw:" a propósito:
 * "Borrar todo" borra los datos del chat, no la preferencia de tema.
 * public/theme-init.js aplica lo mismo antes de pintar.
 */
import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';
const KEY = 'longsaw-theme';
const media = () => window.matchMedia?.('(prefers-color-scheme: dark)');

function stored(): Theme | null {
  try {
    const t = localStorage.getItem(KEY);
    return t === 'light' || t === 'dark' ? t : null;
  } catch {
    return null;
  }
}

const system = (): Theme => (media()?.matches ? 'dark' : 'light');
export const currentTheme = (): Theme => (document.documentElement.classList.contains('dark') ? 'dark' : 'light');

export function applyTheme(t: Theme) {
  document.documentElement.classList.toggle('dark', t === 'dark');
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => stored() ?? system());

  useEffect(() => applyTheme(theme), [theme]);

  // Sin elección guardada, seguimos los cambios del sistema en vivo.
  useEffect(() => {
    const m = media();
    if (!m) return;
    const on = () => {
      if (!stored()) setTheme(system());
    };
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    try {
      // Si coincide con el sistema, no hace falta fijarlo: así vuelve a seguirlo.
      if (next === system()) localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch {
      /* sin almacenamiento: el cambio dura hasta recargar */
    }
    setTheme(next);
  };

  return { theme, toggle };
}
