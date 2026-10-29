# MAPA_MODULOS.md — Bingo Pro (Fase 0)

Fecha: 2026-10-28 · Commit auditado: `561e755` · Solo lectura: no se modificó código.

## 1. Estructura real del repositorio

| Archivo | Líneas | Bytes | Rol |
|---|---|---|---|
| `index.html` | 64 | 3 158 | Hub: tres tarjetas que enlazan a los módulos |
| `assets/liquid-glass.css` | 307 | 10 041 | Estilo compartido (vidrio líquido, botones, orbes, celdas, impresión del hub) |
| `modulo_diseno/index.html` | 1 071 | 52 179 | Generador, personalizador e impresor de cartones |
| `modulo_juego_online/index.html` | 605 | 26 765 | Sala del anfitrión (QR por jugador) y vista del jugador |
| `modulo_balotera/index.html` | 887 | 37 793 | Balotera, modalidades, rondas, verificador, detección de ganadores |

Total: 5 archivos versionados, 2 934 líneas. **No hay** `README`, `.gitignore`, `netlify.toml`, `_redirects`, `_headers`, `package.json`, pruebas, favicon, `robots.txt` ni etiquetas Git.

Sin versionar: `.netlify/state.json` (vínculo local de la CLI de Netlify; ver REGISTRO_RIESGOS R-12).

## 2. Dependencias entre archivos

```
index.html ──enlaza──► modulo_diseno/ · modulo_juego_online/ · modulo_balotera/
cada página ──<link>──► ../assets/liquid-glass.css
cada página ──<script>► https://cdn.tailwindcss.com   (Tailwind Play CDN, sin versión fijada)
diseño ──URL de QR──► modulo_juego_online/?c=<cartón en base64>   (ruta calculada con replace('/modulo_diseno/','/modulo_juego_online/'))
diseño / online ──<img>──► https://api.qrserver.com/v1/create-qr-code/?data=<URL completa>
online ──localStorage──► balotera  (clave bingo_balotera_tablas_v1)
online ──location.href──► ../modulo_balotera/index.html
diseño ──archivo JSON descargado──► online y balotera (importación manual)
```

No hay módulos JS compartidos: `codificarCartonURL`, `generarNumeros5x5`/`generarCartonesUnicos`, la importación de tablas y los rangos B-I-N-G-O están **copiados** en varios archivos (ver §6).

## 3. Módulo `modulo_diseno`

**Pestañas:** Generador · Subir Plantilla · Imprimir.

**Entradas:** colores, título, logo (archivo → data URL), imagen de fondo (archivo → data URL), formato, escala, cantidad de tablas (10/50/200/500/personalizado hasta 2000), casilla "Incluir QR".

**Estado en memoria (se pierde al recargar):** `configDiseno` (todo el diseño y los data URL de logo y fondo), `ultimoLoteTablas` (`[{id, columnas}]`), `modoOrigen` (`generador` | `subida`).

**Salidas:**
- Impresión (`window.print()`, hoja Carta, 4 tablas por hoja, `@page margin:0`).
- Descarga `tablas_bingo_AAAA-MM-DD.json` con `ultimoLoteTablas` (formato `[{id, columnas:[[5],[5],[5],[5],[5]]}]`).
- QR por tarjeta (imagen de `api.qrserver.com`) con la URL de `modulo_juego_online/?c=…`.

**Funciones principales:** `switchTab`, `aplicarPlantilla`, `actualizarVistaPrevia`, `actualizarEstilosCustom`, `generarNumeros5x5`, `crearElementoCarton`, `generarNuevoLote`, `pintarLoteEnPantalla`, `renderizarLoteImpresion`, `regenerarLoteManual`, `generarEImprimir`, `exportarTablasJSON`, `codificarCartonURL`, `urlTarjetaQR`, `urlImagenQR`.

**localStorage:** ninguno.

**Notas de comportamiento verificadas:**
- El generador de Diseño (`generarNumeros5x5`) **no** comprueba duplicados entre cartones; el comentario de `modulo_juego_online` dice que ambos usan el mismo algoritmo reforzado, y no es cierto (online usa `generarCartonesUnicos` con firma de columnas).
- El cartón impreso se obtiene **clonando la vista previa** y reescribiendo sus celdas. Con formato 3×3 o 4×4 la vista previa queda vacía y el cartón impreso sale **sin números** (probado, ver AUDIT §4.1).
- Plantillas: "Política", "Corporativa", "Festiva". El título por defecto es `¡ACTITUD POSITIVA!` y la plantilla Política pone `¡UNIDOS POR EL CAMBIO!`.

## 4. Módulo `modulo_juego_online`

Una sola página con **dos vistas**, elegidas por el parámetro `?c=`.

**Vista del anfitrión (sin `?c=`):**
- Entradas: importar JSON de Diseño (opcional), número de jugadores (1–20) o rango de IDs importados.
- Estado en memoria: `jugadoresSala` (`[{numero, columnas, url}]`), `indiceActual`, `tablasImportadasDiseno`. **La sala se pierde al recargar.**
- Muestra un QR por jugador, de uno en uno. "Finalizar e ir a la Balotera" escribe las tablas de la sala en `bingo_balotera_tablas_v1` y navega a la balotera.
- Exporta `tablas_sala_online_AAAA-MM-DD.json`.

**Vista del jugador (`?c=<base64url>`):**
- El cartón completo viaja en la URL: `{p: número, cols: [[5]×5]}`.
- Tablero 5×5 tocable; las marcas se guardan en `bingo_online_marcas_<c>`.
- No recibe balotas cantadas (no hay canal de comunicación).

