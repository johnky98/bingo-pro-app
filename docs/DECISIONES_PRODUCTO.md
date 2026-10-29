# DECISIONES_PRODUCTO.md — Bingo Pro (Fase 1)

Fecha: 2026-10-28 · Base: commit `561e755`.
Documento de planificación. **Nada de lo que aquí se recomienda está implementado ni aprobado.** Las cifras de costos son estimaciones salvo que se indique "verificado" con su fuente.

## 1. Prioridad de las decisiones

| Prioridad | Decisiones | Por qué ese orden |
|---|---|---|
| **P0 — antes de programar F1.5/F2** | D-02 (3×3/4×4), D-01 (marca), D-12 (reglas pendientes), D-13 (etiqueta Git) | Corrigen defectos que ya dañan al usuario (cartones en blanco, marca política, ganadores falsos) y fijan qué se prueba en F2 |
| **P0 — antes de imprimir cartones para eventos reales** | D-03 (QR y dominio) | Los QR impresos no se pueden cambiar |
| **P1 — antes de F3/F5** | D-04 (varios teléfonos), D-09 (arquitectura en tiempo real), D-05 (registro), D-06 (historial), D-08 (datos y seguridad) | Definen el modelo de datos de F3 y el backend de F5 |
| **P2 — antes de F8/F9** | D-10 (móviles reales), D-07 (publicidad y plan sin anuncios), D-11 (restricciones legales) | Se necesitan antes de lanzar, no antes de programar; D-11 conviene empezarla pronto por su plazo |

## 2. Tabla de decisiones

