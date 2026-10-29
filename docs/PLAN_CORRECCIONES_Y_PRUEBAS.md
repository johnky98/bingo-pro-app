# PLAN_CORRECCIONES_Y_PRUEBAS.md — Bingo Pro (previo a F1.5 / F2)

Fecha: 2026-10-28 · Base: commit `561e755` · Documento de planificación. **Nada de esto está implementado ni aprobado.**

**Estado comprobado al redactar (sin asumir):** `main` = `origin/main` = `561e755`; 0 etiquetas; sin cambios en archivos versionados; producción responde 200 en las 5 URLs y su CSS es idéntico al del repositorio; ninguna decisión D-xx ni propuesta PR-xx ha sido respondida por el usuario.

**Etiquetas de evidencia:** **[V]** verificado (ejecutado) · **[D]** deducido del código, sin ejecutar · **[P]** pendiente de comprobar o de decidir.

Regla de este documento: los criterios de aceptación describen el **comportamiento vigente** salvo los marcados **[Cond. PR-x]**, que dependen de una regla que aún no has aprobado. Ninguna regla se cambia por mi cuenta.

---

## 1. Decisiones pendientes que bloquean el desarrollo

| Decisión | Qué bloquea | Estado |
|---|---|---|
| **D-13** etiqueta `v0.1.0-estable` (implica un push) | Empezar cualquier cambio con punto de recuperación | Aprobada; etiqueta creada y subida |
| **D-02** 3×3/4×4 (ocultar ya / implementar después) | CM-01; el motor y las pruebas deben saber qué tamaños soportan | Aprobada A (ocultar); hecha en CM-01 |
| **D-01** marca BINGO PRO y retirar plantilla Política | CM-02 | Aprobada A; hecha en CM-02 |
| **D-12** reglas: **PR-1** (patrón vacío), **PR-2** (cambio de modalidad), **PR-3** (cartón que ya ganó), **PR-6** (pausa), **PR-8** (cierre) | Los criterios marcados [Cond.] y las pruebas de F2 de esas reglas | Aprobadas: PR-1 (a) en F1.5; PR-2 (b), PR-3 (a), PR-6 y PR-8 el 2026-10-29 |
| **D-03** QR y dominio | No bloquea programar; **bloquea imprimir cartones para eventos reales** | Sin responder |
| **D-04 / D-09** experiencia multi-teléfono y arquitectura en tiempo real | El diseño del almacén de partidas (F3) y todo F5 | Sin responder |
| **D-06** historial y persistencia | Forma del modelo de "partida" en F3 | Aprobada B el 2026-10-29: últimas 20 partidas en el navegador, exportación JSON + CSV, se abre la última usada |
| D-05, D-07, D-08, D-10, D-11 | No bloquean F1.5 ni F2 (son de F3–F9) | Sin responder |

**Mínimo para arrancar F1.5:** D-13, D-02, D-01 y PR-1. **Mínimo para arrancar F2:** además PR-2, PR-3, PR-6 y PR-8 (o aceptar que F2 solo caracterice el comportamiento actual).

---

## 2. Riesgos críticos que corregir antes de integrar los módulos

Integrar significa que los cartones pasan solos de Diseño a Online y a Balotera. Si hoy hay datos malos o destructivos, la integración los propaga.

