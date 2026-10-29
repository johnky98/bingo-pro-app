// Pruebas del motor de bingo. Ejecutar desde la raíz del proyecto:  node --test pruebas/
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const M = require('../nucleo/motor-bingo.js');

// Azar reproducible para las pruebas (mulberry32): mismos resultados en cada ejecución.
function azarConSemilla(semilla) {
  let a = semilla >>> 0;
  return n => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * n);
  };
}

// Cartón fijo: columna B = 1..5, I = 16..20, N = 31..35 (33 es la casilla libre), G = 46..50, O = 61..65.
const T1 = [[1, 2, 3, 4, 5], [16, 17, 18, 19, 20], [31, 32, 33, 34, 35], [46, 47, 48, 49, 50], [61, 62, 63, 64, 65]];
const T2 = [[1, 9, 10, 11, 5], [21, 22, 23, 24, 25], [36, 37, 38, 39, 40], [51, 52, 53, 54, 55], [61, 66, 67, 68, 65]];
const todosLosNumeros = cols => cols.flatMap((col, c) => col.filter((n, f) => !(c === 2 && f === 2)));
const fila = (cols, f) => cols.map(col => col[f]).filter((n, c) => !(c === 2 && f === 2));
const patron = clave => ({ clave, nombre: M.NOMBRES_PATRON[clave], grid: M.generarPatron(clave) });
const personalizado = celdas => {
  const grid = Array.from({ length: 5 }, () => Array(5).fill(false));
  celdas.forEach(([f, c]) => { grid[f][c] = true; });
  grid[2][2] = true;
  return { clave: 'personalizado', nombre: M.NOMBRES_PATRON.personalizado, grid };
};
const ESQUINAS_T1 = [1, 5, 61, 65];

describe('azar (crypto.getRandomValues)', () => {
  test('enteroAleatorio devuelve enteros en [0, n)', () => {
    for (const n of [1, 2, 7, 75]) {
      for (let i = 0; i < 2000; i++) {
        const v = M.enteroAleatorio(n);
        assert.ok(Number.isInteger(v) && v >= 0 && v < n, `${v} fuera de [0, ${n})`);
      }
    }
  });

  test('enteroAleatorio rechaza n inválidos', () => {
    for (const n of [0, -1, 1.5, NaN, 2 ** 33]) assert.throws(() => M.enteroAleatorio(n), RangeError);
  });

  test('enteroAleatorio reparte de forma pareja (sin sesgo evidente)', () => {
    const cuenta = [0, 0, 0];
    const total = 30000;
    for (let i = 0; i < total; i++) cuenta[M.enteroAleatorio(3)]++;
    cuenta.forEach(c => assert.ok(Math.abs(c - total / 3) < total * 0.03, `reparto desigual: ${cuenta}`));
  });

  test('barajar conserva los elementos y no modifica la lista original', () => {
    const original = [1, 2, 3, 4, 5, 6, 7, 8];
    const copia = original.slice();
    const barajada = M.barajar(original, azarConSemilla(1));
    assert.deepEqual(original, copia);
    assert.deepEqual(barajada.slice().sort((a, b) => a - b), copia);
  });
});

