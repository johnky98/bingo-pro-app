// Pruebas del almacén de partidas (D-06). Ejecutar desde la raíz:  node --test "pruebas/*.test.js"
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const M = require('../nucleo/motor-bingo.js');
const P = require('../nucleo/partidas.js');

const T1 = [[1, 2, 3, 4, 5], [16, 17, 18, 19, 20], [31, 32, 33, 34, 35], [46, 47, 48, 49, 50], [61, 62, 63, 64, 65]];
const T2 = [[1, 9, 10, 11, 5], [21, 22, 23, 24, 25], [36, 37, 38, 39, 40], [51, 52, 53, 54, 55], [61, 66, 67, 68, 65]];

// Reloj falso: cada lectura avanza un minuto, así el orden de uso es exacto.
function nuevoAlmacen(storage = P.almacenEnMemoria()) {
  let t = Date.UTC(2026, 9, 29, 12, 0);
  return { storage, almacen: P.crearAlmacen(storage, () => (t += 60000)) };
}

describe('crear, guardar y abrir', () => {
  test('crear deja la partida activa y la lista con su resumen', () => {
    const { almacen } = nuevoAlmacen();
    const p = almacen.crear({ nombre: 'Evento A', tablas: { 1: T1, 2: T2 }, origen: 'diseno' });
    assert.match(p.id, /^p[a-z0-9]+$/);
    assert.equal(almacen.activa().id, p.id);
    const [r] = almacen.listar();
    assert.deepEqual({ nombre: r.nombre, numTablas: r.numTablas, origen: r.origen, estado: r.estado }, { nombre: 'Evento A', numTablas: 2, origen: 'diseno', estado: 'preparada' });
  });

  test('una partida nueva empieza en la ronda 1, sin balotas y en Cartón Lleno', () => {
    const { almacen } = nuevoAlmacen();
    const p = almacen.crear({ nombre: 'X' });
    assert.deepEqual([p.ronda, p.totalRondas, p.bolasCantadas, p.patron.clave, p.avisados, p.historial], [1, 10, [], 'lleno', [], []]);
  });

  test('guardar conserva los cambios y actualiza la fecha de uso', () => {
    const { almacen } = nuevoAlmacen();
    const p = almacen.crear({ nombre: 'X', tablas: { 1: T1 } });
    const antes = p.actualizada;
    p.bolasCantadas.push(7, 22); p.estado = 'en_juego';
    assert.equal(almacen.guardar(p), true);
    const leida = almacen.obtener(p.id);
    assert.deepEqual(leida.bolasCantadas, [7, 22]);
    assert.equal(leida.estado, 'en_juego');
    assert.ok(leida.actualizada > antes);
  });

  test('las partidas no se mezclan: cambiar una no toca la otra (H07)', () => {
    const { almacen } = nuevoAlmacen();
    const a = almacen.crear({ nombre: 'A', tablas: { 1: T1 } });
    const b = almacen.crear({ nombre: 'B', tablas: { 1: T2, 2: T1 } });
    a.bolasCantadas.push(5); a.historial.push({ ronda: 1, idTabla: '1', modalidad: 'Cartón Lleno' });
    almacen.guardar(a);
    const b2 = almacen.obtener(b.id);
    assert.deepEqual(b2.tablas, { 1: T2, 2: T1 });
    assert.deepEqual(b2.bolasCantadas, []);
    assert.deepEqual(b2.historial, []);
    assert.deepEqual(almacen.obtener(a.id).tablas, { 1: T1 });
  });

  test('al abrir se muestra la última usada', () => {
    const { almacen } = nuevoAlmacen();
    const a = almacen.crear({ nombre: 'A' });
    almacen.crear({ nombre: 'B' });
    assert.equal(almacen.activa().nombre, 'B');
    almacen.activar(a.id);
    assert.equal(almacen.activa().nombre, 'A');
    assert.equal(almacen.listar()[0].nombre, 'A'); // la lista va de la más a la menos usada
  });

  test('borrar la activa pasa a la más reciente de las que quedan', () => {
    const { almacen } = nuevoAlmacen();
    almacen.crear({ nombre: 'A' });
    const b = almacen.crear({ nombre: 'B' });
    const c = almacen.crear({ nombre: 'C' });
    almacen.activar(b.id);
    almacen.borrar(b.id);
    assert.equal(almacen.obtener(b.id), null);
    assert.equal(almacen.activa().id, c.id);
    assert.deepEqual(almacen.listar().map(r => r.nombre), ['C', 'A']);
  });

  test('si el registro de una partida se daña, se abre la siguiente que sí sirve', () => {
    const { almacen, storage } = nuevoAlmacen();
    const a = almacen.crear({ nombre: 'A' });
    const b = almacen.crear({ nombre: 'B' });
    storage.setItem(P.PREFIJO_PARTIDA + b.id, '{dañado');
    assert.equal(almacen.obtener(b.id), null);
    assert.equal(almacen.activa().id, a.id);
  });
});

