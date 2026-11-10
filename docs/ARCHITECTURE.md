# Longsaw: arquitectura, decisiones y plan

## 1. Alcance del MVP (v0.1, el que está en este repo)

| Incluido | Fuera (siguiente versión) |
|---|---|
| Chats individuales, export de iOS (.zip/.txt) y Android (.txt) | Grupos |
| Exports en español e inglés (estructura lista para más idiomas) | Otros idiomas (pt, fr, it…) |
| Las 18 tarjetas + PDF (2 por página) + imagen por tarjeta | Plantillas de imagen para Stories (9:16) |
| Todo el análisis en el navegador (Web Worker), sin ninguna petición externa | — |
| Textos por plantillas y reglas (banco de ~190 frases), sin IA | Cuentas de usuario (no hacen falta) |
| 100 % gratis, sin paywall | — |

## 2. Stack y por qué

- **React 19 + Vite + TypeScript**: SPA estática; Vite empaqueta el Worker de forma nativa.
- **Tailwind v4**: tokens pastel en `@theme` (`src/index.css`).
- **Sin librería de gráficos**: los 3 gráficos que hacen falta (barras por mes, horas y la línea de interés) son SVG a mano: 0 KB extra, accesibles (`role="img"` + `aria-label` + `<title>`). Recharts añadiría unos 100 KB gzip.
- **fflate** (zip, 8 KB), **html-to-image** (PNG), **jsPDF** (carga diferida, solo si se pulsa PDF).
- **Vitest** para tests.
- **Sin backend y sin base de datos.** No hay nada que guardar en servidor: no hay cuentas, ni pagos, ni IA. El informe vive en el navegador.

