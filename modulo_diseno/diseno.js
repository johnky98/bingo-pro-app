let modoOrigen = 'generador';
let ultimoLoteTablas = []; // [{ id, columnas }] del último lote renderizado, usado para exportar a JSON
let configDiseno = {
  formato: '5x5',
  colorFondo: '#2E1065',
  colorEncabezado: '#F5711B',
  colorCasilla: '#EDE7D9',
  colorTexto: '#1E0A47',
  titulo: 'BINGO PRO',
  colorTitulo: '#ffffff',
  fuenteTitulo: 'predeterminada',
  posicionLogo: 'superior',
  logoDataUrl: null,
  logoSizeGen: 40,
  fondoCustomDataUrl: null,
  customLogoDataUrl: null,
  customLogoPos: 'superior',
  customLogoSize: 40,
  customShowTitle: false,
  customTituloTxt: 'MI GRAN BINGO',
  customTituloPosY: 8,
  customTituloSize: 18,
  customTituloColor: '#ffffff',
  customTituloFuente: 'predeterminada',
  customShowBingoHeader: false,
  customColorBingoBg: '#F5711B',
  customColorBingoText: '#ffffff',
  customBingoPosY: 20,
  customBingoWidth: 74,
  customBingoSize: 18,
  customShowBox: true,
  customColorNum: '#1E0A47',
  customColorBox: '#ffffff',
  customColorBorder: '#94A3B8',
  customOpacidad: 0.85,
  customPosY: 32,
  customWidth: 84,
  customHeight: 55,
  customFontSize: 14,
  genScale: 100,
  incluirQR: true
};

function onCambioIncluirQR() {
  configDiseno.incluirQR = document.getElementById('cfg-incluir-qr').checked;
  pintarLoteEnPantalla();
}

// ============================================================
// QR POR TARJETA
// Usa EXACTAMENTE la misma codificación que modulo_juego_online
// (codificarCartonURL/decodificarCartonURL), para que el QR impreso en
// la tarjeta #N abra esa misma tarjeta #N sin pasos de importación.
// ============================================================
function codificarCartonURL(columnas, numeroJugador) {
  const json = JSON.stringify({ p: numeroJugador, cols: columnas });
  const base64 = btoa(unescape(encodeURIComponent(json)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Calcula la URL de modulo_juego_online asumiendo la estructura de
// carpetas hermanas descrita en la arquitectura de Bingo Pro:
// modulo_diseno/  y  modulo_juego_online/
function urlBaseJuegoOnline() {
  const aqui = window.location.origin + window.location.pathname;
  return aqui.replace('/modulo_diseno/', '/modulo_juego_online/');
}

function urlTarjetaQR(idNum, columnas) {
  const codigo = codificarCartonURL(columnas, idNum);
  return `${urlBaseJuegoOnline()}?c=${codigo}`;
}

// El QR se genera en el navegador (nucleo/qr-local.js): la URL del cartón no sale a ningún servicio externo.
// Margen de 1 módulo: el recuadro blanco de la tarjeta completa el borde. Nivel L (el del servicio
// anterior): en una tarjeta el QR mide ~1 cm y lo que más ayuda a leerlo es que sea menos denso.
function urlImagenQR(datosURL) {
  return BingoQR.urlImagen(datosURL, 1, 'L');
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('btn-liquid', 'text-white');
    btn.classList.add('text-purple-300');
  });

  document.getElementById(`sec-${tabId}`).classList.remove('hidden');
  const btnActivo = document.getElementById(`btn-tab-${tabId}`);
  btnActivo.classList.add('btn-liquid', 'text-white');
  btnActivo.classList.remove('text-purple-300');

  if(tabId === 'diseno') modoOrigen = 'generador';
  if(tabId === 'subir') modoOrigen = 'subida';
  if(tabId === 'imprimir') renderizarLoteImpresion();
}

function aplicarPlantilla(tipo) {
  if(tipo === 'corporativa') {
    configDiseno.colorFondo = '#0F172A';
    configDiseno.colorEncabezado = '#0284C7';
    configDiseno.colorCasilla = '#F8FAFC';
    configDiseno.colorTexto = '#0F172A';
    configDiseno.titulo = 'EVENTO CORPORATIVO 2026';
  } else if(tipo === 'festiva') {
    configDiseno.colorFondo = '#831843';
    configDiseno.colorEncabezado = '#F43F5E';
    configDiseno.colorCasilla = '#FFF1F2';
    configDiseno.colorTexto = '#831843';
    configDiseno.titulo = 'GRAN BINGO DE CARIDAD';
  }
  
  document.getElementById('cfg-color-fondo').value = configDiseno.colorFondo;
  document.getElementById('cfg-color-encabezado').value = configDiseno.colorEncabezado;
  document.getElementById('cfg-color-casilla').value = configDiseno.colorCasilla;
  document.getElementById('cfg-color-texto').value = configDiseno.colorTexto;
  document.getElementById('cfg-titulo').value = configDiseno.titulo;

  actualizarVistaPrevia();
}

function cargarLogo(e) {
  const file = e.target.files[0];
  if(file) {
    const reader = new FileReader();
    reader.onload = function(evt) {
      configDiseno.logoDataUrl = evt.target.result;
      actualizarVistaPrevia();
    };
    reader.readAsDataURL(file);
  }
}

function cargarLogoCustom(e) {
  const file = e.target.files[0];
  if(file) {
    const reader = new FileReader();
    reader.onload = function(evt) {
      configDiseno.customLogoDataUrl = evt.target.result;
      actualizarEstilosCustom();
    };
    reader.readAsDataURL(file);
  }
}

function cargarFondoPersonalizado(e) {
  const file = e.target.files[0];
  if(file) {
    const reader = new FileReader();
    reader.onload = function(evt) {
      configDiseno.fondoCustomDataUrl = evt.target.result;
      document.getElementById('img-fondo-custom').src = configDiseno.fondoCustomDataUrl;
      document.getElementById('img-fondo-custom').classList.remove('hidden');
      document.getElementById('txt-sin-imagen').classList.add('hidden');
      document.getElementById('grid-overlay-custom').classList.remove('hidden');
      modoOrigen = 'subida';
      actualizarEstilosCustom();
    };
    reader.readAsDataURL(file);
  }
}

function hexToRgba(hex, alpha) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
}

