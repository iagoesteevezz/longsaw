import { useTheme } from '../lib/theme';

/** Botón sol/luna. `glass` para fondos verdes (portada, cabeceras); `solid` sobre el papel. */
export function ThemeToggle({ variant = 'glass' }: { variant?: 'glass' | 'solid' }) {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';
  const look =
    variant === 'glass'
      ? 'bg-white/12 text-white ring-1 ring-white/20 hover:bg-white/20'
      : 'bg-surface text-ink ring-1 ring-ink/10 hover:ring-ink/25';
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={dark ? 'Modo claro' : 'Modo oscuro'}
      className={`press grid h-9 w-9 shrink-0 place-items-center rounded-full ${look}`}
    >
      {dark ? (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden>
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
          <path d="M20.3 14.6A8.5 8.5 0 0 1 9.4 3.7a.6.6 0 0 0-.8-.7 9.5 9.5 0 1 0 12.4 12.4.6.6 0 0 0-.7-.8z" />
        </svg>
      )}
    </button>
  );
}
