import { initPremium, mailtoForm } from './fx.js';
import { LineChart, rangeBars } from './charts.js';
import { SOURCES, UPDATED, PRICE_LEVELS, MOVES, TIMELINE, SUPPLIERS, SCOPES, TUNISIA_IMPLIED, EUR_TND } from '../data/market.js';

const $ = (sel) => document.querySelector(sel);
const h = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};
const srcLink = (key) => {
  const a = h('a', 'src', `Source : ${SOURCES[key].label}`);
  a.href = SOURCES[key].url;
  a.target = '_blank';
  a.rel = 'noopener';
  return a;
};

document.querySelectorAll('[data-updated]').forEach((el) => (el.textContent = `mise à jour ${UPDATED}`));
document.querySelectorAll('[data-src]').forEach((a) => {
  const src = SOURCES[a.dataset.src];
  a.textContent = src.label.split(' — ')[1] ?? src.label;
  a.href = src.url;
  a.target = '_blank';
  a.rel = 'noopener';
});

// mouvements récents
$('[data-moves]')?.append(
  ...MOVES.map((m) => {
    const c = h('article', 'card');
    c.dataset.spotlight = '';
    c.append(h('small', '', m.market), h('b', m.dir < 0 ? 'is-down' : '', m.value), h('h3', '', m.grade), h('p', '', m.detail), srcLink(m.src));
    return c;
  }),
);

// cumul des hausses annoncées par SCA (communiqués publics)
const sca = $('[data-chart-sca]');
if (sca)
  new LineChart(sca, { step: true, unit: '€/t', label: 'Cumul des hausses annoncées par SCA', color: 'var(--c2)', height: 300 }).set([
    { x: 'janv. 25', y: 0, label: 'base' },
    { x: 'mars 25', y: 90, label: '+90', note: 'SCA +90 €/t' },
    { x: 'mai 25', y: 150, label: '+60', note: 'SCA +60 €/t' },
    { x: 'sept. 26', y: 250, label: '+250 €/t', note: 'SCA +100 €/t' },
  ]);

// niveaux de prix
const lv = $('[data-chart-levels]');
if (lv) {
  rangeBars(
    lv,
    PRICE_LEVELS.map((p) => ({ label: p.grade, sub: p.where, lo: p.lo, hi: p.hi, group: p.origin, src: p.src })),
    { max: 1000, step: 250, unit: '€/t', colors: { europe: 'var(--c1)', tunisie: 'var(--c2)' }, source: (it) => SOURCES[it.src].label },
  );
  $('[data-levels-note]').textContent = `* Tunisie : chiffre d’affaires ÷ production publiés par Sotipapier (≈ ${Math.round(TUNISIA_IMPLIED.tlflDT).toLocaleString('fr-FR')} DT/t), converti à ${EUR_TND.toString().replace('.', ',')} DT/€ (BCT). Survolez une barre pour sa source.`;
}

// chronologie
$('[data-timeline]')?.append(
  ...TIMELINE.map((t) => {
    const li = h('li');
    li.dataset.kind = t.kind;
    li.dataset.up = '';
    li.append(h('time', '', t.date), h('p', '', t.text), srcLink(t.src));
    return li;
  }),
);

// benchmark papetiers
const bench = $('[data-bench]');
const filter = $('[data-filter]');
if (bench && filter) {
  const rows = SUPPLIERS.map((sup) => {
    const r = h('article', 'card bench__row');
    r.dataset.scope = sup.scope;
    const a = h('div');
    a.append(h('h3', '', sup.name), h('p', 'where', sup.country), h('span', 'bench__scope', SCOPES[sup.scope]));
    const b = h('div', 'bench__tags');
    b.append(...sup.grades.map((g) => h('span', '', g)), h('span', '', `Fibre ${sup.fibre.toLowerCase()}`));
    const c = h('div');
    c.append(h('b', 'scale', sup.scale), h('p', '', sup.edge), srcLink(sup.src));
    r.append(a, b, c);
    return r;
  });
  bench.append(...rows);
  const choices = [['all', 'Tous'], ...Object.entries(SCOPES)];
  for (const [key, label] of choices) {
    const btn = h('button', '', label);
    btn.type = 'button';
    btn.setAttribute('aria-pressed', key === 'all');
    btn.addEventListener('click', () => {
      filter.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === btn));
      rows.forEach((r) => (r.hidden = key !== 'all' && r.dataset.scope !== key));
    });
    filter.append(btn);
  }
}

initPremium();

const form = document.querySelector('[data-form]');
if (form) mailtoForm(form, { subject: (d) => `Consultation grands comptes — ${d.get('societe')}` });
