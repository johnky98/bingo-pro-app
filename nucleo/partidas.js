// ============================================================
// ALMACÉN DE PARTIDAS (F3, decisión D-06 B): varias partidas en el navegador, cada una
// con sus propias tablas, rondas, balotas, modalidad, avisos e historial. Se conservan
// las últimas 20 (se borra la que lleva más tiempo sin usarse, nunca la abierta), se
// exportan en JSON y CSV, y al abrir se muestra la última usada.
// Necesita nucleo/motor-bingo.js. El almacenamiento se recibe desde fuera (localStorage
// en el navegador, un objeto en memoria en las pruebas).
// ============================================================
(function (raiz, fabrica) {
  const motor = raiz.BingoMotor || (typeof require === 'function' ? require('./motor-bingo.js') : null);
  const modulo = fabrica(motor, raiz);
  if (typeof module === 'object' && module.exports) module.exports = modulo;
  else raiz.BingoPartidas = modulo;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (motor, raiz) {
  'use strict';

  const CLAVE_INDICE = 'bingo_partidas_v1';
  const PREFIJO_PARTIDA = 'bingo_partida_v1_';
  const MAX_PARTIDAS = 20;
  const TOTAL_RONDAS_POR_DEFECTO = 10;
  const FORMATO_EXPORTACION = 'bingo-pro-partida';

  // Claves de la Balotera anteriores a F3 (una sola partida). Se leen una vez para
  // convertirlas en la primera partida y no se borran: si se vuelve a una versión
  // anterior del sitio, sus datos siguen ahí.
  const CLAVES_ANTIGUAS = {
    tablas: 'bingo_balotera_tablas_v1',
    bolas: 'bingo_balotera_balotas_v1',
    patron: 'bingo_balotera_patron_v1',
    ronda: 'bingo_balotera_ronda_v1',
    totalRondas: 'bingo_balotera_total_rondas_v1',
    historial: 'bingo_balotera_historial_ganadores_v1',
    avisados: 'bingo_balotera_avisados_v1',
  };

  // ------------------------------------------------------------
  // NORMALIZACIÓN: todo lo que se lee (del navegador o de un archivo) pasa por aquí,
  // así una partida dañada o editada a mano nunca rompe la Balotera.
  // ------------------------------------------------------------
  const esEnteroPositivo = n => Number.isInteger(n) && n > 0;
  const texto = (v, max, porDefecto) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : porDefecto);

  function patronPorDefecto() {
    return { nombre: motor.NOMBRES_PATRON.lleno, clave: 'lleno', grid: motor.generarPatron('lleno') };
  }

  function normalizarPatron(p) {
    if (!p || typeof p !== 'object' || !Object.prototype.hasOwnProperty.call(motor.NOMBRES_PATRON, p.clave) || !motor.patronTieneCasillas(p.grid)) {
      return patronPorDefecto();
    }
    if (p.clave !== 'personalizado') return { nombre: motor.NOMBRES_PATRON[p.clave], clave: p.clave, grid: motor.generarPatron(p.clave) };
    const grid = p.grid.map(fila => fila.map(v => v === true));
    grid[2][2] = true;
    return { nombre: motor.NOMBRES_PATRON.personalizado, clave: 'personalizado', grid };
  }

  function normalizarBolas(lista) {
    const vistas = new Set();
    return (Array.isArray(lista) ? lista : []).filter(n => {
      if (!Number.isInteger(n) || n < 1 || n > motor.TOTAL_BALOTAS || vistas.has(n)) return false;
      vistas.add(n);
      return true;
    });
  }

  function normalizarTablas(tablas) {
    if (!tablas || typeof tablas !== 'object' || Array.isArray(tablas)) return { tablas: {}, descartadas: 0 };
    const { tablas: validas, rechazadas } = motor.validarLoteTablas(Object.entries(tablas).map(([id, columnas]) => ({ id, columnas })));
    return { tablas: validas, descartadas: rechazadas.length };
  }

  function normalizarHistorial(lista) {
    return (Array.isArray(lista) ? lista : [])
      .filter(g => g && esEnteroPositivo(g.ronda) && /^[1-9]\d*$/.test(String(g.idTabla)))
      .map(g => {
        const registro = { ronda: g.ronda, idTabla: String(g.idTabla) };
        if (typeof g.modalidad === 'string' && g.modalidad) registro.modalidad = g.modalidad.slice(0, 60);
        return registro;
      });
  }

  // Devuelve la partida lista para usar, o null si no tiene forma de partida.
  // "descartadas" (tablas inválidas que se ignoraron) es informativo y no se guarda.
  function normalizarPartida(p) {
    if (!p || typeof p !== 'object' || typeof p.id !== 'string' || !/^[a-z0-9]{1,40}$/i.test(p.id)) return null;
    const { tablas, descartadas } = normalizarTablas(p.tablas);
    const patron = normalizarPatron(p.patron);
    const bolasCantadas = normalizarBolas(p.bolasCantadas);
    const ronda = esEnteroPositivo(p.ronda) ? p.ronda : 1;
    const totalRondas = Math.max(esEnteroPositivo(p.totalRondas) ? p.totalRondas : TOTAL_RONDAS_POR_DEFECTO, ronda);
    let estado = motor.ESTADOS.includes(p.estado) ? p.estado : (bolasCantadas.length > 0 ? 'en_juego' : 'preparada');
    if (estado === 'en_juego' && bolasCantadas.length === 0) estado = 'preparada';
    return {
      id: p.id,
      nombre: texto(p.nombre, 80, 'Partida sin nombre'),
      origen: texto(p.origen, 20, 'balotera'),
      creada: Number.isFinite(p.creada) ? p.creada : 0,
      actualizada: Number.isFinite(p.actualizada) ? p.actualizada : 0,
      estado,
      tablas,
      ronda,
      totalRondas,
      bolasCantadas,
      patron,
      avisados: Array.from(new Set(motor.migrarAvisados(p.avisados, patron))),
      historial: normalizarHistorial(p.historial),
      descartadas,
    };
  }

  function sinCamposTemporales(p) {
    const { descartadas, ...resto } = p;
    return resto;
  }

  function resumen(p) {
    return { id: p.id, nombre: p.nombre, origen: p.origen, creada: p.creada, actualizada: p.actualizada, estado: p.estado, numTablas: Object.keys(p.tablas).length };
  }

  // ------------------------------------------------------------
  // EXPORTACIÓN
  // ------------------------------------------------------------
  const dos = n => String(n).padStart(2, '0');
  function fechaLegible(ms) {
    if (!ms) return 'sin fecha';
    const d = new Date(ms);
    return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())} ${dos(d.getHours())}:${dos(d.getMinutes())}`;
  }

  function exportarJSON(p) {
    return JSON.stringify({ formato: FORMATO_EXPORTACION, version: 1, exportada: new Date().toISOString(), partida: sinCamposTemporales(p) }, null, 2);
  }

  // Campo de CSV: entre comillas si hace falta, y con ' delante si empieza como fórmula
  // (Excel ejecutaría "=..." al abrir el archivo).
  function campoCSV(valor) {
    let s = String(valor);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  // Separador ";" y marca BOM: así Excel en español lo abre en columnas y con tildes.
  function exportarCSV(p) {
    const filas = [
      ['Partida', p.nombre],
      ['Creada', fechaLegible(p.creada)],
      ['Último uso', fechaLegible(p.actualizada)],
      ['Tablas', Object.keys(p.tablas).length],
      ['Rondas jugadas', p.ronda],
      [],
      ['Ronda', 'Modalidad', 'Tabla'],
      ...p.historial.map(g => [g.ronda, g.modalidad || '', `#${String(g.idTabla).padStart(4, '0')}`]),
    ];
    return '﻿' + filas.map(f => f.map(campoCSV).join(';')).join('\r\n') + '\r\n';
  }

  function nombreArchivo(p, extension) {
    const base = p.nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'partida';
    return `bingo_${base}_${fechaLegible(p.actualizada).slice(0, 10)}.${extension}`;
  }

  // ------------------------------------------------------------
  // ALMACÉN
  // ------------------------------------------------------------
  function almacenEnMemoria() {
    const datos = new Map();
    return {
      getItem: k => (datos.has(k) ? datos.get(k) : null),
      setItem: (k, v) => { datos.set(k, String(v)); },
      removeItem: k => { datos.delete(k); },
    };
  }

  function crearAlmacen(storage, ahora = () => Date.now()) {
    const leer = clave => {
      try { return JSON.parse(storage.getItem(clave)); } catch (e) { return null; }
    };
    // Devuelve false si el navegador no tiene espacio (o no deja guardar).
    const escribir = (clave, valor) => {
      try { storage.setItem(clave, JSON.stringify(valor)); return true; } catch (e) { return false; }
    };

    // Se relee en cada operación: la Sala Online y la Balotera pueden estar abiertas a la vez.
    function leerIndice() {
      const i = leer(CLAVE_INDICE);
      const partidas = i && Array.isArray(i.partidas) ? i.partidas.filter(r => r && typeof r.id === 'string') : [];
      return { version: 1, activa: i && typeof i.activa === 'string' ? i.activa : null, partidas };
    }

    const porUso = lista => lista.slice().sort((a, b) => b.actualizada - a.actualizada);

    function listar() {
      return porUso(leerIndice().partidas);
    }

    function obtener(id) {
      return normalizarPartida(leer(PREFIJO_PARTIDA + id));
    }

    function guardar(p) {
      p.actualizada = ahora();
      if (!escribir(PREFIJO_PARTIDA + p.id, sinCamposTemporales(p))) return false;
      const indice = leerIndice();
      indice.partidas = indice.partidas.filter(r => r.id !== p.id).concat(resumen(p));
      return escribir(CLAVE_INDICE, indice);
    }

    function activar(id) {
      const indice = leerIndice();
      const registro = indice.partidas.find(r => r.id === id);
      if (!registro) return false;
      indice.activa = id;
      registro.actualizada = ahora();
      return escribir(CLAVE_INDICE, indice);
    }

    function borrar(id) {
      try { storage.removeItem(PREFIJO_PARTIDA + id); } catch (e) { /* nada que borrar */ }
      const indice = leerIndice();
      indice.partidas = indice.partidas.filter(r => r.id !== id);
      if (indice.activa === id) indice.activa = porUso(indice.partidas)[0] ? porUso(indice.partidas)[0].id : null;
      return escribir(CLAVE_INDICE, indice);
    }

    // La última usada; si su registro se perdió, la más reciente que sí exista.
    function activa() {
      const indice = leerIndice();
      const candidatas = [indice.activa, ...porUso(indice.partidas).map(r => r.id)].filter(Boolean);
      for (const id of candidatas) {
        const p = obtener(id);
        if (p) return p;
      }
      return null;
    }

    // Qué partida se borraría al crear una nueva (null si aún hay sitio).
    function seBorraraAlCrear() {
      const indice = leerIndice();
      if (indice.partidas.length < MAX_PARTIDAS) return null;
      const candidatas = porUso(indice.partidas).filter(r => r.id !== indice.activa);
      return candidatas.length ? candidatas[candidatas.length - 1] : null;
    }

    function nuevoId() {
      let id;
      do {
        id = 'p' + ahora().toString(36) + Array.from({ length: 4 }, () => motor.enteroAleatorio(36).toString(36)).join('');
      } while (leer(PREFIJO_PARTIDA + id));
      return id;
    }

    // Crea una partida, la deja activa y la devuelve (null si no se pudo guardar).
    // Si ya hay 20, antes borra la que lleva más tiempo sin usarse (la interfaz avisa).
    function crear({ nombre, tablas = {}, origen = 'balotera', datos = {} } = {}) {
      while (leerIndice().partidas.length >= MAX_PARTIDAS) {
        const victima = seBorraraAlCrear();
        if (!victima) break;
        borrar(victima.id);
      }
      const momento = ahora();
      const p = normalizarPartida({ ...datos, id: nuevoId(), nombre, origen, tablas, creada: momento, actualizada: momento });
      if (!guardar(p)) return null;
      activar(p.id);
      return p;
    }

    // La primera vez que se abre esta versión, los datos de la Balotera anterior pasan a ser una partida.
    function migrarDesdeVersionAnterior() {
      if (storage.getItem(CLAVE_INDICE) !== null) return null;
      const antiguo = {
        tablas: leer(CLAVES_ANTIGUAS.tablas),
        bolasCantadas: leer(CLAVES_ANTIGUAS.bolas),
        patron: leer(CLAVES_ANTIGUAS.patron),
        ronda: leer(CLAVES_ANTIGUAS.ronda),
        totalRondas: leer(CLAVES_ANTIGUAS.totalRondas),
        historial: leer(CLAVES_ANTIGUAS.historial),
        avisados: leer(CLAVES_ANTIGUAS.avisados),
      };
      const hayDatos = (antiguo.tablas && typeof antiguo.tablas === 'object' && Object.keys(antiguo.tablas).length > 0) ||
        (Array.isArray(antiguo.bolasCantadas) && antiguo.bolasCantadas.length > 0) ||
        (Array.isArray(antiguo.historial) && antiguo.historial.length > 0);
      if (!hayDatos) {
        escribir(CLAVE_INDICE, leerIndice()); // índice vacío: no se vuelve a intentar
        return null;
      }
      const { tablas, ...resto } = antiguo;
      return crear({ nombre: 'Partida anterior', origen: 'migrada', tablas: tablas || {}, datos: resto });
    }

    // Acepta el JSON exportado de una partida o la lista de tablas de Diseño/Online.
    // Devuelve { partida, rechazadas } o { error }.
    function importar(objeto, nombrePorDefecto) {
      if (objeto && objeto.formato === FORMATO_EXPORTACION && objeto.partida && typeof objeto.partida === 'object') {
        const original = normalizarPartida({ ...objeto.partida, id: 'importada' });
        if (!original) return { error: 'El archivo de partida está dañado.' };
        const { id, creada, actualizada, descartadas, tablas, nombre, ...datos } = original;
        const partida = crear({ nombre: `${nombre} (importada)`, origen: 'importada', tablas, datos });
        return partida ? { partida, rechazadas: descartadas } : { error: 'sin-espacio' };
      }
      if (Array.isArray(objeto)) {
        if (objeto.length > motor.MAX_TABLAS_POR_ARCHIVO) return { error: `El archivo trae ${objeto.length} tablas y el máximo es ${motor.MAX_TABLAS_POR_ARCHIVO}. No se cargó nada.` };
        const { tablas, rechazadas } = motor.validarLoteTablas(objeto);
        if (Object.keys(tablas).length === 0) return { error: 'Ninguna tabla del archivo es válida.' + motor.detalleRechazos(rechazadas) };
        const partida = crear({ nombre: nombrePorDefecto, origen: 'importada', tablas });
        return partida ? { partida, rechazadas: rechazadas.length, detalle: rechazadas } : { error: 'sin-espacio' };
      }
      return { error: 'El archivo no tiene el formato esperado.' };
    }

    return { listar, obtener, guardar, activar, borrar, activa, seBorraraAlCrear, crear, migrarDesdeVersionAnterior, importar };
  }

  // ------------------------------------------------------------
  // AYUDAS PARA LAS PÁGINAS (solo navegador)
  // ------------------------------------------------------------
  function almacenDelNavegador() {
    let storage;
    try {
      storage = raiz.localStorage;
      storage.getItem(CLAVE_INDICE);
    } catch (e) {
      storage = almacenEnMemoria(); // navegación privada estricta: funciona mientras la página siga abierta
    }
    const almacen = crearAlmacen(storage);
    almacen.migrarDesdeVersionAnterior();
    return almacen;
  }

  function descargarArchivo(nombre, contenido, tipo) {
    const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
    const a = raiz.document.createElement('a');
    a.href = url;
    a.download = nombre;
    raiz.document.body.appendChild(a);
    a.click();
    raiz.document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function descargarJSON(p) { descargarArchivo(nombreArchivo(p, 'json'), exportarJSON(p), 'application/json'); }
  function descargarCSV(p) { descargarArchivo(nombreArchivo(p, 'csv'), exportarCSV(p), 'text/csv;charset=utf-8'); }

  // Antes de crear una partida: si ya hay 20, avisa cuál se borrará y ofrece descargarla.
  // Devuelve false si el usuario cancela.
  function confirmarEspacioParaNueva(almacen) {
    const victima = almacen.seBorraraAlCrear();
    if (!victima) return true;
    if (!raiz.confirm(`Ya tienes ${MAX_PARTIDAS} partidas guardadas, que es el máximo. Para crear una nueva se borrará la que lleva más tiempo sin usarse:\n\n«${victima.nombre}» (último uso: ${fechaLegible(victima.actualizada)}).\n\n¿Continuar?`)) return false;
    if (raiz.confirm(`¿Descargar antes una copia de «${victima.nombre}» (JSON para volver a importarla y CSV con sus ganadores)?`)) {
      const p = almacen.obtener(victima.id);
      if (p) { descargarJSON(p); descargarCSV(p); }
    }
    return true;
  }

  return {
    CLAVE_INDICE, PREFIJO_PARTIDA, MAX_PARTIDAS, CLAVES_ANTIGUAS, FORMATO_EXPORTACION,
    normalizarPartida, resumen, exportarJSON, exportarCSV, nombreArchivo, fechaLegible,
    almacenEnMemoria, crearAlmacen,
    almacenDelNavegador, descargarJSON, descargarCSV, confirmarEspacioParaNueva,
  };
});