// Tipografías del título (una por categoría). La predeterminada deja la fuente y el grosor de las
// clases font-display/font-black, como estaba antes.
const FUENTES_TITULO = {
  predeterminada: { familia: '', peso: '' },
  serif: { familia: "'Playfair Display', Georgia, 'Times New Roman', serif", peso: '800' },
  sans: { familia: "'Montserrat', 'Helvetica Neue', Arial, sans-serif", peso: '800' },
  slab: { familia: "'Arvo', Rockwell, 'Courier New', serif", peso: '700' },
  script: { familia: "'Pacifico', 'Brush Script MT', cursive", peso: '400' },
  decorativa: { familia: "'Bungee', Impact, sans-serif", peso: '400' },
};

function aplicarFuenteYColorTitulo(el, claveFuente, color) {
  const fuente = FUENTES_TITULO[claveFuente] || FUENTES_TITULO.predeterminada;
  el.style.fontFamily = fuente.familia;
  el.style.fontWeight = fuente.peso;
  el.style.color = color;
}

function actualizarEstilosCustom() {
  configDiseno.customLogoPos = document.getElementById('custom-logo-pos').value;
  configDiseno.customLogoSize = document.getElementById('custom-logo-size').value;
  document.getElementById('val-custom-logo-size').innerText = `${configDiseno.customLogoSize}px`;

  configDiseno.customShowTitle = document.getElementById('custom-show-title').checked;
  configDiseno.customTituloTxt = document.getElementById('custom-titulo-txt').value;
  configDiseno.customShowBingoHeader = document.getElementById('custom-show-bingo-header').checked;
  configDiseno.customColorBingoBg = document.getElementById('custom-color-bingo-bg').value;
  configDiseno.customColorBingoText = document.getElementById('custom-color-bingo-text').value;
  configDiseno.customTituloPosY = document.getElementById('custom-titulo-pos-y').value;
  configDiseno.customTituloSize = document.getElementById('custom-titulo-size').value;
  configDiseno.customTituloColor = document.getElementById('custom-titulo-color').value;
  configDiseno.customTituloFuente = document.getElementById('custom-titulo-fuente').value;
  configDiseno.customBingoPosY = document.getElementById('custom-bingo-pos-y').value;
  configDiseno.customBingoWidth = document.getElementById('custom-bingo-width').value;
  configDiseno.customBingoSize = document.getElementById('custom-bingo-size').value;
  document.getElementById('val-titulo-pos-y').innerText = `${configDiseno.customTituloPosY}%`;
  document.getElementById('val-titulo-size').innerText = `${configDiseno.customTituloSize}px`;
  document.getElementById('val-bingo-pos-y').innerText = `${configDiseno.customBingoPosY}%`;
  document.getElementById('val-bingo-width').innerText = `${configDiseno.customBingoWidth}%`;
  document.getElementById('val-bingo-size').innerText = `${configDiseno.customBingoSize}px`;

  configDiseno.customShowBox = document.getElementById('custom-show-box').checked;
  configDiseno.customColorNum = document.getElementById('custom-color-num').value;
  configDiseno.customColorBox = document.getElementById('custom-color-box').value;
  configDiseno.customColorBorder = document.getElementById('custom-color-border').value;
  
  const opacidadVal = document.getElementById('custom-opacidad').value;
  configDiseno.customOpacidad = opacidadVal / 100;
  
  configDiseno.customPosY = document.getElementById('custom-pos-y').value;
  configDiseno.customWidth = document.getElementById('custom-width').value;
  configDiseno.customHeight = document.getElementById('custom-height').value;
  configDiseno.customFontSize = document.getElementById('custom-font-size').value;

  document.getElementById('val-opacidad').innerText = `${opacidadVal}%`;
  document.getElementById('val-pos-y').innerText = `${configDiseno.customPosY}%`;
  document.getElementById('val-width').innerText = `${configDiseno.customWidth}%`;
  document.getElementById('val-height').innerText = `${configDiseno.customHeight}%`;
  document.getElementById('val-font-size').innerText = `${configDiseno.customFontSize}px`;

  const wrapSup = document.getElementById('custom-logo-sup-wrap');
  const wrapPie = document.getElementById('custom-logo-pie-wrap');
  const wrapWm = document.getElementById('custom-watermark-wrap');
  wrapSup.classList.add('hidden');
  wrapPie.classList.add('hidden');
  wrapWm.classList.add('hidden');

  if(configDiseno.customLogoDataUrl) {
    if(configDiseno.customLogoPos === 'superior') {
      document.getElementById('img-custom-logo-sup').src = configDiseno.customLogoDataUrl;
      document.getElementById('img-custom-logo-sup').style.height = `${configDiseno.customLogoSize}px`;
      wrapSup.classList.remove('hidden');
    } else if(configDiseno.customLogoPos === 'pie') {
      document.getElementById('img-custom-logo-pie').src = configDiseno.customLogoDataUrl;
      document.getElementById('img-custom-logo-pie').style.height = `${configDiseno.customLogoSize}px`;
      wrapPie.classList.remove('hidden');
    } else if(configDiseno.customLogoPos === 'marca-agua') {
      document.getElementById('img-custom-watermark').src = configDiseno.customLogoDataUrl;
      document.getElementById('img-custom-watermark').style.height = `${configDiseno.customLogoSize * 2}px`;
      wrapWm.classList.remove('hidden');
    }
  }

  const wrapTitulo = document.getElementById('custom-titulo-wrap');
  if(configDiseno.customShowTitle) {
    const titulo = document.getElementById('custom-titulo-text');
    titulo.innerText = configDiseno.customTituloTxt;
    titulo.style.fontSize = `${configDiseno.customTituloSize}px`;
    titulo.style.lineHeight = '1.15';
    aplicarFuenteYColorTitulo(titulo, configDiseno.customTituloFuente, configDiseno.customTituloColor);
    wrapTitulo.style.top = `${configDiseno.customTituloPosY}%`;
    wrapTitulo.classList.remove('hidden');
  } else {
    wrapTitulo.classList.add('hidden');
  }

  const wrapBingo = document.getElementById('custom-bingo-header-wrap');
  if(configDiseno.customShowBingoHeader) {
    const box = document.getElementById('custom-bingo-header-box');
    box.style.backgroundColor = configDiseno.customColorBingoBg;
    box.style.color = configDiseno.customColorBingoText;
    box.style.fontSize = `${configDiseno.customBingoSize}px`;
    box.style.lineHeight = '1.2';
    wrapBingo.style.top = `${configDiseno.customBingoPosY}%`;
    wrapBingo.style.width = `${configDiseno.customBingoWidth}%`;
    wrapBingo.classList.remove('hidden');
  } else {
    wrapBingo.classList.add('hidden');
  }

  const overlay = document.getElementById('grid-overlay-custom');
  overlay.style.width = `${configDiseno.customWidth}%`;
  overlay.style.height = `${configDiseno.customHeight}%`;
  overlay.style.top = `${configDiseno.customPosY}%`;

  renderizarGridMuestreoCustom();
}