describe('límite de 20 partidas', () => {
  test('hasta 19 no se borra nada', () => {
    const { almacen } = nuevoAlmacen();
    for (let i = 0; i < 19; i++) almacen.crear({ nombre: `P${i}` });
    assert.equal(almacen.seBorraraAlCrear(), null);
  });

  test('la 21.ª borra la que lleva más tiempo sin usarse, nunca la abierta', () => {
    const { almacen } = nuevoAlmacen();
    const creadas = [];
    for (let i = 1; i <= 20; i++) creadas.push(almacen.crear({ nombre: `P${i}` }));
    almacen.activar(creadas[0].id); // P1 es la más vieja, pero está abierta
    const victima = almacen.seBorraraAlCrear();
    assert.equal(victima.nombre, 'P2');
    almacen.crear({ nombre: 'P21' });
    const nombres = almacen.listar().map(r => r.nombre);
    assert.equal(nombres.length, 20);
    assert.ok(!nombres.includes('P2'));
    assert.ok(nombres.includes('P1') && nombres.includes('P21'));
    assert.equal(almacen.obtener(creadas[1].id), null);
  });

  test('usar una partida (guardarla) la protege del borrado', () => {
    const { almacen } = nuevoAlmacen();
    const creadas = [];
    for (let i = 1; i <= 20; i++) creadas.push(almacen.crear({ nombre: `P${i}` }));
    almacen.guardar(almacen.obtener(creadas[0].id)); // se jugó en P1 hace poco
    assert.equal(almacen.seBorraraAlCrear().nombre, 'P2');
  });
});

