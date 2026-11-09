# Longsaw: arquitectura, decisiones y plan

## 1. Alcance del MVP (v0.1, el que está en este repo)

| Incluido | Fuera (siguiente versión) |
|---|---|
| Chats individuales, export de iOS (.zip/.txt) y Android (.txt) | Grupos |
| Exports en español e inglés (estructura lista para más idiomas) | Otros idiomas (pt, fr, it…) |
| Las 16 tarjetas + PDF + imagen por tarjeta | Plantillas de imagen para Stories (9:16) |
| Todo el análisis en el navegador (Web Worker) | — |
| IA opcional, con consentimiento y vista previa del envío | Pagos reales (diseñados, no implementados) |
| Freemium con tarjetas desenfocadas | Cuentas de usuario (no hacen falta) |

## 2. Stack y por qué

- **React 19 + Vite + TypeScript**: SPA estática; Vite empaqueta el Worker de forma nativa.
- **Tailwind v4**: tokens pastel en `@theme` (`src/index.css`).
- **Sin librería de gráficos**: los 3 gráficos que hacen falta (barras por mes, horas y la línea de interés) son SVG a mano: 0 KB extra, accesibles (`role="img"` + `aria-label` + `<title>`). Recharts añadiría unos 100 KB gzip.
- **fflate** (zip, 8 KB), **html-to-image** (PNG), **jsPDF** (carga diferida, solo si se pulsa PDF).
- **Vitest** para tests.
- **Backend**: un único archivo Node sin dependencias (`server/llm-proxy.mjs`) solo para la IA.
- **Sin base de datos, ni Supabase**. No hay nada que guardar en servidor: no hay cuentas, el informe vive en el navegador y la IA no tiene estado. Cuando lleguen los pagos, un token firmado (HMAC) basta y no hace falta BD. Supabase en local con Docker entraría si se añaden cuentas o el historial de compras; queda anotado como ampliación.

### Despliegue más barato
- Frontend: Cloudflare Pages o Netlify (gratis). `public/_headers` ya trae una CSP estricta.
- Proxy de la IA: el mismo código en una Cloudflare Worker o Pages Function (gratis hasta 100 000 peticiones al día), o en un VPS mínimo. Coste real: solo los tokens del LLM, unos 3-5 KB de entrada por informe con un modelo Haiku, una fracción de céntimo.

## 3. Estructura de carpetas

```
src/
  core/                 TypeScript puro, sin React ni DOM → Worker + tests
    types.ts            modelo de datos (chat parseado, opciones, informe)
    parser.ts           parser de exports (2 pasadas, orden de fecha global)
    zip.ts              .zip/.txt → texto (solo descomprime el .txt)
    locales/            paquetes de idioma (es, en): marcadores, stopwords, ambiguos
    stats/              un módulo por tarjeta o familia de tarjetas
      context.ts        sesiones y respuestas calculadas UNA vez
      basic.ts timeline.ts words.ts silence.ts interest.ts flags.ts ambiguous.ts insights.ts
    analyze.ts          orquestador → Report
    anonymize.ts        scrubber de PII + payload mínimo para la IA
    demo.ts             chat sintético determinista
    format.ts           duraciones y fechas en es-ES
  worker/analysis.worker.ts   el chat vive SOLO aquí
  lib/                  cliente del worker, nombres, relaciones, exportación, almacenamiento, IA, entitlements
  components/           ui.tsx (primitivas), cards/*, AiConsentModal
  pages/                Upload, Setup, Loading, Report, Privacy
server/llm-proxy.mjs    proxy de la IA (único backend)
tests/                  parser, estadísticas y anonimizador + fixtures/*.txt
```

## 4. Modelo de datos

```ts
Message      { id, ts, author: 0|1|null, text, kind: 'text'|'media'|'deleted'|'call'|'system', mediaType?, edited? }
ParsedChat   { participants[2], messages[], locale, platform, dateOrder, exporterGuess, warnings[] }
AnalysisOptions { me, relation, otherAlias, sessionGapHours=6, seenThresholdHours=24, silenceDays=7 }
Report       { meta, counts, responses, firstMessage, initiations, endings, longest, deleted,
               interest, seen, silences, words, timeline, flags, ambiguous, insights }
```

Decisiones clave:
- **El autor es un índice, no un nombre.** Los nombres solo están en `participants`/`meta.participants`.
- **Los textos generados usan los marcadores `{0}`/`{1}`.** Así la UI decide si muestra el nombre, el alias o "Persona A/B" sin recalcular nada.
- **`Pair<T>` = [persona 0, persona 1]**: el core no sabe quién es "tú", lo resuelve la UI con `options.me`.
- **El Report solo lleva agregados y extractos cortos** (máx. 220 caracteres, 600 en "mensaje más largo"). Nunca el chat.

## 5. Privacidad (implementación real)

1. El archivo se lee con `arrayBuffer()` y se **transfiere** al Worker (no se copia).
2. El chat parseado solo existe dentro del Worker. "Borrar todo" llama a `worker.terminate()` y borra `localStorage`.
3. Por defecto no se guarda nada. "Guardar en este dispositivo" guarda solo el Report.
4. IA: `buildAiPayload()` envía números, las flags con un máximo de 3 extractos y como mucho 5 mensajes ambiguos con contexto, todo pasado por `makeScrubber()` (nombres y sus partes, alias, teléfono, email, URL, DNI/NIE, IBAN, números largos, menciones). El modal enseña el JSON exacto y deja quitar frases. El servidor rechaza cuerpos de más de 16 KB, no registra contenido y aplica límite de peticiones por IP.
5. Cero terceros: fuente autoalojada, sin analíticas y CSP `connect-src 'self'`.
6. El test e2e comprueba que al analizar no sale **ninguna** petición fuera del origen.

