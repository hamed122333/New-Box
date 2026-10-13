import { FLUTES, FLUTE_ORDER } from '../data/flutes.js';
import { PAPERS, OUTER_ORDER, INNER_ORDER, FLUTING, CONDITIONS } from '../data/papers.js';
import { estimate, blankArea } from '../lib/calc.js';
import { EUR_TND, TUNISIA_IMPLIED, SUPPLIERS, SCOPES } from '../data/market.js';
import { el, fmt, pct, bindForm, setText, sourceLink } from './ui.js';
import { fillCommon, moveTiles, mailForm } from './market-ui.js';

const $ = (s) => document.querySelector(s);

fillCommon();
moveTiles($('[data-moves]'));

// ------------------------------------------------------------------ prix des papiers (DT/t)
// KL / KS : kraftliner européen (≈ 865 €/t) au cours BCT ; TL / FL : prix moyen implicite tunisien 2025 ;
// TB : hypothèse (+30 % sur le testliner). Modifiables par l'utilisateur.
const KRAFT_EUR = 865;
const DEFAULT_PRICES = {
  KL: Math.round(KRAFT_EUR * EUR_TND),
  KS: Math.round(KRAFT_EUR * EUR_TND),
  TL: Math.round(TUNISIA_IMPLIED.tlflDT),
  TB: Math.round(TUNISIA_IMPLIED.tlflDT * 1.3),
  FL: Math.round(TUNISIA_IMPLIED.tlflDT),
};

const optForm = $('[data-optimizer]');
optForm.querySelector('[data-conditions]').innerHTML = Object.values(CONDITIONS)
  .map((c) => `<option value="${c.id}"${c.id === 'standard' ? ' selected' : ''}>${c.name}</option>`)
  .join('');
$('[data-prices]').replaceChildren(
  ...Object.keys(DEFAULT_PRICES).map((code) =>
    el(
      'label',
      { class: 'field' },
      el('span', { class: 'field__top', text: `${code} · ${PAPERS[code].name}` }),
      el('input', { type: 'number', name: `p_${code}`, min: '200', max: '10000', step: '10', value: String(DEFAULT_PRICES[code]), inputmode: 'numeric' }),
    ),
  ),
);
setText(document, '[data-prices-note]', `KL et KS : kraftliner européen (≈ ${KRAFT_EUR} €/t) à ${fmt(EUR_TND, 4)} DT/€ ; TL et FL : prix moyen implicite tunisien 2025 ; TB : hypothèse (+30 % sur le TL). Remplacez-les par vos prix d’achat.`);

/** Coût papier d'une caisse (DT) : surface du flan × Σ grammage × prix, cannelures comprises. */
function paperCost(e, area, prices) {
  const liners = e.liners.reduce((s, p) => s + p.gsm * prices[p.code], 0);
  const flutes = e.flutings.reduce((s, p) => s + p.gsm * p.takeUp * prices[FLUTING], 0);
  return (area * (liners + flutes)) / 1e6;
}

/** Toutes les compositions (6 cannelures × couvertures) évaluées pour la caisse demandée. */
export function optimize(v) {
  const prices = Object.fromEntries(Object.keys(DEFAULT_PRICES).map((k) => [k, Number(v[`p_${k}`]) || DEFAULT_PRICES[k]]));
  const L = Math.min(800, Math.max(100, v.L || 400));
  const W = Math.min(600, Math.max(80, v.W || 300));
  const H = Math.min(800, Math.max(50, v.H || 300));
  const area = blankArea(L, W, H);
  const options = [];
  for (const flute of FLUTE_ORDER)
    for (const outer of OUTER_ORDER)
      for (const inner of INNER_ORDER) {
        const e = estimate({ product: 'CI', L, W, H, flute, outer, inner, content: v.content, condition: v.condition });
        const unitKg = v.content + e.weightG / 1000;
        const required = (v.target - 1) * unitKg * e.factor; // kgf sur la caisse du bas
        options.push({ flute, outer, inner, e, required, ratio: e.bctKg / required, pass: e.stack >= v.target, cost: paperCost(e, area, prices) });
      }
  const passing = options.filter((o) => o.pass).sort((a, b) => a.cost - b.cost);
  // référence : la caisse américaine courante, cannelure C en kraftliner / testliner
  const ref = options.find((o) => o.flute === REF.flute && o.outer === REF.outer && o.inner === REF.inner);
  return { L, W, H, options, passing, best: passing[0] ?? null, ref };
}

const REF = { flute: 'C', outer: 'KL', inner: 'TL' };
let renderIndex = null; // défini plus bas : l'indexation reprend la quantité de l'optimiseur
const label = (o) => `${FLUTES[o.flute].name.replace('Cannelure ', '')} · ${o.e.papers}`;
const dt = (x, d = 3) => `${fmt(x, d)} DT`;
let lastQty = 100000;

