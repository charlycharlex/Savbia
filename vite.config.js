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
};

// Inserta el encabezado y el pie compartidos en cada página:
//   <!--@header inicio-->  (marca la sección activa)
//   <!--@footer-->
function partials() {
  const read = (f) => readFileSync(resolve(root, 'partials', f), 'utf8');
  return {
    name: 'savbia-partials',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html
          .replace(/<!--@header (\w+)-->/, (_, active) =>
            read('header.html').replace(/\{\{(\w+)\}\}/g, (_m, key) => (key === active ? 'aria-current="page"' : ''))
          )
          .replace('<!--@footer-->', () => read('footer.html'));
      },
    },
  };
}

export default defineConfig({
  plugins: [partials()],
  build: {
    // three.js pesa ~600 kB sin comprimir; es esperado
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      input: Object.fromEntries(Object.entries(PAGES).map(([k, v]) => [k, resolve(root, v)])),
    },
  },
});
