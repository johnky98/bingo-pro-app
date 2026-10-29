// ============================================================
// QR GENERADO EN EL NAVEGADOR (F3): reemplaza a api.qrserver.com, que recibía la
// dirección completa de cada cartón. Usa assets/vendor/qrcode-generator-1.4.4/qrcode.js
// (MIT) y devuelve una imagen SVG en data: URL, así funciona sin internet y se imprime nítida.
// ============================================================
(function (raiz, fabrica) {
  const generador = raiz.qrcode || (typeof require === 'function' ? require('../assets/vendor/qrcode-generator-1.4.4/qrcode.js') : null);
  const modulo = fabrica(generador);
  if (typeof module === 'object' && module.exports) module.exports = modulo;
  else raiz.BingoQR = modulo;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (qrcode) {
  'use strict';

  // Nivel de corrección: M tolera ~15 % de daño; L (~7 %) hace el código menos denso, que es lo que más
  // importa cuando el QR se imprime muy pequeño (era el nivel por defecto del servicio anterior).
  function matriz(textoQR, nivel = 'M') {
    const qr = qrcode(0, nivel); // 0 = el tamaño más pequeño en el que quepa el texto
    qr.addData(textoQR, 'Byte');
    qr.make();
    return qr;
  }

  // margen: módulos blancos alrededor (la norma pide 4; en las tarjetas el recuadro blanco ya suma).
  function svg(textoQR, margen = 4, nivel = 'M') {
    const qr = matriz(textoQR, nivel);
    return qr.createSvgTag({ cellSize: 1, margin: margen, scalable: true })
      .replace('<svg ', '<svg shape-rendering="crispEdges" ');
  }

  function urlImagen(textoQR, margen = 4, nivel = 'M') {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg(textoQR, margen, nivel));
  }

  return { matriz, svg, urlImagen };
});
