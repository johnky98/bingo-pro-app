# FLUJOS_USUARIO.md — Bingo Pro (Fase 1)

Fecha: 2026-10-28 · Base: commit `561e755` · Documento de planificación; no describe código nuevo.

**Cómo leer los estados**

| Marca | Significado |
|---|---|
| ✅ Funciona | Existe en el código y se ejecutó con éxito |
| 🟡 Incompleto | Existe pero con defectos, pasos manuales o límites relevantes |
| 🔴 Falta | No existe; requiere desarrollo |

**Cómo leer la evidencia**

| Etiqueta | Significado |
|---|---|
| *Hoy* | Ejecutado en esta auditoría (28-oct-2026), Chrome de escritorio, servidor local |
| *Previa* | Ejecutado en sesiones anteriores del proyecto; no repetido hoy |
| *Código* | Deducido leyendo el código; no ejecutado |
| *Sin verificar* | Nadie lo ha probado |

Ningún flujo se ha probado en iOS, Android reales ni otros navegadores.

---

## 0. Dos modos de uso que hoy conviven

| Modo | Quién juega | Qué usan los jugadores | Qué usa el organizador |
|---|---|---|---|
| **Presencial** | Personas reunidas | Cartones **impresos** | Diseño → Balotera en **un solo dispositivo** (proyector o pantalla) |
| **Digital** | Personas en sus teléfonos | Cartón en el teléfono, abierto por QR | Diseño/Online → Balotera en un dispositivo; **los teléfonos no se enteran de las balotas** |

El producto actual cubre razonablemente el modo presencial (con pasos manuales). El modo digital solo entrega el cartón al teléfono; no hay juego sincronizado.

---

## 1. Organizador

### 1.1 Crear cartones (módulo Diseño)

| Paso | Qué hace el usuario | Estado | Evidencia |
|---|---|---|---|
| 1 | Entra a Diseño desde el hub | ✅ | *Hoy* |
| 2 | Elige plantilla de un clic, colores, título, logo, escala | ✅ (con título por defecto y plantilla de marca política, ver R-05) | *Hoy* (título), *Código* (plantillas) |
| 3 | Elige formato | 🔴 **5×5 es el único que funciona.** 3×3 y 4×4 dejan la vista previa vacía y los cartones impresos sin números | *Hoy* |
| 4 | Alternativa: sube una imagen de fondo propia y calibra la cuadrícula | ✅ | *Previa* |
| 5 | Va a "Imprimir" y elige cantidad (10, 50, 200, 500 o hasta 2000) | ✅ | *Hoy* (10) |
| 6 | Activa o no el QR por tarjeta | 🟡 QR depende de `api.qrserver.com` y el dominio queda grabado en el código impreso | *Código* |
| 7 | Pulsa **Exportar Tablas** para guardar la lista exacta | 🟡 Paso manual obligatorio; si se omite, el lote se pierde al cerrar o recargar | *Hoy* |
| 8 | Imprime o guarda PDF (hoja Carta, 4 por hoja) | ✅ | *Previa* (emulación de impresión); papel real *sin verificar* |

**Brechas:** formatos 3×3/4×4 (R-01), lote no persistido (R-09), QR externo y atado al dominio (R-07, R-08), texto "pide registro" (R-06).

### 1.2 Configurar una partida

**No existe el concepto de "partida".** Hay estado global por navegador y por origen (ver `MAPA_MODULOS.md` §7).

| Paso | Estado | Evidencia |
|---|---|---|
| Elegir modalidad de victoria | ✅ en la Balotera | *Previa* |
| Definir total de rondas (por defecto 10) | ✅ | *Previa* |
| Cargar los cartones de la partida | 🟡 Importar JSON a mano en la Balotera | *Previa* |
| Dar nombre a la partida, fecha, premio, número de jugadores | 🔴 No existe | *Código* |
| Mantener varias partidas separadas | 🔴 No existe; todo se mezcla en las mismas claves | *Código* |

### 1.3 Iniciar el juego

| Aspecto | Estado |
|---|---|
| No hay botón de "Iniciar". La Ronda 1 ya está en curso al abrir la Balotera (decisión del usuario anterior) | ✅ por diseño |
| No hay forma de anunciar el inicio a los jugadores | 🔴 |

