# REGLAS_DEL_JUEGO.md — Bingo Pro (Fase 1)

Fecha: 2026-10-28 · Base: commit `561e755`.

**Este documento separa dos cosas:**
- **Parte A — Reglas vigentes:** lo que el código hace hoy. Cada regla indica la función que la implementa y cómo se verificó.
- **Parte B — Propuestas:** reglas que **no** están implementadas y necesitan tu aprobación. Nada de la Parte B es comportamiento actual.

Evidencia: *Hoy* = ejecutado en esta auditoría · *Previa* = ejecutado en una sesión anterior, no repetido hoy · *Código* = leído, no ejecutado.

---

# PARTE A — REGLAS VIGENTES (verificadas en el código)

## A1. El cartón

| Regla | Dónde | Evidencia |
|---|---|---|
| Cuadrícula 5×5 con columnas B-I-N-G-O | Diseño, Online, Balotera | *Hoy* |
| Rangos: B 1–15, I 16–30, N 31–45, G 46–60, O 61–75 | `RANGOS` / `generarNumeros5x5` | *Hoy* (el generador produce 25 números) |
| Cada columna tiene 5 números distintos de su rango | `numerosAleatorios` (Online), bucle con `includes` (Diseño) | *Código* |
| La casilla central (fila 3, columna N) es **libre** (FREE) y siempre cuenta como marcada | `tablaCumplePatron`, `renderizarCartonJugador` | *Previa* |
| El cartón guardado trae **25 números**, aunque la casilla central no se muestra ni cuenta; el número de esa posición se ignora | formato `columnas[c][f]` | *Código* |
| Online evita cartones repetidos dentro de un lote (firma de columnas). Diseño **no** lo comprueba | `generarCartonesUnicos` vs `generarNumeros5x5` | *Código* |
| Solo existe el formato 5×5. 3×3 y 4×4 aparecen en Diseño pero no están implementados (ver defecto en `REGISTRO_RIESGOS.md` R-01) | `cfg-formato` | *Hoy* |

## A2. Las balotas

| Regla | Evidencia |
|---|---|
| Hay 75 balotas, numeradas 1–75 | *Hoy* |
| Cada balota sale al azar entre las que no han salido **en la ronda actual** (`Math.random`); no se repite dentro de la ronda | *Hoy* |
| La letra se deduce del número: 1–15 B, 16–30 I, 31–45 N, 46–60 G, 61–75 O | *Previa* |
| Con 75 balotas fuera, el botón queda "¡JUEGO TERMINADO!" y no se pueden sacar más | *Hoy* |
| No hay forma de deshacer o repetir una balota | *Código* |
| El azar usa `Math.random`, que no es criptográficamente seguro; es suficiente para uso social, pero no está auditado ni es verificable por terceros | *Código* |

## A3. Modalidades de victoria

La casilla central siempre se da por marcada. Un cartón gana cuando todas las casillas requeridas están marcadas (números cantados + la libre).

| Modalidad | Casillas requeridas | Cantidad (incluida la libre) | Evidencia |
|---|---|---|---|
| Cartón Lleno | las 25 | 25 | *Previa* |
| Línea Horizontal | **cualquier** fila completa | 5 (4 números si es la fila central) | *Previa* |
| Línea Vertical | **cualquier** columna completa | 5 (4 números si es la columna N) | *Previa* |
| Figura en L | columna B completa + fila inferior + la libre | 10 | *Código* (patrón) |
| Figura en O / Cuadrado | el borde (16 casillas) + la libre | 17 | *Código* (patrón) |
| Cuatro Esquinas | las 4 esquinas + la libre | 5 | *Previa* (ganó al salir la cuarta esquina); *Hoy*: dos cartones con sus 4 esquinas cantadas se avisaron juntos |
| Personalizado | las casillas dibujadas + la libre | variable | *Hoy* (ver defecto A8) |

**No existen:** diagonales, "X", "T", doble línea ni combinaciones de varias figuras.

## A4. Rondas

| Aspecto | Regla vigente | Evidencia |
|---|---|---|
| **Inicio** | La Ronda 1 ya está en curso al abrir la Balotera. No hay botón de inicio | *Previa* |
| **Total** | 10 por defecto; editable en cualquier momento; no puede ser menor que la ronda en curso ni inválido | *Previa* |
| **Siguiente ronda** | Pide confirmación; aumenta la ronda; **vacía las balotas**; conserva cartones e historial; no cambia la modalidad | *Previa* |
| **Pausa** | **No existe** | *Código* |
| **Cierre** | No existe un cierre formal. En la última ronda el botón dice "Evento finalizado" y queda deshabilitado, pero se pueden seguir sacando balotas | *Previa* |
| **Reiniciar** | "Reiniciar juego" (confirmación): vacía balotas, historial de ganadores y avisos. **No** cambia la ronda ni el total. No existe "reiniciar solo la ronda" ni "crear partida nueva" | *Previa* |
| **Ronda anterior** | No se puede volver; las balotas de rondas pasadas se descartan | *Código* |

