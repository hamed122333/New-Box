import { CONTEXT } from '../data/market.js';
import { el, sourceLink } from './ui.js';

const $ = (s) => document.querySelector(s);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
document.documentElement.classList.add('js');

// ------------------------------------------------------------------ le marché (mêmes données que le dossier)
const MARKET = [
  { key: 'olive', title: 'Huile d’olive', meaning: 'Plus de caisses résistantes pour l’export.' },
  { key: 'dates', title: 'Dattes', meaning: 'Plus de plateaux et de caisses pour la saison.' },
  { key: 'ppwr', title: 'Règlement européen PPWR', meaning: 'Le carton recyclable devient la norme pour vendre en Europe.' },
];
$('[data-market]').replaceChildren(
  ...MARKET.map((m) => {
    const c = CONTEXT[m.key];
    return el(
      'article',
      { class: 'pt-stat reveal' },
      el('p', { class: 'pt-stat__title', text: m.title }),
      el('p', { class: 'pt-stat__value', text: c.value }),
      el('p', { class: 'pt-stat__label', text: c.label }),
      el('p', { class: 'pt-stat__meaning', text: `→ ${m.meaning}` }),
      el('p', { class: 'pt-stat__src' }, sourceLink(c.src)),
    );
  }),
);

// ------------------------------------------------------------------ apparition au défilement + compteurs
const count = (node) => {
  const end = Number(node.dataset.count);
  if (reduced || !end) return;
  const t0 = performance.now();
  const dur = 1100;
  const tick = (t) => {
    const k = Math.min(1, (t - t0) / dur);
    node.textContent = String(Math.round(end * (1 - (1 - k) ** 3)));
    if (k < 1) requestAnimationFrame(tick);
  };
  node.textContent = '0';
  requestAnimationFrame(tick);
};
const io = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('is-in');
      e.target.querySelectorAll('[data-count]').forEach(count);
      io.unobserve(e.target);
    }
  },
  { threshold: 0.2 },
);
document.querySelectorAll('.reveal').forEach((n) => io.observe(n));

// ------------------------------------------------------------------ mode présentation (plein écran, clavier)
const slides = [...document.querySelectorAll('[data-slide]')];
const deck = $('[data-deck]');
const counter = $('[data-deck-count]');
let presenting = false;

const current = () => {
  const mid = window.innerHeight / 2;
  let best = 0;
  slides.forEach((s, i) => {
    if (s.getBoundingClientRect().top <= mid) best = i;
  });
  return best;
};
const go = (i) => {
  const k = Math.max(0, Math.min(slides.length - 1, i));
  slides[k].scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
};
const updateCounter = () => {
  const text = `${current() + 1} / ${slides.length} · ${slides[current()].dataset.slide}`;
  if (counter.textContent !== text) counter.textContent = text;
};

function setPresenting(on) {
  presenting = on;
  document.documentElement.classList.toggle('is-presenting', on);
  deck.hidden = !on;
  if (on) {
    document.documentElement.requestFullscreen?.().catch(() => {});
    document.querySelectorAll('.reveal').forEach((n) => n.classList.add('is-in'));
    go(current());
    updateCounter();
  } else if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
}

document.querySelectorAll('[data-present]').forEach((b) => b.addEventListener('click', () => setPresenting(true)));
$('[data-deck-exit]').addEventListener('click', () => setPresenting(false));
$('[data-deck-prev]').addEventListener('click', () => go(current() - 1));
$('[data-deck-next]').addEventListener('click', () => go(current() + 1));
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && presenting) setPresenting(false);
});
document.addEventListener('keydown', (e) => {
  if (!presenting) return;
  const next = ['ArrowDown', 'ArrowRight', 'PageDown', ' '].includes(e.key);
  const prev = ['ArrowUp', 'ArrowLeft', 'PageUp'].includes(e.key);
  if (next || prev || e.key === 'Home' || e.key === 'End') e.preventDefault();
  if (next) go(current() + 1);
  else if (prev) go(current() - 1);
  else if (e.key === 'Home') go(0);
  else if (e.key === 'End') go(slides.length - 1);
  else if (e.key === 'Escape') setPresenting(false);
});
let raf = 0;
window.addEventListener('scroll', () => presenting && (raf ||= requestAnimationFrame(() => ((raf = 0), updateCounter()))), { passive: true });