### 1.4 Sacar balotas

| Paso | Estado | Evidencia |
|---|---|---|
| Pulsar "¡SACAR BALOTA!": sale un número 1–75 sin repetir dentro de la ronda | ✅ | *Hoy* |
| Ver letra y número, tablero 1–75, últimas 5 balotas | ✅ | *Previa* |
| Con las 75 balotas fuera, el botón dice "¡JUEGO TERMINADO!" y se deshabilita | ✅ | *Hoy* |
| Pausar o deshacer una balota | 🔴 No existe | *Código* |
| Anuncio por voz o sonido | 🔴 No existe | *Código* |

### 1.5 Detectar ganadores

| Paso | Estado | Evidencia |
|---|---|---|
| **Requisito previo:** haber importado los cartones de la partida (sin ellos no hay detección ni verificación) | 🟡 Paso manual | *Código* |
| Tras cada balota, revisa todas las tablas contra la modalidad activa y avisa con ventana "¡BINGO!" | ✅ | *Hoy* (simulación de 2 tablas y de 1 000 tablas) |
| Varios ganadores con la misma balota: una tarjeta por ganador en el mismo aviso | ✅ | *Hoy* |
| Verificación manual por número de tabla ("¿es válido el bingo de la #42?") | ✅ con datos válidos; 🟡 insegura con JSON hostil (R-04) | *Hoy* |
| Detectar cartones de jugadores que no están en la lista importada | 🔴 | *Código* |
| Que el jugador "cante bingo" desde su teléfono | 🔴 | *Código* |

### 1.6 Gestionar rondas

| Paso | Estado | Evidencia |
|---|---|---|
| Ver "Ronda X de N" | ✅ | *Previa* |
| Cambiar el total de rondas en vivo (no por debajo de la actual) | ✅ | *Previa* |
| "Siguiente Ronda": pide confirmación, vacía el bombo, conserva cartones e historial | ✅ | *Previa* |
| Cambiar de modalidad entre rondas | ✅ | *Previa* |
| Cambiar de modalidad **dentro** de una ronda | 🟡 Permitido; sin avisos ni reglas (ver `REGLAS_DEL_JUEGO.md` §5.3) | *Hoy* |
| Volver a una ronda anterior | 🔴 | *Código* |
| Última ronda: botón "Evento finalizado" deshabilitado | ✅ | *Previa* |

### 1.7 Cerrar la partida

| Paso | Estado |
|---|---|
| Cerrar formalmente la partida, ver resumen final, exportar resultados | 🔴 No existe. En la última ronda solo se deshabilita el botón de siguiente ronda; la balotera sigue operando |
| "Reiniciar juego": vacía balotas, historial y avisos; **conserva** la ronda | ✅ *Previa* |
| Crear partida nueva | 🔴 No existe como acción; hoy equivale a limpiar el almacenamiento del navegador |

### 1.8 Flujo digital del organizador (sala con QR)

| Paso | Estado | Evidencia |
|---|---|---|
| Online → elegir 1–20 jugadores o un rango de cartones importados → "Generar Sala" | ✅ | *Hoy* (6 jugadores) |
| Mostrar el QR de cada jugador, uno por uno; el jugador escanea desde el mismo dispositivo del organizador | 🟡 Lento y manual; el organizador es un "repartidor de QR" | *Previa* |
| "Finalizar e ir a la Balotera" | 🔴 **Defecto H07**: reemplaza todas las tablas guardadas | *Hoy* (200 → 6) |
| Recuperar la sala si se recarga | 🔴 La sala solo vive en memoria | *Código* |

---

## 2. Jugador

### 2.1 Entrar desde un QR o enlace

| Paso | Estado | Evidencia |
|---|---|---|
| Escanea el QR (de la pantalla del organizador o de la tarjeta impresa) y se abre `modulo_juego_online/?c=…` | ✅ con datos válidos. Escaneo con cámara real *sin verificar* | *Previa* (página), *Sin verificar* (escaneo) |
| No hay registro ni solicitud de datos | ✅ | *Código* |
| Si el enlace está incompleto o manipulado | 🔴 Pantalla casi vacía sin mensaje | *Hoy* (R-11) |

