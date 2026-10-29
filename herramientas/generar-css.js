// Genera assets/tailwind/<pagina>.css con Tailwind 3.4.17 (la versión que servía el CDN).
// Uso (desde herramientas/):  npm run css            -> escribe los archivos
//                              npm run css:comprobar  -> falla si alguno quedó desactualizado
// Cada página tiene su propia configuración porque Diseño define colores distintos con el
// mismo nombre (brandOrange, brandDark...): así cada una se ve exactamente como con el CDN.
const fs = require('fs');
const path = require('path');
const postcss = require('postcss');
const tailwindcss = require('tailwindcss');
const autoprefixer = require('autoprefixer');

// Prefijos -webkit- como los que añadía el CDN (Safari/iPhone los sigue necesitando, p. ej. user-select).
const NAVEGADORES = ['defaults', 'iOS >= 9', 'Safari >= 9'];

const RAIZ = path.resolve(__dirname, '..');
const SALIDA = path.join(RAIZ, 'assets', 'tailwind');
const ENTRADA = '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n';

const LETRAS = {
  letraB: '#FF6B00', letraI: '#7C3AED', letraN: '#D9A32B', letraG: '#DC2626', letraO: '#0D9488',
};
// Clases que el código arma mientras corre (`bg-${coloresLetra[col]}`): Tailwind no las ve al leer los archivos.
const FONDOS_LETRAS = Object.keys(LETRAS).map(l => `bg-${l}`);

const PAGINAS = {
  menu: {
    archivos: ['index.html'],
    tema: { colors: { brandDark: '#130A2A', brandPurple: '#201140', brandOrange: '#FF6B00', brandOrangeHover: '#E55F00' } },
  },
  balotera: {
    archivos: ['modulo_balotera/index.html', 'modulo_balotera/*.js'],
    tema: {
      colors: { brandDark: '#130A2A', brandCard: '#201140', brandOrange: '#FF6B00', brandOrangeHover: '#E55F00', gridBg: '#2E175B', ...LETRAS },
      fontFamily: { display: ['Arial Black', 'Impact', 'sans-serif'] },
    },
    safelist: FONDOS_LETRAS,
  },
  online: {
    archivos: ['modulo_juego_online/index.html', 'modulo_juego_online/*.js'],
    tema: {
      colors: { brandDark: '#130A2A', brandCard: '#201140', brandOrange: '#FF6B00', brandOrangeHover: '#E55F00', gridBg: '#2E175B', ...LETRAS, brandCream: '#EDE7D9' },
      fontFamily: { display: ['Arial Black', 'Impact', 'sans-serif'] },
    },
    safelist: FONDOS_LETRAS,
  },
  diseno: {
    archivos: ['modulo_diseno/index.html', 'modulo_diseno/*.js'],
    tema: {
      colors: { brandDark: '#1E0A47', brandPurple: '#2E1065', brandOrange: '#F5711B', brandGold: '#C9982B', brandCream: '#EDE7D9', brandCreamLight: '#F7F3E8' },
      fontFamily: { display: ['Arial Black', 'Arial', 'sans-serif'] },
    },
  },
};

async function generar(nombre) {
  const p = PAGINAS[nombre];
  const config = {
    content: p.archivos.map(a => path.join(RAIZ, a).replace(/\\/g, '/')),
    theme: { extend: p.tema },
    safelist: p.safelist || [],
  };
  const resultado = await postcss([tailwindcss(config), autoprefixer({ overrideBrowserslist: NAVEGADORES })]).process(ENTRADA, { from: undefined });
  return `/* Generado por herramientas/generar-css.js (Tailwind 3.4.17 + autoprefixer). No editar a mano: cambiar el HTML/JS y ejecutar "npm run css". */\n${resultado.css}`;
}

(async () => {
  const comprobar = process.argv.includes('--comprobar');
  fs.mkdirSync(SALIDA, { recursive: true });
  const desactualizados = [];
  for (const nombre of Object.keys(PAGINAS)) {
    const css = await generar(nombre);
    const archivo = path.join(SALIDA, `${nombre}.css`);
    const actual = fs.existsSync(archivo) ? fs.readFileSync(archivo, 'utf8').replace(/\r\n/g, '\n') : null;
    if (comprobar) {
      if (actual !== css) desactualizados.push(`assets/tailwind/${nombre}.css`);
    } else {
      fs.writeFileSync(archivo, css);
      console.log(`${nombre}.css  ${(css.length / 1024).toFixed(1)} KB`);
    }
  }
  if (desactualizados.length) {
    console.error(`CSS desactualizado: ${desactualizados.join(', ')}. Ejecuta "npm run css" en herramientas/.`);
    process.exitCode = 1;
  } else if (comprobar) {
    console.log('CSS al día.');
  }
})();