| Prioridad | Riesgo | Evidencia | Por qué bloquea la integración |
|---|---|---|---|
| 1 | **R-02 / H07** "Finalizar e ir a la Balotera" reemplaza todas las tablas (200 → 6) | **[V]** | La integración automática lo haría sin que el usuario lo note |
| 2 | **R-03** tabla malformada rompe cada "sacar balota" y la detección de todas | **[V]** | Un solo dato malo inutiliza el juego; la integración lo guardaría sola |
| 3 | **R-04** XSS por JSON importado (`innerHTML` en el verificador) | **[V]** | El intercambio de cartones entre módulos y personas aumenta la exposición |
| 4 | **R-01** 3×3/4×4 producen cartones impresos sin números | **[V]** | El cartón es la entrada de todo el flujo |
| 5 | **R-24** patrón personalizado vacío: todos ganan con la primera balota | **[V]** | Falsos ganadores en el módulo que decide los premios |
| 6 | **R-09** el lote impreso no se persiste | **[V]** | Sin él no hay verificación posible; la integración necesita guardar el lote |
| 7 | **R-15** no existe el concepto de partida (claves globales) | **[D]** | Sin partida, la integración mezclará eventos |
| 8 | **R-11** `?c=` incompleto deja la vista del jugador en blanco | **[V]** | El jugador es la puerta de entrada del modo digital |
| 9 | **R-05 / R-06** marca y textos del bingo político; texto falso de "registro" | **[V]** | Incumple reglas no negociables del plan |
| 10 | **R-25** cambio de modalidad: aviso diferido con balota ajena | **[V]** (aviso diferido) / **[D]** (resto) | Genera disputas de premios si no se define |
| 11 | **R-07 / R-08** QR atado al dominio; QR por servicio externo; impresión a los 300 ms sin esperar imágenes | **[D]** (no se simuló caída ni red lenta) | Dañan cartones impresos de forma irreversible |
| 12 | **P-01 / P-02** sin etiqueta Git y sin pruebas automatizadas | **[V]** (0 etiquetas, 0 pruebas) | No hay red de seguridad para refactorizar |

---

## 3. Criterios de aceptación del motor del bingo

El **motor** es un módulo sin DOM, sin almacenamiento y sin red (F2). Estos criterios definen cuándo está bien.

### 3.0 Criterios transversales

| ID | Criterio | Tipo |
|---|---|---|
| AC-00a | El motor no referencia `document`, `window`, `localStorage`, `fetch` ni `alert` (comprobable con una búsqueda de texto y ejecutándolo en Node) | nuevo |
| AC-00b | El azar es **inyectable** (función `rng`), para que las pruebas sean reproducibles | nuevo, no cambia reglas |
| AC-00c | Las operaciones inválidas **devuelven un error descriptivo y no cambian el estado**; no lanzan excepciones no controladas | nuevo (cierra R-03) |
| AC-00d | El estado completo se serializa a JSON y se restaura idéntico (ida y vuelta) | nuevo (base de la recuperación) |
| AC-00e | **Pruebas de caracterización:** para ≥10 000 combinaciones aleatorias de (cartón, modalidad, balotas), la función nueva devuelve el **mismo resultado** que la actual `tablaCumplePatron`, salvo los defectos documentados (R-24) | **[P]** se construye en F2; la función actual es pura **[V]** |
| AC-00f | Cobertura de ramas de las reglas del motor ≥ 90 % (cifra propuesta; la fijas tú) | propuesta |

### 3.1 Extracción de balotas

| ID | Criterio | Base | Estado |
|---|---|---|---|
| AC-E1 | Cada ronda usa números 1–75 | comportamiento vigente | **[V]** |
| AC-E2 | Una balota no se repite dentro de la misma ronda: 75 extracciones seguidas = permutación completa de 1–75 | vigente | **[V]** (uso) / **[P]** (prueba exhaustiva) |
| AC-E3 | Con 75 balotas fuera no se extrae otra y se devuelve un resultado controlado ("agotado") | vigente (la UI muestra "¡JUEGO TERMINADO!") | **[V]** |
| AC-E4 | Letra por rango: 1–15 B, 16–30 I, 31–45 N, 46–60 G, 61–75 O; se prueban los extremos 1, 15, 16, 30, 31, 45, 46, 60, 61, 75 | vigente | **[D]** |
| AC-E5 | Al cargar un estado con balotas fuera de 1–75, no enteras o repetidas, se rechaza con error (no se asume) | validación | **[P]** · [Cond. PR-9] |
| AC-E6 | Con un `rng` fijo la secuencia es reproducible | AC-00b | **[P]** |
| AC-E7 | Azar de calidad criptográfica (`crypto.getRandomValues`) | — | [Cond. PR-12] |

### 3.2 Validación de cartones