describe('cartones', () => {
  test('generarCarton produce cartones válidos (azar real y con semilla)', () => {
    const azar = azarConSemilla(7);
    for (let i = 0; i < 300; i++) {
      assert.equal(M.motivoCartonInvalido(M.generarCarton()), null);
      assert.equal(M.motivoCartonInvalido(M.generarCarton(azar)), null);
    }
  });

  test('generarCartonesUnicos no repite cartones', () => {
    const lote = M.generarCartonesUnicos(2000);
    assert.equal(lote.length, 2000);
    assert.equal(new Set(lote.map(M.firmaCarton)).size, 2000);
    lote.forEach(c => assert.equal(M.motivoCartonInvalido(c), null));
  });

  test('firmaCarton ignora el número de la casilla libre', () => {
    const otroCentro = T1.map(col => col.slice());
    otroCentro[2][2] = 44;
    assert.equal(M.firmaCarton(otroCentro), M.firmaCarton(T1));
  });

  test('generarCartonesUnicos se detiene con error si el azar no varía (no cuelga la página)', () => {
    assert.throws(() => M.generarCartonesUnicos(2, () => 0), /No se pudieron generar/);
  });

  test('motivoCartonInvalido acepta un cartón correcto y cualquier valor en la casilla libre', () => {
    assert.equal(M.motivoCartonInvalido(T1), null);
    for (const centro of [null, 'x', 99, 31]) {
      const c = T1.map(col => col.slice());
      c[2][2] = centro;
      assert.equal(M.motivoCartonInvalido(c), null, `centro ${centro}`);
    }
  });

  test('motivoCartonInvalido detecta cada defecto', () => {
    const con = (c, f, v) => { const t = T1.map(col => col.slice()); t[c][f] = v; return t; };
    assert.equal(M.motivoCartonInvalido(null), 'no tiene 5 columnas');
    assert.equal(M.motivoCartonInvalido('abc'), 'no tiene 5 columnas');
    assert.equal(M.motivoCartonInvalido(T1.slice(0, 4)), 'no tiene 5 columnas');
    assert.equal(M.motivoCartonInvalido([T1[0], T1[1], T1[2].slice(0, 4), T1[3], T1[4]]), 'la columna N no tiene 5 números');
    assert.equal(M.motivoCartonInvalido(con(0, 0, 16)), 'la columna B tiene números fuera de 1-15');
    assert.equal(M.motivoCartonInvalido(con(4, 0, 76)), 'la columna O tiene números fuera de 61-75');
    assert.equal(M.motivoCartonInvalido(con(1, 0, '16')), 'la columna I tiene números fuera de 16-30');
    assert.equal(M.motivoCartonInvalido(con(3, 0, 46.5)), 'la columna G tiene números fuera de 46-60');
    assert.equal(M.motivoCartonInvalido(con(0, 1, 1)), 'la columna B repite números');
  });

  test('validarLoteTablas separa válidas y rechazadas con su motivo', () => {
    const { tablas, rechazadas } = M.validarLoteTablas([
      { id: 1, columnas: T1 },
      { id: '2', columnas: T2 },
      { id: 1, columnas: T2 },        // repetido
      { id: 0, columnas: T1 },        // no positivo
      { id: '01', columnas: T1 },     // ceros a la izquierda
      { id: 3.5, columnas: T1 },
      { id: 4, columnas: [[1]] },     // malformado
      null,
      { columnas: T1 },
    ]);
    assert.deepEqual(Object.keys(tablas), ['1', '2']);
    assert.deepEqual(rechazadas, [
      '#1: número de tabla repetido',
      '#0: el número de tabla debe ser un entero positivo',
      '#01: el número de tabla debe ser un entero positivo',
      '#3.5: el número de tabla debe ser un entero positivo',
      '#4: no tiene 5 columnas',
      'Posición 8: el número de tabla debe ser un entero positivo',
      'Posición 9: el número de tabla debe ser un entero positivo',
    ]);
  });

  test('detalleRechazos muestra 5 motivos y resume el resto', () => {
    const lista = Array.from({ length: 8 }, (_, i) => `motivo ${i + 1}`);
    const texto = M.detalleRechazos(lista);
    assert.match(texto, /motivo 5/);
    assert.doesNotMatch(texto, /motivo 6/);
    assert.match(texto, /… y 3 más\.$/);
  });
});

describe('balotas', () => {
  test('letraDeBalota respeta los límites de cada columna', () => {
    const casos = { 1: 'B', 15: 'B', 16: 'I', 30: 'I', 31: 'N', 45: 'N', 46: 'G', 60: 'G', 61: 'O', 75: 'O', 0: null, 76: null };
    for (const [n, letra] of Object.entries(casos)) assert.equal(M.letraDeBalota(Number(n)), letra, `balota ${n}`);
  });

  test('sacarBalota saca las 75 sin repetir y luego devuelve null', () => {
    const cantadas = [];
    for (let i = 0; i < 75; i++) {
      const n = M.sacarBalota(cantadas);
      assert.ok(Number.isInteger(n) && n >= 1 && n <= 75);
      assert.ok(!cantadas.includes(n), `balota ${n} repetida`);
      cantadas.push(n);
    }
    assert.equal(M.sacarBalota(cantadas), null);
  });

  test('sacarBalota no modifica la lista de balotas cantadas', () => {
    const cantadas = [10, 20, 30];
    M.sacarBalota(cantadas);
    assert.deepEqual(cantadas, [10, 20, 30]);
  });

  test('sacarBalota solo elige entre las que faltan', () => {
    const cantadas = Array.from({ length: 74 }, (_, i) => i + 1); // falta la 75
    assert.equal(M.sacarBalota(cantadas), 75);
  });
});