// Cartón de muestra para las vistas previas (reglas en nucleo/motor-bingo.js).
function generarNumeros5x5() {
  return BingoMotor.generarCarton();
}

function actualizarVistaPrevia() {
  configDiseno.formato = document.getElementById('cfg-formato').value;
  configDiseno.colorFondo = document.getElementById('cfg-color-fondo').value;
  configDiseno.colorEncabezado = document.getElementById('cfg-color-encabezado').value;
  configDiseno.colorCasilla = document.getElementById('cfg-color-casilla').value;
  configDiseno.colorTexto = document.getElementById('cfg-color-texto').value;
  configDiseno.posicionLogo = document.getElementById('cfg-posicion-logo').value;
  configDiseno.logoSizeGen = document.getElementById('cfg-logo-size-gen').value;
  document.getElementById('val-logo-size-gen').innerText = `${configDiseno.logoSizeGen}px`;

  configDiseno.titulo = document.getElementById('cfg-titulo').value || 'BINGO';
  configDiseno.genScale = document.getElementById('cfg-scale-gen').value;
  document.getElementById('val-scale-gen').innerText = `${configDiseno.genScale}%`;

  const carton = document.getElementById('carton-preview');
  carton.style.backgroundColor = configDiseno.colorFondo;

  document.getElementById('prev-bingo-header').style.backgroundColor = configDiseno.colorEncabezado;
  configDiseno.colorTitulo = document.getElementById('cfg-titulo-color').value;
  configDiseno.fuenteTitulo = document.getElementById('cfg-titulo-fuente').value;
  const prevTitulo = document.getElementById('prev-titulo');
  prevTitulo.innerText = configDiseno.titulo;
  // Los cartones impresos se clonan de esta vista previa, así que heredan la fuente y el color.
  aplicarFuenteYColorTitulo(prevTitulo, configDiseno.fuenteTitulo, configDiseno.colorTitulo);

  const containerSup = document.getElementById('prev-logo-container-sup');
  const containerPie = document.getElementById('prev-logo-container-pie');
  const watermark = document.getElementById('prev-watermark');

  containerSup.classList.add('hidden');
  containerPie.classList.add('hidden');
  watermark.classList.add('hidden');

  if(configDiseno.logoDataUrl) {
    if(configDiseno.posicionLogo === 'superior') {
      containerSup.style.height = `${configDiseno.logoSizeGen}px`;
      document.getElementById('img-logo-sup').src = configDiseno.logoDataUrl;
      containerSup.classList.remove('hidden');
    } else if(configDiseno.posicionLogo === 'pie') {
      containerPie.style.height = `${configDiseno.logoSizeGen}px`;
      document.getElementById('img-logo-pie').src = configDiseno.logoDataUrl;
      containerPie.classList.remove('hidden');
    } else if(configDiseno.posicionLogo === 'marca-agua') {
      document.getElementById('img-watermark').src = configDiseno.logoDataUrl;
      watermark.classList.remove('hidden');
    }
  }

  const grid = document.getElementById('prev-grid');
  grid.innerHTML = '';
  grid.style.transform = `scale(${configDiseno.genScale / 100})`;

  if(configDiseno.formato === '5x5') {
    grid.className = "relative z-10 grid grid-cols-5 gap-1.5 flex-1 my-auto transition-transform";
    const nums = generarNumeros5x5();
    for(let r = 0; r < 5; r++) {
      for(let c = 0; c < 5; c++) {
        const cell = document.createElement('div');
        cell.className = "aspect-square rounded-lg flex items-center justify-center font-display font-black text-sm sm:text-base shadow-sm border border-black/10";
        cell.style.backgroundColor = configDiseno.colorCasilla;
        cell.style.color = configDiseno.colorTexto;

        if(r === 2 && c === 2) {
          cell.innerText = "FREE";
          cell.style.fontSize = "10px";
          cell.style.backgroundColor = configDiseno.colorEncabezado;
          cell.style.color = "#FFFFFF";
        } else {
          cell.innerText = nums[c][r];
        }
        grid.appendChild(cell);
      }
    }
  }
}

