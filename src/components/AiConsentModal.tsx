/**
 * Consentimiento explícito para la IA.
 *
 * Requisitos de privacidad que cumple:
 *  - Muestra EXACTAMENTE el JSON que se enviará (lo mismo que va en el body).
 *  - Permite quitar cualquier frase antes de enviar.
 *  - Exige marcar una casilla (no hay consentimiento por defecto).
 *  - Nada se envía hasta pulsar "Enviar".
 */
import { useMemo, useState } from 'react';
import type { AiPayload } from '../core/anonymize';

export function AiConsentModal(props: {
  payload: AiPayload;
  onCancel: () => void;
  onSend: (p: AiPayload) => void;
  sending: boolean;
  error: string | null;
}) {
  const [removedAmb, setRemovedAmb] = useState<Set<number>>(new Set());
  const [removedEv, setRemovedEv] = useState<Set<string>>(new Set());
  const [ok, setOk] = useState(false);

  const finalPayload = useMemo<AiPayload>(
    () => ({
      ...props.payload,
      flags: props.payload.flags.map((f, fi) => ({ ...f, evidence: f.evidence.filter((_, ei) => !removedEv.has(`${fi}:${ei}`)) })),
      ambiguous: props.payload.ambiguous.filter((a) => !removedAmb.has(a.id)),
    }),
    [props.payload, removedAmb, removedEv],
  );
  const json = JSON.stringify(finalPayload, null, 2);
  const toggle = <T,>(set: Set<T>, v: T) => {
    const n = new Set(set);
    if (n.has(v)) n.delete(v);
    else n.add(v);
    return n;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="ai-title">
      <div className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-[2rem] bg-paper p-6 sm:rounded-[2rem]">
        <h2 id="ai-title" className="text-3xl font-extrabold leading-tight">✨ Interpretar con IA</h2>
        <p className="mt-3 font-semibold leading-snug">
          Para las tarjetas de estilo, “lo que quiere decir” y “the move” podemos pedir una lectura más fina a un modelo de IA
          (Claude, de Anthropic). <b>No enviamos el chat</b>: solo números y las frases de abajo, con nombres, teléfonos, emails y
          enlaces sustituidos. Nuestro servidor no guarda nada y el proveedor no usa estos datos para entrenar.
        </p>
        <p className="mt-2 text-sm font-semibold opacity-70">
          Ojo: no podemos detectar automáticamente nombres de otras personas mencionadas en los mensajes. Revisa y quita lo que quieras.
        </p>

        <h3 className="mt-6 text-lg font-extrabold">Frases que se enviarían</h3>
        <ul className="mt-2 space-y-2">
          {props.payload.flags.flatMap((f, fi) =>
            f.evidence.map((e, ei) => {
              const key = `${fi}:${ei}`;
              const off = removedEv.has(key);
              return (
                <li key={key} className={`flex items-start justify-between gap-3 rounded-2xl bg-white px-4 py-2 text-sm ${off ? 'opacity-40 line-through' : ''}`}>
                  <span><b>{e.from}:</b> {e.text}</span>
                  <button type="button" className="shrink-0 font-bold underline" onClick={() => setRemovedEv(toggle(removedEv, key))}>{off ? 'Incluir' : 'Quitar'}</button>
                </li>
              );
            }),
          )}
          {props.payload.ambiguous.map((a) => {
            const off = removedAmb.has(a.id);
            return (
              <li key={`a${a.id}`} className={`flex items-start justify-between gap-3 rounded-2xl bg-white px-4 py-2 text-sm ${off ? 'opacity-40 line-through' : ''}`}>
                <span>
                  {a.context && <span className="block opacity-70">{a.context}</span>}
                  <b>{a.from}:</b> {a.message}
                </span>
                <button type="button" className="shrink-0 font-bold underline" onClick={() => setRemovedAmb(toggle(removedAmb, a.id))}>{off ? 'Incluir' : 'Quitar'}</button>
              </li>
            );
          })}
        </ul>

        <details className="mt-4">
          <summary className="cursor-pointer font-bold">Ver el JSON exacto ({(json.length / 1024).toFixed(1)} KB)</summary>
          <pre className="mt-2 max-h-72 overflow-auto rounded-2xl bg-ink p-4 text-xs text-white">{json}</pre>
        </details>

        <label className="mt-6 flex items-start gap-3 font-semibold">
          <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} className="mt-1 h-5 w-5 accent-ink" />
          <span>Acepto enviar este contenido anonimizado para generar la interpretación. Sé que es entretenimiento, no un diagnóstico.</span>
        </label>

        {props.error && <p role="alert" className="mt-4 rounded-2xl bg-card-red px-4 py-3 font-bold">{props.error}</p>}

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={props.onCancel} className="flex-1 rounded-full bg-white px-5 py-4 font-extrabold">Cancelar</button>
          <button
            type="button"
            disabled={!ok || props.sending}
            onClick={() => props.onSend(finalPayload)}
            className="flex-1 rounded-full bg-ink px-5 py-4 font-extrabold text-white disabled:opacity-30"
          >
            {props.sending ? 'Pensando…' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  );
}
