/**
 * Proxy mínimo para la interpretación con IA. ÚNICA pieza de backend.
 *
 * POR QUÉ EXISTE: la clave de la API del LLM no puede vivir en el navegador.
 * POR QUÉ ASÍ: Node puro (sin Express, sin dependencias), ~150 líneas. Se puede
 * desplegar tal cual en cualquier VPS/Fly.io/Render, o portar en 10 minutos a
 * una Cloudflare Worker / Vercel Function (misma lógica: validar → llamar → validar).
 * No hay base de datos: no hace falta guardar nada (ver docs/ARCHITECTURE.md).
 *
 * PRIVACIDAD:
 *  - No registra cuerpos de petición ni respuestas (solo códigos de estado).
 *  - Rechaza payloads > 16 KB (el cliente envía ~3-6 KB): impide mandar un chat entero.
 *  - Rate limit en memoria por IP (la IP no se persiste).
 *
 * MODOS:
 *  - ANTHROPIC_API_KEY definida → llama a la API de Anthropic.
 *  - LLM_MOCK=1 → devuelve una respuesta de ejemplo (desarrollo sin clave).
 *  - Ninguna → 503 con mensaje claro; la app sigue funcionando con las reglas.
 */
import { createServer } from 'node:http';

const PORT = Number(process.env.PORT ?? 8787);
const KEY = process.env.ANTHROPIC_API_KEY ?? '';
const MODEL = process.env.LLM_MODEL ?? 'claude-haiku-5-5';
const MOCK = process.env.LLM_MOCK === '1' || process.argv.includes('--mock');
const ORIGINS = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173').split(',').map((s) => s.trim());
const MAX_BODY = 16 * 1024;
const RATE = { windowMs: 60 * 60 * 1000, max: 10 };

const hits = new Map(); // ip → [timestamps]

function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < RATE.windowMs);
  list.push(now);
  hits.set(ip, list);
  return list.length > RATE.max;
}

const SYSTEM = `Eres el motor de interpretación de "Longsaw", una app de entretenimiento que analiza chats de WhatsApp entre dos personas.
Recibes estadísticas agregadas y unos pocos fragmentos ANONIMIZADOS (Persona A, Persona B). "user" indica quién pide el informe.
Reglas:
- Español de España, tono cercano, con humor suave y matices. Nada de sentencias absolutas.
- NUNCA diagnostiques ni etiquetes clínicamente. Habla de "estilo", "parece", "puede que". Si mencionas apego, aclara que es una lectura ligera.
- Basa cada afirmación en los datos recibidos. No inventes hechos.
- Adapta el consejo al tipo de relación ("relation").
- Si detectas señales de control, abuso o riesgo, recomienda con delicadeza hablar con alguien de confianza o un profesional, sin dramatizar.
- Responde SOLO con JSON válido, sin texto alrededor, con esta forma exacta:
{"attachment":{"A":"<=2 frases sobre el estilo de Persona A","B":"<=2 frases sobre Persona B","summary":"1-2 frases sobre la dinámica"},
 "meanings":[{"id":<id del mensaje ambiguo>,"reading":"<=2 frases: qué puede querer decir, con matices"}],
 "move":{"title":"<=8 palabras","steps":["paso concreto","paso concreto","paso concreto"]},
 "flagsComment":"<=2 frases que pongan en contexto las flags"}`;

const MOCK_RESULT = {
  attachment: {
    A: 'Persona A sostiene la conversación y busca respuesta rápido; se nota que le importa.',
    B: 'Persona B marca su propio ritmo y cada vez se implica menos en el chat.',
    summary: 'Una dinámica de “uno persigue, otro se aleja” que se acentúa al final. Ojo: es una lectura ligera, no un diagnóstico.',
  },
  meanings: [{ id: 0, reading: 'Más que desinterés total, suena a no querer entrar en el tema ahora mismo.' }],
  move: { title: 'Deja de perseguir y observa', steps: ['No envíes más mensajes esta semana.', 'Si vuelve a escribir, responde con calma.', 'Pregúntate qué necesitas tú de esta relación.'] },
  flagsComment: 'Las flags apuntan a un desequilibrio creciente más que a algo grave: los números cuentan cómo escribe cada uno, no lo que siente.',
};