describe('modalidades', () => {
  test('generarPatron: casillas de cada figura (incluida la libre del centro)', () => {
    // La L, el Cuadrado y las Esquinas no pasan por el centro, pero se marca igual (siempre está cantado).
    const casillas = { lleno: 25, horizontal: 5, vertical: 5, l: 10, cuadrado: 17, esquinas: 5 };
    for (const [clave, n] of Object.entries(casillas)) {
      const g = M.generarPatron(clave);
      assert.equal(g.flat().filter(Boolean).length, n, clave);
      assert.equal(g[2][2], true, `${clave}: centro`);
    }
  });

  test('patronTieneCasillas: el patrón vacío o mal formado no vale (PR-1)', () => {
    assert.equal(M.patronTieneCasillas(M.generarPatron('desconocido')), false); // solo el centro
    assert.equal(M.patronTieneCasillas([]), false);
    assert.equal(M.patronTieneCasillas(null), false);
    assert.equal(M.patronTieneCasillas([[true]]), false);
    assert.equal(M.patronTieneCasillas(personalizado([[0, 0]]).grid), true);
  });

  test('idModalidad distingue figuras personalizadas', () => {
    assert.equal(M.idModalidad(patron('lleno')), 'lleno');
    const a = M.idModalidad(personalizado([[0, 0]]));
    const b = M.idModalidad(personalizado([[0, 1]]));
    assert.match(a, /^personalizado-[01]{25}$/);
    assert.notEqual(a, b);
    assert.equal(a, M.idModalidad(personalizado([[0, 0]])));
  });
});

describe('tablaCumplePatron', () => {
  const gana = (clave, bolas, carton = T1) => M.tablaCumplePatron(carton, typeof clave === 'string' ? patron(clave) : clave, bolas).esGanadora;

  test('Cartón Lleno: gana con los 24 números y no con 23', () => {
    const todos = todosLosNumeros(T1);
    assert.equal(gana('lleno', todos), true);
    const r = M.tablaCumplePatron(T1, patron('lleno'), todos.slice(1));
    assert.equal(r.esGanadora, false);
    assert.equal(r.requeridas, 25);
    assert.equal(r.cumplidas, 24);
    assert.deepEqual(r.numerosFaltantes, [todos[0]]);
  });

  test('Línea Horizontal: vale cualquier fila; la del centro necesita 4 números', () => {
    assert.equal(gana('horizontal', fila(T1, 0)), true);
    assert.equal(gana('horizontal', fila(T1, 4)), true);
    assert.equal(fila(T1, 2).length, 4);
    assert.equal(gana('horizontal', fila(T1, 2)), true);
    assert.equal(gana('horizontal', fila(T1, 0).slice(1)), false);
  });

  test('Línea Horizontal sin fila completa muestra la fila más avanzada', () => {
    const r = M.tablaCumplePatron(T1, patron('horizontal'), [5, 20, 50]); // 3 de la fila 4
    assert.equal(r.esGanadora, false);
    assert.deepEqual(r.patron.map(f => f[0]), [false, false, false, false, true]);
    assert.deepEqual(r.numerosFaltantes, [35, 65]);
  });

  test('Línea Vertical: vale cualquier columna; la N necesita 4 números', () => {
    assert.equal(gana('vertical', T1[0]), true);
    assert.equal(gana('vertical', T1[4]), true);
    assert.equal(gana('vertical', [31, 32, 34, 35]), true);
    assert.equal(gana('vertical', T1[0].slice(1)), false);
  });

  test('figuras fijas: L, Cuadrado y Cuatro Esquinas', () => {
    const l = [...T1[0], ...fila(T1, 4)];
    assert.equal(gana('l', l), true);
    assert.equal(gana('l', l.slice(1)), false);
    const cuadrado = [...T1[0], ...T1[4], ...fila(T1, 0), ...fila(T1, 4)];
    assert.equal(gana('cuadrado', cuadrado), true);
    assert.equal(gana('cuadrado', cuadrado.filter(n => n !== 2)), false);
    assert.equal(gana('esquinas', ESQUINAS_T1), true);
    assert.equal(gana('esquinas', [1, 5, 61]), false);
  });

  test('una figura fija no gana con otra línea completa', () => {
    assert.equal(gana('esquinas', fila(T1, 2)), false);
    assert.equal(gana('l', T1[4]), false);
  });

  test('Personalizado: exige exactamente la figura dibujada', () => {
    const diagonal = personalizado([[0, 0], [1, 1], [3, 3], [4, 4]]);
    assert.equal(gana(diagonal, [1, 17, 49, 65]), true);
    assert.equal(gana(diagonal, [1, 17, 49]), false);
  });

  test('las balotas que no están en el cartón y el número de la casilla libre no cuentan', () => {
    const otras = Array.from({ length: 75 }, (_, i) => i + 1).filter(n => !todosLosNumeros(T1).includes(n));
    assert.equal(gana('esquinas', otras), false);
    // 33 está guardado en el centro de T1, pero esa casilla es libre: cantarlo no suma nada
    const r = M.tablaCumplePatron(T1, patron('vertical'), [33]);
    assert.equal(r.cumplidas, 1); // solo la casilla libre
  });
});

