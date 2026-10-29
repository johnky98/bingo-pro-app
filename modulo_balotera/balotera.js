// Reglas del juego: nucleo/motor-bingo.js (probadas con "node --test pruebas/*.test.js").
const {
  NOMBRES_PATRON, detalleRechazos, letraDeBalota,
  generarPatron, patronTieneCasillas, idModalidad, tablaCumplePatron, detectarGanadores,
} = BingoMotor;

// ============================================================
// PARTIDA ABIERTA (F3): cada partida guarda sus propias tablas, rondas, balotas, modalidad,
// avisos e historial (nucleo/partidas.js). Al abrir se muestra la última usada. Las variables
// de abajo son la partida abierta; persistir() la guarda tras cada cambio.
// ============================================================
const almacen = BingoPartidas.almacenDelNavegador();

function partidaEnBlanco(nombre) {
  return almacen.crear({ nombre: nombre || `Partida del ${BingoPartidas.fechaLegible(Date.now())}` }) ||
    BingoPartidas.normalizarPartida({ id: 'temporal', nombre: 'Partida sin guardar (sin espacio en el navegador)' });
}

let partida, bolasCantadas, tablasImportadas, tablasDescartadasAlCargar, rondaActual, totalRondas,
  historialGanadores, patronActivo, ganadoresAvisados, estadoPartida, matrizDibujoTemp;

function cargarDePartida(p) {
  partida = p;
  bolasCantadas = p.bolasCantadas;
  tablasImportadas = p.tablas;
  tablasDescartadasAlCargar = p.descartadas;
  rondaActual = p.ronda;
  totalRondas = p.totalRondas;
  historialGanadores = p.historial;
  patronActivo = p.patron;
  // Tablas ya avisadas como ganadoras ("ronda:modalidad:idTabla"). Es independiente del historial
  // visible para que "Borrar historial" a mitad de ronda no repita avisos.
  ganadoresAvisados = new Set(p.avisados);
  estadoPartida = p.estado;
  matrizDibujoTemp = patronActivo.clave === 'personalizado'
    ? patronActivo.grid.map(fila => fila.slice())
    : Array.from({ length: 5 }, (_, f) => Array.from({ length: 5 }, (_, c) => f === 2 && c === 2));
}

let avisoSinEspacioDado = false;
function persistir() {
  Object.assign(partida, {
    bolasCantadas, tablas: tablasImportadas, ronda: rondaActual, totalRondas, historial: historialGanadores,
    patron: patronActivo, avisados: Array.from(ganadoresAvisados), estado: estadoPartida,
  });
  if (partida.id === 'temporal' || almacen.guardar(partida)) return;
  if (!avisoSinEspacioDado) {
    avisoSinEspacioDado = true;
    alert('El navegador no tiene espacio para guardar la partida: el juego sigue, pero si recargas la página se perderá lo último. Exporta (JSON) y borra partidas antiguas para liberar espacio.');
  }
}

// Lleva la partida por los estados del motor (preparada, en juego, pausada, finalizada).
function cambiarEstado(accion) {
  const siguiente = BingoMotor.siguienteEstado(estadoPartida, accion);
  if (siguiente) estadoPartida = siguiente;
  return siguiente !== null;
}

cargarDePartida(almacen.activa() || partidaEnBlanco());

function renderMiniaturaPatron(grid) {
  const cont = document.getElementById('miniatura-patron');
  cont.innerHTML = '';
  for (let f = 0; f < 5; f++) {
    for (let c = 0; c < 5; c++) {
      const cel = document.createElement('div');
      cel.className = grid[f][c] ? 'rounded-[3px] bg-brandOrange shadow-[0_0_8px_rgba(245,113,27,0.6)]' : 'rounded-[3px] bg-white/10';
      cont.appendChild(cel);
    }
  }
}

function aplicarPatronActivo() {
  document.getElementById('nombre-patron-activo').textContent = patronActivo.nombre;
  renderMiniaturaPatron(patronActivo.grid);
  const select = document.getElementById('select-modalidad');
  const opcionPersonalizada = select.querySelector('option[value="personalizado"]');
  if (patronActivo.clave === 'personalizado') {
    opcionPersonalizada.disabled = false;
    select.value = 'personalizado';
  } else {
    opcionPersonalizada.disabled = true;
    select.value = patronActivo.clave;
  }
}

