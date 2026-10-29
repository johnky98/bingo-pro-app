// Reglas del juego (generar y validar cartones): nucleo/motor-bingo.js, compartido con Diseño y Balotera.
const { generarCartonesUnicos, motivoCartonInvalido, detalleRechazos } = BingoMotor;

// ============================================================
// Codificación de la tabla en la URL (base64 URL-safe, sin servidor)
// ============================================================
function codificarCartonURL(columnas, numeroJugador) {
  const json = JSON.stringify({ p: numeroJugador, cols: columnas });
  const base64 = btoa(unescape(encodeURIComponent(json)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodificarCartonURL(codigo) {
  let base64 = codigo.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  const json = decodeURIComponent(escape(atob(base64)));
  return JSON.parse(json);
}

function construirUrlJugador(columnas, numeroJugador) {
  const codigo = codificarCartonURL(columnas, numeroJugador);
  const base = window.location.origin + window.location.pathname;
  return `${base}?c=${codigo}`;
}

// El QR se genera en este navegador (nucleo/qr-local.js): la URL del cartón no sale a ningún servicio externo.
function urlImagenQR(datos) {
  return BingoQR.urlImagen(datos, 2);
}

// ============================================================
// TABLAS DE UNA PARTIDA GUARDADA (F3): la sala puede usar las tablas impresas de una
// partida (creada en Diseño o importada desde su JSON). Así el cartón que revela el QR
// de la tarjeta física #N es exactamente el mismo #N que ya se imprimió. Cada partida
// guarda sus tablas por separado: la sala ya no reemplaza las tablas de otra (H07).
// ============================================================
let almacen = null;                 // se abre solo en la vista del presentador (no en el celular del jugador)
let partidaOrigen = null;           // partida cuyas tablas usa la sala, o null para tablas aleatorias
let tablasImportadasDiseno = {};    // tablas de esa partida

function usarPartida(partida) {
  partidaOrigen = partida && Object.keys(partida.tablas).length > 0 ? partida : null;
  tablasImportadasDiseno = partidaOrigen ? partidaOrigen.tablas : {};
  actualizarInfoTablasImportadas();
}

function importarTablasDesdeDiseno(event) {
  const file = event.target.files[0];
  event.target.value = ''; // permite volver a elegir el mismo archivo
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (evt) {
    let data;
    try {
      data = JSON.parse(evt.target.result);
      if (!Array.isArray(data)) throw new Error('El archivo no contiene una lista de tablas.');
    } catch (err) {
      alert('El archivo no tiene el formato esperado. Debe ser el JSON exportado desde el botón "📥 Exportar Tablas" del módulo de Diseño.');
      return;
    }
    if (!BingoPartidas.confirmarEspacioParaNueva(almacen)) return;

    const resultado = almacen.importar(data, `Tablas de ${file.name.replace(/\.json$/i, '')}`);
    if (resultado.error) {
      alert(resultado.error === 'sin-espacio'
        ? 'El navegador no tiene espacio para guardar otra partida. Abre la Balotera, exporta y borra partidas antiguas, y vuelve a intentarlo.'
        : resultado.error);
      return;
    }
    usarPartida(resultado.partida);
    if (resultado.rechazadas > 0) {
      const validas = Object.keys(resultado.partida.tablas).length;
      const descarte = resultado.rechazadas === 1 ? 'se descartó 1 que no es válida' : `se descartaron ${resultado.rechazadas} que no son válidas`;
      const carga = validas === 1 ? 'Se cargó 1 tabla' : `Se cargaron ${validas} tablas`;
      alert(`${carga} y ${descarte}:` + detalleRechazos(resultado.detalle));
    }
  };
  reader.readAsText(file);
}

function actualizarSelectorPartidas() {
  const select = document.getElementById('select-partida-online');
  select.replaceChildren();
  const aleatorias = document.createElement('option');
  aleatorias.value = '';
  aleatorias.textContent = '— Tablas aleatorias nuevas —';
  select.appendChild(aleatorias);
  almacen.listar().filter(r => r.numTablas > 0).forEach(r => {
    const op = document.createElement('option');
    op.value = r.id;
    op.textContent = `${r.nombre} (${r.numTablas} tabla${r.numTablas === 1 ? '' : 's'})`;
    select.appendChild(op);
  });
  select.value = partidaOrigen ? partidaOrigen.id : '';
}

function actualizarInfoTablasImportadas() {
  const ids = Object.keys(tablasImportadasDiseno).map(Number).filter(n => !isNaN(n));
  const total = ids.length;
  const info = document.getElementById('info-tablas-importadas-diseno');
  const bloqueAleatorio = document.getElementById('bloque-modo-aleatorio');
  const bloqueImportado = document.getElementById('bloque-modo-importado');
  actualizarSelectorPartidas();

  if (total > 0) {
    const minId = Math.min(...ids);
    const maxId = Math.max(...ids);
    info.textContent = `✅ ${total} tabla${total === 1 ? '' : 's'} de «${partidaOrigen.nombre}» (rango #${minId} a #${maxId}).`;
    bloqueAleatorio.classList.add('hidden');
    bloqueImportado.classList.remove('hidden');
    document.getElementById('input-rango-desde').value = minId;
    document.getElementById('input-rango-hasta').value = Math.min(maxId, minId + 19);
    document.getElementById('input-rango-desde').min = minId;
    document.getElementById('input-rango-desde').max = maxId;
    document.getElementById('input-rango-hasta').min = minId;
    document.getElementById('input-rango-hasta').max = maxId;
  } else {
    info.textContent = 'Sin tablas impresas: se generarán tablas aleatorias nuevas.';
    bloqueAleatorio.classList.remove('hidden');
    bloqueImportado.classList.add('hidden');
  }
}

// ============================================================
// VISTA DEL HOST: generación + revelado secuencial de QR
// ============================================================
let jugadoresSala = []; // [{ numero, columnas, url }]
let indiceActual = 0;

function generarSala() {
  const usandoTablasImportadas = !document.getElementById('bloque-modo-importado').classList.contains('hidden');

  if (usandoTablasImportadas) {
    const desde = parseInt(document.getElementById('input-rango-desde').value, 10);
    const hasta = parseInt(document.getElementById('input-rango-hasta').value, 10);

    if (isNaN(desde) || isNaN(hasta) || desde > hasta) {
      alert('Revisa el rango de tarjetas: "Desde" debe ser menor o igual a "Hasta".');
      return;
    }

    jugadoresSala = [];
    for (let id = desde; id <= hasta; id++) {
      const columnas = tablasImportadasDiseno[String(id)];
      if (!columnas) continue; // esa tarjeta no existe en el archivo importado
      jugadoresSala.push({
        numero: id,
        columnas,
        url: construirUrlJugador(columnas, id),
      });
    }

    if (jugadoresSala.length === 0) {
      alert('No se encontró ninguna tarjeta importada en ese rango. Verifica los números.');
      return;
    }
  } else {
    const total = parseInt(document.getElementById('select-max-jugadores').value, 10);
    const cartones = generarCartonesUnicos(total);

    jugadoresSala = cartones.map((columnas, i) => {
      const numero = i + 1;
      return {
        numero,
        columnas,
        url: construirUrlJugador(columnas, numero),
      };
    });
  }

  indiceActual = 0;
  document.getElementById('panel-configuracion').classList.add('hidden');
  document.getElementById('panel-secuencial').classList.remove('hidden');
  mostrarJugadorActual();
}

function mostrarJugadorActual() {
  const jugador = jugadoresSala[indiceActual];
  const total = jugadoresSala.length;

  const esModoImportado = !document.getElementById('bloque-modo-importado').classList.contains('hidden');
  document.getElementById('etiqueta-jugador-actual').textContent = esModoImportado
    ? `Tarjeta #${String(jugador.numero).padStart(4, '0')}`
    : `Jugador ${jugador.numero}`;
  document.getElementById('progreso-sala').textContent = `${indiceActual + 1} de ${total}`;

  const img = document.getElementById('img-qr-actual');
  img.src = urlImagenQR(jugador.url);
  img.classList.remove('anim-nueva');
  void img.offsetWidth;
  img.classList.add('anim-nueva');

  const link = document.getElementById('link-ver-tabla-actual');
  link.href = jugador.url;

  document.getElementById('btn-jugador-anterior').disabled = (indiceActual === 0);
  document.getElementById('btn-jugador-anterior').classList.toggle('opacity-40', indiceActual === 0);

  const esUltimo = (indiceActual === total - 1);
  document.getElementById('btn-jugador-siguiente').classList.toggle('hidden', esUltimo);
  document.getElementById('btn-finalizar-sala').classList.toggle('hidden', !esUltimo);
}

function irAJugadorSiguiente() {
  if (indiceActual < jugadoresSala.length - 1) {
    indiceActual++;
    mostrarJugadorActual();
  }
}

function irAJugadorAnterior() {
  if (indiceActual > 0) {
    indiceActual--;
    mostrarJugadorActual();
  }
}

// Al terminar de repartir los QR la sala queda guardada como partida y se abre en la Balotera:
// - con tablas impresas, es la misma partida de donde salieron (no se copia ni se reemplaza nada);
// - con tablas aleatorias, se crea una partida nueva con las tablas de esta sala.
function finalizarEIrABalotera() {
  if (partidaOrigen) {
    almacen.activar(partidaOrigen.id);
  } else {
    if (!BingoPartidas.confirmarEspacioParaNueva(almacen)) return;
    const tablas = {};
    jugadoresSala.forEach(j => { tablas[String(j.numero)] = j.columnas; });
    const partida = almacen.crear({ nombre: `Sala online · ${BingoPartidas.fechaLegible(Date.now())}`, tablas, origen: 'online' });
    if (!partida) {
      alert('El navegador no tiene espacio para guardar la partida. Usa "Exportar Tablas", y en la Balotera exporta y borra partidas antiguas antes de importarla.');
      return;
    }
  }
  window.location.href = '../modulo_balotera/index.html';
}

function exportarTablasSalaJSON() {
  if (jugadoresSala.length === 0) {
    alert('Primero genera una sala para poder exportar sus tablas.');
    return;
  }

  const lote = jugadoresSala.map(j => ({ id: j.numero, columnas: j.columnas }));
  const blob = new Blob([JSON.stringify(lote, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const fecha = new Date().toISOString().slice(0, 10);

  const a = document.createElement('a');
  a.href = url;
  a.download = `tablas_sala_online_${fecha}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function reiniciarSala() {
  if (jugadoresSala.length > 0 && !confirm('¿Generar una sala nueva? Se perderán las tablas actuales (expórtalas antes si las necesitas).')) {
    return;
  }
  jugadoresSala = [];
  indiceActual = 0;
  document.getElementById('panel-secuencial').classList.add('hidden');
  document.getElementById('panel-configuracion').classList.remove('hidden');
}

function avisarSiEsArchivoLocal() {
  if (window.location.protocol === 'file:') {
    document.getElementById('aviso-sin-conexion').classList.remove('hidden');
    document.getElementById('aviso-sin-conexion-qr').classList.remove('hidden');
  }
}

// ============================================================
// VISTA DEL JUGADOR (cuando la URL trae ?c=<tabla codificada>)
// Sin gate de registro: este producto es de acceso libre, no recolecta
// datos personales. Ver el cartón es inmediato al escanear el QR.
// ============================================================
function claveMarcasJugador(codigo) {
  return `bingo_online_marcas_${codigo}`;
}

function cargarMarcasJugador(codigo) {
  try {
    const guardado = localStorage.getItem(claveMarcasJugador(codigo));
    if (guardado) return JSON.parse(guardado);
  } catch (e) { /* sin localStorage: las marcas no persistirán a un refresco */ }
  return {};
}

function guardarMarcasJugador(codigo, marcas) {
  try {
    localStorage.setItem(claveMarcasJugador(codigo), JSON.stringify(marcas));
  } catch (e) { /* continúa funcionando solo en memoria durante la sesión */ }
}

// Dibuja la grilla 5x5 del cartón dentro de #carton-jugador.
function renderizarCartonJugador(datos, codigo) {
  document.getElementById('jugador-etiqueta').textContent = `Jugador ${datos.p}`;

  const marcas = cargarMarcasJugador(codigo);
  const contenedor = document.getElementById('carton-jugador');
  contenedor.innerHTML = '';

  const coloresLetra = ['letraB', 'letraI', 'letraN', 'letraG', 'letraO'];

  for (let fila = 0; fila < 5; fila++) {
    for (let col = 0; col < 5; col++) {
      const celda = document.createElement('div');
      const esLibre = (fila === 2 && col === 2);
      const clave = `${fila}-${col}`;
      const marcada = esLibre || !!marcas[clave];

      celda.className = `aspect-square rounded-lg flex items-center justify-center font-bold text-sm md:text-base transition select-none
        ${marcada ? `cell-on bg-${coloresLetra[col]} text-white` : 'cell-glass text-purple-100'}`;
      celda.textContent = esLibre ? 'FREE' : datos.cols[col][fila];

      if (!esLibre) {
        celda.addEventListener('click', () => {
          marcas[clave] = !marcas[clave];
          guardarMarcasJugador(codigo, marcas);
          if (marcas[clave]) {
            celda.className = `aspect-square rounded-lg flex items-center justify-center font-bold text-sm md:text-base transition select-none cell-on bg-${coloresLetra[col]} text-white`;
          } else {
            celda.className = 'aspect-square rounded-lg flex items-center justify-center font-bold text-sm md:text-base transition select-none cell-glass text-purple-100';
          }
        });
      }

      contenedor.appendChild(celda);
    }
  }

  document.getElementById('carton-jugador').classList.remove('hidden');
  document.getElementById('nota-marcado-jugador').classList.remove('hidden');
}

function mostrarVistaJugador(codigo) {
  document.getElementById('vista-sala').classList.add('hidden');
  const vista = document.getElementById('vista-jugador');
  vista.classList.remove('hidden');
  vista.classList.add('flex');

  let datos = null;
  try {
    datos = decodificarCartonURL(codigo);
  } catch (e) { /* enlace incompleto o alterado: se informa abajo */ }

  // El cartón viaja en la URL, así que se valida antes de dibujarlo.
  if (!datos || !Number.isInteger(datos.p) || datos.p < 1 || motivoCartonInvalido(datos.cols)) {
    vista.innerHTML = '<p class="text-white text-center">No se pudo leer esta tabla. Pide al presentador un nuevo código QR.</p>';
    return;
  }

  renderizarCartonJugador(datos, codigo);
}

// ============================================================
// Punto de entrada
// ============================================================
const parametrosURL = new URLSearchParams(window.location.search);
const codigoCarton = parametrosURL.get('c');

if (codigoCarton) {
  mostrarVistaJugador(codigoCarton);
} else {
  avisarSiEsArchivoLocal();
  almacen = BingoPartidas.almacenDelNavegador();
  usarPartida(almacen.activa()); // la última partida usada, si tiene tablas
  document.getElementById('select-partida-online').addEventListener('change', e => usarPartida(e.target.value ? almacen.obtener(e.target.value) : null));
  document.getElementById('btn-generar-sala').addEventListener('click', generarSala);
  document.getElementById('btn-jugador-siguiente').addEventListener('click', irAJugadorSiguiente);
  document.getElementById('btn-jugador-anterior').addEventListener('click', irAJugadorAnterior);
  document.getElementById('btn-finalizar-sala').addEventListener('click', finalizarEIrABalotera);
  document.getElementById('btn-reiniciar-sala').addEventListener('click', reiniciarSala);
  document.getElementById('btn-exportar-tablas').addEventListener('click', exportarTablasSalaJSON);
  document.getElementById('input-importar-tablas-diseno').addEventListener('change', importarTablasDesdeDiseno);
  document.getElementById('btn-usar-modo-aleatorio').addEventListener('click', () => usarPartida(null));
}
