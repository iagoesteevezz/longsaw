# 💬 Longsaw

Analiza un chat exportado de WhatsApp **en tu navegador** y genera un informe visual por tarjetas: quién escribe más, tiempos de respuesta, quién inicia, fotos/audios/stickers de cada uno, risas, cariño y pullitas, vistos, silencios, red flags, estilo, "lo que quiere decir" y "the move".

Es **100 % gratis y 100 % local**: no hay servidor, ni IA, ni cuentas, ni ninguna petición externa. Los comentarios de cada tarjeta salen de un banco de ~190 frases elegidas según los datos, sin repetirse dentro de un informe.

Arquitectura, decisiones, métricas, modelo de negocio y riesgos: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Requisitos
- Node 22 o superior (`node -v`)

## Arrancar

```bash
npm install
npm run dev            # http://localhost:5173
```

Pulsa **"Probar con un chat de ejemplo"** o sube tu export (.zip de iPhone o .txt de Android). No hace falta configurar nada: no hay variables de entorno ni backend.

## Tests

```bash
npm test               # parser, estadísticas, multimedia, diccionarios, frases, privacidad, PDF, anonimizador
npm run typecheck
npm run build          # compila TypeScript y genera dist/
```

Los exports sintéticos de cada formato están en `tests/fixtures/` (iOS/Android, 12/24 h, "p. m.", U+202F, CRLF+BOM, fechas con puntos o ISO, grupos, una sola persona, teléfonos con marcas bidi). También sirven para subirlos a mano en la app.

> **No subas chats reales al repositorio.** Guárdalos en `chats/` o `private/` (están en `.gitignore`, igual que los `.zip` y los `.txt` de la raíz) y deja en `tests/fixtures/` solo chats inventados.

## Producción

```bash
npm run build          # dist/ estático → Cloudflare Pages / Netlify (public/_headers trae la CSP)
npm run preview        # sirve dist/ en local para probarlo
```

## Cómo exportar un chat de WhatsApp
- **iPhone**: abre el chat → nombre del contacto → Exportar chat → Sin archivos. Se genera un `.zip`. Elige **sin archivos**: fotos, audios y stickers se cuentan igual a partir de los avisos “imagen omitida”, “audio omitido”…
- **Android**: abre el chat → ⋮ → Más → Exportar chat → Sin archivos. Se genera un `.txt`.

## Licencia

[MIT](LICENSE). longsaw no está afiliado a WhatsApp.
