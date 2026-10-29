# AUDIT.md — Bingo Pro · Fase 0 (auditoría y estabilización)

Fecha: 2026-10-28 · Repositorio `johnky98/bingo-pro-app` · Rama `main` · Commit auditado `561e755`.
Alcance: solo lectura. No se modificó código, no se hizo commit ni push, no se tocó el sitio de 9M ni el Bingo Político.
Documentos hermanos: `MAPA_MODULOS.md`, `REGISTRO_RIESGOS.md`, `MATRIZ_FUNCIONES_Y_PRUEBAS.md`.

## 1. Estado de Git

| Dato | Resultado |
|---|---|
| Rama | `main`, sincronizada con `origin/main` (`git ls-remote` devuelve `561e755` para `HEAD` y `refs/heads/main`) |
| Historial | `5d3b2f6` (2026-08-08, inicial) → `3de4505` (2026-10-27, rondas y detección) → `561e755` (2026-10-27, vidrio líquido) |
| Cambios sin confirmar | Ninguno en archivos versionados |
| Sin versionar | `.netlify/state.json` (+ esta carpeta `docs/auditoria/`) |
| Etiquetas | **Ninguna** (no existe punto de recuperación nombrado) |
| Archivos de proyecto ausentes | README, `.gitignore`, `netlify.toml`, `_headers`, `_redirects`, `package.json`, pruebas, favicon |

## 2. Estado del despliegue