function renderizarGridMuestreoCustom() {
  const overlay = document.getElementById('grid-overlay-custom');
  overlay.innerHTML = '';
  const nums = generarNumeros5x5();
  for(let r = 0; r < 5; r++) {
    for(let c = 0; c < 5; c++) {
      const cell = document.createElement('div');
      cell.className = "rounded flex items-center justify-center font-display font-black shadow-sm transition-all";
      
      if(configDiseno.customShowBox) {
        cell.style.backgroundColor = hexToRgba(configDiseno.customColorBox, configDiseno.customOpacidad);
        cell.style.border = `1.5px solid ${configDiseno.customColorBorder}`;
      } else {
        cell.style.backgroundColor = 'transparent';
        cell.style.border = 'none';
      }

      cell.style.color = configDiseno.customColorNum;
      cell.style.fontSize = `${configDiseno.customFontSize}px`;
      cell.innerText = (r === 2 && c === 2) ? "★" : nums[c][r];
      overlay.appendChild(cell);
    }
  }
}

function usarSubidaEImprimir() {
  if(!configDiseno.fondoCustomDataUrl) {
    alert("Por favor selecciona primero una imagen para la tabla.");
    return;
  }
  modoOrigen = 'subida';
  switchTab('imprimir');
}

function crearElementoCarton(tabla) {
  const idNum = tabla.id;
  const numsFijos = tabla.columnas;

  if(modoOrigen === 'subida') {
    const wrap = document.createElement('div');
    wrap.className = "carton-print-item relative aspect-[3/4] rounded-xl overflow-hidden shadow border border-slate-700 bg-slate-900 flex items-center justify-center";
    
    const img = document.createElement('img');
    img.src = configDiseno.fondoCustomDataUrl;
    img.className = "absolute inset-0 w-full h-full object-cover";
    wrap.appendChild(img);

    if(configDiseno.customLogoDataUrl && configDiseno.customLogoPos === 'marca-agua') {
      const wmWrap = document.createElement('div');
      wmWrap.className = "absolute inset-0 flex items-center justify-center opacity-15 pointer-events-none";
      const imgWm = document.createElement('img');
      imgWm.src = configDiseno.customLogoDataUrl;
      imgWm.style.maxHeight = "70%";
      imgWm.style.maxWidth = "70%";
      wmWrap.appendChild(imgWm);
      wrap.appendChild(wmWrap);
    }

    if(configDiseno.customLogoDataUrl && configDiseno.customLogoPos === 'superior') {
      const logoWrap = document.createElement('div');
      logoWrap.className = "absolute top-2 left-1/2 -translate-x-1/2 z-20";
      const imgLogo = document.createElement('img');
      imgLogo.src = configDiseno.customLogoDataUrl;
      imgLogo.style.height = `${Math.round(configDiseno.customLogoSize * 0.8)}px`;
      logoWrap.appendChild(imgLogo);
      wrap.appendChild(logoWrap);
    }

    if(configDiseno.customShowTitle) {
      const titleWrap = document.createElement('div');
      // Posiciones en % del alto del cartón, igual que en la vista previa; letras al 80 % como los números.
      titleWrap.className = "absolute left-0 w-full text-center z-20 px-2";
      titleWrap.style.top = `${configDiseno.customTituloPosY}%`;
      const h2 = document.createElement('h2');
      h2.className = "font-display font-black text-sm text-white drop-shadow";
      h2.style.fontSize = `${Math.round(configDiseno.customTituloSize * 0.8)}px`;
      h2.style.lineHeight = '1.15';
      aplicarFuenteYColorTitulo(h2, configDiseno.customTituloFuente, configDiseno.customTituloColor);
      h2.innerText = configDiseno.customTituloTxt;
      titleWrap.appendChild(h2);
      wrap.appendChild(titleWrap);
    }

    if(configDiseno.customShowBingoHeader) {
      const bingoWrap = document.createElement('div');
      bingoWrap.className = "absolute left-1/2 -translate-x-1/2 z-20";
      bingoWrap.style.width = `${configDiseno.customBingoWidth}%`;
      bingoWrap.style.top = `${configDiseno.customBingoPosY}%`;

      const box = document.createElement('div');
      box.className = "grid grid-cols-5 gap-1 w-full text-center font-display font-black text-xs py-0.5 rounded shadow";
      box.style.backgroundColor = configDiseno.customColorBingoBg;
      box.style.color = configDiseno.customColorBingoText;
      box.style.fontSize = `${Math.round(configDiseno.customBingoSize * 0.8)}px`;
      box.style.lineHeight = '1.2';
      box.innerHTML = '<div>B</div><div>I</div><div>N</div><div>G</div><div>O</div>';
      bingoWrap.appendChild(box);
      wrap.appendChild(bingoWrap);
    }

    const overlay = document.createElement('div');
    overlay.className = "absolute grid grid-cols-5 gap-1.5 p-2 rounded-xl box-border z-10";
    overlay.style.width = `${configDiseno.customWidth}%`;
    overlay.style.height = `${configDiseno.customHeight}%`;
    overlay.style.top = `${configDiseno.customPosY}%`;
    overlay.style.left = `50%`;
    overlay.style.transform = `translateX(-50%)`;

    const nums = numsFijos;
    for(let r = 0; r < 5; r++) {
      for(let c = 0; c < 5; c++) {
        const cell = document.createElement('div');
        cell.className = "rounded flex items-center justify-center font-display font-black shadow-sm";
        
        if(configDiseno.customShowBox) {
          cell.style.backgroundColor = hexToRgba(configDiseno.customColorBox, configDiseno.customOpacidad);
          cell.style.border = `1.5px solid ${configDiseno.customColorBorder}`;
        } else {
          cell.style.backgroundColor = 'transparent';
          cell.style.border = 'none';
        }

        cell.style.color = configDiseno.customColorNum;
        cell.style.fontSize = `${Math.round(configDiseno.customFontSize * 0.8)}px`;
        cell.innerText = (r === 2 && c === 2) ? "★" : nums[c][r];
        overlay.appendChild(cell);
      }
    }
    wrap.appendChild(overlay);

    if(configDiseno.customLogoDataUrl && configDiseno.customLogoPos === 'pie') {
      const pieWrap = document.createElement('div');
      pieWrap.className = "absolute bottom-1 left-1/2 -translate-x-1/2 z-20";
      const imgPie = document.createElement('img');
      imgPie.src = configDiseno.customLogoDataUrl;
      imgPie.style.height = `${Math.round(configDiseno.customLogoSize * 0.7)}px`;
      pieWrap.appendChild(imgPie);
      wrap.appendChild(pieWrap);
    }

    const spanId = document.createElement('span');
    spanId.className = "absolute bottom-1 right-2 text-[8px] font-bold text-slate-800 bg-white/90 px-1.5 py-0.5 rounded border border-slate-300 shadow-sm z-20";
    spanId.innerText = `#${String(idNum).padStart(4, '0')}`;
    wrap.appendChild(spanId);

    if (configDiseno.incluirQR) {
      const qrWrap = document.createElement('div');
      qrWrap.className = "absolute bottom-1 left-2 bg-white rounded p-0.5 shadow z-20 flex items-center justify-center";
      qrWrap.style.width = "36px";
      qrWrap.style.height = "36px";
      const qrImg = document.createElement('img');
      qrImg.src = urlImagenQR(urlTarjetaQR(idNum, numsFijos));
      qrImg.width = 34;
      qrImg.height = 34;
      qrImg.alt = `QR de la tarjeta #${idNum}`;
      qrWrap.appendChild(qrImg);
      wrap.appendChild(qrWrap);
    }

    return wrap;
  } else {
    const clone = document.getElementById('carton-preview').cloneNode(true);
    clone.id = `carton-print-${idNum}`;
    clone.className = "carton-print-item aspect-[3/4] rounded-xl p-4 shadow flex flex-col justify-between relative overflow-hidden";
    const spanId = clone.querySelector('span');
    if(spanId) spanId.innerText = `ID TABLA: #${String(idNum).padStart(4, '0')}`;

    // Cada tabla necesita su propia combinación aleatoria de números.
    // Antes se clonaba tal cual la vista previa, así que todas las tablas
    // del lote salían con exactamente los mismos números.
    const gridClon = clone.querySelector('#prev-grid');
    if (gridClon) {
      gridClon.removeAttribute('id');
      const nums = numsFijos;
      const celdas = gridClon.children;
      let idx = 0;
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          const cell = celdas[idx];
          if (cell) cell.innerText = (r === 2 && c === 2) ? "FREE" : nums[c][r];
          idx++;
        }
      }
    }

    if (configDiseno.incluirQR) {
      const qrWrap = document.createElement('div');
      qrWrap.className = "relative z-20 bg-white rounded p-0.5 shadow shrink-0 flex items-center justify-center";
      qrWrap.style.width = "42px";
      qrWrap.style.height = "42px";
      const qrImg = document.createElement('img');
      qrImg.src = urlImagenQR(urlTarjetaQR(idNum, numsFijos));
      qrImg.width = 40;
      qrImg.height = 40;
      qrImg.alt = `QR de la tarjeta #${idNum}`;
      qrWrap.appendChild(qrImg);

      const pie = clone.querySelector('.relative.z-10.mt-2');
      if (pie) {
        pie.insertBefore(qrWrap, pie.firstChild);
      } else {
        clone.appendChild(qrWrap);
      }
    }

    return clone;
  }
}