describe('migración desde la Balotera anterior (una sola partida)', () => {
  const sembrar = storage => {
    const K = P.CLAVES_ANTIGUAS;
    storage.setItem(K.tablas, JSON.stringify({ 1: T1, 2: T2, 3: [[1]] }));
    storage.setItem(K.bolas, JSON.stringify([1, 5, 61, 65]));
    storage.setItem(K.patron, JSON.stringify({ nombre: 'Cuatro Esquinas', clave: 'esquinas', grid: M.generarPatron('esquinas') }));
    storage.setItem(K.ronda, '2');
    storage.setItem(K.totalRondas, '6');
    storage.setItem(K.historial, JSON.stringify([{ ronda: 1, idTabla: '2' }]));
    storage.setItem(K.avisados, JSON.stringify(['2:1', '2:esquinas:2']));
  };

  test('convierte los datos guardados en "Partida anterior" y la deja abierta', () => {
    const { almacen, storage } = nuevoAlmacen();
    sembrar(storage);
    const p = almacen.migrarDesdeVersionAnterior();
    assert.equal(p.nombre, 'Partida anterior');
    assert.equal(p.origen, 'migrada');
    assert.deepEqual(Object.keys(p.tablas), ['1', '2']); // la tabla dañada se ignora
    assert.equal(p.descartadas, 1);
    assert.deepEqual([p.ronda, p.totalRondas, p.patron.clave, p.estado], [2, 6, 'esquinas', 'en_juego']);
    assert.deepEqual(p.bolasCantadas, [1, 5, 61, 65]);
    assert.deepEqual(p.avisados, ['2:esquinas:1', '2:esquinas:2']);
    assert.deepEqual(p.historial, [{ ronda: 1, idTabla: '2' }]);
    assert.equal(almacen.activa().id, p.id);
  });

  test('no borra las claves antiguas y no se repite', () => {
    const { almacen, storage } = nuevoAlmacen();
    sembrar(storage);
    almacen.migrarDesdeVersionAnterior();
    assert.notEqual(storage.getItem(P.CLAVES_ANTIGUAS.tablas), null);
    assert.equal(almacen.migrarDesdeVersionAnterior(), null);
    assert.equal(almacen.listar().length, 1);
  });

  test('sin datos anteriores no crea nada, y tampoco lo intenta después', () => {
    const { almacen, storage } = nuevoAlmacen();
    assert.equal(almacen.migrarDesdeVersionAnterior(), null);
    assert.equal(almacen.listar().length, 0);
    sembrar(storage); // datos que aparezcan después no se migran (los escribiría una versión vieja)
    assert.equal(almacen.migrarDesdeVersionAnterior(), null);
  });
});

describe('normalización de lo que se lee', () => {
  test('descarta balotas repetidas o fuera de rango y patrones vacíos', () => {
    const p = P.normalizarPartida({ id: 'abc', bolasCantadas: [3, 3, 0, 76, '5', 75], patron: { clave: 'personalizado', grid: M.generarPatron('nada') } });
    assert.deepEqual(p.bolasCantadas, [3, 75]);
    assert.equal(p.patron.clave, 'lleno');
  });

  test('una partida "en juego" sin balotas vuelve a "preparada"; estados inventados se corrigen', () => {
    assert.equal(P.normalizarPartida({ id: 'a', estado: 'en_juego' }).estado, 'preparada');
    assert.equal(P.normalizarPartida({ id: 'a', estado: 'volando', bolasCantadas: [4] }).estado, 'en_juego');
    assert.equal(P.normalizarPartida({ id: 'a', estado: 'pausada', bolasCantadas: [4] }).estado, 'pausada');
  });

  test('el total de rondas nunca queda por debajo de la ronda en curso', () => {
    const p = P.normalizarPartida({ id: 'a', ronda: 7, totalRondas: 3 });
    assert.deepEqual([p.ronda, p.totalRondas], [7, 7]);
  });

  test('sin id válido no es una partida', () => {
    for (const id of [undefined, '', 'con espacio', '../x', 5]) assert.equal(P.normalizarPartida({ id }), null);
  });

  test('la figura personalizada se conserva y el nombre se corrige', () => {
    const grid = M.generarPatron('nada'); grid[0][0] = true;
    const p = P.normalizarPartida({ id: 'a', patron: { clave: 'personalizado', nombre: '<b>x</b>', grid } });
    assert.equal(p.patron.nombre, 'Personalizado (manual)');
    assert.equal(p.patron.grid[0][0], true);
  });
});

