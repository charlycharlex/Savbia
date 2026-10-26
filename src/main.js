// Página de inicio: experiencia 3D de la recicladora ligada al scroll.
import { $, $$, reduced, ScrollTrigger } from './common.js';
import { createScene } from './scene.js';

/* ---------------- 3D ---------------- */
const loaderEl = $('#loader');
const bar = $('#loader .bar span');
const hideLoader = () => loaderEl.classList.add('is-done');

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

let scene = null;
if (hasWebGL()) {
  scene = createScene({ canvas: $('#stage'), onProgress: (p) => (bar.style.width = `${Math.round(p * 100)}%`) });
  scene.setReduced(reduced);
  if (import.meta.env.DEV) window.__scene = scene;
  // la cámara arranca lejos y transparente: el suavizado hace la entrada
  Object.assign(scene.cur, { dist: 2.4, opacity: 0, ty: 0.1, az: -1.1 });
  scene.loaded
    .then(() => {
      bar.style.width = '100%';
      setTimeout(hideLoader, 250);
    })
    .catch((err) => {
      console.error('No se pudo cargar el modelo', err);
      fallbackImages();
      hideLoader();
    });
  setTimeout(hideLoader, 9000); // nunca bloquear la página
} else {
  fallbackImages();
  hideLoader();
}

function fallbackImages() {
  document.documentElement.classList.add('no-webgl');
  const add = (sel, src, alt) => {
    const img = new Image();
    img.src = src;
    img.alt = alt;
    img.className = 'fallback-img';
    $(sel)?.appendChild(img);
  };
  add('.hero__in', '/img/blanco.webp', 'Recicladora Savbia en color blanco');
  add('#desarme .stage-grid', '/img/apertura.webp', 'Recicladora abierta con cubeta y filtro fuera');
  add('.colors__in', '/img/colores.webp', 'Recicladora en blanco, verde oliva y negro');
}

/* ---------------- Poses de cámara por scroll ---------------- */
// Cada pose describe la cámara y el estado del producto. Entre poses se interpola
// según la posición del scroll, así todo es reversible y no depende de eventos.
function poses() {
  const M = window.innerWidth <= 720;
  const side = M ? 0 : 0.19;
  const lift = M ? 0.19 : 0;
  const base = { az: -0.55, el: 0.1, dist: 1.45, ty: 0.18, sx: side, sy: lift, desarme: 0, explode: 0, xray: 0, spin: 1, opacity: 1 };
  const HERO = { ...base, sy: M ? 0.22 : 0 };
  const DES0 = { ...base, az: -0.45, el: 0.14, dist: 1.6, ty: 0.19, sx: side * 0.95, spin: 0.2 };
  const DES1 = { ...DES0, az: -0.28, el: 0.46, dist: 1.8, ty: 0.24, desarme: 0.25, spin: 0 };
  const DES2 = { ...DES1, az: -0.72, el: 0.2, dist: 2.2, ty: 0.34, desarme: 0.625 };
  const DES3 = { ...DES2, az: -0.78, el: 0.15, dist: 2.3, ty: 0.3, desarme: 1 };
  const EX1 = { ...DES3, az: -0.32, el: 0.1, dist: 3.15, ty: 0.38, sx: 0, sy: M ? -0.05 : -0.01, explode: 1, xray: 1 };
  const EX2 = { ...EX1, az: 0.6, el: 0.24 };
  const COL = { ...base, az: -0.42, el: 0.2, dist: 1.6, sx: M ? 0 : 0.17, sy: M ? 0.2 : 0, spin: 0.5 };
  return { HERO, DES0, DES1, DES2, DES3, EX1, EX2, COL };
}

let keys = [];
const stage = {};
const top = (el) => el.getBoundingClientRect().top + window.scrollY;

function buildKeys() {
  const vh = window.innerHeight;
  const P = poses();
  const off = (p) => ({ ...p, opacity: 0 });
  const manif = top($('.manifesto'));
  const des = $('#desarme');
  const D = top(des);
  const dLen = des.offsetHeight - vh;
  const ex = $('#por-dentro');
  const E = top(ex);
  const eLen = ex.offsetHeight - vh;
  const col = $('#colores');
  const C = top(col);
  const cH = col.offsetHeight;

  keys = [
    [0, P.HERO],
    [manif - vh * 0.6, P.HERO],
    [manif - vh * 0.05, { ...off(P.HERO), dist: 1.8, ty: 0.12 }],
    [D - vh * 0.6, off(P.DES0)],
    [D - vh * 0.05, P.DES0],
    [D + dLen * 0.08, P.DES0],
    [D + dLen * 0.36, P.DES1],
    [D + dLen * 0.66, P.DES2],
    [D + dLen * 0.94, P.DES3],
    [E + eLen * 0.06, P.DES3],
    [E + eLen * 0.46, P.EX1],
    [E + eLen * 0.6, P.EX1],
    [E + eLen * 0.97, P.EX2],
    [E + eLen + vh * 0.55, off(P.EX2)],
    [C - vh * 0.75, off(P.COL)],
    [C - vh * 0.1, P.COL],
    [C + cH - vh * 0.95, P.COL],
    [C + cH - vh * 0.4, off(P.COL)],
  ].sort((a, b) => a[0] - b[0]);
  Object.assign(stage, { D, dLen, E, eLen, C, cH });
}

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
function sample(y) {
  if (!keys.length) return null;
  if (y <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [y0, a] = keys[i];
    const [y1, b] = keys[i + 1];
    if (y <= y1) {
      const t = y1 === y0 ? 1 : ease((y - y0) / (y1 - y0));
      const out = {};
      for (const k of Object.keys(a)) out[k] = a[k] + (b[k] - a[k]) * t;
      return out;
    }
  }
  return keys[keys.length - 1][1];
}

