/**
 * Marca de longsaw: bocadillo verde con tres barras (chat → gráfica).
 * `bare` quita el cuadrado verde oscuro para usarla sobre fondos ya oscuros.
 */
const BUBBLE = 'M256 86c-93 0-168 68-168 152 0 45 21 85 55 113l-14 61 70-31c17 5 36 8 57 8 93 0 168-68 168-151S349 86 256 86z';

export function LogoMark({ className = '', bare = false }: { className?: string; bare?: boolean }) {
  return (
    <svg viewBox={bare ? '70 70 372 372' : '0 0 512 512'} className={className} aria-hidden>
      {!bare && <rect width="512" height="512" rx="112" fill="#075E54" />}
      <path d={BUBBLE} fill="#25D366" />
      <g fill="#075E54">
        <rect x="162" y="226" width="34" height="62" rx="12" />
        <rect x="239" y="168" width="34" height="120" rx="12" />
        <rect x="316" y="200" width="34" height="88" rx="12" />
      </g>
    </svg>
  );
}

/** Logotipo completo: marca + "longsaw" en Fredoka. El color del texto se hereda. */
export function Wordmark({ className = '', markClassName = 'h-9 w-9', bare = false }: { className?: string; markClassName?: string; bare?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className={markClassName} bare={bare} />
      <span className="font-brand font-semibold leading-none tracking-[-0.01em]">longsaw</span>
    </span>
  );
}
