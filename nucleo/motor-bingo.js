// ============================================================
// MOTOR DE BINGO (F2): reglas del juego sin pantalla, sin almacenamiento y sin red.
// Lo usan la Balotera, el Juego Online y el Diseño (navegador, como window.BingoMotor)
// y las pruebas automáticas (Node, con require). Reglas aprobadas: docs/REGLAS_DEL_JUEGO.md.
// ============================================================
(function (raiz, fabrica) {
  const motor = fabrica(raiz.crypto);
  if (typeof module === 'object' && module.exports) module.exports = motor;
  else raiz.BingoMotor = motor;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (cripto) {
  'use strict';

  const LETRAS = 'BINGO';
  const RANGOS_COLUMNA = [[1, 15], [16, 30], [31, 45], [46, 60], [61, 75]];
  const TOTAL_BALOTAS = 75;
  const MAX_TABLAS_POR_ARCHIVO = 2000; // mismo tope que el módulo de Diseño

  // ------------------------------------------------------------
  // AZAR (PR-12): crypto.getRandomValues con rechazo para que todos los
  // resultados tengan la misma probabilidad. Las funciones que usan azar
  // aceptan otra fuente "azar(n) -> entero en [0, n)" para las pruebas.
  // ------------------------------------------------------------
  function enteroAleatorio(n) {
    if (!Number.isInteger(n) || n < 1 || n > 0x100000000) throw new RangeError('n debe ser un entero entre 1 y 2^32');
    const limite = Math.floor(0x100000000 / n) * n; // descarta el sobrante que favorecería a los primeros valores
    const caja = new Uint32Array(1);
    do { cripto.getRandomValues(caja); } while (caja[0] >= limite);
    return caja[0] % n;
  }

  // Fisher-Yates sobre una copia.
  function barajar(lista, azar = enteroAleatorio) {
    const copia = lista.slice();
    for (let i = copia.length - 1; i > 0; i--) {
      const j = azar(i + 1);
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
  }

  // ------------------------------------------------------------
  // CARTONES: 5 columnas B-I-N-G-O de 5 números distintos dentro de su rango.
  // La casilla del centro es libre; el número que se guarda ahí no se usa.
  // ------------------------------------------------------------
  function generarCarton(azar = enteroAleatorio) {
    return RANGOS_COLUMNA.map(([min, max]) => {
      const pool = [];
      for (let n = min; n <= max; n++) pool.push(n);
      return barajar(pool, azar).slice(0, 5);
    });
  }

  function firmaCarton(columnas) {
    return columnas.map((col, c) => col.filter((n, f) => !(c === 2 && f === 2)).join(',')).join('|');
  }

  // Sin cartones repetidos dentro del lote (se comparan sin la casilla libre).
  function generarCartonesUnicos(total, azar = enteroAleatorio) {
    const vistos = new Set();
    const cartones = [];
    let intentos = 0;
    while (cartones.length < total) {
      // Con azar real repetir un cartón es rarísimo; el tope evita colgar la página si la fuente de azar falla.
      if (++intentos > total * 100 + 1000) throw new Error('No se pudieron generar cartones distintos');
      const columnas = generarCarton(azar);
      const firma = firmaCarton(columnas);
      if (vistos.has(firma)) continue;
      vistos.add(firma);
      cartones.push(columnas);
    }
    return cartones;
  }

  // Devuelve el motivo por el que el cartón no es válido, o null si lo es.
  function motivoCartonInvalido(columnas) {
    if (!Array.isArray(columnas) || columnas.length !== 5) return 'no tiene 5 columnas';
    for (let c = 0; c < 5; c++) {
      const letra = LETRAS[c];
      const col = columnas[c];
      if (!Array.isArray(col) || col.length !== 5) return `la columna ${letra} no tiene 5 números`;
      const [min, max] = RANGOS_COLUMNA[c];
      const usados = col.filter((n, f) => !(c === 2 && f === 2));
      if (usados.some(n => !Number.isInteger(n) || n < min || n > max)) return `la columna ${letra} tiene números fuera de ${min}-${max}`;
      if (new Set(usados).size !== usados.length) return `la columna ${letra} repite números`;
    }
    return null;
  }

  // Convierte una lista [{id, columnas}] en { "id": columnas } y aparta lo que no es válido.
  function validarLoteTablas(lista) {
    const tablas = {};
    const rechazadas = [];
    lista.forEach((t, i) => {
      const id = t && (typeof t.id === 'number' || typeof t.id === 'string') ? String(t.id).trim() : '';
      if (!/^[1-9]\d*$/.test(id)) {
        rechazadas.push(`${id ? '#' + id.slice(0, 20) : 'Posición ' + (i + 1)}: el número de tabla debe ser un entero positivo`);
        return;
      }
      if (tablas[id]) { rechazadas.push(`#${id}: número de tabla repetido`); return; }
      const motivo = motivoCartonInvalido(t.columnas);
      if (motivo) { rechazadas.push(`#${id}: ${motivo}`); return; }
      tablas[id] = t.columnas;
    });
    return { tablas, rechazadas };
  }

  function detalleRechazos(rechazadas) {
    const muestra = rechazadas.slice(0, 5).join('\n');
    return `\n\n${muestra}${rechazadas.length > 5 ? `\n… y ${rechazadas.length - 5} más.` : ''}`;
  }

  // ------------------------------------------------------------
  // BALOTAS
  // ------------------------------------------------------------
  function letraDeBalota(n) {
    const c = RANGOS_COLUMNA.findIndex(([min, max]) => n >= min && n <= max);
    return c === -1 ? null : LETRAS[c];
  }

  // Elige una balota que aún no ha salido, o null si ya salieron las 75. No modifica la lista.
  function sacarBalota(bolasCantadas, azar = enteroAleatorio) {
    const cantadas = new Set(bolasCantadas);
    const disponibles = [];
    for (let n = 1; n <= TOTAL_BALOTAS; n++) if (!cantadas.has(n)) disponibles.push(n);
    return disponibles.length === 0 ? null : disponibles[azar(disponibles.length)];
  }

  // ------------------------------------------------------------
  // MODALIDADES
  // ------------------------------------------------------------
  const NOMBRES_PATRON = {
    lleno: 'Cartón Lleno',
    horizontal: 'Línea Horizontal',
    vertical: 'Línea Vertical',
    l: 'Figura en L',
    cuadrado: 'Figura en O / Cuadrado',
    esquinas: 'Cuatro Esquinas',
    personalizado: 'Personalizado (manual)',
  };

  function generarPatron(clave) {
    const grid = Array.from({ length: 5 }, () => Array(5).fill(false));
    for (let f = 0; f < 5; f++) {
      for (let c = 0; c < 5; c++) {
        switch (clave) {
          case 'lleno': grid[f][c] = true; break;
          case 'horizontal': grid[f][c] = (f === 2); break;
          case 'vertical': grid[f][c] = (c === 2); break;
          case 'l': grid[f][c] = (c === 0) || (f === 4); break;
          case 'cuadrado': grid[f][c] = (f === 0 || f === 4 || c === 0 || c === 4); break;
          case 'esquinas': grid[f][c] = (f === 0 || f === 4) && (c === 0 || c === 4); break;
          default: grid[f][c] = false;
        }
      }
    }
    grid[2][2] = true;
    return grid;
  }

  // Un patrón sin casillas, aparte de la libre del centro, haría ganar a todas las tablas con la primera balota.
  function patronTieneCasillas(grid) {
    return Array.isArray(grid) && grid.length === 5 && grid.every(fila => Array.isArray(fila) && fila.length === 5) &&
      grid.some((fila, f) => fila.some((encendida, c) => encendida === true && !(f === 2 && c === 2)));
  }

  // Identifica la modalidad para los avisos (PR-3). Cada figura personalizada distinta
  // cuenta como una modalidad propia: "personalizado-" + las 25 casillas en 0/1.
  function idModalidad(patron) {
    if (patron.clave !== 'personalizado') return patron.clave;
    return 'personalizado-' + patron.grid.map(fila => fila.map(v => (v ? 1 : 0)).join('')).join('');
  }

  // Dada una tabla, la modalidad activa y las balotas cantadas, calcula la matriz 5x5,
  // el patrón a pintar y si la tabla ya es ganadora. Se evalúa ÚNICAMENTE contra la
  // modalidad activa. En "Línea Horizontal" / "Línea Vertical" vale CUALQUIER fila o
  // columna completa; en el resto se exige la figura exacta de patronActivo.grid.
  function tablaCumplePatron(columnas, patronActivo, bolasCantadas) {
    const cantadas = new Set(bolasCantadas);
    const matriz = [];
    for (let f = 0; f < 5; f++) {
      const fila = [];
      for (let c = 0; c < 5; c++) {
        const esLibre = (f === 2 && c === 2);
        const numero = esLibre ? null : columnas[c][f];
        const marcada = esLibre || cantadas.has(numero);
        fila.push({ numero, marcada, esLibre });
      }
      matriz.push(fila);
    }

    let patron; // grid 5x5 booleano que se usará para pintar y evaluar
    let esGanadora = false;

    if (patronActivo.clave === 'horizontal') {
      let filaGanadora = -1;
      for (let f = 0; f < 5; f++) {
        if (matriz[f].every(cel => cel.marcada)) { filaGanadora = f; break; }
      }
      if (filaGanadora === -1) {
        // ninguna fila completa aún: se muestra como referencia la más avanzada
        let mejorProgreso = -1;
        for (let f = 0; f < 5; f++) {
          const avance = matriz[f].filter(cel => cel.marcada).length;
          if (avance > mejorProgreso) { mejorProgreso = avance; filaGanadora = f; }
        }
      } else {
        esGanadora = true;
      }
      patron = Array.from({ length: 5 }, (_, f) => Array(5).fill(f === filaGanadora));
    } else if (patronActivo.clave === 'vertical') {
      let colGanadora = -1;
      for (let c = 0; c < 5; c++) {
        if (matriz.every(fila => fila[c].marcada)) { colGanadora = c; break; }
      }
      if (colGanadora === -1) {
        let mejorProgreso = -1;
        for (let c = 0; c < 5; c++) {
          const avance = matriz.filter(fila => fila[c].marcada).length;
          if (avance > mejorProgreso) { mejorProgreso = avance; colGanadora = c; }
        }
      } else {
        esGanadora = true;
      }
      patron = Array.from({ length: 5 }, () => Array.from({ length: 5 }, (_, c) => c === colGanadora));
    } else {
      // Cartón Lleno, Figura en L, Cuadrado, Cuatro Esquinas, Personalizado: figura fija
      patron = patronActivo.grid;
    }

    let requeridas = 0;
    let cumplidas = 0;
    const numerosFaltantes = [];
    for (let f = 0; f < 5; f++) {
      for (let c = 0; c < 5; c++) {
        if (!patron[f][c]) continue;
        requeridas++;
        if (matriz[f][c].marcada) cumplidas++;
        else numerosFaltantes.push(matriz[f][c].numero);
      }
    }

    if (patronActivo.clave !== 'horizontal' && patronActivo.clave !== 'vertical') {
      esGanadora = requeridas > 0 && cumplidas === requeridas;
    }

    return { matriz, patron, esGanadora, requeridas, cumplidas, numerosFaltantes };
  }

  // ------------------------------------------------------------
  // DETECCIÓN DE GANADORES (PR-3): una tabla avisa una sola vez por ronda y por
  // modalidad. "avisados" es el registro de avisos ya dados (independiente del
  // historial visible, para que borrarlo no repita avisos). No modifica nada:
  // devuelve los ganadores nuevos y las claves que hay que añadir a "avisados".
  // ------------------------------------------------------------
  function claveAviso(ronda, modalidad, idTabla) {
    return `${ronda}:${modalidad}:${idTabla}`;
  }

  function detectarGanadores({ tablas, bolasCantadas, patron, ronda, avisados }) {
    const nuevos = [];
    const claves = [];
    if (bolasCantadas.length === 0) return { nuevos, claves };
    const modalidad = idModalidad(patron);
    for (const idTabla of Object.keys(tablas)) {
      const clave = claveAviso(ronda, modalidad, idTabla);
      if (avisados.has(clave)) continue;
      if (!tablaCumplePatron(tablas[idTabla], patron, bolasCantadas).esGanadora) continue;
      claves.push(clave);
      nuevos.push({ ronda, idTabla, modalidad: patron.nombre });
    }
    return { nuevos, claves };
  }

  // Los avisos guardados antes de F2 eran "ronda:idTabla" (una vez por ronda). Se les
  // asigna la modalidad activa para que una ronda a medias no repita avisos ya dados.
  function migrarAvisados(lista, patron) {
    const modalidad = idModalidad(patron);
    return (Array.isArray(lista) ? lista : [])
      .filter(clave => typeof clave === 'string')
      .map(clave => {
        const antigua = /^(\d+):(\d+)$/.exec(clave);
        return antigua ? claveAviso(antigua[1], modalidad, antigua[2]) : clave;
      });
  }

  // ------------------------------------------------------------
  // ESTADO DE LA PARTIDA (PR-6 pausa, PR-8 cierre). La interfaz de pausa llega en F3
  // y la de cierre en F6; aquí quedan definidos los estados y los pasos permitidos.
  //   preparada --sacar_balota--> en_juego --pausar--> pausada --reanudar--> en_juego
  //   nueva_ronda / reiniciar: vuelven a "preparada"; finalizar: "finalizada" (no se sale).
  // ------------------------------------------------------------
  const ESTADOS = ['preparada', 'en_juego', 'pausada', 'finalizada'];
  const TRANSICIONES = {
    preparada: { sacar_balota: 'en_juego', nueva_ronda: 'preparada', reiniciar: 'preparada', finalizar: 'finalizada' },
    en_juego: { sacar_balota: 'en_juego', pausar: 'pausada', nueva_ronda: 'preparada', reiniciar: 'preparada', finalizar: 'finalizada' },
    pausada: { reanudar: 'en_juego', nueva_ronda: 'preparada', reiniciar: 'preparada', finalizar: 'finalizada' },
    finalizada: {},
  };

  // Devuelve el estado al que lleva la acción, o null si no está permitida.
  function siguienteEstado(estado, accion) {
    const destinos = TRANSICIONES[estado];
    return destinos && Object.prototype.hasOwnProperty.call(destinos, accion) ? destinos[accion] : null;
  }

  return {
    LETRAS, RANGOS_COLUMNA, TOTAL_BALOTAS, MAX_TABLAS_POR_ARCHIVO, NOMBRES_PATRON, ESTADOS,
    enteroAleatorio, barajar,
    generarCarton, firmaCarton, generarCartonesUnicos, motivoCartonInvalido, validarLoteTablas, detalleRechazos,
    letraDeBalota, sacarBalota,
    generarPatron, patronTieneCasillas, idModalidad, tablaCumplePatron,
    claveAviso, detectarGanadores, migrarAvisados,
    siguienteEstado,
  };
});