// MANEJAR CONTROL DE CANTIDAD (PRESETS vs CUSTOM)
function manejarCambioCantidad() {
  const presetSel = document.getElementById('cant-imprimir-preset').value;
  const customInput = document.getElementById('cant-imprimir-custom');

  if(presetSel === 'custom') {
    customInput.classList.remove('hidden');
    customInput.focus();
  } else {
    customInput.classList.add('hidden');
  }
  renderizarLoteImpresion();
}

function obtenerCantidadTotal() {
  const presetSel = document.getElementById('cant-imprimir-preset').value;
  if(presetSel === 'custom') {
    const valCustom = parseInt(document.getElementById('cant-imprimir-custom').value);
    return (isNaN(valCustom) || valCustom < 1) ? 1 : valCustom;
  }
  return parseInt(presetSel);
}

// Genera un lote NUEVO de tablas (números aleatorios frescos) del tamaño pedido.
// El lote no repite cartones dentro de sí mismo.
function generarNuevoLote(cantidadTotal) {
  ultimoLoteTablas = BingoMotor.generarCartonesUnicos(cantidadTotal).map((columnas, i) => ({ id: i + 1, columnas }));
  // La partida creada guardó el lote anterior: con números nuevos ya no corresponde a lo que se ve.
  loteGuardadoEnPartida = false;
  document.getElementById('aviso-partida-creada').classList.add('hidden');
}