## A5. Ganadores

| Regla | Evidencia |
|---|---|
| La detección corre tras **cada balota**, al **importar tablas** y al **cargar la página** (solo si ya hay balotas cantadas) | *Código*; tras balota *Hoy* |
| Solo se revisan las tablas **importadas o sincronizadas** (en `bingo_balotera_tablas_v1`). Un cartón que no esté en esa lista nunca será detectado | *Código* |
| **Uno o varios ganadores:** todos los cartones que cumplen tras la misma balota se avisan **juntos**, en una sola ventana, una tarjeta por cartón. No hay desempate ni reparto de premio | *Hoy* (2 simultáneos) |
| Orden en que aparecen: por número de tabla ascendente (orden de las claves del diccionario) | *Hoy* |
| **Cada cartón avisa una sola vez por ronda.** La clave es `ronda:idTabla` | *Hoy* |
| **Si el cartón gana otra vez en la misma ronda:** no se vuelve a avisar, aunque siga cumpliendo (o cumpla otro patrón) | *Código* |
| **Si gana en una ronda posterior:** vuelve a avisar y se registra de nuevo | *Hoy* |
| **Borrar el historial visible no reactiva avisos** (los avisos se guardan aparte) | *Previa* |
| **"Reiniciar juego" sí borra los avisos**, por lo que los cartones podrían avisar otra vez | *Código* |
| El aviso muestra "Tabla #0001", ronda y modalidad. No muestra nombres | *Previa* |
| Tras un ganador el juego **no se detiene**: se pueden seguir sacando balotas | *Código* |
| La verificación manual evalúa un cartón contra la **modalidad activa** y las balotas de la ronda actual; resultado "BINGO VÁLIDO" o "Faltan N números" | *Previa* |

## A6. Cambio de modalidad durante una ronda

Está **permitido en cualquier momento** y no tiene reglas asociadas. Efectos observados:

| Hecho | Evidencia |
|---|---|
| Cambiar la modalidad **no** dispara una evaluación inmediata | *Hoy* |
| La nueva modalidad se evalúa con la **siguiente balota**, sea cual sea | *Hoy* |
| Un cartón que ya cumplía la nueva modalidad se anuncia entonces con una balota que no tiene relación con él (ocurrió: la tabla 1 se anunció al salir una balota solo presente en la tabla 2) | *Hoy* |
| Un cartón ya avisado en la ronda no vuelve a avisar, porque la clave no incluye la modalidad | *Código* |
| El aviso muestra la modalidad **vigente al momento de avisar**, no la que lo hizo ganar | *Código* |

## A7. Validación

| Elemento | Qué se valida hoy | Qué no |
|---|---|---|
| Importar JSON | Que sea una lista; que cada elemento tenga `id` y `columnas` como arreglo | Que tenga 5 columnas de 5 números, que estén en rango, que no haya repetidos, que el `id` sea único o numérico |
| Cartón en `?c=` | Que sea base64 y JSON válido | La estructura de `cols`, los rangos ni la autenticidad (cualquiera puede fabricar un cartón) |
| Balotas guardadas | Nada; se asume un arreglo de números | Duplicados, rango 1–75 |
| Total de rondas | Entero ≥ 1 y ≥ ronda actual | — |
| Patrón personalizado | Nada (ver A8) | Que tenga al menos una casilla elegida |
| Número de tabla a verificar | Que no esté vacío y exista | — |

Consecuencia comprobada: una tabla malformada hace fallar cada "sacar balota" (R-03).

## A8. Defectos de reglas hallados al revisar (no son decisiones: son errores)

| ID | Defecto | Evidencia |
|---|---|---|
| A8-1 | **Patrón personalizado vacío:** si se guarda un dibujo sin casillas elegidas, la única casilla requerida es la libre (ya marcada), así que **todos los cartones ganan con la primera balota**. Nada impide guardarlo | *Hoy*: 2 tablas ganadoras con 1 balota |
| A8-2 | Cambio de modalidad: anuncio diferido y con una balota ajena (ver A6) | *Hoy* |
| A8-3 | Un número "oculto" en la posición central de cada cartón se guarda pero nunca se usa; no afecta el juego, pero sí la unicidad real de los cartones (dos cartones pueden verse iguales y estar guardados distintos) | *Código* |

