// Código compartido por todas las páginas: estilos, scroll suave, menú,
// animaciones de entrada, pestañas y formularios de lista de espera.
import './style.css';
import './pages.css';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reduced) document.documentElement.classList.add('reduced');

// Conecta aquí tu servicio de correo (Mailchimp, Formspree, Brevo…) con VITE_WAITLIST_ENDPOINT
const WAITLIST_ENDPOINT = import.meta.env.VITE_WAITLIST_ENDPOINT || '';

/* ---------------- Scroll suave ---------------- */
export let lenis = null;
if (!reduced) {
  lenis = new Lenis({ lerp: 0.11, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  if (import.meta.env.DEV) window.__lenis = lenis;
}

const stickyOffset = () => ($('#pnav') || $('.page .gnav'))?.offsetHeight || 0;

export function scrollToEl(el) {
  const isStage = el.classList.contains('sticky-stage');
  const offset = isStage ? 0 : -stickyOffset();
  if (lenis) lenis.scrollTo(el, { offset, duration: 1.4 });
  else window.scrollTo({ top: el.getBoundingClientRect().top + scrollY + offset });
}

$$('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    const el = id.length > 1 && $(id);
    if (!el) return;
    e.preventDefault();
    scrollToEl(el);
    history.replaceState(null, '', id);
  });
});

// Si llegamos desde otra página con un ancla (/#lista), bajar con suavidad
window.addEventListener('load', () => {
  const el = location.hash && $(location.hash);
  if (el) setTimeout(() => scrollToEl(el), 400);
});

/* ---------------- Menú móvil ---------------- */
const burger = $('.gnav__burger');
const gnav = $('[data-gnav]');
if (burger && gnav) {
  const setOpen = (open) => {
    gnav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    document.documentElement.classList.toggle('menu-open', open);
    if (lenis) open ? lenis.stop() : lenis.start();
  };
  burger.addEventListener('click', () => setOpen(!gnav.classList.contains('is-open')));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && setOpen(false));
  $$('#gnav-menu a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
  window.matchMedia('(min-width: 721px)').addEventListener('change', () => setOpen(false));
}

/* ---------------- Textos que aparecen ---------------- */
$$('.reveal-words').forEach((words) => {
  words.innerHTML = words.textContent
    .trim()
    .split(/\s+/)
    .map((w) => `<span class="w">${w}</span>`)
    .join(' ');
  const ws = $$('.w', words);
  if (reduced) gsap.set(ws, { opacity: 1 });
  else
    gsap.to(ws, {
      opacity: 1,
      ease: 'none',
      stagger: 0.12,
      scrollTrigger: { trigger: words, start: 'top 78%', end: 'bottom 42%', scrub: true },
    });
});

if (!reduced) {
  ScrollTrigger.batch('.fade-up', {
    start: 'top 88%',
    once: true,
    onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.09 }),
  });
}

$$('[data-count]').forEach((el) => {
  const to = +el.dataset.count;
  if (reduced || to === 0) {
    el.textContent = to;
    return;
  }
  const o = { v: 0 };
  ScrollTrigger.create({
    trigger: el,
    start: 'top 85%',
    once: true,
    onEnter: () => gsap.to(o, { v: to, duration: 1.6, ease: 'power2.out', onUpdate: () => (el.textContent = Math.round(o.v)) }),
  });
});

/* ---------------- Pestañas ---------------- */
$$('[data-tabs]').forEach((root) => {
  const tabs = $$('[role="tab"]', root);
  const select = (t, focus) => {
    tabs.forEach((x) => {
      const on = x === t;
      x.setAttribute('aria-selected', on);
      x.tabIndex = on ? 0 : -1;
      $(`#${x.getAttribute('aria-controls')}`).hidden = !on;
    });
    if (focus) t.focus();
    const panel = $(`#${t.getAttribute('aria-controls')}`);
    if (!reduced) gsap.fromTo(panel, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' });
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const d = e.key === 'ArrowRight' ? 1 : -1;
      select(tabs[(i + d + tabs.length) % tabs.length], true);
    });
  });
});

/* ---------------- Lista de espera ---------------- */
$$('[data-waitlist]').forEach((form) => {
  const msg = $('[data-waitlist-msg]', form);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    msg.classList.remove('is-ok', 'is-err');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      msg.textContent = 'Revisa tu correo, parece incompleto.';
      msg.classList.add('is-err');
      form.email.focus();
      return;
    }
    const btn = form.querySelector('button');
    btn.disabled = true;
    try {
      if (WAITLIST_ENDPOINT) {
        const r = await fetch(WAITLIST_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ email, origen: form.dataset.origen || 'recicladora' }),
        });
        if (!r.ok) throw new Error(r.status);
      } else {
        console.warn('Lista de espera sin conectar: define VITE_WAITLIST_ENDPOINT para guardar los correos.');
      }
      msg.textContent = '¡Listo! Te avisaremos antes que a nadie.';
      msg.classList.add('is-ok');
      form.reset();
    } catch {
      msg.textContent = 'No pudimos registrarte. Intenta de nuevo en un momento.';
      msg.classList.add('is-err');
    } finally {
      btn.disabled = false;
    }
  });
});