**Funciones principales:** `generarCartonesUnicos`, `construirUrlJugador`, `codificarCartonURL`, `decodificarCartonURL`, `urlImagenQR`, `importarTablasDesdeDiseno`, `generarSala`, `mostrarJugadorActual`, `sincronizarTablasConBalotera`, `finalizarEIrABalotera`, `exportarTablasSalaJSON`, `renderizarCartonJugador`, `mostrarVistaJugador`.

**Validación:** al decodificar solo se captura el error de `atob`/`JSON.parse`; no se valida la estructura de `cols`.

## 5. Módulo `modulo_balotera`

**Entradas:** botón sacar balota, modalidad (6 predefinidas + dibujo personalizado), total de rondas, JSON de tablas, número de tabla a verificar.

**Estado:** `bolasCantadas`, `tablasImportadas` (dict `{id: columnas}`), `patronActivo`, `rondaActual`, `totalRondas`, `historialGanadores`, `ganadoresAvisados` (Set `"ronda:id"`).

**Funciones principales:** `sacarBalotaAleatoria`, `actualizarTableroUI`, `tablaCumplePatron` (pura, sin DOM), `verificarTabla`, `verificarGanadoresAutomatico`, `iniciarSiguienteRonda`, `actualizarTotalRondas`, `reiniciarJuego`, `importarTablasJSON`, `mostrarModalGanadores`, `renderHistorialGanadores`, `borrarHistorialGanadores`, `generarPatron`, `guardarPatronPersonalizado`.

**Modalidades:** Cartón Lleno, Línea Horizontal (cualquier fila), Línea Vertical (cualquier columna), Figura en L, Figura en O/Cuadrado (borde), Cuatro Esquinas, Personalizado. La casilla central siempre cuenta como libre.

**Reglas confirmadas en código:**
- Se evalúa un cartón por cada balota nueva y al importar tablas o cargar la página.
- Un cartón avisa **una vez por ronda** (clave `ronda:id`), sin importar la modalidad: si cambias de modalidad a mitad de ronda, un cartón ya avisado no vuelve a avisar.
- Cambiar la modalidad **no** dispara una nueva evaluación hasta la siguiente balota.
- Reiniciar juego: vacía balotas, historial y avisos, **no** cambia la ronda ni el total.
- Siguiente ronda: vacía balotas; conserva tablas e historial.

## 6. Código duplicado entre módulos

| Elemento | Dónde | Riesgo |
|---|---|---|
| `codificarCartonURL` | Diseño, Online | Deben ser idénticas; hoy lo son por copia |
| Generación de números 5×5 | Diseño (`generarNumeros5x5`, sin unicidad), Online (`generarCartonesUnicos`, con unicidad) | Comportamiento distinto |
| Importación JSON `[{id, columnas}]` → dict | Online, Balotera | Misma validación débil duplicada |
| `urlImagenQR` | Diseño, Online | Dos puntos que llaman al servicio externo |
| Rangos B/I/N/G/O | Diseño, Online, Balotera | Constantes copiadas |
| `tailwind.config` (colores) | Los 4 HTML con valores **distintos** de `brandOrange` (`#FF6B00` vs `#F5711B`) y `brandCard`, etc. | Inconsistencia visual |
| Clases dinámicas `bg-${...}` | Online (L540, L548), Balotera (L436, L488) | Con Tailwind compilado serían purgadas si no se declaran |

## 7. Mapa de datos compartidos y claves de localStorage

Todas las claves son del **origen** completo (`gentle-starlight-b32724.netlify.app`); todos los módulos comparten el mismo almacenamiento.

| Clave | Escribe | Lee | Contenido | Crítica |
|---|---|---|---|---|
| `bingo_balotera_tablas_v1` | Balotera (`importarTablasJSON`), Online (`importarTablasDesdeDiseno`, `sincronizarTablasConBalotera`) | Balotera, Online | `{ "id": [[5],[5],[5],[5],[5]] }` | **Sí.** Cualquiera de los tres puntos de escritura reemplaza todo el diccionario (H07) |
| `bingo_balotera_balotas_v1` | Balotera | Balotera | `[número…]` de la ronda actual | Sí |
| `bingo_balotera_patron_v1` | Balotera | Balotera | `{nombre, clave, grid 5×5}` | Media |
| `bingo_balotera_ronda_v1` | Balotera | Balotera | entero | Sí |
| `bingo_balotera_total_rondas_v1` | Balotera | Balotera | entero | Media |
| `bingo_balotera_historial_ganadores_v1` | Balotera | Balotera | `[{ronda, idTabla}]` | Media |
| `bingo_balotera_avisados_v1` | Balotera | Balotera | `["ronda:id"…]` | Sí (evita avisos duplicados) |
| `bingo_online_marcas_<c>` | Vista del jugador | Vista del jugador | `{ "fila-col": true }`; `<c>` es el cartón codificado (~150 caracteres) | Baja; se acumula sin limpieza |

Ninguna clave tiene número de partida ni de sala: **no existe el concepto de partida** en el modelo de datos actual.

## 8. Flujos que hoy requieren pasos manuales con JSON

1. **Diseño → Balotera:** Exportar Tablas (descarga) → abrir Balotera → Importar Tablas (JSON).
2. **Diseño → Online:** Exportar Tablas → abrir Online → Importar Tablas (JSON) → elegir rango.
3. **Online → Balotera:** automático por localStorage, pero **destructivo** (reemplaza todas las tablas; ver H07).
4. **Respaldo del lote impreso:** si no se pulsa Exportar antes de cerrar Diseño, el lote impreso no se puede recuperar (`ultimoLoteTablas` solo vive en memoria) y los ganadores no se podrán verificar.
5. **Jugador → balotas cantadas:** no existe; el jugador marca de oído.
