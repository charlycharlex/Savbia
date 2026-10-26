// Tienda: cambia el render de la recicladora según el color elegido.
import { $, $$ } from '../common.js';

const img = $('[data-shop-img]');
const name = $('[data-shop-name]');
const swatches = $$('[data-shop-finish]');
const NAMES = { blanco: 'Blanco', oliva: 'Verde oliva', negro: 'Negro' };

// precargar los tres renders
Object.keys(NAMES).forEach((k) => (new Image().src = `/img/${k}.webp`));

function pick(btn, focus = false) {
  const k = btn.dataset.shopFinish;
  swatches.forEach((b) => {
    const on = b === btn;
    b.setAttribute('aria-checked', on);
    b.tabIndex = on ? 0 : -1;
  });
  if (focus) btn.focus();
  name.textContent = NAMES[k];
  img.style.opacity = '0';
  setTimeout(() => {
    img.src = `/img/${k}.webp`;
    img.alt = `Recicladora Savbia en color ${NAMES[k].toLowerCase()}`;
    img.style.opacity = '1';
  }, 180);
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
