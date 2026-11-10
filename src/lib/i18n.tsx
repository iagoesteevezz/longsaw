/**
 * Idioma de la interfaz. Por defecto, el del sistema: español para es/ca/gl/eu
 * y inglés para el resto. Si el usuario elige otro, se recuerda (clave sin el
 * prefijo "longsaw:", para que "Borrar todo" no lo borre).
 *
 * Al cambiar, también se cambia el idioma del core (fechas, números y los
 * textos que se generen a partir de ahora) y el <html lang>.
 */
import { createContext, useContext, useState, type ReactNode } from 'react';
import { setCoreLang, type Lang } from '../core/i18n';
import { es, type Dict } from '../i18n/es';
import { en } from '../i18n/en';

const KEY = 'longsaw-lang';
const DICTS: Record<Lang, Dict> = { es, en };

export function systemLang(): Lang {
  const langs = typeof navigator === 'undefined' ? [] : navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const l of langs) {
    const base = l?.toLowerCase().split('-')[0];
    if (base === 'es' || base === 'ca' || base === 'gl' || base === 'eu') return 'es';
    if (base === 'en') return 'en';
  }
  return langs.length ? 'en' : 'es';
}

function stored(): Lang | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'es' || v === 'en' ? v : null;
  } catch {
    return null;
  }
}

function apply(l: Lang) {
  setCoreLang(l);
  document.documentElement.lang = l;
  document.title = DICTS[l].meta.title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', DICTS[l].meta.description);
}

interface LangCtx {
  lang: Lang;
  t: Dict;
  setLang: (l: Lang) => void;
}

const Ctx = createContext<LangCtx | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const l = stored() ?? systemLang();
    apply(l);
    return l;
  });

  const setLang = (l: Lang) => {
    try {
      // Igual que el sistema → no lo fijamos, así seguirá al sistema.
      if (l === systemLang()) localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, l);
    } catch {
      /* sin almacenamiento: dura hasta recargar */
    }
    apply(l);
    setLangState(l);
  };

  return <Ctx.Provider value={{ lang, t: DICTS[lang], setLang }}>{children}</Ctx.Provider>;
}

export function useI18n(): LangCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useI18n fuera de LangProvider');
  return c;
}

/** Atajo para los componentes que solo necesitan los textos. */
export const useT = () => useI18n().t;
