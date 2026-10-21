import { $, h, svg, fmt, srcLink, reveal, animate, mailtoForm, reduced } from './common.js';
import { DEMO, GROWTH } from '../data/partners.js';
import { CONTEXT, SOURCES } from '../data/market.js';

// Données de src/data/partners.js : DEMO = valeurs fictives (badge affiché).
const { years, forecastFrom, firstFullYear, series } = GROWTH;
const ca = series.ca;
const vol = series.volume;
const fi = years.indexOf(forecastFrom);
const last = fi - 1; // dernière année réalisée
const i0 = years.indexOf(firstFullYear);
const cagr = (v) => ((v[last] / v[i0]) ** (1 / (last - i0)) - 1) * 100;
if (DEMO) $('[data-demo]').hidden = false;

// ---------- indicateurs (avec mini-courbe) ----------
function spark(values) {
  const w = 120, hgt = 32, max = Math.max(...values);
  const pts = values.slice(0, fi).map((v, i) => `${(i / (fi - 1)) * w},${hgt - 3 - (v / max) * (hgt - 6)}`);
  const s = svg('svg', { class: 'spark', viewBox: `0 0 ${w} ${hgt}`, preserveAspectRatio: 'none', 'aria-hidden': 'true' });
  s.append(svg('polyline', { points: pts.join(' '), fill: 'none', stroke: '#3550d0', 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke' }));
  return s;
}
const kpis = [
  { label: `Chiffre d’affaires ${years[last]}`, value: fmt(ca.values[last], 1), unit: 'MDT', meta: `+${fmt((ca.values[last] / ca.values[last - 1] - 1) * 100)} % sur un an`, sp: ca.values },
  { label: `Croissance annuelle moyenne`, value: `+${fmt(cagr(ca.values))}`, unit: '%', meta: `chiffre d’affaires ${firstFullYear}–${years[last]}`, sp: ca.values },
  { label: `Volume vendu ${years[last]}`, value: fmt(vol.values[last]), unit: 't', meta: `+${fmt(cagr(vol.values))} %/an depuis ${firstFullYear}`, sp: vol.values },
  { label: `Prévision ${forecastFrom}`, value: fmt(ca.values[fi], 1), unit: 'MDT', meta: `${fmt(vol.values[fi])} t prévues`, sp: ca.values },
];
$('[data-kpis]').append(
  ...kpis.map((k) =>
    h(
      'article',
      { class: 'card kpi span-3', 'data-in': true },
      h('span', { class: 'kpi__label', text: k.label }),
      h('b', { class: 'kpi__value' }, k.value, h('small', { text: k.unit })),
      h('span', { class: 'kpi__meta' }, h('span', { class: 'delta delta--good', text: '▲' }), h('span', { text: k.meta })),
      spark(k.sp),
    ),
  ),
);

// ---------- graphique combiné : colonnes (volume) + courbe (CA) ----------
const chartEl = $('[data-chart]');
const yearEl = $('[data-yeardetail]');
let current = last;

function nice(max) {
  const raw = max / 4, mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((x) => x >= raw);
  return { step, top: Math.ceil(max / step) * step };
}

function showYear(i) {
  current = i;
  chartEl.querySelectorAll('.col').forEach((c, k) => c.classList.toggle('is-on', k === i));
  chartEl.querySelectorAll('.pt').forEach((c, k) => c.classList.toggle('is-on', k === i));
  const prev = i > 0 ? i - 1 : null;
  const d = (s) => (prev == null ? '—' : `${s.values[i] >= s.values[prev] ? '+' : ''}${fmt((s.values[i] / s.values[prev] - 1) * 100)} %`);
  yearEl.replaceChildren(
    h('div', {}, h('p', { class: 'kpi__label', text: i >= fi ? 'Prévision' : 'Réalisé' }), h('p', { class: 'year__n', text: String(years[i]) })),
    h(
      'div',
      { class: 'year__rows' },
      h('div', { class: 'year__row' }, h('span', { text: 'Chiffre d’affaires' }), h('b', { text: `${fmt(ca.values[i], 1)} MDT` })),
      h('div', { class: 'year__row' }, h('span', { text: 'Volume vendu' }), h('b', { text: `${fmt(vol.values[i])} t` })),
      h('div', { class: 'year__row' }, h('span', { text: 'CA vs année précédente' }), h('b', { text: d(ca) })),
      h('div', { class: 'year__row' }, h('span', { text: 'Prix moyen' }), h('b', { text: `${fmt((ca.values[i] * 1e6) / vol.values[i])} DT/t` })),
    ),
    h('p', { style: 'font-size:12px;color:var(--ink-3)', text: '← → pour changer d’année' }),
  );
}

function draw(play) {
  const w = Math.max(320, chartEl.clientWidth);
  const H = w < 560 ? 260 : 320;
  const pad = { l: 44, r: 52, t: 20, b: 28 };
  const n = years.length;
  const band = (w - pad.l - pad.r) / n;
  const cx = (i) => pad.l + band * (i + 0.5);
  const A = nice(Math.max(...ca.values));
  const B = nice(Math.max(...vol.values));
  const ya = (v) => pad.t + (1 - v / A.top) * (H - pad.t - pad.b);
  const yb = (v) => pad.t + (1 - v / B.top) * (H - pad.t - pad.b);
  const s = svg('svg', { viewBox: `0 0 ${w} ${H}`, role: 'img', 'aria-label': `Chiffre d’affaires et volume de ${years[0]} à ${years.at(-1)}` });
  const defs = svg('defs');
  const pat = svg('pattern', { id: 'fc-hatch', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
  pat.append(svg('rect', { width: 6, height: 6, fill: '#eef0fb' }), svg('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: '#c5cdf2', 'stroke-width': 2 }));
  defs.append(pat);
  s.append(defs);
  for (let k = 0; k <= 4; k++) {
    const y = ya(A.step * k);
    s.append(svg('line', { class: 'gl', x1: pad.l, x2: w - pad.r, y1: y, y2: y }));
    s.append(svg('text', { class: 'ax', x: pad.l - 8, y: y + 4, 'text-anchor': 'end' }, fmt(A.step * k)));
    s.append(svg('text', { class: 'ax', x: w - pad.r + 8, y: y + 4 }, fmt(B.step * k)));
  }
  const cols = [];
  years.forEach((yr, i) => {
    const top = yb(vol.values[i]);
    const c = svg('rect', { class: `col${i >= fi ? ' is-fc' : ''}`, x: cx(i) - band * 0.3, y: top, width: band * 0.6, height: H - pad.b - top, rx: 4 });
    cols.push(c);
    s.append(c);
    s.append(svg('text', { class: 'ax', x: cx(i), y: H - 8, 'text-anchor': 'middle', style: 'fill:var(--ink-2);font-weight:600' }, String(yr)));
  });
  const pts = ca.values.map((v, i) => [cx(i), ya(v)]);
  const path = (p) => p.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ');
  const solid = svg('path', { class: 'ln', d: path(pts.slice(0, fi)) });
  s.append(solid, svg('path', { class: 'ln ln--fc', d: path(pts.slice(fi - 1)) }));
  pts.forEach(([x, y], i) => {
    s.append(svg('circle', { class: 'pt', cx: x, cy: y, r: 4 }));
    if (i === last || i === 0 || i === fi) s.append(svg('text', { class: 'lbl', x, y: y - 10, 'text-anchor': 'middle' }, fmt(ca.values[i], 1)));
  });
  years.forEach((_, i) => {
    const hit = svg('rect', { class: 'hit', x: cx(i) - band / 2, y: 0, width: band, height: H });
    hit.addEventListener('pointerenter', () => showYear(i));
    s.append(hit);
  });
  chartEl.replaceChildren(s);
  showYear(current);
  if (play && !reduced) {
    cols.forEach((c, i) => animate(c, [{ transform: 'scaleY(0)', transformOrigin: 'bottom', transformBox: 'fill-box' }, { transform: 'scaleY(1)', transformOrigin: 'bottom', transformBox: 'fill-box' }], { duration: 600, delay: i * 60 }));
    const len = solid.getTotalLength();
    animate(solid, [{ strokeDasharray: len, strokeDashoffset: len }, { strokeDasharray: len, strokeDashoffset: 0 }], { duration: 1100, delay: 250 });
  }
}

chartEl.tabIndex = 0;
chartEl.addEventListener('keydown', (e) => {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  e.preventDefault();
  showYear(Math.min(years.length - 1, Math.max(0, current + (e.key === 'ArrowRight' ? 1 : -1))));
});
draw(false);
let lastW = chartEl.clientWidth;
new ResizeObserver(() => {
  if (Math.abs(chartEl.clientWidth - lastW) < 4) return;
  lastW = chartEl.clientWidth;
  draw(false);
}).observe(chartEl);
new IntersectionObserver((e, io) => {
  if (!e[0].isIntersecting) return;
  draw(true);
  io.disconnect();
}, { threshold: 0.3 }).observe(chartEl);

// ---------- contexte de marché ----------
$('[data-ctx]').append(...Object.values(CONTEXT).map((c) => h('div', {}, h('b', { text: c.value }), h('p', { text: c.label }), srcLink(SOURCES[c.src]))));

reveal();
mailtoForm($('[data-form]'), (d) => `Partenaires New Box — ${d.get('demande')} (${d.get('institution')})`);
