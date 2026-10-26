// Quiz de sostenibilidad: 8 preguntas, cada respuesta vale de 0 a 3 puntos.
// Las preguntas, perfiles y recomendaciones se editan aquí.
import { $, $$, gsap, reduced } from '../common.js';

const QUESTIONS = [
  {
    q: '¿Qué pasa con los restos de comida en tu casa?',
    a: ['Van a la basura con todo lo demás', 'A veces los separo', 'Siempre los separo para el contenedor orgánico', 'Los composto o los aprovecho en casa'],
  },
  {
    q: 'Cuando compras algo, ¿revisas de dónde viene o de qué está hecho?',
    a: ['Casi nunca', 'Solo en algunos productos', 'Casi siempre', 'Siempre, y comparo opciones'],
  },
  {
    q: '¿Cómo te llevas las compras del súper o del mercado?',
    a: ['En bolsas nuevas cada vez', 'Reuso algunas bolsas', 'Llevo mis bolsas casi siempre', 'Llevo mis bolsas y compro a granel cuando puedo'],
  },
  {
    q: 'En una semana normal, ¿cuánta comida se te echa a perder?',
    a: ['Bastante', 'Algo', 'Muy poca', 'Casi nada: planeo y aprovecho sobras'],
  },
  {
    q: '¿Cómo te mueves en tu día a día?',
    a: ['Casi siempre en auto, solo', 'Auto compartido o una mezcla', 'Sobre todo transporte público', 'Caminando o en bici siempre que puedo'],
  },
  {
    q: '¿Cómo tomas agua fuera de casa?',
    a: ['Compro botellas desechables', 'Garrafón en casa, botella desechable fuera', 'Llevo botella reutilizable a veces', 'Siempre llevo mi botella reutilizable'],
  },
  {
    q: 'Sobre la energía en casa…',
    a: ['No suelo pensar en eso', 'Apago luces y aparatos que no uso', 'Uso focos LED y desconecto lo que no uso', 'Mido mi consumo o uso energía solar'],
  },
  {
    q: 'Cuando algo se descompone o ya no lo usas…',
    a: ['Lo tiro y compro uno nuevo', 'Depende de lo que cueste', 'Intento repararlo primero', 'Lo reparo, lo dono o lo vendo de segunda mano'],
  },
];

const MAX = QUESTIONS.length * 3;

const PROFILES = [
  {
    min: 0,
    name: 'Explorador',
    desc: 'Tienes la intención y estás empezando a mirar tus hábitos con otros ojos. Es el mejor momento: los primeros cambios son los que más se notan.',
    tips: [
      'Empieza por la cocina: separa los restos de comida durante una semana y observa cuánto pesan en tu basura.',
      'Lleva una bolsa reutilizable en tu mochila o en el auto, así nunca se te olvida.',
      'Elige un solo hábito al mes. Mejor uno que se queda que diez que se abandonan.',
    ],
  },
  {
    min: 9,
    name: 'En transición',
    desc: 'Ya tomas varias decisiones conscientes, aunque no siempre. Te falta poco para que se vuelvan automáticas.',
    tips: [
      'Planea las comidas de la semana para que se eche a perder menos comida.',
      'Revisa de qué está hecho lo que compras seguido; ahí está la mayor parte de tu impacto.',
      'Dale una segunda vida a tus restos orgánicos en lugar de mandarlos al relleno sanitario.',
    ],
  },
  {
    min: 15,
    name: 'Consciente',
    desc: 'La sostenibilidad ya es parte de tu rutina. Ahora se trata de hacerlo más fácil y de que tu impacto positivo crezca.',
    tips: [
      'Automatiza lo que ya haces: una recicladora en la cocina reduce tus residuos orgánicos sin esfuerzo extra.',
      'Prioriza productos verificados y duraderos sobre los que solo dicen ser “eco”.',
      'Comparte lo que te funciona: tus hábitos inspiran a quienes viven contigo.',
    ],
  },
  {
    min: 21,
    name: 'Agente de cambio',
    desc: 'Tus hábitos ya marcan la diferencia y probablemente inspiras a otros. Tu siguiente paso es multiplicar ese efecto.',
    tips: [
      'Cierra el ciclo en casa: convierte tus restos de comida en material para tus plantas.',
      'Ayuda a alguien cercano a dar su primer paso; compártele este quiz.',
      'Exige evidencia: pregunta a las marcas cómo comprueban lo que prometen.',
    ],
  },
];

const root = $('[data-quiz]');
const screens = Object.fromEntries($$('[data-screen]', root).map((s) => [s.dataset.screen, s]));
const qEl = $('[data-question]', root);
const optsEl = $('[data-options]', root);
const countEl = $('[data-count-label]', root);
const barEl = $('[data-bar]', root);
const backBtn = $('[data-back]', root);

let index = 0;
let answers = [];

function show(name) {
  for (const [k, el] of Object.entries(screens)) el.hidden = k !== name;
  const el = screens[name];
  if (!reduced) gsap.fromTo(el, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' });
}

function renderQuestion() {
  const item = QUESTIONS[index];
  countEl.textContent = `${index + 1} / ${QUESTIONS.length}`;
  barEl.style.width = `${(index / QUESTIONS.length) * 100}%`;
  backBtn.disabled = index === 0;
  qEl.textContent = item.q;
  optsEl.setAttribute('aria-label', item.q);
  optsEl.innerHTML = item.a
    .map(
      (txt, i) =>
        `<button type="button" class="quiz__opt" data-value="${i}" aria-pressed="${answers[index] === i}"><b>${'ABCD'[i]}</b><span>${txt}</span></button>`
    )
    .join('');
  show('question');
  qEl.focus({ preventScroll: true });
}

function choose(value) {
  answers[index] = value;
  $$('.quiz__opt', optsEl).forEach((b) => b.setAttribute('aria-pressed', +b.dataset.value === value));
  setTimeout(
    () => {
      if (index < QUESTIONS.length - 1) {
        index++;
        renderQuestion();
      } else {
        renderResult();
      }
    },
    reduced ? 0 : 260
  );
}

function renderResult() {
  barEl.style.width = '100%';
  const score = answers.reduce((s, v) => s + v, 0);
  const profile = [...PROFILES].reverse().find((p) => score >= p.min);
  $('[data-profile]', root).textContent = profile.name;
  $('[data-desc]', root).textContent = profile.desc;
  $('[data-score]', root).textContent = `${score} / ${MAX}`;
  $('[data-tips]', root).innerHTML = profile.tips.map((t) => `<li>${t}</li>`).join('');
  const meter = $('[data-meter]', root);
  meter.style.width = '0';
  show('result');
  requestAnimationFrame(() => requestAnimationFrame(() => (meter.style.width = `${(score / MAX) * 100}%`)));
  $('[data-profile]', root).focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
}

$('[data-start]', root).addEventListener('click', () => {
  index = 0;
  answers = [];
  renderQuestion();
});
$('[data-restart]', root).addEventListener('click', () => {
  index = 0;
  answers = [];
  renderQuestion();
});
backBtn.addEventListener('click', () => {
  if (index > 0) {
    index--;
    renderQuestion();
  }
});
optsEl.addEventListener('click', (e) => {
  const b = e.target.closest('.quiz__opt');
  if (b) choose(+b.dataset.value);
});
// Atajos de teclado: A, B, C, D o 1–4
document.addEventListener('keydown', (e) => {
  if (screens.question.hidden || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  const i = 'abcd'.indexOf(k) >= 0 ? 'abcd'.indexOf(k) : '1234'.indexOf(k);
  if (i >= 0 && e.target.tagName !== 'INPUT') choose(i);
});
