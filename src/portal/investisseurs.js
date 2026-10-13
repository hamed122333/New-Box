import { el, fmt, pct, bindForm, setText } from './ui.js';
import { LineChart, stackBars } from './charts.js';
import { fillCommon, contextTiles, moveTiles, priceLevels, timeline, suppliersTable, mailForm, bindToggle, heroMarketCard } from './market-ui.js';

const $ = (s) => document.querySelector(s);

fillCommon();
heroMarketCard($('[data-hero-card]'));
contextTiles($('[data-context]'), ['olive', 'dates', 'ppwr', 'market', 'sector']);
moveTiles($('[data-moves]'));
priceLevels($('[data-levels]'), $('[data-levels-table]'), $('[data-toggle-table]'));
timeline($('[data-timeline]'));
suppliersTable($('[data-suppliers]'), $('[data-filters]'));

// ------------------------------------------------------------------ sensibilité au prix du papier
const sens = $('[data-sensitivity]');
const signed = (v) => pct(v, Number.isInteger(v) ? 0 : 1);
const COST_KEYS = [
  { key: 'local', label: 'Papier local', color: 'var(--series-2)' },
  { key: 'import', label: 'Papier importé', color: 'var(--series-1)' },
  { key: 'other', label: 'Autres coûts', color: 'var(--series-muted)' },
];

/**
 * Coût de revient en base 100 : papier (local + importé) et autres coûts.
 * Le papier importé subit aussi la variation de l'euro ; les autres coûts ne bougent pas.
 */
export function sensitivity(v) {
  const paper = v.paper;
  const imp = (paper * v.imported) / 100;
  const loc = paper - imp;
  const other = 100 - paper;
  const imp1 = imp * (1 + v.dImport / 100) * (1 + v.dFx / 100);
  const loc1 = loc * (1 + v.dLocal / 100);
  const cost1 = imp1 + loc1 + other;
  const price = 100 / (1 - v.margin / 100);
  return { imp, loc, other, imp1, loc1, cost1, dCost: cost1 - 100, margin1: (1 - cost1 / price) * 100 };
}

bindForm(
  sens,
  (v) => {
    const r = sensitivity(v);
    setText(document, '[data-out="cost"]', pct(r.dCost));
    setText(document, '[data-out="newMargin"]', `${fmt(r.margin1, 1)} %`);
    setText(document, '[data-out="marginNote"]', `contre ${fmt(v.margin)} % aujourd’hui (${fmt(r.margin1 - v.margin, 1)} point${Math.abs(r.margin1 - v.margin) >= 2 ? 's' : ''})`);
    setText(document, '[data-out="priceUp"]', pct(r.dCost));
    stackBars(
      $('[data-cost-bars]'),
      [
        { label: 'Avant', parts: [{ key: 'local', value: r.loc }, { key: 'import', value: r.imp }, { key: 'other', value: r.other }] },
        { label: 'Après', parts: [{ key: 'local', value: r.loc1 }, { key: 'import', value: r.imp1 }, { key: 'other', value: r.other }] },
      ],
      COST_KEYS,
      { format: (x) => fmt(x, 1), total: (x) => fmt(x, 1) },
    );
  },
  {
    paper: (x) => `${fmt(x)} %`,
    imported: (x) => `${fmt(x)} %`,
    dImport: signed,
    dLocal: signed,
    dFx: signed,
    margin: (x) => `${fmt(x)} %`,
  },
);

// ------------------------------------------------------------------ projet d'investissement
const RAMP = [0.5, 0.85]; // montée en charge des deux premières années

/** Flux annuels (k DT), délai de retour, VAN et TRI. */
export function project(v) {
  const revenue = (v.capacity * (v.load / 100) * v.price) / 1000; // k DT
  const contribution = revenue * (v.cm / 100);
  const ebitda = contribution - v.fixed;
  const flows = [-v.invest];
  for (let y = 1; y <= v.years; y++) flows.push(contribution * (RAMP[y - 1] ?? 1) - v.fixed);
  const cum = [];
  flows.reduce((s, f, i) => (cum[i] = s + f), 0);
  let payback = null;
  for (let i = 1; i < cum.length; i++) {
    if (cum[i] >= 0) {
      payback = i - 1 + -cum[i - 1] / flows[i];
      break;
    }
  }
  const npvAt = (r) => flows.reduce((s, f, i) => s + f / (1 + r) ** i, 0);
  const npv = npvAt(v.rate / 100);
  // TRI par dichotomie (s'il existe sur [−90 %, 200 %])
  let irr = null;
  let lo = -0.9;
  let hi = 2;
  if (npvAt(lo) > 0 && npvAt(hi) < 0) {
    for (let k = 0; k < 80; k++) {
      const mid = (lo + hi) / 2;
      if (npvAt(mid) > 0) lo = mid;
      else hi = mid;
    }
    irr = (lo + hi) / 2;
  }
  return { revenue, ebitda, flows, cum, payback, npv, irr };
}

const kdt = (x) => `${fmt(x)} k DT`;
const cash = new LineChart($('[data-cash-chart]'), {
  height: 280,
  label: 'Trésorerie cumulée (k DT)',
  xFormat: (x, short) => (short ? `${x}` : `Année ${x}`),
  yFormat: (y) => fmt(y),
});
const cashTable = $('[data-cash-table]');
bindToggle($('[data-toggle-cash]'), $('[data-cash-chart]'), cashTable);

bindForm(
  $('[data-project]'),
  (v) => {
    const r = project(v);
    setText(document, '[data-out="payback"]', r.payback == null ? `> ${v.years} ans` : `${fmt(r.payback, 1)} ans`);
    setText(document, '[data-out="revenue"]', kdt(r.revenue));
    setText(document, '[data-out="ebitda"]', kdt(r.ebitda));
    setText(document, '[data-out="npv"]', kdt(r.npv));
    setText(document, '[data-out="irr"]', r.irr == null ? `à ${fmt(v.rate, 1)} % · TRI non défini` : `à ${fmt(v.rate, 1)} % · TRI ${fmt(r.irr * 100, 1)} %`);
    const data = r.cum.map((y, x) => ({ x, y }));
    cash.update(data, r.payback == null ? [] : [{ x: r.payback, label: `Retour en ${fmt(r.payback, 1)} ans` }]);
    cashTable.replaceChildren(
      el(
        'table',
        { class: 'data-table' },
        el('thead', {}, el('tr', {}, ['Année', 'Flux (k DT)', 'Cumul (k DT)'].map((h) => el('th', { scope: 'col', text: h })))),
        el('tbody', {}, r.flows.map((f, i) => el('tr', {}, el('td', { text: String(i) }), el('td', { class: 'num', text: fmt(f) }), el('td', { class: 'num', text: fmt(r.cum[i]) })))),
      ),
    );
  },
  {
    invest: kdt,
    capacity: (x) => `${fmt(x)} t/an`,
    load: (x) => `${fmt(x)} %`,
    price: (x) => `${fmt(x)} DT/t`,
    cm: (x) => `${fmt(x)} %`,
    fixed: (x) => `${fmt(x)} k DT/an`,
    rate: (x) => `${fmt(x, 1)} %`,
    years: (x) => `${x} ans`,
  },
);

// ------------------------------------------------------------------ contact
mailForm($('[data-contact]'), {
  subject: (v) => `${v.topic} — ${v.org || v.name}`,
  lines: (v) => ['Bonjour,', '', v.message || '', '', `${v.name}${v.org ? ` — ${v.org}` : ''}`, v.email],
});
