// El CSS de Tailwind (assets/tailwind/*.css) se genera en herramientas/ y se versiona. Esta prueba lo
// regenera en memoria y falla si el del repositorio quedó desactualizado (por ejemplo, tras añadir una
// clase nueva en un HTML o JS sin ejecutar "npm run css"). Requiere "npm install" en herramientas/.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const HERRAMIENTAS = path.join(__dirname, '..', 'herramientas');
const instalado = fs.existsSync(path.join(HERRAMIENTAS, 'node_modules', 'tailwindcss'));

test('assets/tailwind/*.css está al día con el HTML y el JS', { skip: !instalado && 'falta "npm install" en herramientas/' }, () => {
  const salida = execFileSync(process.execPath, ['generar-css.js', '--comprobar'], { cwd: HERRAMIENTAS, encoding: 'utf8' });
  assert.match(salida, /CSS al día/);
});

test('ninguna página carga Tailwind desde el CDN', () => {
  const raiz = path.join(__dirname, '..');
  const paginas = ['index.html', '404.html', 'modulo_balotera/index.html', 'modulo_juego_online/index.html', 'modulo_diseno/index.html'];
  for (const p of paginas) {
    const html = fs.readFileSync(path.join(raiz, p), 'utf8');
    assert.doesNotMatch(html, /cdn\.tailwindcss\.com|tailwind\.config/, p);
  }
});