function renderOptimizer(v) {
  const r = optimize(v);
  lastQty = Math.max(0, v.qty || 0);
  const best = r.best;
  const box = $('[data-best]');
  if (!best) {
    box.replaceChildren(
      el('div', {}, el('p', { class: 'best__badge', text: 'Aucune composition' }), el('h3', { text: 'Charge trop élevée pour une caisse seule' }), el('p', { text: 'Réduisez la hauteur de gerbage, renforcez par des cornières ou passez à une caisse-palette : nos équipes vous proposent une solution.' })),
    );
  } else {
    const url = `index.html?produit=CI&L=${r.L}&W=${r.W}&H=${r.H}&cannelure=${best.flute}&ext=${best.outer}&int=${best.inner}#configurateur`;
    box.replaceChildren(
      el(
        'div',
        {},
        el('p', { class: 'best__badge', text: 'Recommandé' }),
        el('h3', { text: `${FLUTES[best.flute].name} · ${best.e.papers}` }),
        el('p', { text: `BCT ≈ ${fmt(best.e.bctKg)} kgf · jusqu’à ${best.e.stack} caisses empilées · ${fmt(best.e.weightG)} g par caisse · ECT ≈ ${fmt(best.e.ect, 1)} kN/m` }),
      ),
      el(
        'div',
        { style: 'text-align:right' },
        el('p', { style: 'font:650 32px/1.1 var(--f-head);color:#fff', text: dt(best.cost) }),
        el('p', { text: 'de papier par caisse' }),
        el('a', { class: 'btn btn--small', href: url, style: 'margin-top:10px', text: 'Voir en 3D' }),
      ),
    );
  }

  // économies face à la référence C · KL / TL
  if (best && r.ref.pass && best !== r.ref) {
    const save = r.ref.cost - best.cost;
    setText(document, '[data-out="saving"]', pct((-save / r.ref.cost) * 100));
    setText(document, '[data-out="savingNote"]', `${dt(save)} par caisse · ≈ ${fmt((save * lastQty) / 1000)} k DT par an`);
    const tons = ((r.ref.e.weightG - best.e.weightG) * lastQty) / 1e6;
    setText(document, '[data-out="tons"]', `${fmt(Math.abs(tons), 1)} t`);
    setText(document, '[data-out="tonsNote"]', tons >= 0 ? `de papier en moins par an pour ${fmt(lastQty)} caisses` : `de papier en plus, mais des papiers moins chers`);
  } else {
    setText(document, '[data-out="saving"]', best === r.ref ? '0 %' : '—');
    setText(document, '[data-out="savingNote"]', !r.ref.pass ? 'la référence C · KL / TL ne tient pas cette charge' : 'la référence C · KL / TL est déjà la meilleure');
    setText(document, '[data-out="tons"]', '—');
    setText(document, '[data-out="tonsNote"]', `pour ${fmt(lastQty)} caisses par an`);
  }
  setText(document, '[data-out="passing"]', `${r.passing.length} / ${r.options.length}`);
  setText(document, '[data-out="required"]', best ? `résistance exigée ≈ ${fmt(best.required)} kgf (coef. ${fmt(best.e.factor, 1)})` : 'aucune ne suffit');

  // tableau : les meilleures compositions, la référence si elle n'y est pas, sinon les plus résistantes
  let rows = r.passing.slice(0, 7);
  if (!rows.length) rows = [...r.options].sort((a, b) => b.ratio - a.ratio).slice(0, 6);
  if (!rows.includes(r.ref)) rows = [...rows, r.ref];
  const maxRatio = Math.max(...rows.map((o) => o.ratio));
  $('[data-options]').replaceChildren(
    ...rows.map((o) => {
      const tr = el(
        'tr',
        { class: [o === best ? 'is-best' : '', o.pass ? '' : 'is-fail'].join(' ').trim() || null },
        el('td', {}, el('b', { text: label(o) }), o === r.ref ? el('span', { style: 'display:block;font-size:12px;color:var(--ink-3)', text: 'référence courante' }) : null),
        el('td', { class: 'num', text: `${fmt(o.e.bctKg)} kgf` }),
        el('td', {}, el('div', { class: 'meter', title: `×${fmt(o.ratio, 2)} la résistance exigée` }, el('span', { style: `width:${Math.min(100, (o.ratio / maxRatio) * 100)}%` })), el('span', { class: o.pass ? 'ok' : 'ko', text: o.pass ? `✓ ×${fmt(o.ratio, 2)}` : `✗ ×${fmt(o.ratio, 2)}` })),
        el('td', { class: 'num', text: `${o.e.stack} caisses` }),
        el('td', { class: 'num', text: `${fmt(o.e.weightG)} g` }),
        el('td', { class: 'num', text: dt(o.cost) }),
      );
      return tr;
    }),
  );
  heroCard(r, v);
  renderIndex?.();
}