| ID | Decisión pendiente | Alternativas | Ventajas | Riesgos | Recomendación | Aprobación requerida |
|---|---|---|---|---|---|---|
| **D-01** | **Marca genérica BINGO PRO; eliminar referencias políticas** (hoy el cartón sale con "¡ACTITUD POSITIVA!" y existe la plantilla "Política" con "¡UNIDOS POR EL CAMBIO!") | A. Título por defecto "BINGO PRO" y retirar la plantilla Política.<br>B. Mantener la plantilla Política con otro texto neutro.<br>C. Dejar el título vacío para que lo escriba el usuario | A: cumple la regla de marca genérica y es el cambio más pequeño.<br>B: conserva un estilo de colores.<br>C: sin marca por defecto | Cartones ya impresos con el texto político no se pueden corregir.<br>Si queda "Política" con otro nombre, puede seguir asociándose al otro proyecto | **A**, y revisar además los textos que mencionan "registro" (R-06) | **Sí** (cambio de texto en 3 sitios de Diseño) |
| **D-02** | **Opciones 3×3 y 4×4** (hoy producen cartones impresos **sin números**) | A. Ocultarlas ya y registrar como "futuro".<br>B. Implementarlas de extremo a extremo (cartón, balotas, modalidades, detección, QR, online).<br>C. Dejarlas | A: corrige un defecto crítico en minutos.<br>B: producto más flexible (partidas rápidas) | A: ninguno técnico.<br>B: toca los tres módulos y el motor; rango de números y modalidades distintos; alcance grande.<br>C: seguirá imprimiendo papel inútil | **A ahora**; decidir B después de F2, cuando exista el motor con pruebas | **Sí** |
| **D-03** | **QR y dominio definitivo** (el QR codifica el dominio actual `netlify.app` y todo el cartón en la URL) | A. Esperar al dominio antes de imprimir cartones reales.<br>B. Comprar dominio ya.<br>C. Imprimir ya con la URL actual y mantener ese sitio vivo con redirección a futuro.<br>D. Que el QR use un código corto de sala (requiere backend) | A: sin deuda.<br>B/C: permiten imprimir pronto.<br>D: QR pequeño y estable | A: retrasa eventos reales.<br>C: depende de no renombrar ni borrar el sitio de Netlify (si se renombra, el subdominio viejo deja de responder: *comportamiento general de Netlify, no verificado en este proyecto*).<br>B: pago anticipado de dominio sin nombre comercial definido.<br>D: el formato cambia al llegar F5 | **A para eventos reales; C para pruebas.** Mantener siempre soportado el formato actual `?c=` aunque cambie después. **No renombrar `gentle-starlight-b32724` mientras existan cartones impresos.** Decidir el nombre comercial antes de comprar | **Sí**, y cualquier compra de dominio es tuya |
| **D-04** | **Experiencia de juego desde varios teléfonos** | A. Solo presencial: un dispositivo + cartones impresos (como hoy).<br>B. Teléfonos del jugador como **cartón pasivo**: ven su cartón, marcan a mano (como hoy).<br>C. Jugador recibe balotas en vivo, ve su avance y recibe aviso de victoria.<br>D. C + el jugador "canta bingo" desde el teléfono | A y B: sin costo ni backend.<br>C: es la propuesta de valor del bingo digital.<br>D: flujo completo | A/B: no hay diferencial frente a un bingo de papel.<br>C/D: exigen backend, salas, reconexión, límites de conexiones y moderación | **A+B ya funcionan; C como meta de F5; D opcional después.** Definir cuántos jugadores simultáneos por sala (ver D-09) | **Sí** |
| **D-05** | **Registro de jugadores** | A. Ninguno; acceso anónimo (decisión vigente).<br>B. Apodo opcional, sin datos personales.<br>C. Registro con correo/teléfono | A: privacidad máxima y cero fricción.<br>B: ayuda al organizador a identificar jugadores.<br>C: contacto con ganadores | C contradice la regla "sin registro" y trae obligaciones de protección de datos.<br>B: moderar apodos ofensivos | **A como regla; B opcional en F5.** Entrega de premios y contacto quedan en manos del organizador, fuera de la app | **Sí** (mantener A es la decisión ya confirmada; B es nueva) |
| **D-06** | **Historial y persistencia de partidas** | A. Solo la partida en curso (hoy).<br>B. Varias partidas guardadas en el **navegador** con exportación JSON/CSV.<br>C. Servidor con caducidad (por ejemplo 7–30 días).<br>D. Servidor sin caducidad | B: sin costo ni datos personales.<br>C: acceso desde otro dispositivo.<br>D: histórico permanente | B: se pierde al borrar datos del navegador.<br>C/D: costo, política de borrado y privacidad.<br>D: crecimiento sin límite | **B en F3/F6; C solo con backend en F5/F6.** Evitar D | **Aprobada B** el 2026-10-29: se conservan las **últimas 20** partidas (al crear la 21.ª se borra la más antigua, avisando antes y ofreciendo exportarla; nunca la que está abierta); exportación **JSON + CSV**; al abrir la Balotera se muestra **la última usada**, con selector para cambiar o crear otra |
| **D-07** | **Publicidad y versión sin anuncios** | A. Sin publicidad por ahora.<br>B. Gratis con anuncios + pago único o suscripción sin anuncios.<br>C. Gratis con límites (cartones, jugadores) + premium | B/C: ingresos.<br>A: producto limpio | B: los anuncios no deben tapar ni interferir con el marcado, la balotera ni los avisos de ganador; los anuncios de redes publicitarias pueden restringir contenido de juegos/azar (*no verificado*).<br>C: hoy hay etiquetas "(Prueba Gratis)" y "(gratis)" en la interfaz que **no limitan nada**. Pasarelas de pago y redes de anuncios en Colombia: **no evaluadas** | **Posponer a F9.** Mientras tanto, retirar o aclarar las etiquetas "(gratis)" si aún no se controlan. Evaluar proveedores en F9 con una comparación escrita | **Sí** (modelo de negocio y proveedores) |
| **D-08** | **Protección de datos y seguridad** | A. Mantener "sin datos personales" y corregir las vulnerabilidades actuales.<br>B. Además, política de privacidad, términos y cabeceras de seguridad.<br>C. Permitir datos personales opcionales | A/B: bajo riesgo legal y técnico | Hoy: XSS por JSON importado, tablas malformadas, sin cabeceras de seguridad (R-03, R-04, R-14).<br>El QR actual envía la URL completa del cartón a un tercero (R-08) | **A + B.** Corregir R-03/R-04/R-11 en F2; QR local en F3; cabeceras en F4/F8; privacidad y términos antes de lanzar (F9). La Ley 1581 de 2012 (protección de datos) aplicaría si algún día se recogen datos personales | **Sí** (alcance), correcciones técnicas las informo en cada fase |
| **D-09** | **Arquitectura para sincronización en tiempo real** | Ver §3: A. Solo `localStorage`; B. Backend con estado compartido; **C. Gradual (recomendada)** | Ver §3 | Ver §3 | **C gradual**, con decisión de proveedor en F5 | **Sí**, y cualquier cuenta/servicio de pago requiere tu aprobación expresa |
| **D-10** | **Pruebas en móviles reales** | A. Tus dispositivos (iPhone + Android) y de conocidos.<br>B. Servicio de dispositivos en la nube (de pago).<br>C. Solo emulación de escritorio | A: gratis y realista.<br>B: más cobertura.<br>C: rápido | C no detecta fallos de cámara/QR, `backdrop-filter`, impresión ni rendimiento.<br>B: costo (**no cotizado**) | **A en F8 (y una prueba corta tras F3).** B solo si A deja huecos importantes | **Sí** (disponibilidad de dispositivos) |
| **D-11** | **Restricciones legales en Colombia (premios, apuestas)** | A. Posicionar la herramienta como software de apoyo para organizadores y prohibir en los términos su uso con apuestas o cobro por jugar.<br>B. Ofrecer premios o cobros dentro de la plataforma.<br>C. Consultar a un abogado antes de decidir | A: menor exposición.<br>B: ingresos | B: la actividad podría entrar en el régimen de juegos de suerte y azar (monopolio rentístico, Ley 643 de 2001; Coljuegos regula bingos como juego localizado y los sorteos promocionales requieren autorización, Decreto 2104 de 2016: *según fuentes consultadas hoy; no verificado el trámite exacto vigente*).<br>Posibles sanciones y bloqueo | **A + C antes de F9**, y no hacer publicidad de premios con la plataforma sin ese concepto. **No es asesoría legal** | **Sí** (consulta legal, costo no estimado) |
| **D-12** | **Reglas del juego pendientes** (patrón vacío, cambio de modalidad, repetición de ganador, pausa, cierre) | Ver `REGLAS_DEL_JUEGO.md`, Parte B (PR-1 a PR-13) | Reglas explícitas y probables | Si no se deciden, F2 probaría comportamientos accidentales | Aprobar PR-1, PR-2, PR-3, PR-6, PR-8 antes de F2; el resto puede esperar | **Aprobadas** (PR-1 en F1.5; PR-2 b, PR-3 a, PR-6 y PR-8 el 2026-10-29) |
| **D-13** | **Punto de recuperación Git** | A. Etiqueta `v0.1.0-estable` sobre `561e755` (requiere subirla a GitHub).<br>B. Sin etiqueta | A: reversión rápida | Una etiqueta subida es visible en el repositorio | **A**, justo antes de F1.5 | **Sí**: no la he creado |