// Dibuja en pantalla el lote que ya está en ultimoLoteTablas, SIN generar
// números nuevos. Así, ver la vista previa varias veces, cambiar de pestaña,
// imprimir y exportar usan siempre exactamente los mismos números.
function pintarLoteEnPantalla() {
  const container = document.getElementById('area-impresion');
  container.innerHTML = '';

  const paginasNecesarias = Math.ceil(ultimoLoteTablas.length / 4);
  document.getElementById('info-hojas-totales').innerText = `${paginasNecesarias} Hoja${paginasNecesarias !== 1 ? 's' : ''} Carta`;

  let idx = 0;
  for (let p = 0; p < paginasNecesarias; p++) {
    const pagina = document.createElement('div');
    pagina.className = "pagina-impresion";

    for (let i = 0; i < 4; i++) {
      if (idx < ultimoLoteTablas.length) {
        const cartonEl = crearElementoCarton(ultimoLoteTablas[idx]);
        pagina.appendChild(cartonEl);
        idx++;
      }
    }
    container.appendChild(pagina);
  }
}

// Punto de entrada usado por los controles de la pestaña Imprimir.
// Solo genera números nuevos si la cantidad pedida cambió; si no, reutiliza
// el lote que ya existe para que no se "muevan" los números sin querer.
function renderizarLoteImpresion() {
  const cantidadTotal = obtenerCantidadTotal();
  if (ultimoLoteTablas.length !== cantidadTotal) {
    generarNuevoLote(cantidadTotal);
  }
  pintarLoteEnPantalla();
}