// PR-2: con la ronda empezada y tablas cargadas, cambiar la modalidad pide confirmación,
// porque los cartones se revisan en ese mismo momento (no con la siguiente balota).
function confirmarCambioModalidad(nuevoPatron) {
  if (idModalidad(nuevoPatron) === idModalidad(patronActivo)) return true;
  if (bolasCantadas.length === 0 || Object.keys(tablasImportadas).length === 0) return true;
  const n = bolasCantadas.length;
  return confirm(`Ya ${n === 1 ? 'salió 1 balota' : `salieron ${n} balotas`} en esta ronda. Al cambiar a "${nuevoPatron.nombre}" se revisan los cartones en este momento y puede haber ganadores inmediatos. ¿Cambiar la modalidad?`);
}

function activarPatron(nuevoPatron) {
  patronActivo = nuevoPatron;
  aplicarPatronActivo();
  persistir();
  refrescarVerificacionSiHayTablaVisible();
  verificarGanadoresAutomatico();
}

function cambiarModalidadPreestablecida(clave) {
  const nuevo = { nombre: NOMBRES_PATRON[clave], clave, grid: generarPatron(clave) };
  if (!confirmarCambioModalidad(nuevo)) {
    aplicarPatronActivo(); // devuelve el selector a la modalidad que sigue activa
    return;
  }
  activarPatron(nuevo);
}

function construirMatrizDibujo() {
  const matriz = document.getElementById('matriz-dibujo');
  matriz.innerHTML = '';
  for (let f = 0; f < 5; f++) {
    for (let c = 0; c < 5; c++) {
      const boton = document.createElement('button');
      boton.type = 'button';
      const esLibre = (f === 2 && c === 2);
      const encendida = matrizDibujoTemp[f][c];
      boton.className = `aspect-square rounded-lg text-[9px] font-bold flex items-center justify-center transition ${encendida ? 'cell-on bg-brandOrange text-white' : 'cell-glass text-purple-200'}`;
      boton.textContent = esLibre ? 'FREE' : '';
      boton.addEventListener('click', () => {
        matrizDibujoTemp[f][c] = !matrizDibujoTemp[f][c];
        construirMatrizDibujo();
      });
      matriz.appendChild(boton);
    }
  }
}