describe('detectarGanadores (PR-3: una vez por ronda y por modalidad)', () => {
  const base = { tablas: { 1: T1 }, ronda: 1 };
  const detectar = (extra) => M.detectarGanadores({ ...base, avisados: new Set(), ...extra });

  test('sin balotas no hay ganadores', () => {
    assert.deepEqual(detectar({ bolasCantadas: [], patron: patron('lleno') }), { nuevos: [], claves: [] });
  });

  test('avisa al ganador con ronda, tabla y modalidad', () => {
    const r = detectar({ bolasCantadas: ESQUINAS_T1, patron: patron('esquinas') });
    assert.deepEqual(r.nuevos, [{ ronda: 1, idTabla: '1', modalidad: 'Cuatro Esquinas' }]);
    assert.deepEqual(r.claves, ['1:esquinas:1']);
  });

  test('varios ganadores con la misma balota', () => {
    const r = detectar({ tablas: { 7: T1, 8: T2, 9: [[6, 7, 8, 12, 13], ...T1.slice(1)] }, bolasCantadas: ESQUINAS_T1, patron: patron('esquinas') });
    assert.deepEqual(r.nuevos.map(g => g.idTabla), ['7', '8']);
  });

  test('no repite el aviso con las siguientes balotas de la misma modalidad', () => {
    const avisados = new Set(['1:esquinas:1']);
    const r = detectar({ avisados, bolasCantadas: [...ESQUINAS_T1, 30, 31], patron: patron('esquinas') });
    assert.equal(r.nuevos.length, 0);
  });

  test('no modifica el registro de avisos que recibe', () => {
    const avisados = new Set();
    detectar({ avisados, bolasCantadas: ESQUINAS_T1, patron: patron('esquinas') });
    assert.equal(avisados.size, 0);
  });

  test('bingo por etapas: el mismo cartón puede ganar otra modalidad en la misma ronda', () => {
    const avisados = new Set();
    const bolas = fila(T1, 0); // 1, 16, 31, 46, 61
    const primera = detectar({ avisados, bolasCantadas: bolas, patron: patron('horizontal') });
    primera.claves.forEach(c => avisados.add(c));
    assert.equal(primera.nuevos.length, 1);

    const todas = todosLosNumeros(T1);
    const segunda = detectar({ avisados, bolasCantadas: todas, patron: patron('lleno') });
    segunda.claves.forEach(c => avisados.add(c));
    assert.deepEqual(segunda.nuevos, [{ ronda: 1, idTabla: '1', modalidad: 'Cartón Lleno' }]);

    // volver a una modalidad que ya ganó en esta ronda no repite el aviso
    assert.equal(detectar({ avisados, bolasCantadas: todas, patron: patron('horizontal') }).nuevos.length, 0);
  });

  test('una figura personalizada distinta cuenta como otra modalidad', () => {
    const a = personalizado([[0, 0]]);
    const b = personalizado([[4, 4]]);
    const avisados = new Set(detectar({ bolasCantadas: [1, 65], patron: a }).claves);
    assert.equal(detectar({ avisados, bolasCantadas: [1, 65], patron: a }).nuevos.length, 0);
    assert.equal(detectar({ avisados, bolasCantadas: [1, 65], patron: b }).nuevos.length, 1);
  });

  test('en una ronda nueva el mismo cartón puede volver a ganar', () => {
    const avisados = new Set(['1:esquinas:1']);
    const r = detectar({ avisados, ronda: 2, bolasCantadas: ESQUINAS_T1, patron: patron('esquinas') });
    assert.deepEqual(r.claves, ['2:esquinas:1']);
  });

  test('borrar el historial visible no reactiva avisos (solo cuenta el registro de avisos)', () => {
    const avisados = new Set(detectar({ bolasCantadas: ESQUINAS_T1, patron: patron('esquinas') }).claves);
    let historial = [{ ronda: 1, idTabla: '1' }];
    historial = []; // "Borrar historial"
    assert.equal(historial.length, 0);
    assert.equal(detectar({ avisados, bolasCantadas: [...ESQUINAS_T1, 2], patron: patron('esquinas') }).nuevos.length, 0);
  });

  test('PR-2: al cambiar de modalidad a mitad de ronda se revisa al instante, sin otra balota', () => {
    const bolas = [...ESQUINAS_T1, 2, 3]; // completa las esquinas pero no el cartón lleno
    assert.equal(detectar({ bolasCantadas: bolas, patron: patron('lleno') }).nuevos.length, 0);
    assert.equal(detectar({ bolasCantadas: bolas, patron: patron('esquinas') }).nuevos.length, 1);
  });

  test('migrarAvisados: los avisos antiguos "ronda:tabla" toman la modalidad activa', () => {
    const migrados = M.migrarAvisados(['1:7', '2:8', '3:lleno:9', 5, null], patron('esquinas'));
    assert.deepEqual(migrados, ['1:esquinas:7', '2:esquinas:8', '3:lleno:9']);
    assert.deepEqual(M.migrarAvisados(null, patron('lleno')), []);
    // tras migrar, la ronda a medias no repite el aviso de esa tabla
    const avisados = new Set(M.migrarAvisados(['1:1'], patron('esquinas')));
    assert.equal(detectar({ avisados, bolasCantadas: ESQUINAS_T1, patron: patron('esquinas') }).nuevos.length, 0);
  });
});