// Fuerza un lote 100% nuevo (mismos IDs, números distintos), a pedido explícito del usuario.
function regenerarLoteManual() {
  const cantidadTotal = obtenerCantidadTotal();
  generarNuevoLote(cantidadTotal);
  pintarLoteEnPantalla();
}

// Espera a que carguen (o fallen) las imágenes de las tarjetas, con un tope de tiempo, y devuelve
// cuántas no están listas: si el logo, la plantilla o un QR no han cargado, las tarjetas
// saldrían impresas sin ellos sin que nadie lo note.
function esperarImagenes(contenedor, maxMs) {
  // Cada cartón clonado trae <img> de logo y marca de agua sin src cuando no se usan: no cuentan.
  const imgs = [...contenedor.querySelectorAll('img')].filter(img => img.getAttribute('src'));
  const pendientes = imgs.filter(img => !img.complete).map(img => new Promise(ok => {
    img.addEventListener('load', ok, { once: true });
    img.addEventListener('error', ok, { once: true });
  }));
  return Promise.race([Promise.all(pendientes), new Promise(ok => setTimeout(ok, maxMs))])
    .then(() => ({ total: imgs.length, sinCargar: imgs.filter(img => !img.complete || img.naturalWidth === 0).length }));
}

let esperandoImpresion = false;
let loteImpresoSinExportar = false; // se imprimió algo desde la última exportación a JSON
let loteGuardadoEnPartida = false;  // el lote en pantalla ya está guardado como partida (no hace falta el JSON)

