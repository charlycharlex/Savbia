# Recicladora Savbia · sitio de producto

Página de producto estilo Apple para la recicladora de cocina Savbia (Latinoamérica).
El modelo 3D se abre y se despieza con el scroll, y el visitante puede cambiar el color en vivo.

## Cómo correrlo

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # genera dist/ listo para publicar
npm run preview  # prueba local de dist/
```

## Recorrido de la página

1. **Hero** · producto girando suavemente, titular y llamados a la acción.
2. **Manifiesto** · texto que se ilumina palabra por palabra.
3. **Diseño** (fijo, 520vh) · el scroll reproduce la animación *Desarme* del .glb: tapa → cubeta → filtro, con un punto que marca cada pieza.
4. **Por dentro** (fijo, 460vh) · despiece de las 7 piezas con etiquetas ancladas, carcasa en "rayos X" y giro de cámara.
5. Lista de piezas, Cómo funciona, Cifras, Modos (pestañas), Qué puede entrar.
6. **Colores** · blanco, verde oliva y negro sobre el mismo modelo; se puede arrastrar para girarlo.
7. Especificaciones, contenido actual de savbia.com (plataforma, propósito, testimonio), Preguntas frecuentes, Lista de espera y pie de página.

## Páginas

| Ruta | Archivo | Qué es |
| --- | --- | --- |
| `/` | `index.html` | Inicio: la recicladora en 3D + contenido de la plataforma |
| `/proposito/` | `proposito/index.html` | Propósito de Savbia |
| `/quiz/` | `quiz/index.html` | Quiz de sostenibilidad (8 preguntas, 4 perfiles) |
| `/tienda/` | `tienda/index.html` | Recicladora destacada, accesorios y criterios |
| `/blog/` | `blog/index.html` | Índice del blog |
| `/blog/<slug>/` | `blog/<slug>/index.html` | Artículos |

El encabezado y el pie son compartidos: viven en `partials/header.html` y `partials/footer.html`
y se insertan en cada página con `<!--@header seccion-->` y `<!--@footer-->` (ver `vite.config.js`).

**Para agregar un artículo:** copia una carpeta de `blog/`, cambia el contenido, agrega la ruta en
`PAGES` dentro de `vite.config.js` y una tarjeta en `blog/index.html`.

## Dónde editar

| Qué | Archivo |
| --- | --- |
| Textos de cada página | el `index.html` de su carpeta |
| Menú y pie de página | `partials/` |
| Preguntas, perfiles y consejos del quiz | `src/pages/quiz.js` |
| Colores del sitio y diseño | `src/style.css` (variables en `:root`) y `src/pages.css` |
| Cámara y estado del producto en cada sección | `src/main.js` → `poses()` y `buildKeys()` |
| Acabados de color y separación de piezas | `src/scene.js` → `FINISHES` y `PARTS` |

Las cifras marcadas con `*` son valores de referencia del fabricante y deben confirmarse.
Peso y garantía están como "Por confirmar".

## Modelo 3D

`public/models/recicladora.glb` sale del archivo `Savbia_Recicladora_Blanco.glb` del proveedor, comprimido con meshopt (2.7 MB → 470 KB).
Las tres versiones de color comparten geometría y animación, así que se carga un solo modelo y se cambian los materiales `01`, `02` y `06`.

Si el proveedor manda un modelo nuevo:

```bash
npx gltf-transform optimize nuevo.glb public/models/recicladora.glb --compress meshopt --texture-compress false --simplify false --join false --flatten false --instance false --palette false
```

Los nombres de los grupos (`01_Tapa`, `02_Cubeta`, `03_Asa`, `04_Filtro`, `05_Carcasa`, `06_Camara_termica`, `07_Base_motor`) y el clip `Desarme` deben conservarse.

## Lista de espera

El formulario valida el correo, pero **todavía no lo guarda en ningún lado**.
Crea un archivo `.env` con la URL de tu servicio (Formspree, Brevo, Mailchimp, un webhook, etc.):

```
VITE_WAITLIST_ENDPOINT=https://formspree.io/f/xxxxxxx
```

Se envía un `POST` JSON con `{ email, origen: "recicladora" }`.

## Publicar

Cualquier hosting estático sirve (Vercel, Netlify, Cloudflare Pages): comando `npm run build`, carpeta `dist`.
Luego se puede apuntar un subdominio (por ejemplo `recicladora.savbia.com`) o enlazarlo desde el sitio de Wix.

## Accesibilidad y rendimiento

- Respeta "reducir movimiento" del sistema: sin scroll suave ni balanceo.
- Si el navegador no tiene WebGL, se muestran los renders del proveedor.
- El texto es HTML real (se lee en móvil y lo indexan los buscadores).