## 6. Definiciones de las métricas

| Métrica | Definición |
|---|---|
| Conversación nueva | Mensaje tras ≥ `sessionGapHours` (6 h) de silencio. |
| Respuesta | Cambio de autor dentro de una conversación; se mide desde el último mensaje del otro. |
| Tiempo de respuesta | Mediana (titular), media y p90. |
| Visto (estimación) | Racha de mensajes que pedía respuesta (contiene "?" o insiste ≥ 1 h) y la respuesta tarda ≥ 24 h o no llega. |
| Silencio unilateral | Racha de una persona (≥ 2 mensajes en ≥ 1 h) sin respuesta durante ≥ 7 días. Si cierra el chat, es "posible bloqueo". |
| Interés | Suma ponderada de escalas absolutas: rapidez 25 %, iniciativa 20 %, longitud 15 %, preguntas 15 %, volumen 10 %, evolución 10 %, emojis 5 %. |
| Vuestro idioma | Palabras y bigramas que usan los dos ≥ 3 veces; puntuación = mín(a, b), con bonus para los bigramas. |

Red flags por reglas (`stats/flags.ts`, con umbrales en `T`): iniciativa ≥ 70 %, ratio de medianas ≥ 3x, mensajes un 40 % más cortos (primer cuarto frente al último), ≥ 25 % de mensajes de madrugada, caída mensual ≥ 60 %, vistos asimétricos, silencio final, ráfagas de doble texting y ≥ 5 % de mensajes borrados. Green flags: iniciativa equilibrada, respuestas rápidas por ambos lados, racha de 14 días o más, preguntas por ambos lados.

## 7. Modelo de negocio (diseñado)

- **Gratis**: tarjetas 1-6 y la línea temporal (lo que más se comparte, que es lo que trae usuarios).
- **Pago único por informe (2,99 €)**: el resto de tarjetas, el PDF y la IA. Las bloqueadas se ven desenfocadas, como en la referencia.
- **Integración prevista**: `POST /api/checkout` → Stripe Checkout (pago único) → webhook → token HMAC `{reportHash, exp}`. `reportHash` es un hash de las estadísticas, no del contenido. El proxy de la IA exige el token, y ahí está el bloqueo "duro". Sin cuentas y sin BD.
- **Riesgo asumido**: como las estadísticas se calculan en el cliente, el bloqueo de las tarjetas locales es "blando" (se puede saltar con DevTools). Es un trade-off deliberado a favor de la privacidad: lo que de verdad se paga es la IA (servidor) y la comodidad.

## 8. Fases y estado

| Fase | Estado |
|---|---|
| 1. Parser + tests (iOS/Android, 12/24 h, es/en, zip, casos límite) | ✅ |
| 2. Estadísticas básicas | ✅ |
| 3. Interfaz de tarjetas, setup por relación, carga por pasos, privacidad | ✅ |
| 4. Línea temporal | ✅ |
| 5. Interés y red flags por reglas, visto, silencios, ambiguos, the move | ✅ |
| 6. IA opcional (consentimiento, anonimización, proxy, modo mock) | ✅ |
| 7. Exportar a imagen (Web Share en móvil) y PDF | ✅ |
| Pagos (Stripe) | Diseñado |
| Grupos, más idiomas, plantillas para Stories | Pendiente |

## 9. Riesgos detectados

1. **Cambios de formato de WhatsApp.** Los textos de sistema cambian entre versiones. Mitigación: marcadores en datos (`locales/`), clasificación tolerante y fixtures para cada formato. Conviene añadir un fixture nuevo por cada export real que falle.
2. **Fechas ambiguas** (todo ≤ 12 en un chat corto, p. ej. un inglés británico con DMY). Se resuelve por inversiones temporales y, si sigue ambiguo, por el idioma. Un chat de pocos días puede fallar; en ese caso se podría añadir un selector manual en el setup.
3. **Zona horaria.** El export no la trae. Se interpreta como hora local, y un viaje puede desplazar las horas.
4. **Nombres de terceros dentro de los mensajes** no se anonimizan automáticamente (haría falta NER). Mitigación: vista previa y quitar frases antes de enviar.
5. **Lecturas "psicológicas".** Riesgo reputacional y de bienestar. Mitigación: lenguaje de "estilo", avisos visibles y un prompt que prohíbe diagnosticar y, ante señales de riesgo, deriva con delicadeza a alguien de confianza.
6. **Datos de terceros** (la otra persona no ha consentido). Mitigación: todo en local, nombres ocultos por defecto al compartir y un aviso en la página de privacidad. Antes de lanzar, conviene revisarlo con alguien de legal (RGPD).
7. **Memoria con exports enormes**: el zip con multimedia se filtra al .txt. unos 100 000 mensajes se parsean y analizan en 1-3 s en Node (el test lo vigila); en el navegador tarda algo más, pero dentro del Worker la interfaz no se congela.
8. **`html-to-image`** puede fallar con emojis o fuentes en Safari antiguo. Hay que probar en dispositivos iOS reales.
9. **Nombre del modelo de IA**: configurable con `LLM_MODEL`. Hay que verificar que el valor por defecto es válido en tu cuenta de la API.