function valid(o) {
  return (
    o && typeof o === 'object' &&
    typeof o.attachment?.A === 'string' && typeof o.attachment?.B === 'string' && typeof o.attachment?.summary === 'string' &&
    Array.isArray(o.meanings) && o.meanings.every((m) => Number.isInteger(m.id) && typeof m.reading === 'string') &&
    typeof o.move?.title === 'string' && Array.isArray(o.move?.steps) && o.move.steps.every((s) => typeof s === 'string') &&
    typeof o.flagsComment === 'string'
  );
}

/** Validación del payload entrante: forma esperada y nada más. */
function validPayload(p) {
  return (
    p && typeof p === 'object' &&
    typeof p.relation === 'string' && p.relation.length < 20 &&
    (p.user === 'Persona A' || p.user === 'Persona B') &&
    p.stats && typeof p.stats === 'object' &&
    Array.isArray(p.flags) && p.flags.length <= 10 &&
    Array.isArray(p.ambiguous) && p.ambiguous.length <= 8
  );
}

async function callLLM(payload) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1200,
      temperature: 0.7,
      system: SYSTEM,
      messages: [{ role: 'user', content: JSON.stringify(payload) }],
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new Error(`upstream ${res.status}`);
  const data = await res.json();
  const text = (data.content ?? []).filter((c) => c.type === 'text').map((c) => c.text).join('');
  // El modelo a veces envuelve el JSON en ```json … ```: lo extraemos.
  const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  const parsed = JSON.parse(json);
  if (!valid(parsed)) throw new Error('invalid model output');
  return parsed;
}

function send(res, status, body, origin) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...(origin ? { 'access-control-allow-origin': origin, vary: 'Origin' } : {}),
  });
  res.end(JSON.stringify(body));
}

const server = createServer(async (req, res) => {
  const origin = ORIGINS.includes(req.headers.origin ?? '') ? req.headers.origin : undefined;
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      ...(origin ? { 'access-control-allow-origin': origin } : {}),
      'access-control-allow-methods': 'POST',
      'access-control-allow-headers': 'content-type',
      'access-control-max-age': '86400',
    });
    return res.end();
  }
  if (req.url === '/api/health') return send(res, 200, { ok: true, mode: MOCK ? 'mock' : KEY ? 'live' : 'off' }, origin);
  if (req.url !== '/api/interpret' || req.method !== 'POST') return send(res, 404, { error: 'No encontrado' }, origin);

  const ip = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? '').split(',')[0].trim();
  if (rateLimited(ip)) return send(res, 429, { error: 'Demasiadas peticiones. Prueba en un rato.' }, origin);

  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > MAX_BODY) return send(res, 413, { error: 'Demasiado contenido: solo aceptamos fragmentos mínimos.' }, origin);
    chunks.push(c);
  }
  let payload;
  try {
    payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return send(res, 400, { error: 'JSON inválido' }, origin);
  }
  if (!validPayload(payload)) return send(res, 400, { error: 'Formato no válido' }, origin);

  if (MOCK) return send(res, 200, MOCK_RESULT, origin);
  if (!KEY) return send(res, 503, { error: 'La interpretación con IA no está configurada en este servidor (falta ANTHROPIC_API_KEY).' }, origin);

  try {
    const out = await callLLM(payload);
    console.log(`[interpret] 200`); // sin contenido, a propósito
    return send(res, 200, out, origin);
  } catch (e) {
    console.log(`[interpret] error: ${e.message}`);
    return send(res, 502, { error: 'La IA no ha podido responder ahora. Las tarjetas siguen funcionando con nuestras reglas.' }, origin);
  }
});

server.listen(PORT, () => console.log(`Longsaw LLM proxy en http://localhost:${PORT} · modo ${MOCK ? 'mock' : KEY ? 'live' : 'sin IA'}`));
