// Pruebas del QR local. La lectura real de los códigos se comprobó con un lector independiente
// (jsQR) fuera del repositorio; aquí se cubre la forma de la imagen. Ejecutar:  node --test "pruebas/*.test.js"
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Q = require('../nucleo/qr-local.js');

const URL_CARTON = 'https://gentle-starlight-b32724.netlify.app/modulo_juego_online/index.html?c=' + 'A'.repeat(140);

test('el mismo texto produce siempre el mismo QR', () => {
  assert.equal(Q.svg(URL_CARTON), Q.svg(URL_CARTON));
  assert.notEqual(Q.svg(URL_CARTON), Q.svg(URL_CARTON + 'B'));
});

test('el tamaño crece con el texto y una URL de cartón cabe', () => {
  const corto = Q.matriz('hola').getModuleCount();
  const largo = Q.matriz(URL_CARTON).getModuleCount();
  assert.ok(corto < largo);
  assert.ok(largo <= 177); // tamaño máximo de un QR
});

test('SVG escalable, en blanco y negro y con bordes nítidos', () => {
  const s = Q.svg('x');
  assert.match(s, /^<svg shape-rendering="crispEdges" /);
  assert.match(s, /viewBox="0 0 \d+ \d+"/);
  assert.doesNotMatch(s, / width="\d+px"/); // se adapta al tamaño del recuadro
  assert.match(s, /fill="white"/);
  assert.match(s, /fill="black"/);
});

test('el nivel L (tarjetas impresas) es menos denso que el M (pantalla)', () => {
  assert.ok(Q.matriz(URL_CARTON, 'L').getModuleCount() < Q.matriz(URL_CARTON, 'M').getModuleCount());
  assert.notEqual(Q.svg(URL_CARTON, 1, 'L'), Q.svg(URL_CARTON, 1, 'M'));
});

test('el margen se puede ajustar', () => {
  const n = Q.matriz('x').getModuleCount();
  assert.match(Q.svg('x', 0), new RegExp(`viewBox="0 0 ${n} ${n}"`));
  assert.match(Q.svg('x', 4), new RegExp(`viewBox="0 0 ${n + 8} ${n + 8}"`));
});

test('urlImagen es una data: URL que no sale a ningún servidor', () => {
  const u = Q.urlImagen(URL_CARTON);
  assert.ok(u.startsWith('data:image/svg+xml;charset=utf-8,'));
  assert.equal(decodeURIComponent(u.split(',')[1]), Q.svg(URL_CARTON));
  assert.doesNotMatch(u, /qrserver|https%3A%2F%2Fapi/);
});