/** Encart du héros : le résultat de l'optimiseur pour la caisse saisie (mis à jour en direct). */
function heroCard(r, v) {
  const card = $('[data-hero-card]');
  const best = r.best;
  const save = best && r.ref.pass && best !== r.ref ? (1 - best.cost / r.ref.cost) * 100 : null;
  card.replaceChildren(
    el('p', { class: 'hero-card__title', text: 'Exemple d’optimisation' }),
    el('div', { class: 'hero-card__row' }, el('span', { text: `Caisse ${r.L} × ${r.W} × ${r.H} mm` }), el('b', { text: `${fmt(v.content, v.content % 1 ? 1 : 0)} kg` }), el('small', { text: `${v.target} caisses empilées · ${CONDITIONS[v.condition].name}` })),
    best
      ? el('div', { class: 'hero-card__row' }, el('span', { text: 'Composition retenue' }), el('b', { text: label(best) }), el('small', { text: `BCT ≈ ${fmt(best.e.bctKg)} kgf · ${fmt(best.e.weightG)} g` }))
      : el('div', { class: 'hero-card__row' }, el('span', { text: 'Aucune composition ne suffit' })),
    best ? el('p', { class: 'hero-card__big', text: dt(best.cost) }) : null,
    best ? el('small', { style: 'color:var(--on-dark-2)', text: save != null ? `de papier par caisse, soit ${pct(-save)} face à une C · KL / TL` : 'de papier par caisse' }) : null,
    el('a', { class: 'btn btn--small', href: '#optimiseur', text: 'Essayer avec ma caisse' }),
  );
}

bindForm(optForm, renderOptimizer, { content: (x) => `${fmt(x, x % 1 ? 1 : 0)} kg`, target: (x) => `${x} caisses` });

// ------------------------------------------------------------------ clause d'indexation
const signed = (v) => pct(v, Number.isInteger(v) ? 0 : 1);
export function indexation(v) {
  const dPaper = (1 + v.dIdx / 100) * (1 + ((v.imported / 100) * v.dFx) / 100) - 1;
  const triggered = Math.abs(dPaper * 100) >= v.threshold;
  const newPrice = triggered ? v.price * (1 + (v.share / 100) * dPaper) : v.price;
  return { dPaper, triggered, newPrice, dPrice: newPrice / v.price - 1 };
}

renderIndex = bindForm(
  $('[data-index]'),
  (v) => {
    const r = indexation(v);
    setText(document, '[data-out="newPrice"]', dt(r.newPrice));
    setText(document, '[data-out="trigger"]', r.triggered ? `clause déclenchée : papier ${pct(r.dPaper * 100)} (seuil ±${fmt(v.threshold, 1)} %)` : `sous le seuil de ±${fmt(v.threshold, 1)} % : prix inchangé`);
    setText(document, '[data-out="dPrice"]', pct(r.dPrice * 100));
    setText(document, '[data-out="dPaper"]', `variation du papier retenue : ${pct(r.dPaper * 100)}`);
    setText(document, '[data-out="yearly"]', `${r.newPrice >= v.price ? '+' : '−'}${fmt(Math.abs((r.newPrice - v.price) * lastQty) / 1000)} k DT`);
    setText(document, '[data-out="yearlyNote"]', `pour ${fmt(lastQty)} caisses par an (quantité de l’optimiseur)`);
  },
  { price: (x) => dt(x), share: (x) => `${fmt(x)} %`, dIdx: signed, imported: (x) => `${fmt(x)} %`, dFx: signed, threshold: (x) => `±${fmt(x, x % 1 ? 1 : 0)} %` },
);

// ------------------------------------------------------------------ bassin d'approvisionnement
$('[data-supply]').replaceChildren(
  ...Object.entries(SCOPES).map(([scope, name]) =>
    el(
      'article',
      { class: 'card' },
      el('p', { class: 'scope', 'data-scope': scope, text: name }),
      el(
        'ul',
        {},
        SUPPLIERS.filter((s) => s.scope === scope).map((s) => el('li', {}, el('b', { text: s.name }), ` — ${s.grades.join(', ')} ; ${s.scale} `, sourceLink(s.src, true))),
      ),
    ),
  ),
);

// ------------------------------------------------------------------ demande d'accord-cadre
mailForm($('[data-contact]'), {
  subject: (v) => `Accord-cadre grands comptes — ${v.company}`,
  lines: (v) => [
    'Bonjour New Box,',
    '',
    'Nous souhaitons étudier un accord-cadre :',
    `• Société : ${v.company}`,
    `• Secteur : ${v.sector}`,
    `• Volume annuel : ${v.volume || 'à préciser'}`,
    `• Nombre de références : ${v.refs || 'à préciser'}`,
    '',
    v.message || '',
    '',
    `${v.name} — ${v.email}${v.phone ? ` — ${v.phone}` : ''}`,
  ],
});