## 3. Análisis de arquitectura (sin implementarla)

### 3.1 Opción A — Integración temporal con `localStorage` (mismo navegador)

**Qué es:** crear en el navegador un modelo de **partida** (con identificador) que Diseño, Online y Balotera comparten, sin servidor.

| | |
|---|---|
| **Cubre** | Eliminar el JSON manual (M1–M3); cerrar H07; guardar el lote impreso; varias partidas en el mismo navegador; exportar/importar como respaldo; detección de ganadores; modo presencial completo |
| **No cubre** | Teléfonos de jugadores que reciben balotas; avisos al jugador; recuperación desde otro dispositivo; salas |
| **Costo** | $0 de infraestructura (se mantiene Netlify) |
| **Datos personales** | Ninguno |
| **Riesgos** | Límite de ~5 MB por origen (1 000 tablas ocupan ≈88 KB, medido); datos perdidos si se borra el navegador; el organizador y los jugadores nunca verían el mismo estado |
| **Esfuerzo** | Bajo-medio (F2 + F3) |

### 3.2 Opción B — Aplicación con backend y estado compartido

**Qué es:** un servidor guarda la sala, las balotas y los cartones, y empuja los cambios a los teléfonos en tiempo real.

| | |
|---|---|
| **Cubre** | Balotas en vivo en el teléfono, avisos al jugador, validación de ganadores en servidor, recuperación tras recarga/desconexión, historial entre dispositivos |
| **Costo** | Depende del proveedor (ver §3.5) |
| **Datos personales** | Evitables: código de sala, cartones (solo números) y estado; sin nombres |
| **Riesgos** | Seguridad (permisos del anfitrión, aislamiento entre salas, límites de uso), operación y soporte, límites de conexiones simultáneas, dependencia de un proveedor, costos que crecen con el uso |
| **Esfuerzo** | Alto (F5–F6, 3–6 semanas del plan) |

