# MATRIZ_FUNCIONES_Y_PRUEBAS.md — Bingo Pro (Fase 0)

Fecha: 2026-10-28 · Commit `561e755`.

**Leyenda de la columna "Prueba en esta auditoría":**
- **Ejecutada**: la probé ahora en Chrome de escritorio (servidor local, repositorio sin modificar).
- **Lectura**: solo revisé el código; no la ejecuté.
- **Previa**: la verificación se hizo en sesiones anteriores (rediseño y rondas); no la repetí hoy.
- **No probada**: nadie la ha probado.

**Pruebas automatizadas en el repositorio: 0.** Todo lo "Previa" fue con guiones temporales que no se conservaron.

## Diseño

| # | Función | Estado | Prueba en esta auditoría | Nota |
|---|---|---|---|---|
| D1 | Vista previa 5×5 con colores, título, logo | Funciona | Ejecutada (25 celdas) | |
| D2 | Plantillas de 1 clic (Política/Corporativa/Festiva) | Funciona | Lectura | La "Política" usa texto del bingo político (R-05) |
| D3 | Formato 4×4 y 3×3 | **Roto** | Ejecutada | Vista previa vacía; cartones impresos sin números (R-01) |
| D4 | Subir plantilla de fondo y calibrar la cuadrícula | Funciona | Previa | |
| D5 | Lote de N cartones con ID correlativo (10–2000) | Funciona | Ejecutada (10) | |
| D6 | "Nuevo Lote" (regenera números) | Funciona | Lectura | |
| D7 | Impresión Carta, 4 por hoja | Funciona | Previa (emulación de impresión) | Dispositivos/impresoras reales: no probado |
| D8 | QR por tarjeta | Parcial | Ejecutada (10 `<img>` creadas) | Depende de servicio externo; no se comprobó que resuelvan ni el escaneo (R-08) |
| D9 | Exportar tablas JSON | Funciona | Ejecutada (25 números por tabla) | |
| D10 | Persistir diseño o lote al recargar | **No existe** | Ejecutada (`localStorage` vacío) | H10 / R-09 |

## Juego online

| # | Función | Estado | Prueba en esta auditoría | Nota |
|---|---|---|---|---|
| O1 | Generar sala aleatoria (1–20 jugadores) | Funciona | Ejecutada (6) | Cartones únicos |
| O2 | Generar sala con rango de tablas importadas | Funciona | Lectura | |
| O3 | Importar JSON de Diseño | Parcial | Lectura | Valida poco; **reemplaza** el diccionario |
| O4 | QR de uno en uno, anterior/siguiente | Funciona | Previa | |
| O5 | "Finalizar e ir a la Balotera" | **Defecto H07** | Ejecutada | 200 tablas → 6 (R-02) |
| O6 | Exportar tablas de la sala | Funciona | Previa | |
| O7 | Vista del jugador por `?c=` | Funciona con datos válidos | Previa | Falla con `?c=` incompleto (R-11) |
| O8 | Marcar casillas y recordarlas | Funciona | Previa | Solo en ese teléfono |
| O9 | Recibir balotas cantadas | **No existe** | — | Requiere backend (F5) |
| O10 | Recuperar la sala tras recargar | **No existe** | Lectura | Estado solo en memoria |

## Balotera

| # | Función | Estado | Prueba en esta auditoría | Nota |
|---|---|---|---|---|
| B1 | Sacar balota (75, sin repetir) | Funciona | Ejecutada (uso en pruebas) | |
| B2 | Tablero 1–75, historial reciente, persistencia de balotas | Funciona | Previa | |
| B3 | Modalidades predefinidas y dibujo personalizado | Predefinidas funcionan; **personalizado vacío da ganadores falsos** | Previa; Ejecutada (patrón vacío, R-24) | Cambio de modalidad a mitad de ronda: aviso diferido (R-25) |
| B4 | Rondas (total editable, siguiente ronda, última ronda) | Funciona | Previa | |
| B5 | Detección automática de ganadores (varios a la vez) | Funciona con datos válidos | Ejecutada (rendimiento y 100 ganadores simulados) | No se repitieron hoy los escenarios de modalidad una a una |
| B6 | Aviso único por tabla y ronda; borrar historial no reactiva | Funciona | Previa | |
| B7 | Aviso "¡BINGO!" (modal) e historial | Funciona | Previa | Construido con `textContent` (seguro) |
| B8 | Verificador manual | Funciona; **inseguro con JSON hostil** | Ejecutada (XSS reproducido) | R-04 |
| B9 | Importar JSON de tablas | Parcial | Ejecutada | Acepta tablas malformadas (R-03) |
| B10 | Reiniciar juego | Funciona | Previa | Conserva la ronda |
| B11 | Rendimiento con 1 000 tablas | Aceptable | Ejecutada | 168 ms para 70 balotas; pintado y móviles no medidos |
| B12 | Tableros 3×3 / 4×4 | **No existe** | Lectura | Todo es 5×5 / 75 balotas |

## Transversal

| # | Función | Estado | Prueba en esta auditoría |
|---|---|---|---|
| T1 | Estilo vidrio líquido y paleta morado/naranja | Funciona | Previa (capturas y contraste); respaldo con `prefers-reduced-transparency` presente en CSS (Lectura) |
| T2 | Responsive a 375 px | Funciona | Previa |
| T3 | Teclado y lector de pantalla | No evaluado | No probada (0 `aria-*`) |
| T4 | iOS / Android reales | No evaluado | No probada |
| T5 | Contenido de producción = repositorio | **Equivalente** | Ejecutada: el CSS es idéntico byte a byte; los HTML difieren solo por lo que añade Netlify (comentario inicial y enlaces `/modulo_x/`) |
| T6 | Cabeceras de seguridad | Solo HSTS | Ejecutada |

## Escenarios de regresión que deberá cubrir la Fase 2 (propuesta)

1. Cada modalidad × tabla ganadora / casi ganadora / vacía.
2. Varios ganadores en la misma balota.
3. Aviso único por (ronda, tabla); borrar historial; reiniciar juego; nueva ronda; cambio de modalidad a mitad de ronda.
4. Tabla malformada, JSON hostil, `?c=` manipulado.
5. 75 balotas agotadas; total de rondas inválido o por debajo de la ronda en curso.
6. H07: 200 tablas + sala de 6 → siguen 200 (además de las 6 de la sala, aisladas).
7. Impresión: cartón 5×5 con y sin QR, 10/50/200 tablas.
