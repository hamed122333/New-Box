import { $, h, fmt, srcLink, reveal, animate, mailtoForm, tip, hideTip } from './common.js';
import { trendChart } from './trend.js';
import { PRICE_TREND, SOURCES, UPDATED, PRICE_LEVELS, MOVES, TIMELINE, SUPPLIERS, SCOPES, TUNISIA_IMPLIED, EUR_TND } from '../data/market.js';

const COLORS = { local: '#f49c21', med: '#3550d0', world: '#0d1642' };
const tonsText = (t) => (t >= 1e6 ? `${fmt(t / 1e6, 2).replace(/,?0+$/, '')} Mt` : `${fmt(t)} t`);
const logPct = (t) => Math.max(1.5, ((Math.log10(t) - 4) / 3) * 100); // 10 000 t → 10 Mt

$('[data-updated]').textContent = UPDATED;

// ---------- indicateurs ----------
const kraft = MOVES.find((m) => m.grade === 'Kraftliner' && m.market === 'Europe');
const recy = MOVES.find((m) => m.grade.startsWith('Recyclé'));
const tn = PRICE_LEVELS.find((p) => p.origin === 'tunisie');
const kpis = [
  { label: 'Kraftliner, Europe', value: kraft.value, meta: kraft.detail, delta: ['Hausse', 'up'], src: kraft.src },
  { label: 'Papiers recyclés, Europe', value: recy.value, meta: recy.detail, delta: ['Hausse', 'up'], src: recy.src },
  { label: 'Testliner + fluting, Tunisie', value: `≈ ${fmt(tn.lo)} €/t`, meta: 'prix moyen implicite 2025', delta: ['Local', 'neutral'], src: tn.src },
  { label: 'Délai caisses américaines', value: '7–10 j', meta: 'plaques 5 j · découpes 12–15 j', delta: ['New Box', 'good'] },
];
$('[data-kpis]').append(
  ...kpis.map((k) =>
    h(
      'article',
      { class: 'card kpi span-3', 'data-in': true },
      h('span', { class: 'kpi__label', text: k.label }),
      h('b', { class: 'kpi__value', text: k.value }),
      h('span', { class: 'kpi__meta' }, h('span', { class: `delta delta--${k.delta[1]}`, text: k.delta[0] }), h('span', { text: k.meta })),
      k.src ? h('a', { href: SOURCES[k.src].url, target: '_blank', rel: 'noopener', style: 'font-size:11px;color:var(--ink-3)', text: SOURCES[k.src].label }) : null,
    ),
  ),
);

// ---------- prix des bobines : courbe animée ----------
trendChart($('[data-trend]'), {
  data: PRICE_TREND,
  sources: SOURCES,
  legend: $('[data-trend-legend]'),
  side: $('[data-trend-side]'),
  srcNote: $('[data-trend-src]'),
  replay: $('[data-trend-replay]'),
});

// ---------- benchmark ----------
let zone = 'all';
let sort = 'size';
let selected = SUPPLIERS[0].name;

const detail = $('[data-detail]');
function showDetail(s) {
  detail.replaceChildren(
    h('div', {}, h('span', { class: `zone zone--${s.scope}`, text: SCOPES[s.scope] }), h('h3', { text: s.name, style: 'margin-top:8px' }), h('p', { class: 'detail__where', text: s.country })),
    h(
      'dl',
      {},
      h('dt', { text: 'Échelle' }),
      h('dd', { text: s.scale }),
      h('dt', { text: 'Papiers' }),
      h('dd', {}, h('div', { class: 'tags' }, s.grades.map((g) => h('span', { text: g })))),
      h('dt', { text: 'Fibre' }),
      h('dd', { text: s.fibre }),
    ),
    h('p', { class: 'detail__edge', text: s.edge }),
    h('p', { class: 'detail__src' }, srcLink(SOURCES[s.src])),
  );
  animate(detail, [{ opacity: 0, transform: 'translateX(8px)' }, { opacity: 1, transform: 'none' }], { duration: 300 });
}

