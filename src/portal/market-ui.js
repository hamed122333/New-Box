import { CONTEXT, MOVES, PRICE_LEVELS, TIMELINE, SUPPLIERS, SCOPES, SOURCES, EUR_TND, UPDATED, TUNISIA_IMPLIED } from '../data/market.js';
import { el, fmt, sourceLink } from './ui.js';
import { rangeChart } from './charts.js';

const ORIGIN_COLOR = { europe: 'var(--series-1)', tunisie: 'var(--series-2)' };

/** Textes communs : date de la veille, cours de change, prix tunisien converti. */
export function fillCommon(root = document) {
  root.querySelectorAll('[data-updated]').forEach((n) => (n.textContent = UPDATED));
  root.querySelectorAll('[data-fx]').forEach((n) => (n.textContent = fmt(EUR_TND, 4)));
  root.querySelectorAll('[data-tn-eur]').forEach((n) => (n.textContent = fmt(TUNISIA_IMPLIED.tlflDT / EUR_TND)));
  root.querySelectorAll('[data-tn-dt]').forEach((n) => (n.textContent = fmt(TUNISIA_IMPLIED.tlflDT)));
}

/** Encart du héros : quelques chiffres du marché (tirés des mêmes données que la page). */
export function heroMarketCard(card) {
  const row = (label, value, note) => el('div', { class: 'hero-card__row' }, el('span', { text: label }), el('b', { text: value }), el('small', { text: note }));
  const kl = MOVES[0];
  card.replaceChildren(
    el('p', { class: 'hero-card__title', text: `Le marché en un coup d’œil · ${UPDATED}` }),
    row(`${kl.grade} · ${kl.market}`, kl.value, kl.detail),
    row('Export d’huile d’olive', CONTEXT.olive.value, '10 mois de la campagne 2025-2026'),
    row('Export de dattes', CONTEXT.dates.value, 'saison 2025-2026, 160 000 t'),
    row('Règlement PPWR (UE)', CONTEXT.ppwr.value, 'en application, emballages importés compris'),
  );
}

/** Tuiles chiffrées du contexte (clé de CONTEXT → tuile avec source). */
export function contextTiles(container, keys) {
  container.replaceChildren(
    ...keys.map((k) => {
      const c = CONTEXT[k];
      return el('article', { class: 'tile' }, el('p', { class: 'tile__value', text: c.value }), el('p', { class: 'tile__label', text: c.label }), el('p', { class: 'tile__src' }, sourceLink(c.src)));
    }),
  );
}

/** Derniers mouvements de prix par marché (flèche + mot : jamais la couleur seule). */
export function moveTiles(container) {
  container.replaceChildren(
    ...MOVES.map((m) =>
      el(
        'article',
        { class: 'tile move', 'data-dir': String(m.dir) },
        el('p', { class: 'tile__tag', text: m.market }),
        el('p', { class: 'move__value' }, el('i', { 'aria-hidden': 'true', text: m.dir > 0 ? '▲' : '▼' }), el('span', { text: m.value })),
        el('p', { class: 'tile__label' }, el('b', { text: m.grade }), ` — ${m.detail}`),
        el('p', { class: 'tile__src' }, sourceLink(m.src)),
      ),
    ),
  );
}

/** Graphique des niveaux de prix + vue tableau (mêmes données). */
export function priceLevels(chart, table, toggle) {
  rangeChart(chart, PRICE_LEVELS, {
    max: 1000,
    step: 200,
    unit: '€/t',
    color: (it) => ORIGIN_COLOR[it.origin],
    source: (it) => SOURCES[it.src].label,
  });
  table.replaceChildren(
    el(
      'table',
      { class: 'data-table' },
      el('thead', {}, el('tr', {}, ['Qualité', 'Marché, date', 'Prix (€/t)', 'Source'].map((h) => el('th', { scope: 'col', text: h })))),
      el(
        'tbody',
        {},
        PRICE_LEVELS.map((it) =>
          el(
            'tr',
            {},
            el('td', { text: it.grade }),
            el('td', { text: it.where }),
            el('td', { class: 'num', text: it.lo === it.hi ? fmt(it.lo) : `${fmt(it.lo)}–${fmt(it.hi)}` }),
            el('td', {}, sourceLink(it.src)),
          ),
        ),
      ),
    ),
  );
  bindToggle(toggle, chart, table);
}

/** Bouton « Afficher le tableau » / « Afficher le graphique ». */
export function bindToggle(btn, chart, table) {
  if (!btn) return;
  btn.addEventListener('click', () => {
    const showTable = table.hidden;
    table.hidden = !showTable;
    chart.hidden = showTable;
    btn.textContent = showTable ? 'Afficher le graphique' : 'Afficher le tableau';
  });
}

export function timeline(container) {
  container.replaceChildren(
    ...TIMELINE.map((t) => el('li', {}, el('time', { text: t.date }), el('div', {}, el('span', { class: 'kind', text: t.kind }), t.text, sourceLink(t.src, true)))),
  );
}

/** Tableau des papetiers, filtrable par zone. */
export function suppliersTable(tbody, filters) {
  const render = (scope) => {
    const rows = SUPPLIERS.filter((s) => scope === 'all' || s.scope === scope);
    tbody.replaceChildren(
      ...rows.map((s) =>
        el(
          'tr',
          {},
          el('td', {}, el('b', { text: s.name }), el('span', { text: s.country })),
          el('td', {}, el('span', { class: 'scope', 'data-scope': s.scope, text: SCOPES[s.scope] })),
          el('td', {}, el('div', { class: 'grades' }, s.grades.map((g) => el('span', { text: g }))), el('small', { style: 'color:var(--ink-3)', text: s.fibre })),
          el('td', { text: s.scale }),
          el('td', { text: s.edge }),
          el('td', {}, sourceLink(s.src, true)),
        ),
      ),
    );
  };
  filters?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-scope]');
    if (!b) return;
    filters.querySelectorAll('[data-scope]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    render(b.dataset.scope);
  });
  render('all');
}

/** Formulaire de contact → e-mail pré-rempli (rien n'est envoyé automatiquement). */
export function mailForm(form, { subject, lines }) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(form).entries());
    const body = lines(v).join('\n');
    window.location.href = `mailto:info@newbox.com.tn?subject=${encodeURIComponent(subject(v))}&body=${encodeURIComponent(body)}`;
  });
}