function abrirModalDibujo() {
  construirMatrizDibujo();
  const modal = document.getElementById('modal-dibujo');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function cerrarModalDibujo() {
  const modal = document.getElementById('modal-dibujo');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function guardarPatronPersonalizado() {
  if (!patronTieneCasillas(matrizDibujoTemp)) {
    alert('Dibuja al menos una casilla además de la casilla libre del centro.');
    return;
  }
  const gridGuardado = matrizDibujoTemp.map(fila => fila.slice());
  gridGuardado[2][2] = true;
  const nuevo = { nombre: NOMBRES_PATRON.personalizado, clave: 'personalizado', grid: gridGuardado };
  if (!confirmarCambioModalidad(nuevo)) return;
  cerrarModalDibujo();
  activarPatron(nuevo);
}

function inicializarTableroBalotas() {
  const grid = document.getElementById('tablero-balotas-grid');
  grid.innerHTML = '';

  const letras = ['B', 'I', 'N', 'G', 'O'];
  const coloresLetra = ['letraB', 'letraI', 'letraN', 'letraG', 'letraO'];

  for (let col = 0; col < 5; col++) {
    const colDiv = document.createElement('div');
    colDiv.className = "flex flex-col gap-2";

    const header = document.createElement('div');
    header.className = `cell-on bg-${coloresLetra[col]} rounded-lg text-center font-display font-black text-lg md:text-xl py-2 text-white`;
    header.textContent = letras[col];
    colDiv.appendChild(header);

    const min = col * 15 + 1;
    const max = min + 14;

    for (let i = min; i <= max; i++) {
      const celda = document.createElement('div');
      celda.id = `balota-btn-${i}`;
      celda.className = "cell-glass w-full py-2.5 rounded-lg text-sm font-bold text-purple-200 transition flex items-center justify-center select-none";
      celda.innerText = i;
      colDiv.appendChild(celda);
    }
    grid.appendChild(colDiv);
  }
  actualizarTableroUI();
}

function sacarBalotaAleatoria() {
  if (estadoPartida === 'pausada') return; // PR-6: la pausa congela el bombo (el botón ya está desactivado)
  const balota = BingoMotor.sacarBalota(bolasCantadas);
  if (balota === null) {
    alert("¡Ya se han cantado las 75 balotas!");
    return;
  }
  if (!cambiarEstado('sacar_balota')) return;
  bolasCantadas.push(balota);
  actualizarTableroUI(true);
  persistir();
  verificarGanadoresAutomatico();
}

// PR-6: pausar congela "Sacar balota" hasta reanudar; se guarda con la partida.
function alternarPausa() {
  cambiarEstado(estadoPartida === 'pausada' ? 'reanudar' : 'pausar');
  persistir();
  actualizarTableroUI();
}

function actualizarTableroUI(animar) {
  const ultima = bolasCantadas[bolasCantadas.length - 1];
  const elLetra = document.getElementById('balota-letra');
  const elNumero = document.getElementById('balota-numero');
  const circulo = document.getElementById('balota-actual-circulo');
  const coloresPorLetra = { B: 'letraB', I: 'letraI', N: 'letraN', G: 'letraG', O: 'letraO' };

  const baseCirculo = "orb w-48 h-48 md:w-56 md:h-56 mx-auto rounded-full flex flex-col items-center justify-center transition-colors";

  if (ultima) {
    const letra = letraDeBalota(ultima);
    elLetra.textContent = letra;
    elNumero.textContent = ultima;
    circulo.className = `bg-${coloresPorLetra[letra]} ${baseCirculo}`;
    if (animar) {
      circulo.classList.remove('anim-nueva');
      void circulo.offsetWidth;
      circulo.classList.add('anim-nueva');
    }
  } else {
    elLetra.textContent = '—';
    elNumero.textContent = '--';
    circulo.className = `orb-vacia ${baseCirculo}`;
  }

  document.getElementById('contador-salidas').textContent = `${bolasCantadas.length} de 75 salieron`;
  document.getElementById('contador-restantes').textContent = `${75 - bolasCantadas.length} balotas por sacar`;

  const btnSacar = document.getElementById('btn-sacar-balota');
  const pausada = estadoPartida === 'pausada';
  if (bolasCantadas.length >= 75 || pausada) {
    btnSacar.disabled = true;
    btnSacar.textContent = pausada ? '⏸️ EN PAUSA' : '¡JUEGO TERMINADO!';
    btnSacar.classList.add('opacity-60', 'cursor-not-allowed');
  } else {
    btnSacar.disabled = false;
    btnSacar.textContent = '¡SACAR BALOTA!';
    btnSacar.classList.remove('opacity-60', 'cursor-not-allowed');
  }
  // Solo se puede pausar con la ronda en juego (motor: preparada no admite "pausar").
  const btnPausa = document.getElementById('btn-pausa');
  btnPausa.classList.toggle('hidden', estadoPartida !== 'en_juego' && !pausada);
  btnPausa.textContent = pausada ? '▶️ Reanudar' : '⏸️ Pausar';

  for (let i = 1; i <= 75; i++) {
    const celda = document.getElementById(`balota-btn-${i}`);
    if (celda) {
      if (bolasCantadas.includes(i)) {
        celda.className = "cell-on w-full py-2.5 rounded-lg text-sm font-black bg-brandOrange text-white transform scale-[1.03] select-none flex items-center justify-center";
      } else {
        celda.className = "cell-glass w-full py-2.5 rounded-lg text-sm font-bold text-purple-200 select-none flex items-center justify-center";
      }
    }
  }

  const elHistorial = document.getElementById('historial-reciente');
  if (bolasCantadas.length > 1) {
    const anteriores = bolasCantadas.slice(0, -1).reverse().slice(0, 5);
    const fila = crearElemento('div', 'flex gap-2 flex-wrap', '');
    anteriores.forEach(n => fila.appendChild(crearElemento('span', 'chip font-bold text-amber-300', String(n))));
    elHistorial.replaceChildren(fila);
  } else {
    elHistorial.innerText = "Aún no hay balotas anteriores";
  }

  refrescarVerificacionSiHayTablaVisible();
}

// Si ya se estaba mostrando el resultado de una tabla, la vuelve a calcular
// (se usa tras sacar una balota y también tras cambiar la modalidad de juego,
// para que el veredicto nunca quede desactualizado).
function refrescarVerificacionSiHayTablaVisible() {
  if (document.getElementById('input-id-tabla').value.trim() !== '' && document.getElementById('resultado-verificacion').hasChildNodes()) {
    verificarTabla();
  }
}

function reiniciarJuego() {
  if (confirm("¿Deseas reiniciar el tablero de balotas? Esto también borra el historial de ganadores de esta partida.")) {
    bolasCantadas = [];
    historialGanadores = [];
    ganadoresAvisados.clear();
    cambiarEstado('reiniciar');
    persistir();
    actualizarTableroUI();
    renderHistorialGanadores();
  }
}

// Acepta la lista de tablas de Diseño/Online o una partida exportada (JSON). Nunca reemplaza
// las tablas de una partida con juego: crea una partida nueva, salvo que la abierta esté vacía.
function importarTablasJSON(event) {
  const file = event.target.files[0];
  event.target.value = ''; // permite volver a elegir el mismo archivo
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    let data;
    try {
      data = JSON.parse(evt.target.result);
    } catch (err) {
      data = null;
    }
    const esPartida = data && data.formato === BingoPartidas.FORMATO_EXPORTACION;
    if (!Array.isArray(data) && !esPartida) {
      alert('El archivo no tiene el formato esperado. Debe ser el JSON de "📥 Exportar Tablas" (Diseño o Sala Online) o el de una partida exportada desde aquí.');
      return;
    }

    const abiertaVacia = !esPartida && Object.keys(tablasImportadas).length === 0 && bolasCantadas.length === 0 && historialGanadores.length === 0;
    if (abiertaVacia) {
      // La partida abierta aún no tiene nada: las tablas se cargan en ella.
      if (data.length > BingoMotor.MAX_TABLAS_POR_ARCHIVO) {
        alert(`El archivo trae ${data.length} tablas y el máximo es ${BingoMotor.MAX_TABLAS_POR_ARCHIVO}. No se cargó nada.`);
        return;
      }
      const { tablas, rechazadas } = BingoMotor.validarLoteTablas(data);
      if (Object.keys(tablas).length === 0) {
        alert('Ninguna tabla del archivo es válida.' + detalleRechazos(rechazadas));
        return;
      }
      tablasImportadas = tablas;
      tablasDescartadasAlCargar = 0;
      persistir();
      avisarDescartadas(Object.keys(tablas).length, rechazadas);
    } else {
      persistir();
      if (!BingoPartidas.confirmarEspacioParaNueva(almacen)) return;
      const resultado = almacen.importar(data, `Tablas de ${file.name.replace(/\.json$/i, '')}`);
      if (resultado.error) {
        alert(resultado.error === 'sin-espacio'
          ? 'El navegador no tiene espacio para guardar otra partida. Exporta y borra partidas antiguas, y vuelve a intentarlo.'
          : resultado.error);
        return;
      }
      abrirPartida(resultado.partida);
      if (resultado.detalle) avisarDescartadas(Object.keys(resultado.partida.tablas).length, resultado.detalle);
      else if (resultado.rechazadas > 0) alert(`Se ignoraron ${resultado.rechazadas} tablas de la partida que no eran válidas.`);
    }
    actualizarInfoTablasImportadas();
    verificarGanadoresAutomatico();
  };
  reader.readAsText(file);
}

function avisarDescartadas(validas, rechazadas) {
  if (rechazadas.length === 0) return;
  const descarte = rechazadas.length === 1 ? 'se descartó 1 que no es válida' : `se descartaron ${rechazadas.length} que no son válidas`;
  const carga = validas === 1 ? 'Se cargó 1 tabla' : `Se cargaron ${validas} tablas`;
  alert(`${carga} y ${descarte}:` + detalleRechazos(rechazadas));
}

function actualizarInfoTablasImportadas() {
  const total = Object.keys(tablasImportadas).length;
  const el = document.getElementById('info-tablas-importadas');
  const descartadas = tablasDescartadasAlCargar > 0
    ? (tablasDescartadasAlCargar === 1
      ? ' Se ignoró 1 tabla guardada que no era válida.'
      : ` Se ignoraron ${tablasDescartadasAlCargar} tablas guardadas que no eran válidas.`)
    : '';
  el.textContent = (total > 0
    ? `✅ ${total} tabla${total === 1 ? '' : 's'} cargada${total === 1 ? '' : 's'} y lista${total === 1 ? '' : 's'} para verificar.`
    : 'Aún no has importado ningún archivo de tablas.') + descartadas;
}

function verificarTabla() {
  const idInput = document.getElementById('input-id-tabla');
  const id = idInput.value.trim();
  const resultado = document.getElementById('resultado-verificacion');
  // Los números vienen de archivos importados: se pintan con textContent, nunca como HTML.
  resultado.replaceChildren();

  if (!id) {
    resultado.appendChild(crearElemento('p', 'text-xs text-purple-400', 'Escribe el número de tabla a verificar.'));
    return;
  }

  const columnas = tablasImportadas[id] || tablasImportadas[String(parseInt(id, 10))];
  if (!columnas) {
    const aviso = crearElemento('div', 'bg-rose-950/40 border border-rose-700/50 rounded-xl p-3 text-center', '');
    aviso.appendChild(crearElemento('p', 'text-sm text-rose-300 font-bold', `⚠️ No se encontró la tabla #${id}.`));
    aviso.appendChild(crearElemento('p', 'text-xs text-rose-400/80 mt-1', 'Verifica el número o que importaste el archivo correcto.'));
    resultado.appendChild(aviso);
    return;
  }

  const { matriz, patron, esGanadora, requeridas, cumplidas, numerosFaltantes } =
    tablaCumplePatron(columnas, patronActivo, bolasCantadas);

  const grid = crearElemento('div', 'grid grid-cols-5 gap-1.5 max-w-xs mx-auto mb-4', '');
  matriz.flat().forEach((cel, idx) => {
    const f = Math.floor(idx / 5);
    const c = idx % 5;
    const perteneceAlPatron = patron[f][c];

    let clases;
    if (perteneceAlPatron && cel.marcada) {
      clases = 'cell-on bg-brandOrange text-white ring-2 ring-white/60'; // requerida y ya cantada
    } else if (perteneceAlPatron && !cel.marcada) {
      clases = 'cell-glass text-purple-100 ring-2 ring-dashed ring-amber-400/70'; // requerida, aún falta
    } else if (!perteneceAlPatron && cel.marcada) {
      clases = 'cell-glass text-purple-200 opacity-75'; // cantada pero no cuenta para esta modalidad
    } else {
      clases = 'cell-glass text-purple-200 opacity-60'; // no cantada y no cuenta
    }

    grid.appendChild(crearElemento('div', `aspect-square rounded-lg flex items-center justify-center text-xs font-bold transition ${clases}`, cel.esLibre ? 'FREE' : String(cel.numero)));
  });

  // Línea con la modalidad en negrita: "<prefijo><strong>nombre</strong><sufijo>"
  function lineaModalidad(clases, prefijo, sufijo) {
    const p = crearElemento('p', clases, prefijo);
    p.appendChild(crearElemento('strong', '', patronActivo.nombre));
    if (sufijo) p.appendChild(document.createTextNode(sufijo));
    return p;
  }

  let veredicto;
  if (esGanadora) {
    veredicto = crearElemento('div', 'bg-green-900/30 border-2 border-green-500 rounded-xl p-4 text-center', '');
    veredicto.appendChild(crearElemento('p', 'text-xl font-display font-black text-green-400 mb-1', '✅ ¡BINGO VÁLIDO!'));
    veredicto.appendChild(lineaModalidad('text-xs text-green-300', 'Cumple la modalidad activa: '));
  } else {
    veredicto = crearElemento('div', 'bg-rose-950/40 border-2 border-rose-600/70 rounded-xl p-4 text-center', '');
    veredicto.appendChild(crearElemento('p', 'text-lg font-display font-black text-rose-300 mb-1', '❌ Faltan números'));
    veredicto.appendChild(lineaModalidad('text-xs text-rose-300/90 mb-1', 'Modalidad activa: ', ` — ${cumplidas}/${requeridas} casillas cumplidas`));
    if (numerosFaltantes.length > 0) {
      veredicto.appendChild(crearElemento('p', 'text-xs text-rose-200', `Faltan: ${numerosFaltantes.join(', ')}`));
    }
  }

  resultado.append(crearElemento('p', 'text-xs text-purple-400 mb-2 text-center', `Tabla #${String(id).padStart(4, '0')}`), grid, veredicto);
}

// ============================================================
// RONDAS: la Ronda 1 ya está en curso al entrar. "Siguiente Ronda" reinicia el
// bombo; las tablas importadas y el historial de ganadores no se tocan.
// ============================================================
function actualizarUIRonda() {
  const badge = document.getElementById('badge-ronda');
  const btn = document.getElementById('btn-ronda');
  const inputTotal = document.getElementById('input-total-rondas');
  if (inputTotal && document.activeElement !== inputTotal) inputTotal.value = totalRondas;

  if (rondaActual < totalRondas) {
    badge.textContent = `Ronda ${rondaActual} de ${totalRondas}`;
    btn.textContent = `⏭️ Siguiente Ronda (${rondaActual + 1} de ${totalRondas})`;
    btn.disabled = false;
    btn.classList.remove('opacity-60', 'cursor-not-allowed');
  } else {
    badge.textContent = `Ronda ${totalRondas} de ${totalRondas} — última ronda`;
    btn.textContent = '🏁 Evento finalizado';
    btn.disabled = true;
    btn.classList.add('opacity-60', 'cursor-not-allowed');
  }
}

// Se puede subir o bajar el total en vivo, pero nunca por debajo de la ronda en curso.
function actualizarTotalRondas() {
  const input = document.getElementById('input-total-rondas');
  const nuevo = parseInt(input.value, 10);
  if (!Number.isInteger(nuevo) || nuevo < 1) {
    alert('Ingresa un número de rondas válido (1 o más).');
    input.value = totalRondas;
    return;
  }
  if (nuevo < rondaActual) {
    alert(`Ya vas en la ronda ${rondaActual}, no puedes bajar el total por debajo de eso.`);
    input.value = totalRondas;
    return;
  }
  totalRondas = nuevo;
  persistir();
  actualizarUIRonda();
}

function iniciarSiguienteRonda() {
  if (rondaActual >= totalRondas) return;
  if (!confirm(`¿Pasar a la Ronda ${rondaActual + 1} de ${totalRondas}? Se reinicia el bombo (75 balotas disponibles de nuevo). Elige la modalidad de la nueva ronda con el selector de arriba antes de sacar balotas.`)) return;

  rondaActual++;
  bolasCantadas = [];
  cambiarEstado('nueva_ronda');
  persistir();
  actualizarTableroUI();
  actualizarUIRonda();
}

// ============================================================
// DETECCIÓN AUTOMÁTICA DE GANADORES: tras cada balota (y al cambiar la modalidad,
// importar tablas o cargar la página) revisa todas las tablas contra la modalidad activa.
// Una tabla avisa una sola vez por ronda y por modalidad (PR-3).
// ============================================================
function verificarGanadoresAutomatico() {
  const { nuevos: nuevosGanadores, claves } = detectarGanadores({
    tablas: tablasImportadas, bolasCantadas, patron: patronActivo, ronda: rondaActual, avisados: ganadoresAvisados,
  });
  claves.forEach(clave => ganadoresAvisados.add(clave));
  historialGanadores.push(...nuevosGanadores);

  if (nuevosGanadores.length > 0) {
    persistir();
    renderHistorialGanadores();
    mostrarModalGanadores(nuevosGanadores);
  }
}

function crearElemento(etiqueta, clases, texto) {
  const el = document.createElement(etiqueta);
  el.className = clases;
  el.textContent = texto;
  return el;
}

function etiquetaTabla(idTabla) {
  return `Tabla #${String(idTabla).padStart(4, '0')}`;
}

function mostrarModalGanadores(nuevosGanadores) {
  const cont = document.getElementById('contenido-modal-ganador');
  cont.replaceChildren();
  nuevosGanadores.forEach(g => {
    const tarjeta = crearElemento('div', 'bg-green-900/30 border-2 border-green-500 rounded-xl p-4 text-center mb-3', '');
    tarjeta.appendChild(crearElemento('p', 'text-xl font-display font-black text-green-400 mb-1', '✅ ¡BINGO!'));
    tarjeta.appendChild(crearElemento('p', 'text-sm text-white font-bold', etiquetaTabla(g.idTabla)));
    tarjeta.appendChild(crearElemento('p', 'text-[10px] text-green-400/70 mt-1', `Ronda ${g.ronda} — ${g.modalidad}`));
    cont.appendChild(tarjeta);
  });
  const modal = document.getElementById('modal-ganador');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function cerrarModalGanador() {
  const modal = document.getElementById('modal-ganador');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function renderHistorialGanadores() {
  const cont = document.getElementById('lista-historial-ganadores');
  cont.replaceChildren();
  if (historialGanadores.length === 0) {
    cont.textContent = 'Aún no hay ganadores registrados.';
    return;
  }
  historialGanadores.slice().reverse().forEach(g => {
    const fila = crearElemento('div', 'glass-soft flex justify-between items-center px-3 py-2', '');
    // Los registros anteriores a F2 no guardaban la modalidad.
    fila.appendChild(crearElemento('span', 'text-xs text-purple-400', g.modalidad ? `Ronda ${g.ronda} · ${g.modalidad}` : `Ronda ${g.ronda}`));
    fila.appendChild(crearElemento('span', 'font-bold text-amber-300', etiquetaTabla(g.idTabla)));
    cont.appendChild(fila);
  });
}

function borrarHistorialGanadores() {
  if (confirm('¿Borrar el historial de ganadores? Las balotas ya cantadas y la ronda actual no se tocan.')) {
    historialGanadores = [];
    persistir();
    renderHistorialGanadores();
  }
}

// ============================================================
// PARTIDAS GUARDADAS (D-06): cambiar, crear, renombrar, exportar y borrar.
// ============================================================
function renderSelectorPartidas() {
  const select = document.getElementById('select-partida');
  select.replaceChildren();
  const lista = almacen.listar();
  if (!lista.some(r => r.id === partida.id)) lista.unshift(BingoPartidas.resumen(partida)); // partida sin guardar
  lista.forEach(r => {
    const op = document.createElement('option');
    op.value = r.id;
    op.textContent = `${r.nombre} (${r.numTablas} tabla${r.numTablas === 1 ? '' : 's'})`;
    select.appendChild(op);
  });
  select.value = partida.id;
  const n = Object.keys(tablasImportadas).length;
  document.getElementById('info-partida').textContent =
    `${lista.length} de ${BingoPartidas.MAX_PARTIDAS} partidas guardadas en este navegador · Esta: creada ${BingoPartidas.fechaLegible(partida.creada)}, ${n} tabla${n === 1 ? '' : 's'}, ronda ${rondaActual}.`;
}

// Muestra en pantalla la partida recibida (ya abierta en el almacén).
function abrirPartida(p) {
  cargarDePartida(p);
  cerrarModalGanador();
  document.getElementById('input-id-tabla').value = '';
  document.getElementById('resultado-verificacion').replaceChildren();
  actualizarInfoTablasImportadas();
  aplicarPatronActivo();
  actualizarTableroUI();
  actualizarUIRonda();
  renderHistorialGanadores();
  renderSelectorPartidas();
}

function cambiarPartida(id) {
  persistir();
  const p = almacen.obtener(id);
  if (!p) {
    alert('No se pudo abrir esa partida: sus datos se dañaron o se borraron en otra pestaña.');
    renderSelectorPartidas();
    return;
  }
  almacen.activar(id);
  abrirPartida(p);
  verificarGanadoresAutomatico();
}

function nuevaPartida() {
  const nombre = prompt('Nombre de la nueva partida:', `Partida del ${BingoPartidas.fechaLegible(Date.now())}`);
  if (nombre === null) return;
  persistir();
  if (!BingoPartidas.confirmarEspacioParaNueva(almacen)) return;
  const p = almacen.crear({ nombre: nombre.trim() || undefined });
  if (!p) {
    alert('El navegador no tiene espacio para guardar otra partida. Exporta y borra partidas antiguas, y vuelve a intentarlo.');
    return;
  }
  abrirPartida(p);
}

function renombrarPartida() {
  const nombre = prompt('Nuevo nombre de la partida:', partida.nombre);
  if (nombre === null || !nombre.trim()) return;
  partida.nombre = nombre.trim().slice(0, 80);
  persistir();
  renderSelectorPartidas();
}

function exportarPartida(formato) {
  persistir();
  if (formato === 'csv') BingoPartidas.descargarCSV(partida);
  else BingoPartidas.descargarJSON(partida);
}

function borrarPartidaActual() {
  if (!confirm(`¿Borrar la partida «${partida.nombre}»? Se pierden sus tablas, balotas e historial, y no se puede deshacer.\n\nSi la necesitas, cancela y descárgala antes con "📥 JSON".`)) return;
  almacen.borrar(partida.id);
  abrirPartida(almacen.activa() || partidaEnBlanco());
}

window.onload = function() {
  inicializarTableroBalotas();
  actualizarInfoTablasImportadas();
  aplicarPatronActivo();
  actualizarUIRonda();
  renderHistorialGanadores();
  renderSelectorPartidas();
  verificarGanadoresAutomatico();
};