| ID | Criterio | Estado |
|---|---|---|
| AC-V1 | Un cartón válido tiene 5 columnas × 5 enteros; la columna B en 1–15, I en 16–30, N en 31–45, G en 46–60, O en 61–75; sin repetidos dentro de la columna | **[D]** (es lo que generan Diseño y Online) |
| AC-V2 | Se rechazan con motivo: columnas distintas de 5, columnas distintas de 5 elementos, no enteros, fuera de rango, repetidos, textos (incluido HTML), `null`/`undefined` | **[P]** · [Cond. PR-9] (hoy solo se comprueba que `columnas` sea un arreglo) |
| AC-V3 | Importar un lote devuelve cartones aceptados + rechazados con su motivo; **no se pierden los válidos** por culpa de uno malo | **[P]** · [Cond. PR-9] |
| AC-V4 | El `id` de cada cartón se normaliza y es único dentro del lote | **[P]** · [Cond. PR-9] |
| AC-V5 | La casilla central (FREE) nunca cuenta; el número guardado en esa posición no influye en el resultado | vigente **[D]** |
| AC-V6 | La generación de un lote no produce dos cartones iguales (hoy lo hace Online pero no Diseño) | **[P]** — no cambia reglas de juego; aun así la confirmas tú |
| AC-V7 | Un cartón decodificado de `?c=` pasa AC-V1/V2 antes de mostrarse; si falla, se informa con un mensaje | **[P]** · [Cond. PR-9] |
| AC-V8 | Tamaño del lote: 1 000 cartones validan sin bloquear la interfaz; el umbral exacto se fija tras medirlo | **[P]** |

### 3.3 Patrones ganadores

Para cada modalidad se exigen casos: **ganadora exacta**, **a un número de ganar**, **ninguna balota**, **balotas ajenas al patrón** y **uso de la casilla libre**.

| ID | Modalidad | Criterio (comportamiento vigente) | Estado |
|---|---|---|---|
| AC-P1 | Cartón Lleno | Gana con las 24 casillas con número cantadas (25 con la libre) | **[D]** |
| AC-P2 | Línea Horizontal | Gana con **cualquiera** de las 5 filas; la fila central requiere 4 números | **[D]** |
| AC-P3 | Línea Vertical | Gana con **cualquiera** de las 5 columnas; la N requiere 4 números | **[D]** |
| AC-P4 | Figura en L | Columna B completa + fila inferior (+ libre) = 10 casillas | **[D]** |
| AC-P5 | Figura en O / Cuadrado | Borde (16 casillas) + libre = 17 | **[D]** |
| AC-P6 | Cuatro Esquinas | 4 esquinas + libre = 5 | **[V]** (cartones ganaron al cantar sus 4 esquinas) |
| AC-P7 | Personalizado | Las casillas dibujadas + libre | **[V]** (comportamiento con dibujo no vacío en sesión previa) |
| AC-P8 | Personalizado **vacío** | Se rechaza al guardar | **[Cond. PR-1]** · hoy **[V]** falla: todos ganan con 1 balota |
| AC-P9 | Sin diagonales ni otras figuras | Verificar que **no** existen, para no ampliar el alcance sin decidirlo | **[D]** · [Cond. PR-13] |
| AC-P10 | Una casilla se considera marcada solo si su número está en las balotas de **la ronda actual** (o es libre) | vigente | **[D]** |

### 3.4 Múltiples ganadores

| ID | Criterio | Estado |
|---|---|---|
| AC-M1 | Todos los cartones que cumplen tras la misma balota se devuelven **juntos**, en un solo evento | **[V]** (2 simultáneos) |
| AC-M2 | Orden estable por número de tabla ascendente (numérico) | **[V]** con ids numéricos; **[P]** con ids no numéricos (hoy depende del orden de las claves) |
| AC-M3 | Un cartón se avisa **una sola vez por ronda** | **[V]** |
| AC-M4 | El mismo cartón puede ganar en una ronda posterior | **[V]** |
| AC-M5 | Borrar el historial visible no reactiva avisos | **[V]** (sesión previa) |
| AC-M6 | "Reiniciar juego" vacía historial y avisos, y conserva ronda y total | **[V]** (sesión previa) / **[D]** |
| AC-M7 | Evaluar dos veces el mismo estado no genera avisos nuevos (idempotencia) | **[P]** |
| AC-M8 | Sin cartones o sin balotas no se evalúa y no hay error | **[D]** |
| AC-M9 | Tras un ganador la ronda continúa | vigente **[D]** · [Cond. PR-5] |
| AC-M10 | Avisa una vez por ronda **y por modalidad** | PR-3 aprobada; hecho en F2 (pruebas del motor y de la Balotera) |
| AC-M11 | Al cambiar de modalidad en plena ronda se reevalúa al instante, con confirmación | PR-2 aprobada; hecho en F2 (pruebas del motor y de la Balotera) |
| AC-M12 | Reglas de desempate o reparto de premio | [Cond. PR-4]; hoy no existen |

