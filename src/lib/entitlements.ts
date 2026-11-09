/**
 * Modelo freemium (diseñado, sin pagos implementados todavía).
 *
 *  GRATIS: estadísticas básicas (tarjetas 1-6) + línea temporal → enganchan y
 *          son las más compartibles.
 *  PAGO ÚNICO POR INFORME: el resto (interés, vistos, bloqueo, palabras,
 *          red flags, estilo, interpretación, the move) + PDF + IA.
 *
 * Cómo se conectará el pago (ver docs/ARCHITECTURE.md §Negocio):
 *  1. `requestUnlock()` llama a POST /api/checkout → Stripe Checkout (pago único).
 *  2. El webhook de Stripe firma un token `{reportHash, exp}` (HMAC).
 *  3. El cliente guarda el token en memoria y lo manda en las llamadas a la IA.
 *  `reportHash` es un hash de ESTADÍSTICAS (no del contenido), así el servidor
 *  nunca ve el chat.
 *
 * Limitación honesta: las estadísticas se calculan en el navegador, así que el
 * bloqueo de las tarjetas locales es "blando" (alguien con DevTools puede
 * verlas). Lo que de verdad protege el pago es lo que ocurre en servidor: la
 * interpretación con IA. Es un trade-off deliberado a favor de la privacidad.
 */
import type { CardId } from './relations';

export const FREE_CARDS: ReadonlySet<CardId> = new Set<CardId>([
  'messages', 'response', 'first', 'initiator', 'longest', 'deleted', 'timeline',
]);

export const PRICE_LABEL = '2,99 €';

/** En desarrollo (o con VITE_DEV_UNLOCK=true) se desbloquea sin pagar. */
export const DEV_UNLOCK = import.meta.env.DEV || import.meta.env.VITE_DEV_UNLOCK === 'true';

export async function requestUnlock(): Promise<boolean> {
  if (DEV_UNLOCK) return true;
  // TODO(pagos): redirigir a Stripe Checkout cuando exista /api/checkout.
  return false;
}