describe('exportar e importar', () => {
  test('JSON: exportar e importar recupera la partida completa con otro id', () => {
    const { almacen } = nuevoAlmacen();
    const p = almacen.crear({ nombre: 'Rifa', tablas: { 1: T1, 2: T2 } });
    Object.assign(p, { ronda: 3, bolasCantadas: [1, 5], historial: [{ ronda: 2, idTabla: '1', modalidad: 'Cuatro Esquinas' }], estado: 'pausada' });
    almacen.guardar(p);
    const texto = P.exportarJSON(almacen.obtener(p.id));
    const { partida } = almacen.importar(JSON.parse(texto));
    assert.notEqual(partida.id, p.id);
    assert.equal(partida.nombre, 'Rifa (importada)');
    assert.deepEqual([partida.tablas, partida.ronda, partida.bolasCantadas, partida.historial, partida.estado], [p.tablas, 3, [1, 5], p.historial, 'pausada']);
    assert.equal(almacen.activa().id, partida.id);
  });

  test('importar la lista de tablas de Diseño crea una partida nueva sin tocar la abierta', () => {
    const { almacen } = nuevoAlmacen();
    const abierta = almacen.crear({ nombre: 'Abierta', tablas: { 9: T1 } });
    const r = almacen.importar([{ id: 1, columnas: T1 }, { id: 2, columnas: [[1]] }], 'tablas.json');
    assert.equal(r.rechazadas, 1);
    assert.deepEqual(Object.keys(r.partida.tablas), ['1']);
    assert.deepEqual(almacen.obtener(abierta.id).tablas, { 9: T1 });
  });

  test('importar rechaza archivos vacíos de tablas válidas, demasiado grandes o con otra forma', () => {
    const { almacen } = nuevoAlmacen();
    assert.match(almacen.importar([{ id: 1, columnas: [[1]] }], 'x').error, /Ninguna tabla/);
    assert.match(almacen.importar(Array.from({ length: 2001 }, (_, i) => ({ id: i + 1, columnas: T1 })), 'x').error, /máximo es 2000/);
    assert.match(almacen.importar({ hola: 1 }, 'x').error, /formato esperado/);
    assert.match(almacen.importar({ formato: P.FORMATO_EXPORTACION, partida: 'x' }, 'x').error, /formato esperado/);
    assert.equal(almacen.listar().length, 0);
  });

  test('CSV: separado por ";", con BOM, y protegido contra fórmulas', () => {
    const p = P.normalizarPartida({ id: 'a', nombre: '=HYPERLINK("x");2', tablas: { 1: T1 }, ronda: 2,
      historial: [{ ronda: 1, idTabla: '1', modalidad: 'Línea Horizontal' }, { ronda: 2, idTabla: '1' }] });
    const csv = P.exportarCSV(p);
    assert.ok(csv.startsWith('﻿'));
    const lineas = csv.slice(1).trim().split('\r\n');
    assert.equal(lineas[0], `Partida;"'=HYPERLINK(""x"");2"`);
    assert.equal(lineas[3], 'Tablas;1');
    assert.deepEqual(lineas.slice(-3), ['Ronda;Modalidad;Tabla', '1;Línea Horizontal;#0001', '2;;#0001']);
  });

  test('nombre de archivo sin tildes ni símbolos', () => {
    const p = P.normalizarPartida({ id: 'a', nombre: 'Bingo Navideño / Año 2026', actualizada: Date.UTC(2026, 11, 24, 15) });
    assert.match(P.nombreArchivo(p, 'csv'), /^bingo_Bingo_Navideno_Ano_2026_2026-12-2\d\.csv$/);
  });
});

describe('sin espacio en el navegador', () => {
  test('guardar devuelve false y crear devuelve null, sin dejar el índice a medias', () => {
    const base = P.almacenEnMemoria();
    let lleno = false;
    const storage = { ...base, setItem: (k, v) => { if (lleno && k.startsWith(P.PREFIJO_PARTIDA)) throw new Error('QuotaExceededError'); base.setItem(k, v); } };
    const { almacen } = nuevoAlmacen(storage);
    const p = almacen.crear({ nombre: 'A' });
    lleno = true;
    p.bolasCantadas.push(3);
    assert.equal(almacen.guardar(p), false);
    assert.deepEqual(almacen.obtener(p.id).bolasCantadas, []);
    assert.equal(almacen.crear({ nombre: 'B' }), null);
    assert.deepEqual(almacen.listar().map(r => r.nombre), ['A']);
  });
});
