# herramientas/

Herramientas de desarrollo de Bingo Pro. **No se publican en la web**: Netlify las quita al publicar y `_redirects` las bloquea. El sitio sigue siendo estático y no necesita compilarse.

## CSS de Tailwind (F4, decisión D-14 B)

Cada página tiene su propio CSS ya generado en `assets/tailwind/` (`menu.css`, `balotera.css`, `online.css`, `diseno.css`). Se generan con Tailwind 3.4.17, la versión que servía el CDN, más autoprefixer. Diseño define colores distintos con los mismos nombres que las otras páginas, por eso cada una tiene su configuración en `generar-css.js`.

**Cuando cambies clases en un HTML o en un `.js` de módulo:**

```
cd herramientas
npm install        # solo la primera vez
npm run css        # regenera assets/tailwind/*.css
```

Luego sube también los `.css` regenerados. La prueba `pruebas/css.test.js` (`node --test "pruebas/*.test.js"` desde la raíz) falla si el CSS quedó desactualizado.

**Clases armadas en tiempo de ejecución** (por ejemplo `bg-${coloresLetra[col]}`): Tailwind no las ve al leer los archivos. Hay que añadirlas a `safelist` en `generar-css.js`.

## Dependencias

Las versiones están fijadas en `package.json` y `package-lock.json`. Ninguna se carga en la web.

| Paquete | Versión | Licencia | Para qué |
|---|---|---|---|
| tailwindcss | 3.4.17 | MIT | Generar el CSS |
| autoprefixer | 10.6.2 | MIT | Prefijos `-webkit-` para Safari/iPhone, como hacía el CDN |