const bars = $('[data-bars]');
function renderBars(animateIn) {
  let list = SUPPLIERS.filter((s) => zone === 'all' || s.scope === zone);
  if (sort === 'size') list = [...list].sort((a, b) => (b.tons || 0) - (a.tons || 0));
  else list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  if (!list.some((s) => s.name === selected)) selected = list[0].name;
  bars.replaceChildren();
  list.forEach((s, i) => {
    const track = h('span', { class: 'bar__track' });
    if (s.tons) {
      const fill = h('i', { class: 'bar__fill', style: `width:${logPct(s.tons)}%;background:${COLORS[s.scope]}` });
      track.append(fill, h('span', { class: 'bar__val', style: `left:calc(${logPct(s.tons)}% + 8px)`, text: tonsText(s.tons) }));
      if (animateIn) animate(fill, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 700, delay: i * 50 });
    } else track.append(h('span', { class: 'bar__none', text: s.scale }));
    const btn = h(
      'button',
      {
        type: 'button',
        class: 'bar',
        'aria-pressed': s.name === selected,
        onclick: () => {
          selected = s.name;
          bars.querySelectorAll('.bar').forEach((b) => b.setAttribute('aria-pressed', b === btn));
          showDetail(s);
        },
      },
      h('span', { class: 'bar__name' }, h('b', { text: s.name }), h('span', { text: s.metric || SCOPES[s.scope] })),
      track,
    );
    bars.append(btn);
  });
  showDetail(SUPPLIERS.find((s) => s.name === selected));
}

function seg(container, items, current, onPick) {
  container.replaceChildren(
    ...items.map(([key, label, count]) =>
      h(
        'button',
        {
          type: 'button',
          'aria-pressed': key === current,
          onclick: (e) => {
            container.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b === e.currentTarget));
            onPick(key);
          },
        },
        label,
        count != null ? h('small', { text: count }) : null,
      ),
    ),
  );
}
seg(
  $('[data-zone]'),
  [['all', 'Tous', SUPPLIERS.length], ...Object.entries(SCOPES).map(([k, v]) => [k, v, SUPPLIERS.filter((s) => s.scope === k).length])],
  zone,
  (k) => {
    zone = k;
    renderBars(true);
  },
);
seg($('[data-sort]'), [['size', 'Par taille'], ['name', 'A → Z']], sort, (k) => {
  sort = k;
  renderBars(true);
});
renderBars(false);
new IntersectionObserver((e, io) => {
  if (!e[0].isIntersecting) return;
  renderBars(true);
  io.disconnect();
}, { threshold: 0.2 }).observe($('#benchmark'));

// ---------- niveaux de prix ----------
const MAX = 1000;
$('[data-levels]').append(
  ...PRICE_LEVELS.map((p, i) => {
    const txt = p.lo === p.hi ? `${fmt(p.lo)} €/t` : `${fmt(p.lo)}–${fmt(p.hi)}`;
    const bar = h('i', { style: `left:0;width:${(p.hi / MAX) * 100}%;background:${p.origin === 'tunisie' ? '#f49c21' : '#3550d0'}` });
    const row = h('div', { class: 'level', tabindex: '0', 'aria-label': `${p.grade}, ${p.where} : ${txt}` }, h('div', {}, h('b', { text: p.grade }), h('span', { text: p.where })), h('div', { class: 'level__track' }, bar), h('span', { class: 'num', text: txt }));
    row.addEventListener('pointermove', (e) => tip(e.clientX, e.clientY, txt, SOURCES[p.src].label));
    row.addEventListener('pointerleave', hideTip);
    new IntersectionObserver((en, io) => {
      if (!en[0].isIntersecting) return;
      animate(bar, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 700, delay: i * 60 });
      io.disconnect();
    }).observe(row);
    return row;
  }),
);
$('[data-levels-note]').textContent = `Tunisie : chiffre d’affaires ÷ production publiés par Sotipapier (≈ ${fmt(Math.round(TUNISIA_IMPLIED.tlflDT))} DT/t), converti à ${String(EUR_TND).replace('.', ',')} DT/€ (BCT). Survolez une ligne pour sa source.`;

// ---------- chronologie ----------
const KIND = { hausse: '#f49c21', annonce: '#f49c21', baisse: '#3550d0', offre: '#12805c' };
$('[data-feed]').append(
  ...[...TIMELINE].reverse().slice(0, 7).map((t) =>
    h('li', {}, h('time', {}, h('span', { class: 'dot', style: `background:${KIND[t.kind]}` }), t.date), h('div', {}, h('p', { text: t.text }), srcLink(SOURCES[t.src], ''))),
  ),
);

reveal();
mailtoForm($('[data-form]'), (d) => `Consultation grands comptes — ${d.get('societe')}`);