### 3.5 Gestión de rondas

| ID | Criterio | Estado |
|---|---|---|
| AC-R1 | La partida empieza en la Ronda 1 con 0 balotas | **[V]** |
| AC-R2 | "Siguiente ronda": ronda + 1, balotas vacías, cartones e historial conservados, modalidad sin cambios | **[V]** (sesión previa) |
| AC-R3 | El total de rondas es un entero ≥ 1 y ≥ ronda en curso; si no, error y sin cambios | **[V]** (sesión previa) |
| AC-R4 | En la última ronda no se avanza más | **[V]** (sesión previa) |
| AC-R5 | "Reiniciar juego": balotas, historial y avisos vacíos; ronda y total intactos | **[V]** (sesión previa) |
| AC-R6 | Una transición inválida (por ejemplo, avanzar más allá del total) devuelve error y deja el estado intacto | **[P]** (nuevo, ligado a AC-00c) |
| AC-R7 | Estado de ronda serializable y restaurable (AC-00d) | **[P]** |
| AC-R8 | Pausa, reiniciar solo la ronda, partida nueva y cierre con resumen | [Cond. PR-6, PR-7, PR-8]; hoy no existen |

---

## 4. Conjunto de pruebas de regresión

### 4.1 Cómo se ejecutarían (sin instalar nada nuevo)

| Capa | Herramienta | Qué cubre | Estado |
|---|---|---|---|
| Motor | `node --test` (incluido en Node, sin dependencias) | AC-00 a AC-R, pruebas de caracterización | **[P]** se crea en F2 |
| Navegador (flujos de cada módulo) | Chrome sin interfaz controlado por el protocolo CDP, con un script de Node (sin librerías), el mismo método que usé en esta auditoría | RT-D, RT-O, RT-B, RT-X | Los guiones previos **no se conservaron**; hay que reescribirlos **[P]** |
| Visual e impresión | Capturas a 1280 px y 375 px, y emulación de impresión, comparadas contra una **línea base tomada antes de cambiar nada** | RT-V | **[P]** línea base sin tomar |
| Dispositivos reales (iOS/Android) | Manual, con los teléfonos que tengas | RT-M | **[P]** sin hacer nunca |

Playwright u otra herramienta serían una dependencia nueva: **no se instalaría sin tu aprobación**.

Leyenda de "Hoy": **Pasa** = la comprobé ahora o en sesión previa y se cumple · **Falla** = reproducido · **Sin probar**.

### 4.2 Diseño (`RT-D`)

| ID | Prueba | Hoy |
|---|---|---|
| RT-D1 | La página carga sin errores de consola, también a 375 px | Pasa (previa) |
| RT-D2 | Vista previa 5×5: 25 celdas, FREE al centro | Pasa (hoy) |
| RT-D3 | Las 3 plantillas aplican colores y título | Sin probar |
| RT-D4 | Lote de N: ids 1..N, cada cartón cumple AC-V1, sin repetidos | Parcial (hoy: 10 cartones, 25 números) |
| RT-D5 | Cambiar de pestaña no regenera números del lote | Sin probar |
| RT-D6 | "Nuevo Lote" cambia los números y conserva la cantidad | Sin probar |
| RT-D7 | Exportar JSON: esquema `[{id, columnas}]` y coincide con lo mostrado | Parcial (hoy: 25 números por tabla) |
| RT-D8 | El QR de la tarjeta N, decodificado, devuelve el cartón N (ida y vuelta) | Sin probar |
| RT-D9 | Impresión emulada: ⌈N/4⌉ hojas Carta, 4 por hoja, 25 celdas con número en cada cartón, interfaz oculta | Parcial (previa) |
| RT-D10 | Subir plantilla: la cuadrícula se ajusta con los controles | Pasa (previa) |
| RT-D11 | Formatos 3×3/4×4 | **Falla** (cartones sin números). Esperado tras CM-01: opciones ocultas **[Cond. D-02]** |
| RT-D12 | Sin textos "Actitud", "Política" ni "pide registro" | **Falla** · esperado tras CM-02 **[Cond. D-01]** |
| RT-D13 | Con QR activado se piden N imágenes y la impresión espera a que carguen | **Falla/Sin probar** · esperado tras CM-08 |