### 3.3 Opción C — Arquitectura gradual (recomendada)

Construir A de modo que **B pueda reemplazar el almacenamiento sin reescribir la lógica ni la interfaz**:

| Capa | Qué contiene | Cuándo | Se reutiliza en B |
|---|---|---|---|
| 1. **Motor de dominio** | Módulo JavaScript sin DOM ni almacenamiento: cartones, balotas, modalidades, rondas, avisos, validación. Con pruebas automáticas | F2 | Se ejecuta tal cual en el servidor (misma lógica) |
| 2. **Almacén de partidas** (interfaz) | Operaciones `crearPartida`, `cargarPartida`, `guardarEstado`, `suscribir`. Implementación 1: `localStorage` con identificador de partida | F3 | Se añade la implementación 2 (remota) sin tocar la interfaz de usuario |
| 3. **Interfaz** | HTML + `assets/liquid-glass.css` (estilo actual). Habla solo con la capa 2 | F3 | Sin cambios visuales |
| 4. **Backend** (opcional, por decisión) | Salas, permisos, tiempo real | F5 | Implementa la capa 2 |

Principios:
1. **El modelo de datos se diseña ya como si hubiera servidor** (partida, cartones, balotas, rondas, ganadores, versión) para que migrar sea copiar el esquema.
2. **Formato del cartón y de la URL `?c=` se conservan** y siguen funcionando si cambia el sistema.
3. **No se migra a Vite/React hasta F4** y solo si se justifica (decisión del plan). La capa 1 se escribe en JavaScript estándar (módulos ES) compatible con ambos caminos.
4. **QR generado en el navegador** con una librería incluida en el repositorio (cierra H04), válido en A y en B.
5. **Sin servicios de pago ni cuentas nuevas hasta que lo apruebes.** El prototipo del backend (F5) se haría primero en un plan gratuito con datos de prueba y sin tráfico real.

**Por qué no empezar directamente por B:** dependería de decisiones aún abiertas (D-03, D-04, D-05, D-09, D-11), y los defectos actuales (cartones en blanco, H07, XSS) existirían igual en B.
**Por qué no quedarse en A:** no permite el modo digital con teléfonos sincronizados, que es el objetivo del plan.

### 3.4 Qué debe resolverse en la arquitectura B (para F5, a evaluar entonces)

Autoridad del anfitrión mediante credencial temporal (no solo el código de sala); el servidor decide balotas y ganadores; los cartones se asignan en servidor; aislamiento entre salas; límites de peticiones; caducidad de salas; sin secretos en el navegador; políticas de acceso a la base de datos revisadas antes de producción; recuperación tras desconexión. Estas son **ideas de diseño a validar**, no decisiones tomadas.

### 3.5 Costos potenciales