describe('estado de la partida (PR-6 pausa, PR-8 cierre)', () => {
  test('recorrido normal: preparada → en juego → pausada → en juego → finalizada', () => {
    let e = 'preparada';
    for (const [accion, esperado] of [['sacar_balota', 'en_juego'], ['sacar_balota', 'en_juego'], ['pausar', 'pausada'], ['reanudar', 'en_juego'], ['finalizar', 'finalizada']]) {
      e = M.siguienteEstado(e, accion);
      assert.equal(e, esperado, accion);
    }
  });

  test('la pausa congela el sacar balotas', () => {
    assert.equal(M.siguienteEstado('pausada', 'sacar_balota'), null);
  });

  test('una partida finalizada no admite ninguna acción', () => {
    for (const accion of ['sacar_balota', 'pausar', 'reanudar', 'nueva_ronda', 'reiniciar', 'finalizar']) {
      assert.equal(M.siguienteEstado('finalizada', accion), null, accion);
    }
  });

  test('acciones fuera de lugar o desconocidas se rechazan', () => {
    assert.equal(M.siguienteEstado('preparada', 'pausar'), null);
    assert.equal(M.siguienteEstado('preparada', 'reanudar'), null);
    assert.equal(M.siguienteEstado('en_juego', 'reanudar'), null);
    assert.equal(M.siguienteEstado('en_juego', 'toString'), null);
    assert.equal(M.siguienteEstado('inventado', 'sacar_balota'), null);
  });

  test('nueva ronda y reiniciar vuelven a "preparada" desde cualquier estado activo', () => {
    for (const estado of ['preparada', 'en_juego', 'pausada']) {
      assert.equal(M.siguienteEstado(estado, 'nueva_ronda'), 'preparada', estado);
      assert.equal(M.siguienteEstado(estado, 'reiniciar'), 'preparada', estado);
    }
  });

  test('los estados declarados son exactamente los que tienen transiciones', () => {
    assert.deepEqual(M.ESTADOS, ['preparada', 'en_juego', 'pausada', 'finalizada']);
  });
});
