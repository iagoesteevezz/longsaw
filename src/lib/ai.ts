/**
 * Cliente de la interpretación con IA (opt-in).
 * Solo envía el `AiPayload` que el usuario ha visto y aprobado.
 */
import { isAiResult, type AiPayload, type AiResult } from '../core/anonymize';

export async function interpret(payload: AiPayload, signal?: AbortSignal): Promise<AiResult> {
  const res = await fetch('/api/interpret', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
    // Nada de cookies ni credenciales: el servidor no sabe quién eres.
    credentials: 'omit',
  });
  if (!res.ok) {
    const msg = await res.json().catch(() => ({}));
    throw new Error(msg.error ?? `El servicio de IA respondió ${res.status}`);
  }
  const data = await res.json();
  if (!isAiResult(data)) throw new Error('La IA devolvió una respuesta con formato inesperado.');
  return data;
}
