import { CONTEXT } from '../data/market.js';
import { GROWTH, DEMO } from '../data/partners.js';
import { el, fmt, sourceLink } from './ui.js';
import { GrowthChart } from './growth.js';

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

// ------------------------------------------------------------------ croissance (chiffre d'affaires / volume)
const chartBox = $('[data-growth-chart]');
const growth = new GrowthChart(chartBox, { years: GROWTH.years, forecastFrom: GROWTH.forecastFrom });
const $g = (k) => document.querySelector(`[data-g="${k}"]`);
let growthKey = 'ca';
let heroAnim = 0;

/** Chiffres clés d'une série : dernière année réalisée, croissance sur un an, multiplicateur, TCAM. */
function growthStats(s) {
  const yrs = GROWTH.years;
  const li = (GROWTH.forecastFrom ? yrs.indexOf(GROWTH.forecastFrom) : yrs.length) - 1;
  const bi = Math.max(0, yrs.indexOf(GROWTH.firstFullYear));
  const last = s.values[li];
  const base = s.values[bi];
  const n = yrs[li] - yrs[bi];
  return {
    year: yrs[li],
    last,
    yoy: last / s.values[li - 1] - 1,
    mult: last / base,
    base: yrs[bi],
    cagr: n > 0 ? (last / base) ** (1 / n) - 1 : 0,
    forecast: GROWTH.forecastFrom ? s.values[li + 1] : null,
  };
}

/** Le grand chiffre monte jusqu'à sa valeur (sauf mouvement réduit). */
function countTo(node, value, decimals) {
  cancelAnimationFrame(heroAnim);
  if (reduced) return (node.textContent = fmt(value, decimals));
  const from = Number(node.dataset.v || 0);
  const t0 = performance.now();
  const tick = (t) => {
    const k = Math.min(1, (t - t0) / 900);
    const v = from + (value - from) * (1 - (1 - k) ** 3);
    node.textContent = fmt(v, decimals);
    if (k < 1) heroAnim = requestAnimationFrame(tick);
  };
  node.dataset.v = value;
  heroAnim = requestAnimationFrame(tick);
}

function showGrowth(key, animate) {
  growthKey = key;
  const s = GROWTH.series[key];
  const st = growthStats(s);
  document.querySelectorAll('[data-series]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.series === key)));
  $g('kicker').textContent = `${s.label} ${st.year}`;
  if (animate) countTo($g('value'), st.last, s.decimals);
  else $g('value').textContent = fmt(st.last, s.decimals);
  $g('unit').textContent = s.unit;
  $g('yoy').textContent = `${st.yoy >= 0 ? '▲ +' : '▼ '}${fmt(st.yoy * 100, 0)} % sur un an`;
  $g('mult').textContent = `×${fmt(st.mult, 1)}`;
  $g('multNote').textContent = `depuis ${st.base}, première année pleine`;
  $g('cagr').textContent = `+${fmt(st.cagr * 100, 0)} %`;
  $g('cagrNote').textContent = `par an en moyenne, ${st.base}-${st.year}`;
  $g('forecast').textContent = st.forecast == null ? '—' : `${fmt(st.forecast, s.decimals)} ${s.unit}`;
  $g('forecastNote').textContent = `prévision ${st.year + 1}`;
  growth.setSeries(s, animate);
  // vue tableau (mêmes données)
  $('[data-growth-table]').replaceChildren(
    el(
      'table',
      { class: 'data-table data-table--dark' },
      el('thead', {}, el('tr', {}, ['Année', `${s.label} (${s.unit})`, 'Sur un an'].map((h) => el('th', { scope: 'col', text: h })))),
      el(
        'tbody',
        {},
        GROWTH.years.map((y, i) =>
          el(
            'tr',
            {},
            el('td', { text: y >= (GROWTH.forecastFrom ?? Infinity) ? `${y} (prévision)` : String(y) }),
            el('td', { class: 'num', text: fmt(s.values[i], s.decimals) }),
            el('td', { class: 'num', text: i ? `${s.values[i] >= s.values[i - 1] ? '+' : ''}${fmt((s.values[i] / s.values[i - 1] - 1) * 100, 0)} %` : '—' }),
          ),
        ),
      ),
    ),
  );
}

$('[data-demo]').hidden = !DEMO;
document.querySelector('.g-tabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-series]');
  if (b && b.dataset.series !== growthKey) showGrowth(b.dataset.series, true);
});
const growthToggle = $('[data-growth-toggle]');
growthToggle.addEventListener('click', () => {
  const table = $('[data-growth-table]');
  table.hidden = !table.hidden;
  chartBox.hidden = !table.hidden;
  growthToggle.textContent = table.hidden ? 'Voir les données' : 'Voir la courbe';
});
showGrowth('ca', false);
$g('value').dataset.v = 0;
$g('value').textContent = '0';
const growthIo = new IntersectionObserver(
  ([e]) => {
    if (!e.isIntersecting) return;
    growth.reveal();
    countTo($g('value'), growthStats(GROWTH.series[growthKey]).last, GROWTH.series[growthKey].decimals);
    growthIo.disconnect();
  },
  { threshold: 0.25 },
);
growthIo.observe(document.querySelector('.pt-growth'));

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
