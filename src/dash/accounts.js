import { $, h, fmt, srcLink, reveal, animate } from './common.js';
import { trendChart } from './trend.js';
import { PRICE_TREND, SOURCES, SUPPLIERS, SCOPES } from '../data/market.js';

const COLORS = { local: '#f49c21', med: '#3550d0', world: '#0d1642' };
const tonsText = (t) => (t >= 1e6 ? `${fmt(t / 1e6, 2).replace(/,?0+$/, '')} Mt` : `${fmt(t)} t`);
const logPct = (t) => Math.max(1.5, ((Math.log10(t) - 4) / 3) * 100); // 10 000 t → 10 Mt



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

reveal();


// caisse 3D de l'accueil en tête de page (chargée après le reste)
const boxCanvas = document.querySelector('[data-minibox]');
if (boxCanvas) import('./minibox.js').then((m) => m.miniBox(boxCanvas));
