import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = import.meta.dirname;
const PAGES = {
  main: 'index.html',
  proposito: 'proposito/index.html',
  quiz: 'quiz/index.html',
  tienda: 'tienda/index.html',
  blog: 'blog/index.html',
  'blog-comida': 'blog/lo-que-pasa-con-la-comida-que-tiramos/index.html',
  'blog-plantas': 'blog/abono-para-tus-plantas/index.html',
  'blog-cocina': 'blog/decisiones-en-la-cocina/index.html',
  notfound: '404.html',
};

// Dominio público del sitio (para canonical, og:url y og:image absolutos).
// En Vercel se puede cambiar con la variable de entorno SITE_URL.
const SITE = (process.env.SITE_URL || 'https://savbia.vercel.app').replace(/\/$/, '');

// Inserta el encabezado y el pie compartidos en cada página y completa las metas:
//   <!--@header inicio-->  (marca la sección activa)
//   <!--@footer-->
function partials() {
  const read = (f) => readFileSync(resolve(root, 'partials', f), 'utf8');
  return {
    name: 'savbia-partials',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const path = ctx.path.replace(/index\.html$/, '');
        const url = SITE + path;
        const out = html
          .replace(/<!--@header (\w+)-->/, (_, active) =>
            read('header.html').replace(/\{\{(\w+)\}\}/g, (_m, key) => (key === active ? 'aria-current="page"' : ''))
          )
          .replace('<!--@footer-->', () => read('footer.html'))
          .replace(/(property="og:image" content=")\//g, '$1' + SITE + '/');
        return {
          html: out,
          tags: [
            // marca que hay JS antes de pintar (las animaciones de entrada solo ocultan con JS)
            { tag: 'script', children: "document.documentElement.classList.add('js')", injectTo: 'head-prepend' },
            ...(path.includes('404') ? [] : [
              { tag: 'link', attrs: { rel: 'canonical', href: url }, injectTo: 'head' },
              { tag: 'meta', attrs: { property: 'og:url', content: url }, injectTo: 'head' },
            ]),
            { tag: 'meta', attrs: { property: 'og:site_name', content: 'Savbia' }, injectTo: 'head' },
            { tag: 'meta', attrs: { property: 'og:locale', content: 'es_MX' }, injectTo: 'head' },
            { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' }, injectTo: 'head' },
          ],
        };
      },
    },
  };
}

// Solo en desarrollo: guarda capturas del canvas enviadas a /__capture?name=x (pruebas visuales)
function captures() {
  return {
    name: 'savbia-captures',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__capture', (req, res) => {
        const name = new URL(req.url, 'http://x').searchParams.get('name') || 'frame';
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', async () => {
          const { mkdirSync, writeFileSync } = await import('node:fs');
          const dir = resolve(root, '.captures');
          mkdirSync(dir, { recursive: true });
          writeFileSync(resolve(dir, `${name.replace(/[^\w-]/g, '')}.jpg`), Buffer.from(body, 'base64'));
          res.end('ok');
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [partials(), captures()],
  build: {
    // three.js pesa ~600 kB sin comprimir; es esperado
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      input: Object.fromEntries(Object.entries(PAGES).map(([k, v]) => [k, resolve(root, v)])),
    },
  },
});