## A9. Recuperación (recarga de página y pérdida de conexión)

| Qué | Tras recargar | Evidencia |
|---|---|---|
| Balotera: balotas, cartones, modalidad, ronda, total, historial, avisos | **Se conservan** en ese navegador y en ese dominio | *Previa* |
| Balotera en otro navegador o dispositivo | No existe nada | *Código* |
| Online: la sala generada (jugadores, QR en curso) | **Se pierde** | *Código* |
| Online: marcas del jugador | Se conservan en ese teléfono, por cartón | *Previa* |
| Diseño: configuración, logo, fondo y el lote generado | **Se pierde** | *Hoy* |
| Si se borran los datos del navegador, o se usa navegación privada | Se pierde todo; no hay aviso. Los errores de escritura se ignoran en silencio | *Código* |
| **Pérdida de conexión:** no hay concepto de conexión (no hay servidor ni sincronización). Dependencias de red: Tailwind (CDN) y QR (`api.qrserver.com`). Qué pasa al recargar sin internet **no se ha probado** | *Sin verificar* |

---

# PARTE B — PROPUESTAS (no implementadas; requieren tu aprobación)

Cada una indica opciones, mi recomendación y por qué. Las que cierran defectos se anotan como tales.

| ID | Tema | Opciones | Recomendación | Motivo | Aprobación |
|---|---|---|---|---|---|
| PR-1 | **Patrón personalizado vacío** (A8-1) | (a) Exigir al menos 1 casilla (b) Dejarlo | (a) | Es un error, no una regla; hoy produce ganadores falsos | Se corrige en F1.5 si lo aprueba |
| PR-2 | **Cambio de modalidad a mitad de ronda** | (a) Bloquearlo una vez salió la primera balota (b) Permitirlo con confirmación y reevaluar de inmediato (c) Mantener | (b), con aviso "puede haber ganadores inmediatos" | Evita anuncios diferidos con una balota ajena y mantiene flexibilidad | **Sí** |
| PR-3 | **Un cartón que ya ganó en la ronda** | (a) Una sola vez por ronda y por modalidad (b) Una sola vez por ronda (actual) (c) Cada vez que cumpla una modalidad nueva | (a) | Permite el "bingo por etapas" sin repetir avisos; requiere incluir la modalidad en la clave | **Sí** |
| PR-4 | **Varios ganadores simultáneos** | (a) Todos ganan (actual) (b) Desempate por regla del organizador (c) Reparto | (a) como regla del sistema; el reparto del premio es del organizador, fuera de la app | La app no gestiona premios | **Sí** |
| PR-5 | **Qué pasa tras un ganador** | (a) La ronda sigue (actual) (b) Pausa automática hasta confirmar que el premio se otorgó | (b) opcional con interruptor | Evita seguir sacando balotas por error | **Sí** |
| PR-6 | **Pausa** | Añadir "Pausar" que congele el botón de sacar balota | Sí, F3 | Hoy no existe y es habitual en eventos | **Sí** |
| PR-7 | **Reiniciar** | Separar (1) reiniciar ronda, (2) reiniciar partida, (3) partida nueva | Sí, F6; con confirmaciones diferenciadas | Hoy un solo botón mezcla efectos | **Sí** |
| PR-8 | **Cierre de partida** | Acción "Finalizar partida" que bloquea el juego, genera resumen exportable y archiva el historial | Sí, F6 | Hoy no existe | **Sí** |
| PR-9 | **Validación de cartones** | Validar estructura, rangos, unicidad y tamaño máximo al importar y al abrir `?c=` | Sí, F2 | Cierra R-03, R-11 | Es corrección; informo en F2 |
| PR-10 | **Ganador en partidas multidispositivo** | El servidor decide quién ganó, con los cartones y balotas guardados en servidor, no con datos del cliente | Sí, si se aprueba el backend (F5) | Evita fabricar cartones o balotas | **Sí**, ligado a D-09 |
| PR-11 | **Recuperación en salas compartidas** | Reconectar con el mismo código y reanudar el último estado confirmado | Sí, F5/F6 | Requisito del plan | Ligado a D-09 |
| PR-12 | **Aleatoriedad de las balotas** | (a) `Math.random` (b) `crypto.getRandomValues` | (b) en F2 si se acepta | Mejora de calidad sin costo; no cambia la experiencia | Informativa |
| PR-13 | **Más modalidades** (diagonales, X, doble línea) | Añadir o no | No ahora; primero cerrar F2/F3 | Alcance | **Sí** (producto) |

Mientras no apruebes una propuesta, el comportamiento sigue siendo el de la Parte A.