### 4.3 Juego Online (`RT-O`)

| ID | Prueba | Hoy |
|---|---|---|
| RT-O1 | Sala aleatoria de N jugadores: cartones únicos y válidos | Parcial (hoy: se generó la sala de 6; unicidad y validez no se comprobaron) |
| RT-O2 | Sala por rango de tablas importadas | Sin probar |
| RT-O3 | Cada URL de jugador decodifica a su cartón | Pasa (previa) |
| RT-O4 | Vista del jugador: 25 celdas, FREE al centro; el marcado se conserva al recargar | Pasa (previa) |
| RT-O5 | `?c=` incompleto o manipulado: mensaje claro, sin excepción | **Falla** · esperado tras CM-06 |
| RT-O6 | "Finalizar" no destruye las tablas previas | **Falla** (200 → 6) · esperado tras CM-07 / F3 |
| RT-O7 | Exportar tablas de la sala | Pasa (previa) |
| RT-O8 | Importar un JSON inválido: aviso y sin cambios | Sin probar |
| RT-O9 | Navegar jugador anterior/siguiente; último muestra "Finalizar" | Pasa (previa, flujo de 6) |

### 4.4 Balotera (`RT-B`)

| ID | Prueba | Hoy |
|---|---|---|
| RT-B1 | Arranca en "Ronda 1 de 10" con el botón habilitado | Pasa (previa) |
| RT-B2 | 75 balotas únicas y luego "¡JUEGO TERMINADO!" | Parcial (hoy: el botón cambia tras 75; unicidad de las 75 no comprobada exhaustivamente) |
| RT-B3 | Recargar conserva balotas, cartones, modalidad, ronda, total, historial y avisos | Pasa (previa) |
| RT-B4 | Cada modalidad con un cartón construido: gana, casi gana, no gana | Parcial |
| RT-B5 | Varios ganadores en una balota → una tarjeta por cartón | Pasa (hoy) |
| RT-B6 | Sin avisos repetidos; borrar historial no reactiva | Pasa (previa) |
| RT-B7 | Siguiente ronda: el mismo cartón puede ganar de nuevo | Pasa (hoy) |
| RT-B8 | Total de rondas inválido o por debajo de la ronda actual: alerta y sin cambios | Pasa (previa) |
| RT-B9 | Reiniciar juego conserva la ronda | Pasa (previa) |
| RT-B10 | Verificador manual: "Bingo válido", "Faltan N", "no encontrada" | Pasa (previa) |
| RT-B11 | Importar JSON válido / inválido | Parcial (válido sí; inválido acepta datos malos) |
| RT-B12 | Un JSON con HTML en un número **no** ejecuta script | **Falla** · esperado tras CM-05 |
| RT-B13 | Una tabla malformada no rompe "sacar balota" ni la detección de las demás | **Falla** · esperado tras CM-06 |
| RT-B14 | Patrón personalizado vacío rechazado | **Falla** · **[Cond. PR-1]** |
| RT-B15 | Rendimiento: 1 000 tablas × 70 balotas | Referencia: **168 ms** (Chrome de escritorio). Criterio propuesto: no superar el doble de la referencia |
| RT-B16 | Dibujo personalizado se guarda y se restaura | Sin probar |
| RT-B17 | Sin errores de consola a 375 px | Pasa (previa) |

### 4.5 Integración entre módulos (`RT-X`) y transversales