function generarEImprimir() {
  if (esperandoImpresion) return;
  esperandoImpresion = true;
  renderizarLoteImpresion(); // solo genera si aún no hay lote para esta cantidad
  // También se esperan las tipografías del título: si no han cargado, la hoja saldría con la fuente de respaldo.
  Promise.all([esperarImagenes(document.getElementById('area-impresion'), 15000), document.fonts.ready]).then(([{ total, sinCargar }]) => {
    esperandoImpresion = false;
    if (sinCargar > 0 && !confirm(
      `${sinCargar} de ${total} imágenes de las tarjetas no han cargado. ` +
      'Si imprimes ahora, esas tarjetas saldrán sin ellas.\n\n¿Imprimir de todos modos? Cancela para revisar tu conexión y volver a intentarlo.')) {
      return;
    }
    loteImpresoSinExportar = !loteGuardadoEnPartida;
    window.print();
  });
}

// Exporta el lote actual (ID + números exactos de cada tabla) a un archivo
// JSON descargable, para poder verificar tablas ganadoras luego en el
// módulo de Balotera sin depender de que ambos módulos compartan memoria.
// Usa el MISMO lote que se ve en pantalla / se imprimió, nunca genera uno nuevo.
function exportarTablasJSON() {
  renderizarLoteImpresion(); // asegura que exista un lote, sin regenerar si ya coincide

  if (ultimoLoteTablas.length === 0) {
    alert('No hay tablas generadas para exportar.');
    return;
  }

  const blob = new Blob([JSON.stringify(ultimoLoteTablas, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const fecha = new Date().toISOString().slice(0, 10);

  const a = document.createElement('a');
  a.href = url;
  a.download = `tablas_bingo_${fecha}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  loteImpresoSinExportar = false;
}

// Guarda el lote en pantalla como una partida nueva (F3): la Balotera y la Sala Online
// la abren directamente, sin exportar ni importar archivos.
function usarLoteEnPartida() {
  renderizarLoteImpresion(); // el mismo lote que se ve, sin regenerar
  if (ultimoLoteTablas.length === 0) {
    alert('No hay tablas generadas para guardar.');
    return;
  }
  const almacen = BingoPartidas.almacenDelNavegador();
  if (!BingoPartidas.confirmarEspacioParaNueva(almacen)) return;

  const tablas = {};
  ultimoLoteTablas.forEach(t => { tablas[String(t.id)] = t.columnas; });
  const n = ultimoLoteTablas.length;
  const titulo = modoOrigen === 'subida' ? 'Plantilla propia' : configDiseno.titulo;
  const partida = almacen.crear({ nombre: `${titulo} · ${BingoPartidas.fechaLegible(Date.now())}`, tablas, origen: 'diseno' });
  if (!partida) {
    alert('El navegador no tiene espacio para guardar la partida. Abre la Balotera, exporta y borra partidas antiguas, y vuelve a intentarlo. Mientras tanto puedes usar "📥 Exportar Tablas".');
    return;
  }
  loteGuardadoEnPartida = true; // las tablas ya quedaron guardadas en la partida
  loteImpresoSinExportar = false;
  document.getElementById('texto-partida-creada').textContent = `✅ Partida «${partida.nombre}» creada y abierta con estas ${n} tablas.`;
  document.getElementById('aviso-partida-creada').classList.remove('hidden');
}

// El lote solo vive en memoria: si se imprimió y no se exportó, al cerrar o recargar la página
// se pierde la lista exacta de tablas y no habrá con qué verificar ganadores en la Balotera.
window.addEventListener('beforeunload', e => {
  if (!loteImpresoSinExportar) return;
  e.preventDefault();
  e.returnValue = ''; // necesario en Chrome para que muestre el aviso de salida
});

window.onload = function() {
  actualizarVistaPrevia();
};
