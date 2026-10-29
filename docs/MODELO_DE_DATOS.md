# MODELO_DE_DATOS.md — Bingo Pro (F3)

Fecha: 2026-10-29. Decisión aplicada: **D-06 B**, es decir, varias partidas en el navegador, se conservan las últimas 20, se exportan en JSON + CSV y al abrir se muestra la última usada.

Código: `nucleo/partidas.js` (almacén), `nucleo/motor-bingo.js` (reglas) y `nucleo/qr-local.js` (QR). Pruebas: `pruebas/partidas.test.js`. Se ejecutan con `node --test "pruebas/*.test.js"`.

## 1. Qué es una partida

Una partida es un evento: sus tablas, sus rondas, las balotas, la modalidad, los avisos y el historial de ganadores. Cada partida se guarda aparte, así que **las tablas de un evento no se pierden ni se mezclan con las de otro** (se cierran H07 y R-15).

```json
{
  "id": "pmvt5zs9mz9ks",
  "nombre": "BINGO PRO · 2026-10-29 10:30",
  "origen": "diseno",
  "creada": 1793255449306,
  "actualizada": 1793255512000,
  "estado": "en_juego",
  "tablas": { "1": [[5 números B], [I], [N], [G], [O]], "2": [...] },
  "ronda": 2,
  "totalRondas": 10,
  "bolasCantadas": [7, 22, 41],
  "patron": { "clave": "esquinas", "nombre": "Cuatro Esquinas", "grid": [[true, ...], ...] },
  "avisados": ["1:esquinas:7", "2:lleno:12"],
  "historial": [{ "ronda": 1, "idTabla": "7", "modalidad": "Cuatro Esquinas" }]
}
```

| Campo | Significado |
|---|---|
| `origen` | De dónde salió: `diseno`, `online` (sala con tablas aleatorias), `importada`, `migrada` (datos de la versión anterior) o `balotera` (creada vacía en la Balotera) |
| `estado` | Estados del motor: `preparada` → `en_juego` ⇄ `pausada` → `finalizada`. La pausa (PR-6) ya se usa; `finalizada` llega con el cierre en F6 (PR-8) |
| `tablas` | Mismo formato que el JSON de "📥 Exportar Tablas", pero como diccionario. El número del centro se guarda y no se usa |
| `avisados` | Avisos ya dados: `ronda:modalidad:tabla` (PR-3). Es independiente del historial, para que borrar el historial no repita avisos |
| `actualizada` | Último uso. Decide qué partida se borra al llegar a 20 |

Todo lo que se lee, venga del navegador o de un archivo, se **normaliza**:
- Se descartan tablas inválidas y balotas repetidas o fuera de rango.
- Un patrón vacío pasa a Cartón Lleno.
- El total de rondas nunca queda por debajo de la ronda en curso.
- Una partida "en juego" sin balotas vuelve a "preparada".

Así una partida dañada o editada a mano no rompe la Balotera.

## 2. Cómo se guarda (localStorage)

| Clave | Contenido |
|---|---|
| `bingo_partidas_v1` | Índice: `{ version, activa, partidas: [{ id, nombre, origen, creada, actualizada, estado, numTablas }] }` |
| `bingo_partida_v1_<id>` | Una partida completa (sección 1) |
| `bingo_online_marcas_<código>` | Marcas del jugador en su celular (sin cambios) |

Cada partida va en su propia clave. Así, guardar una balota no reescribe las otras 19. El índice se relee en cada operación, porque la Sala Online y la Balotera pueden estar abiertas a la vez.

**Espacio.** Medido: una partida de 2 000 tablas ocupa 177 KB, así que 20 partidas de ese tamaño suman unos 3,5 MB. Los navegadores suelen permitir unos 5 MB por sitio (comportamiento general, no medido en tu equipo). Si el navegador no deja guardar, la Balotera avisa una vez y el juego sigue en memoria. Antes, ese error se ignoraba en silencio (R-20).

**Versión anterior.** La primera vez que se abre esta versión, las claves `bingo_balotera_*_v1` se convierten en una partida llamada "Partida anterior". Las claves antiguas **no se borran**, para que una vuelta atrás del sitio siga funcionando. La conversión no se repite.

## 3. Flujo entre módulos (sin manejar JSON)

```
Diseño ──"🎯 Usar en una partida"──► partida nueva (sus tablas = el lote en pantalla)
                                       │
Sala Online ── usa las tablas de la partida elegida (las impresas) ──► "Finalizar" abre esa misma partida
            └─ o tablas aleatorias ──► "Finalizar" crea una partida nueva con ellas
                                       │
Balotera ── abre la última usada; selector para cambiar, crear, renombrar, exportar o borrar
```

- En Diseño, "🔄 Nuevo Lote" oculta el aviso de partida creada: la partida guardó el lote anterior.
- Imprimir un lote ya guardado como partida no dispara el aviso de salida.
- En la Balotera, importar un JSON con la partida abierta vacía carga las tablas en ella. Si la partida ya tiene juego, crea una partida nueva y no reemplaza nada.
- Importar y exportar JSON sigue disponible como respaldo y para pasar partidas entre equipos.

## 4. Límite de 20 partidas

Al crear la 21.ª se borra **la que lleva más tiempo sin usarse, nunca la abierta**. Antes de borrarla, la página pregunta y ofrece descargarla en JSON (para volver a importarla) y CSV (ganadores para Excel). Si el usuario cancela, no se crea ni se borra nada.

## 5. Exportación

| Formato | Contenido | Uso |
|---|---|---|
| JSON | `{ "formato": "bingo-pro-partida", "version": 1, "exportada": ISO, "partida": {...} }` | Respaldo completo; se vuelve a cargar con "Importar" en la Balotera, como partida nueva |
| CSV | Datos de la partida y la tabla Ronda;Modalidad;Tabla, con separador `;` y BOM UTF-8 | Abrir en Excel en español con tildes. Los campos que empiezan como fórmula (`=`, `+`, `-`, `@`) llevan `'` delante |

## 6. QR

Los QR se generan en el navegador con `qrcode-generator` 1.4.4 (MIT), copiada sin cambios en `assets/vendor/`. Su integridad npm está verificada; consta en el `LICENSE.txt` de esa carpeta. Ya no se envía la URL del cartón a `api.qrserver.com` y funciona sin internet.

| Dónde | Nivel | Tamaño |
|---|---|---|
| Sala Online (pantalla) | M | 57×57 módulos en ~240 px |
| Tarjetas impresas | L (el del servicio anterior) | 49×49 módulos en ~38 px |

**Riesgo abierto R-26:** el QR de las tarjetas impresas es muy pequeño para su densidad. Se resolvería con un QR más grande en la tarjeta o con una URL más corta (D-03), y hay que probarlo en papel con celulares reales antes de un evento.

El contenido del QR **no cambió**: es la misma URL `?c=`. Los cartones ya impresos siguen funcionando.