/* ---------------- UI ligada al scroll ---------------- */
const steps = $$('#desarme .step');
const progress = $('#desarme .stage-progress span');
const hudTxt = $('.hud__txt');
const head = $('.explode-head');
let lastStep = -1;
let inColors = false;

function onScroll() {
  const y = window.scrollY;
  if (scene) {
    const s = sample(y);
    if (s) {
      const user = scene.target.user;
      Object.assign(scene.target, s);
      scene.target.user = inColors ? user : 0;
    }
  }

  // Desarme: paso activo y barra
  const p = stage.dLen ? (y - stage.D) / stage.dLen : 0;
  const step = p < 0.38 ? 0 : p < 0.68 ? 1 : 2;
  if (step !== lastStep) {
    steps.forEach((el, i) => el.classList.toggle('is-on', i === step));
    lastStep = step;
  }
  progress.style.transform = `scaleX(${Math.min(1, Math.max(0, p)).toFixed(3)})`;
  scene?.setActiveHotspot(p > 0.04 && p < 0.99 ? steps[step].dataset.hot : null);

  // Por dentro: texto del HUD y título que se retira
  const e = stage.eLen ? (y - stage.E) / stage.eLen : 0;
  hudTxt.textContent = e < 0.12 ? 'Abierta' : e < 0.44 ? 'Separando piezas…' : e < 0.62 ? 'Despiece · 7 piezas' : 'Vista 360°';
  const fade = Math.min(1, Math.max(0, (e - 0.12) / 0.18));
  head.style.opacity = (1 - fade).toFixed(3);
  head.style.translate = `0 ${(-fade * 40).toFixed(1)}px`;
  head.style.visibility = fade >= 1 ? 'hidden' : 'visible';

  inColors = y > stage.C - window.innerHeight * 0.3 && y < stage.C + stage.cH - window.innerHeight * 0.6;
}

function refresh() {
  buildKeys();
  onScroll();
}
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', () => {
  clearTimeout(refresh.t);
  refresh.t = setTimeout(() => {
    ScrollTrigger.refresh();
    refresh();
  }, 120);
});
document.fonts?.ready.then(refresh);
window.addEventListener('load', refresh);
refresh();

/* ---------------- Etiquetas 3D ---------------- */
if (scene) {
  $$('#labels .plabel').forEach((el) => scene.registerLabel(el, el.dataset.part, 'label'));
  $$('#labels .hotspot').forEach((el) => scene.registerLabel(el, el.dataset.part, 'hotspot'));
}

/* ---------------- Colores ---------------- */
const swatches = $$('.swatches button');
const caption = $('[data-color-caption]');
const colorName = $('[data-color-name]');
const names = { blanco: 'Blanco', oliva: 'Verde oliva', negro: 'Negro' };
function pick(btn, focus = false) {
  swatches.forEach((b) => {
    const on = b === btn;
    b.setAttribute('aria-checked', on);
    b.tabIndex = on ? 0 : -1;
  });
  if (focus) btn.focus();
  caption.textContent = btn.dataset.caption;
  colorName.textContent = names[btn.dataset.finish];
  scene?.setFinish(btn.dataset.finish);
  if (document.documentElement.classList.contains('no-webgl')) {
    const img = $('.colors__in .fallback-img');
    if (img) img.src = `/img/${btn.dataset.finish}.webp`;
  }
}
swatches.forEach((b, i) => {
  b.addEventListener('click', () => pick(b));
  b.addEventListener('keydown', (e) => {
    if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key)) return;
    e.preventDefault();
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
    pick(swatches[(i + d + swatches.length) % swatches.length], true);
  });
});

// Arrastrar para girar
const drag = $('[data-drag]');
if (drag && scene) {
  let sx = null;
  let start = 0;
  drag.addEventListener('pointerdown', (e) => {
    sx = e.clientX;
    start = scene.target.user;
    drag.setPointerCapture(e.pointerId);
  });
  drag.addEventListener('pointermove', (e) => {
    if (sx === null) return;
    scene.target.user = start + (e.clientX - sx) * 0.012;
  });
  const end = () => (sx = null);
  drag.addEventListener('pointerup', end);
  drag.addEventListener('pointercancel', end);
}

/* ---------------- Barra de producto: sección activa ---------------- */
$$('.pnav nav a').forEach((a) => {
  const sec = $(a.getAttribute('href'));
  if (!sec) return;
  ScrollTrigger.create({
    trigger: sec,
    start: 'top 50%',
    end: 'bottom 50%',
    onToggle: (self) => a.classList.toggle('is-active', self.isActive),
  });
});