### Despliegue más barato
- GitHub Pages (gratis): `.github/workflows/pages.yml` pasa los tests y publica en cada push a `main`, compilando con `BASE_PATH=/longsaw/`. Pages no admite cabeceras propias, así que ahí no se aplica la CSP de `_headers`; la app igualmente no hace peticiones externas (lo vigila `tests/privacy.test.ts`).
- Cloudflare Pages o Netlify (gratis): solo hay que servir `dist/`. `public/_headers` ya trae una CSP estricta. Coste de operación: cero.

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
      basic.ts timeline.ts words.ts lexicon.ts silence.ts interest.ts flags.ts ambiguous.ts insights.ts
    media.ts            marcadores de multimedia omitida (multilingüe) → tipo
    dictionaries.ts     risas, cariño, insultos suaves y saludos
    phrases/            bank.ts (frases por situación) + engine.ts (elección sin repetir)
    analyze.ts          orquestador → Report
    anonymize.ts        scrubber de nombres y PII para ocultar nombres al compartir
    demo.ts             chat sintético determinista
    format.ts           duraciones y fechas en es-ES
  worker/analysis.worker.ts   el chat vive SOLO aquí
  lib/                  cliente del worker, nombres, relaciones, exportación (PNG/PDF), pdfLayout, almacenamiento
  components/           ui.tsx (primitivas), ChatToChart (animación de portada), cards/*
  pages/                Upload (portada), Setup, Loading, Report, Privacy
tests/                  parser, estadísticas, multimedia, frases, privacidad/PDF, anonimizador + fixtures/*.txt
```

## 4. Modelo de datos

```ts
Message      { id, ts, author: 0|1|null, text, kind: 'text'|'media'|'deleted'|'call'|'system', mediaType?, edited? }
ParsedChat   { participants[2], messages[], locale, platform, dateOrder, exporterGuess, warnings[] }
AnalysisOptions { me, relation, otherAlias, sessionGapHours=6, seenThresholdHours=24, silenceDays=7 }
Report       { meta, counts, media, lexicon, responses, firstMessage, initiations, endings, longest, longestWords,
               deleted, interest, seen, silences, words, timeline, flags, ambiguous,
               insights: { styles, move, noticed, captions } }
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
4. No hay IA, servidor ni pagos: los textos salen de `core/phrases` y viajan con la web.
5. Cero terceros: fuente autoalojada, sin analíticas y CSP `connect-src 'self'`.
6. `tests/privacy.test.ts` falla si alguien añade `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon` o rutas `/api/` en `src/`.

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
| Multimedia | Marcadores "omitido" de los exports sin archivos (`core/media.ts`): regex "tipo + palabra de omisión" en es/en/pt/fr/de/it, con o sin `<>`, al final del mensaje. Android solo pone "<Multimedia omitido>" → "sin especificar". Nunca entran en el análisis de texto. |
| Risas, cariño, pullitas, saludos | Diccionarios de `core/dictionaries.ts`, sin tildes, expresiones de hasta 3 palabras (la más larga gana y consume sus palabras) + emojis. |
| Frases | Cada hueco tiene situaciones ordenadas de específica a general; la primera que aplica a los datos elige una redacción no usada. Semilla = huella del chat (determinista). |

Red flags por reglas (`stats/flags.ts`, con umbrales en `T`): iniciativa ≥ 70 %, ratio de medianas ≥ 3x, mensajes un 40 % más cortos (primer cuarto frente al último), ≥ 25 % de mensajes de madrugada, caída mensual ≥ 60 %, vistos asimétricos, silencio final, ráfagas de doble texting y ≥ 5 % de mensajes borrados. Green flags: iniciativa equilibrada, respuestas rápidas por ambos lados, racha de 14 días o más, preguntas por ambos lados.

## 7. Modelo de negocio

Ninguno, por ahora: la web es **100 % gratuita**, sin paywall, sin cuentas y sin IA. Al no haber servidor, el coste de operación es el del hosting estático (gratis en Cloudflare Pages o Netlify).

## 8. Fases y estado

| Fase | Estado |
|---|---|
| 1. Parser + tests (iOS/Android, 12/24 h, es/en, zip, casos límite) | ✅ |
| 2. Estadísticas básicas | ✅ |
| 3. Interfaz de tarjetas, setup por relación, carga por pasos, privacidad | ✅ |
| 4. Línea temporal | ✅ |
| 5. Interés y red flags por reglas, visto, silencios, ambiguos, the move | ✅ |
| 6. Exportar a imagen (Web Share en móvil) y PDF (portada + 2 tarjetas por página) | ✅ |
| 7. Sin IA ni pagos: banco de frases, diccionarios, multimedia por tipo, portada animada | ✅ |
| Grupos, más idiomas, plantillas para Stories | Pendiente |

## 9. Riesgos detectados

1. **Cambios de formato de WhatsApp.** Los textos de sistema cambian entre versiones. Mitigación: marcadores en datos (`locales/`), clasificación tolerante y fixtures para cada formato. Conviene añadir un fixture nuevo por cada export real que falle.
2. **Fechas ambiguas** (todo ≤ 12 en un chat corto, p. ej. un inglés británico con DMY). Se resuelve por inversiones temporales y, si sigue ambiguo, por el idioma. Un chat de pocos días puede fallar; en ese caso se podría añadir un selector manual en el setup.
3. **Zona horaria.** El export no la trae. Se interpreta como hora local, y un viaje puede desplazar las horas.
4. **Nombres de terceros dentro de los mensajes** no se anonimizan automáticamente al compartir (haría falta NER).
5. **Lecturas "psicológicas".** Riesgo reputacional y de bienestar. Mitigación: lenguaje de "estilo", avisos visibles y frases escritas sin diagnósticos (y sin adjetivos con género sobre las personas).
6. **Datos de terceros** (la otra persona no ha consentido). Mitigación: todo en local, nombres ocultos por defecto al compartir y un aviso en la página de privacidad. Antes de lanzar, conviene revisarlo con alguien de legal (RGPD).
7. **Memoria con exports enormes**: el zip con multimedia se filtra al .txt. unos 100 000 mensajes se parsean y analizan en 1-3 s en Node (el test lo vigila); en el navegador tarda algo más, pero dentro del Worker la interfaz no se congela.
8. **`html-to-image`** puede fallar con emojis o fuentes en Safari antiguo. Hay que probar en dispositivos iOS reales.
9. **Idioma del móvil**: los marcadores de multimedia dependen del idioma del sistema. Hay patrones para es/en/pt/fr/de/it; otro idioma contaría esos avisos como texto hasta añadirlo en `core/media.ts`.