**Leyenda:** *Verificado* = cifra leída hoy en la página oficial del proveedor · *Estimación* = cálculo mío con supuestos explícitos · *No verificado* = referencia general sin confirmar hoy.

| Concepto | Cifra | Estado |
|---|---|---|
| **Hosting actual (Netlify)** | $0 en el plan gratuito. Netlify cambió a un sistema de créditos y las fuentes de terceros que consulté **discrepan** en los límites exactos (por ejemplo, créditos por GB). Plan de tu cuenta y consumo: **no revisados** | *No verificado* → revisar en tu panel de Netlify |
| **Supabase Free** | $0 · 200 conexiones simultáneas en tiempo real · 2 M mensajes/mes · 500 MB de base de datos · 50 000 usuarios activos/mes · 5 GB de transferencia · **el proyecto se pausa tras 1 semana sin actividad** | *Verificado* ([supabase.com/pricing](https://supabase.com/pricing)) |
| **Supabase Pro** | Desde **$25/mes** · 500 conexiones simultáneas (+$10 por cada 1 000) · 5 M mensajes/mes (+$2,50 por millón) · 8 GB de base de datos · 250 GB de transferencia · no se pausa | *Verificado* (misma fuente) |
| **Límites de tiempo real** | Free: 100 mensajes/s · Pro: 500 mensajes/s | *Verificado* ([documentación](https://supabase.com/docs/guides/realtime/limits)) |
| **Consumo de mensajes por evento** | Si cada balota se entrega como 1 mensaje a cada jugador: 100 jugadores × 75 balotas = 7 500 mensajes por ronda; 10 rondas ≈ 75 000 mensajes por evento. El plan gratuito (2 M) alcanzaría para ≈26 eventos de ese tamaño por mes | *Estimación* (supone que cada entrega cuenta como un mensaje y desprecia otros mensajes; **no he verificado cómo los cuenta Supabase**) |
| **Tope de jugadores simultáneos** | ≈200 en Free y ≈500 en Pro, contando también al anfitrión y otras conexiones | *Verificado* (límites) / *Estimación* (cómo se reparten) |
| **API propia + PostgreSQL + WebSockets** | Costo del servidor y la base (no cotizado) más tiempo de desarrollo y operación | *Sin cotizar* |
| **Dominio** | Orden de magnitud de unas decenas de USD al año según la extensión | *No verificado* |
| **Total mensual estimado de un piloto con backend** | ≈ $0 (Free, solo pruebas) y ≈ $25/mes (Pro, uso real) más el dominio y, si aplica, impuestos y conversión a COP | *Estimación* |
| **Anuncios, pasarela de pago, abogado, dispositivos en la nube** | Sin datos | *Sin cotizar* |

Ninguno de estos servicios se creará ni contratará sin tu aprobación.

## 4. Recomendación resumida

1. Aprobar D-02 (ocultar 3×3/4×4), D-01 (marca BINGO PRO) y D-13 (etiqueta) para una pequeña tanda de correcciones (F1.5).
2. Aprobar las reglas PR-1, PR-2, PR-3, PR-6 y PR-8 para que F2 pruebe reglas claras.
3. Mantener D-05 "sin registro" y D-08 "sin datos personales" como principios.
4. Adoptar la arquitectura gradual (opción C) y decidir el backend (D-09) al terminar F3, con una comparación escrita.
5. No imprimir cartones para eventos reales hasta decidir D-03.
6. Abrir la consulta legal (D-11) con tiempo.

## 5. Información que me falta

- Plan y consumo reales de tu cuenta de Netlify y el vínculo con GitHub (la conexión de esta sesión no ve tu cuenta personal).
- Tamaño típico de tus eventos (jugadores simultáneos, rondas) para dimensionar costos.
- Nombre comercial y presupuesto mensual aceptable.
- Si habrá premios, cobro de entrada o vínculo con apuestas (condiciona D-11).
- Dispositivos disponibles para pruebas (D-10).
