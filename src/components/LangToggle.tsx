import { useI18n } from '../lib/i18n';

/** Botón ES/EN: muestra el idioma al que cambia. Mismas variantes que ThemeToggle. */
export function LangToggle({ variant = 'glass' }: { variant?: 'glass' | 'solid' }) {
  const { lang, t, setLang } = useI18n();
  const look =
    variant === 'glass'
      ? 'bg-white/12 text-white ring-1 ring-white/20 hover:bg-white/20'
      : 'bg-surface text-ink ring-1 ring-ink/10 hover:ring-ink/25';
  return (
    <button
      type="button"
      onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
      aria-label={t.common.switchLang}
      title={t.common.switchLang}
      lang={lang === 'es' ? 'en' : 'es'}
      className={`press grid h-9 min-w-9 shrink-0 place-items-center rounded-full px-2 text-xs font-extrabold tracking-wide ${look}`}
    >
      {t.common.switchLangShort}
    </button>
  );
}