| Dato | Resultado | Cómo se comprobó |
|---|---|---|
| URL de producción | `https://gentle-starlight-b32724.netlify.app` | HTTP |
| Páginas | `/`, `/modulo_balotera/`, `/modulo_juego_online/`, `/modulo_diseno/`, `/assets/liquid-glass.css` → 200 | `curl` |
| ¿Es el commit `561e755`? | **Equivalente.** El CSS coincide byte a byte. Los HTML difieren solo por un comentario que añade Netlify y por la reescritura de enlaces a `/modulo_x/` | comparación de hashes y `diff` |
| Cabeceras | HSTS sí; sin CSP, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`; `Cache-Control: public,max-age=0,must-revalidate` | `curl -I` |
| Repositorio y rama vinculados | **No verificado por mí.** El sitio vive en una cuenta que la conexión MCP de esta sesión no ve. Por lo que el usuario mostró antes, está conectado a GitHub; falta confirmar rama y comando de build en el panel | — |
| Sitio duplicado en la cuenta de 9M (`bingo-pro-app`) | **Eliminado.** El equipo de 9M ya no lista ningún proyecto con "bingo" y la URL responde "Site not found" | MCP `get-projects` + `curl` |
| `.netlify/state.json` local | Apunta al ID del sitio duplicado ya eliminado → vínculo obsoleto | lectura |

## 3. Inventario (resumen; detalle en `MAPA_MODULOS.md`)

- 4 páginas HTML estáticas + 1 CSS compartido. 2 934 líneas. Sin build, sin backend, sin dependencias npm.
- Dependencias externas en ejecución: **Tailwind Play CDN** (sin versión fijada) y **`api.qrserver.com`** (QR). Nada más (se comprobó por búsqueda de URLs y por las peticiones de red de Diseño).
- 8 claves de localStorage, todas por origen y sin identificador de partida; solo `bingo_balotera_tablas_v1` se comparte entre módulos.
- 4 puntos de intercambio entre módulos, 3 de ellos con JSON manual (ver `MAPA_MODULOS.md` §8).
- Código duplicado entre módulos: codificación del cartón, generación de números, importación JSON, QR, rangos y configuración de Tailwind (con valores distintos).

## 4. Hallazgos principales (probados salvo indicación)

### 4.1 Cartones impresos en blanco con 3×3 / 4×4 (R-01, H06)
Al elegir "4×4 Rápido" o "3×3 Mini" en Diseño, la vista previa se vacía (0 celdas) y, al pasar a Imprimir, los 10 cartones salen **sin ningún número**, mientras que el JSON exportado y el QR sí contienen 25 números 5×5. La opción es peor que "no implementada": produce papel inservible. El resto del sistema (balotera, online) solo conoce 5×5 y 75 balotas.

### 4.2 H07 reproducido (R-02)
Con 200 tablas guardadas y una sala de 6, "Finalizar e ir a la Balotera" deja 6. Además, el mismo reemplazo total ocurre al importar un JSON en Online o en Balotera: no hay fusión ni separación por partida.

### 4.3 Seguridad de datos importados (R-03, R-04, R-11)
- Un JSON con HTML en un número ejecuta script en el verificador (`innerHTML`).
- Una tabla malformada guardada hace fallar cada "sacar balota" y la detección de todas las tablas.
- Un `?c=` incompleto deja la vista del jugador sin cartón y sin mensaje.

### 4.4 Marca y textos (R-05, R-06)
El título por defecto del cartón impreso es `¡ACTITUD POSITIVA!`; la plantilla "Política" usa `¡UNIDOS POR EL CAMBIO!`; y un texto de ayuda sostiene que el QR "pide registro (nombre, celular, comuna)", cosa que ya no ocurre. **Corrección a mi informe anterior:** el JSON entregado a ChatGPT decía que no había referencias a Actitud Positiva, pero esa comprobación se había hecho solo en la balotera. Debo corregirlo.

### 4.5 QR (R-07, R-08, H04)
Cada QR envía a un tercero la URL completa con el cartón. Además, el QR impreso queda atado al dominio de ese momento: al comprar el dominio definitivo, los cartones ya impresos seguirán apuntando a `netlify.app`. La impresión se dispara a los 300 ms sin esperar a que las imágenes carguen (no probado con red lenta).

### 4.6 Lo que sí funciona bien
- La lógica de detección (`tablaCumplePatron`) es pura y reutilizable; 1 000 tablas × 70 balotas = 168 ms en total.
- Modal e historial de la balotera se construyen con `textContent`.
- Las rondas, el aviso único y la persistencia siguieron correctos en las pruebas de sesiones anteriores.
- El contenido publicado es equivalente al repositorio.

## 5. Contraste con el JSON del plan

| Afirmación del plan | Resultado |
|---|---|
| Último commit `561e755`, rama sincronizada | **Confirmado** |
| Netlify publicado y accesible | **Confirmado** por HTTP; vínculo con GitHub **no verificado** |
| 3×3/4×4 "no implementadas de extremo a extremo" | **Confirmado y más grave**: producen cartones en blanco |
| H07 | **Confirmado** (200 → 6) |
| H04 QR externo | **Confirmado**, más el problema de dominio y de carga en impresión |
| H09 Tailwind por CDN | **Confirmado** |
| H10 configuración se pierde al recargar | **Confirmado y ampliado**: también se pierde el lote impreso |
| "Marca genérica sin referencias al bingo político" | **Incumplido** en Diseño (R-05) |
| "Sin pruebas automatizadas" | No mencionado en el plan; **confirmado: 0** |
| Pendientes de contraste/accesibilidad | **Confirmado** (0 `aria-*`) |

## 6. Limitaciones de esta auditoría (qué no se hizo)

- No se probó en iOS/Android ni en otros navegadores distintos de Chrome de escritorio.
- No se simuló caída o lentitud del servicio de QR ni la impresión real en papel.
- No se leyó el panel de Netlify de la cuenta personal ni la configuración de build.
- No se repitieron hoy todos los escenarios de modalidades y rondas (los de la sesión anterior se marcan "Previa").
- El rendimiento se midió solo en la lógica de detección, no en el pintado de cientos de cartones.

## 7. Punto de recuperación (criterio de aceptación F0)

Hoy el punto de recuperación es el commit `561e755` en `origin/main`. **No hay etiqueta.** Propongo `git tag -a v0.1.0-estable 561e755 -m "Base estable antes de la integración"` y su `git push origin v0.1.0-estable`. No lo ejecuté porque el plan pide aprobación antes de acciones de publicación. Procedimiento de reversión propuesto: `git revert` de los commits nuevos (o redeploy del deploy anterior en Netlify) y, en el peor caso, `git checkout v0.1.0-estable` en una rama nueva.

## 8. Propuesta para F1–F3

### F1 — Reglas y experiencia (sin tocar código de juego)
Decisiones que necesito de ti (ver §9) y documentos `FLUJOS_USUARIO.md`, `REGLAS_DEL_JUEGO.md`, `DECISIONES_PRODUCTO.md`.

### F1.5 — Correcciones de bajo riesgo (propuesta, requiere tu aprobación)
Cambios pequeños que no alteran la arquitectura y corrigen riesgos Altos/Críticos:
1. Ocultar (o desactivar con aviso) las opciones 3×3/4×4 hasta que se implementen (R-01).
2. Cambiar el título por defecto a algo genérico y renombrar o eliminar la plantilla "Política"; corregir el texto "pide registro" y los `alt` (R-05, R-06).
3. Añadir `.gitignore` con `.netlify/` y eliminar el `state.json` obsoleto (R-12).
4. Crear la etiqueta `v0.1.0-estable` (P-01).

### F2 — Motor y pruebas
Extraer `tablaCumplePatron`, generación de cartones, rondas y avisos a `motor/bingo-motor.js` sin DOM, con pruebas Node (`node --test`, sin dependencias nuevas) que cubran §"Escenarios de regresión" de la matriz. Incluye validación de cartones (cierra R-03, R-11, parte de R-04) y escape de datos al pintar (R-04).

### F3 — Integración sin JSON manual
Modelo común `partida → cartones`, almacenado bajo claves con identificador de partida en `localStorage` (sin backend). Diseño crea la partida y entrega los cartones; Online y Balotera la leen. Cierra H07, R-02, R-09, R-15. QR local en el navegador (librería empaquetada en el repositorio, sin CDN) cierra H04/R-08; la política de URLs de los QR (R-07) se decide en F1.

Orden sugerido: F1 → F1.5 → F2 → F3. Cada paso termina con pruebas ejecutadas y un commit por tarea.

## 9. Decisiones que necesito de ti antes de seguir

1. **3×3/4×4:** ¿las ocultamos ahora (rápido) o las implementamos de verdad en F2/F3?
2. **Marca por defecto:** ¿qué título genérico usamos en el cartón (p. ej. "BINGO PRO")? ¿Eliminamos la plantilla "Política"?
3. **QR y dominio:** los QR impresos hoy quedan atados al dominio. ¿Aceptas que el QR lleve una URL corta estable (p. ej. `…/j/?c=`) y que mantengamos `netlify.app` vivo después de comprar el dominio, o prefieres esperar al dominio antes de imprimir cartones reales?
4. **Cambio de modalidad a mitad de ronda:** ¿un cartón ya avisado puede volver a ganar con otra modalidad en la misma ronda?
5. **Etiqueta Git:** ¿apruebas crear y subir `v0.1.0-estable`?
6. **Plan de pruebas:** ¿puedes probar en un iPhone y un Android reales cuando lleguemos a F8, o lo planeamos con un servicio de dispositivos?

No inicio nada de F1.5–F3 hasta tu aprobación.