| ID | Prueba | Hoy |
|---|---|---|
| RT-X1 | Contrato: un JSON exportado por Diseño lo aceptan Online y Balotera sin pérdida | Sin probar como prueba formal |
| RT-X2 | Contrato de claves: ningún módulo escribe una clave de otro sin documentarlo (tabla de `MAPA_MODULOS.md` §7) | Sin probar |
| RT-X3 | Flujo completo Diseño → Online → Balotera conserva todos los cartones (tras F3) | **Pasa en F3** (prueba de integración: 30 tablas de Diseño → sala con #3–#5 → Balotera con las 30; una sala aleatoria crea otra partida sin tocarlas) |
| RT-V1 | Capturas de los 4 módulos a 1280 y 375 px contra la línea base: sin diferencias no intencionadas | **[P]** línea base sin tomar |
| RT-V2 | Impresión emulada comparada contra la línea base | **[P]** |
| RT-V3 | Contraste de los textos principales ≥ criterios acordados | Parcial (previa); pares de marca conocidos bajo 4,5:1 |
| RT-M1 | Dispositivos reales: abrir QR, marcar, imprimir, `backdrop-filter` | **Nunca probado** |
| RT-M2 | Escaneo con cámara real de un QR impreso | **Nunca probado** |
| RT-M3 | Red lenta/sin red: qué pasa con Tailwind y los QR | **Nunca probado** |

---

## 5. Cambios mínimos recomendados, en orden

Cada cambio es pequeño, reversible y se entrega con su prueba. **Ninguno se hace sin tu aprobación.**

| Orden | ID | Cambio | Riesgo que cierra | Tamaño | Requiere aprobación de | Prueba que lo cubre |
|---|---|---|---|---|---|---|
| 0a | CM-00a | Crear y subir la etiqueta `v0.1.0-estable` en `561e755` (no cambia código) | P-01 | Mínimo | **D-13** | `git tag -l` + subida verificada |
| 0b | CM-00b | Tomar la **línea base** de capturas e impresión antes de tocar nada (fuera del repositorio) | Regresiones visuales | Mínimo | — | RT-V1, RT-V2 |
| 1 | CM-01 | Ocultar las opciones 3×3 y 4×4 en Diseño | R-01 | 2 líneas HTML | **D-02** | RT-D11 |
| 2 | CM-02 | Título por defecto "BINGO PRO"; retirar la plantilla Política; corregir el texto "pide registro" y los `alt` | R-05, R-06 | ~8 líneas | **D-01** | RT-D12 |
| 3 | CM-03 | Añadir `.gitignore` con `.netlify/` y retirar el `state.json` obsoleto | R-12 | 1 archivo nuevo | Tu visto bueno (es un archivo nuevo del repositorio) | `git status` |
| 4 | CM-04 | Exigir al menos una casilla al guardar un patrón personalizado | R-24 | ~5 líneas | **PR-1** | RT-B14, AC-P8 |
| 5 | CM-05 | Pintar el verificador con `textContent` / DOM en vez de `innerHTML` con datos importados | R-04 | ~30 líneas, misma salida visual | Corrección de seguridad, **sin cambio de reglas**: te aviso y confirmas | RT-B12, RT-B10 |
| 6 | CM-06 | Validar cartones al importar (Balotera y Online) y al abrir `?c=`, con mensaje claro | R-03, R-11 | ~60 líneas | **PR-9** | RT-B13, RT-O5, RT-O8, AC-V1..V3 |
| 7 | CM-07 | Antes de "Finalizar e ir a la Balotera", avisar cuántas tablas se reemplazarán y pedir confirmación (mitigación; la solución real es F3) | R-02 (parcial) | ~10 líneas | Tu visto bueno (cambia la experiencia) | RT-O6 (mitigado, no resuelto) |
| 8 | CM-08 | Impresión: esperar a que carguen las imágenes de QR (o a que fallen) y avisar si alguna no cargó | R-08 (parcial) | ~25 líneas | Tu visto bueno | RT-D13 |
| 9 | CM-09 | Avisar antes de cerrar o recargar Diseño si hay un lote sin exportar | R-09 (parcial) | ~10 líneas | Tu visto bueno | Prueba manual + RT-D7 |
| — | F2 | Crear `tests/` con `node --test`, extraer el motor y las pruebas AC-* | P-02 | Medio | **D-12** | Todas las AC |
| — | F3 | Modelo de partida con almacén intercambiable; cerrar H07, R-09, R-15; QR local | R-02, R-09, R-15, H04 | Grande | **D-04, D-06, D-03** | RT-X3 |

**Por qué este orden:** primero lo que protege (etiqueta, línea base), luego lo que corrige daños que el usuario ya ve (cartones en blanco, marca, ganadores falsos), luego seguridad y validación, y al final las mitigaciones. Los cambios 1–4 no modifican reglas; 4 depende de PR-1 y 6 de PR-9 porque cambian qué datos se aceptan. Cada paso se prueba con su RT antes del siguiente, y cada uno va en su propio commit para poder revertirlo solo.

**Lo que NO está en esta lista a propósito:** cambiar las reglas de cambio de modalidad (PR-2), repetición de ganador (PR-3), pausa (PR-6) y cierre (PR-8); implementar 3×3/4×4; el backend; los anuncios; el dominio; Canva. Todo eso espera tus decisiones.

---

## 6. Ejecución de F1.5 (2026-10-28, aprobada por el usuario)

Commits locales sobre `v0.1.0-estable` (**sin push**; producción sigue en `561e755`). Cada fila se probó en Chrome de escritorio sobre un servidor local.

| ID | Commit | Prueba ejecutada | Resultado |
|---|---|---|---|
| CM-00a | etiqueta `v0.1.0-estable` → `561e755`, subida a GitHub | `git ls-remote --tags` | Pasa |
| CM-00b | línea base fuera del repo: `../linea-base-561e755/` | 17 capturas + PDF; repetida: 16/17 idénticas (`online-sala-d` varía por la animación) | Pasa |
| CM-01 | `51c8dc1` ocultar 3×3/4×4 | RT-D11: solo 5×5; 10 cartones impresos con 24 números | Pasa |
| CM-02 | `743b541` marca BINGO PRO | RT-D12: sin "Actitud", "Política" ni "registro"; plantillas Corporativa/Festiva funcionan | Pasa |
| CM-03 | `903411e` `.gitignore` + retirar `.netlify/` | `git status` | Pasa |
| CM-04 | `94d813a` patrón personalizado ≥1 casilla (PR-1) | RT-B14: vacío rechazado, 0 ganadores; patrón de 1 casilla gana solo con su número; patrón vacío guardado → vuelve a Cartón Lleno | Pasa |
| CM-05 | `7bcf3ea` verificador sin `innerHTML` | RT-B12: script no se ejecuta; 7 escenarios con árbol DOM idéntico al de `v0.1.0-estable` | Pasa |
| CM-06 | `5956ace` validación de tablas (PR-9) | RT-B11, RT-B13, RT-O5, RT-O8: mezcla 2 válidas/7 rechazadas con motivo; archivo sin válidas conserva las anteriores; >2000 rechazado; 2000 reales aceptadas; tablas dañadas guardadas se ignoran y "sacar balota" sigue; `?c=` inválido → mensaje; válido → 25 celdas | Pasa |
| CM-07 | `4125745` aviso antes de reemplazar tablas | RT-O6 (mitigado): 200 guardadas → aviso, cancelar conserva 200; modo importado cuenta 180; sala idéntica no pregunta; aceptar sincroniza y abre la Balotera | Pasa (H07 sigue abierto hasta F3) |
| CM-08 | `3fbfc0b` imprimir tras cargar QR | RT-D13: carga normal imprime sin preguntar; doble clic imprime 1 vez; QR caído avisa "10 de 20" y respeta cancelar/aceptar; sin QR imprime directo | Pasa |
| CM-09 | `53369f5` aviso al salir con lote impreso sin exportar | Chrome sin interfaz con clics reales: impreso sin exportar → diálogo `beforeunload`; exportado → sale sin aviso | Pasa |

**Regresión final:** línea base repetida sobre `53369f5`: solo cambian las 5 capturas de Diseño esperadas (título y plantillas) más `online-sala-d` (variable); 0 errores de consola. Guiones previos: Balotera 19/19, sala online 7/7, jugador 6/6.

**Pendiente de comprobar:** iOS/Android reales, impresión en papel, escaneo real de QR, cómo se ve el diálogo de salida en Safari/Firefox.