### 2.2 Identificar su cartón

| Aspecto | Estado |
|---|---|
| Ve su tablero 5×5 con la casilla central FREE | ✅ *Previa* |
| Etiqueta: dice "Jugador N". En la tarjeta impresa figura "ID TABLA: #000N". Los dos números coinciden por construcción, pero la pantalla no muestra el formato #000N | 🟡 *Código* |
| No hay nombre del evento, ronda ni modalidad en pantalla | 🔴 |

### 2.3 Consultar las balotas extraídas

🔴 **No existe.** El teléfono no recibe nada del organizador. No hay conexión entre dispositivos. El jugador marca "de oído" lo que canta el organizador. Esta es la brecha principal del modo digital.

### 2.4 Marcar su cartón

| Paso | Estado | Evidencia |
|---|---|---|
| Tocar una casilla la marca/desmarca; se recuerda en ese teléfono (`bingo_online_marcas_<c>`) | ✅ | *Previa* |
| Marcado automático al salir un número | 🔴 | *Código* |

### 2.5 Recibir avisos de posible victoria

🔴 **No existe.** No hay "te falta 1 número", "¡BINGO!" ni notificación al jugador. Solo el organizador ve el aviso (ventana en la Balotera) y solo para los cartones importados.

---

## 3. Administración (consulta de resultados e historial)

No hay rol de administración. El "administrador" es el organizador con su navegador.

| Qué se pide | Estado | Evidencia |
|---|---|---|
| Ver ganadores de la partida actual (ronda y número de tabla, más recientes primero) | ✅ | *Previa* |
| Que persista tras recargar | ✅ en ese navegador | *Previa* |
| Borrar el historial visible (no reactiva avisos) | ✅ | *Previa* |
| Ver partidas anteriores | 🔴 Solo existe el historial de la partida en curso; "Reiniciar juego" lo borra | *Código* |
| Ver resumen final, balotas por ronda, tiempos | 🔴 Las balotas de rondas anteriores se descartan al pasar de ronda | *Código* |
| Exportar resultados (JSON/CSV/PDF) | 🔴 | *Código* |
| Ver historial en otro dispositivo | 🔴 | *Código* |
| Ver quién ganó (nombre) | No aplica ni se propone: el producto no recoge datos personales | decisión vigente |

---

## 4. Pasos manuales que hoy impone el flujo

| # | Paso manual | Causa | Etapa que lo elimina (propuesta) |
|---|---|---|---|
| M1 | Exportar JSON desde Diseño | El lote no se persiste | F3 |
| M2 | Importar JSON en la Balotera | Módulos sin modelo común | F3 |
| M3 | Importar JSON en Online (para que el QR de la tarjeta #N coincida) | Idem | F3 |
| M4 | Mostrar y escanear los QR de uno en uno | No hay sala compartida | F5 |
| M5 | Cantar los números de viva voz para que los jugadores marquen | No hay sincronización | F5 |
| M6 | Escribir el número de tabla para verificar | Solo aplica a cartones impresos sin lista importada | Se mantiene como respaldo |

---

## 5. Flujo objetivo (PROPUESTA; no implementado; requiere aprobación)

### 5.1 Presencial, un solo dispositivo
1. Organizador crea la partida en Diseño: cartones + modalidades + nº de rondas.
2. Imprime. La lista exacta de cartones queda guardada en la **partida** (sin exportar JSON).
3. Abre la Balotera: la partida ya está cargada.
4. Saca balotas; la detección avisa los ganadores; pasa de ronda; cierra la partida con resumen.

### 5.2 Digital, varios teléfonos
1. El organizador crea una sala y recibe un **código de sala** y un enlace/QR único para jugadores.
2. Cada jugador entra, recibe un cartón y ve las balotas en vivo.
3. El organizador saca balotas; los teléfonos las reciben, marcan o resaltan; el jugador ve cuánto le falta.
4. El servidor valida al ganador. El aviso llega al organizador y al jugador.
5. Al cerrar, resumen exportable; los datos de la sala expiran según una política.

Los puntos 2–5 requieren backend (ver `DECISIONES_PRODUCTO.md` §Arquitectura).
