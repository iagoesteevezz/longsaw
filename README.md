# 💬 Longsaw

Analiza un chat exportado de WhatsApp **en tu navegador** y genera un informe visual por tarjetas: quién escribe más, tiempos de respuesta, quién inicia, vistos, silencios, red flags, estilo, "lo que quiere decir" y "the move". La IA es opcional y siempre con consentimiento.

Arquitectura, decisiones, métricas, modelo de negocio y riesgos: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Requisitos
- Node 22 o superior (`node -v`)

## Arrancar

```bash
npm install
npm run dev            # http://localhost:5173
```

Pulsa **"Probar con un chat de ejemplo"** o sube tu export. En desarrollo, el botón "Desbloquear" abre todas las tarjetas sin pagar.

### IA (opcional)
En una segunda terminal:

```bash
npm run dev:api:mock   # respuestas de ejemplo, sin clave ni coste
# o, con una clave real:
cp .env.example .env   # rellena ANTHROPIC_API_KEY
npm run dev:api
```

Vite redirige `/api` a `http://localhost:8787`. Si el proxy no está arrancado, la app funciona igual con las interpretaciones por reglas.

## Tests

```bash
npm test               # parser (todos los formatos), estadísticas, anonimizador
npm run typecheck
```

Los exports sintéticos de cada formato están en `tests/fixtures/` (iOS/Android, 12/24 h, "p. m.", U+202F, CRLF+BOM, fechas con puntos o ISO, grupos, una sola persona, teléfonos con marcas bidi). También sirven para subirlos a mano en la app.

> **No subas chats reales al repositorio.** Guárdalos en `chats/` o `private/` (están en `.gitignore`, igual que los `.zip` y los `.txt` de la raíz) y deja en `tests/fixtures/` solo chats inventados.

## Producción

```bash
npm run build          # dist/ estático → Cloudflare Pages / Netlify (public/_headers trae la CSP)
node server/llm-proxy.mjs   # o portarlo a una Cloudflare Worker (ver docs)
```

Variables del proxy: `ANTHROPIC_API_KEY`, `LLM_MODEL`, `ALLOWED_ORIGINS`, `PORT`.

## Cómo exportar un chat de WhatsApp
- **iPhone**: abre el chat → nombre del contacto → Exportar chat → Sin archivos. Se genera un `.zip`.
- **Android**: abre el chat → ⋮ → Más → Exportar chat → Sin archivos. Se genera un `.txt`.
