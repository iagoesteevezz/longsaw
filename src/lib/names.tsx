/**
 * Contexto de presentación de nombres.
 *
 * El core usa índices 0/1 y marcadores {0}/{1}. Aquí se decide cómo se ve
 * cada persona:
 *   - normal:    tu nombre (primera palabra del export) y el alias elegido para la otra persona
 *   - ocultando: "Persona A" (tú) y "Persona B" (por defecto al exportar/compartir)
 * Nota: no usamos "Tú" en frases generadas porque obligaría a conjugar en
 * segunda persona ("Tú escribes" vs "Marta escribe"); con nombres en tercera
 * persona todas las plantillas funcionan.
 * Y también se limpian los nombres reales que aparezcan DENTRO de los
 * mensajes citados ("oye Marta…") con el anonimizador de core/anonymize.
 */
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { AuthorIndex, Pair } from '../core/types';
import { makeScrubber } from '../core/anonymize';

interface NamesCtx {
  names: Pair<string>;
  me: AuthorIndex;
  hidden: boolean;
  /** Sustituye {0}/{1} por los nombres visibles. */
  fill: (s: string) => string;
  /** Limpia nombres reales dentro de una cita (solo si hidden). */
  quote: (s: string) => string;
}

/** "María José 🌸" → "María" (si es un teléfono, se queda entero). */
function firstName(n: string) {
  if (/^\+?\d/.test(n)) return n;
  return n.split(/\s+/)[0] || n;
}

/** Nombres visibles [persona 0, persona 1]. También los usa la portada del PDF. */
export function displayNames(realNames: Pair<string>, me: AuthorIndex, alias: string, hidden: boolean, myAlias?: string): Pair<string> {
  const myName = hidden ? 'Persona A' : myAlias?.trim() || firstName(realNames[me]);
  const otherName = hidden ? 'Persona B' : alias || firstName(realNames[me === 0 ? 1 : 0]);
  return me === 0 ? [myName, otherName] : [otherName, myName];
}

/** Sustituye {0}/{1} (marcadores del core) por nombres. */
export const fillNames = (s: string, names: Pair<string>) => s.replace(/\{0\}/g, names[0]).replace(/\{1\}/g, names[1]);

const Ctx = createContext<NamesCtx | null>(null);

export function NamesProvider(props: {
  realNames: Pair<string>;
  me: AuthorIndex;
  alias: string;
  myAlias?: string;
  hidden: boolean;
  children: ReactNode;
}) {
  const { realNames, me, alias, myAlias, hidden } = props;
  const value = useMemo<NamesCtx>(() => {
    const names = displayNames(realNames, me, alias, hidden, myAlias);
    const known: Pair<string> = [...realNames];
    if (myAlias?.trim()) known[me] = myAlias.trim();
    const scrub = makeScrubber(known, alias, me, { 0: names[0], 1: names[1] });
    return {
      names,
      me,
      hidden,
      fill: (s) => fillNames(s, names),
      quote: (s) => (hidden ? scrub(s) : s),
    };
  }, [realNames, me, alias, myAlias, hidden]);
  return <Ctx.Provider value={value}>{props.children}</Ctx.Provider>;
}

export function useNames(): NamesCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useNames fuera de NamesProvider');
  return c;
}
