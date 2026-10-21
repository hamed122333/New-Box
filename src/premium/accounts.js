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

// benchmark papetiers : barres de tonnage (échelle log) + fiches, animations rejouées à chaque filtre
const bench = $('[data-bench]');
const filter = $('[data-filter]');
const tons = $('[data-tons]');
if (bench && filter && tons) {
  const COLORS = { local: '#f49c21', med: '#3550d0', world: '#0d1642' };
  const fmtT = (t) => (t >= 1e6 ? `${(t / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} Mt` : `${t.toLocaleString('fr-FR')} t`);
  const logW = (t) => Math.max(2, ((Math.log10(t) - 4) / 3) * 100); // 10 000 t → 10 Mt
  let zone = 'all';
  let bySize = false;

  const render = () => {
    let list = SUPPLIERS.filter((x) => zone === 'all' || x.scope === zone);
    if (bySize) list = [...list].sort((a, b) => (b.tons || 0) - (a.tons || 0));
    tons.replaceChildren();
    list.filter((x) => x.tons).forEach((x, i) => {
      const row = h('div', 'tons__row');
      const lab = h('div', 'tons__label');
      lab.append(h('b', '', x.name), h('span', '', x.metric));
      const track = h('div', 'tons__track');
      const bar = h('i', 'boom-bar');
      bar.style.cssText = `width:${logW(x.tons)}%;background:${COLORS[x.scope]};animation-delay:${0.1 + i * 0.12}s`;
      const val = h('em', 'boom', fmtT(x.tons));
      val.style.cssText = `left:calc(${logW(x.tons)}% + 12px);animation-delay:${0.3 + i * 0.12}s`;
      track.append(bar, val);
      row.append(lab, track);
      tons.append(row);
    });
    const axis = h('div', 'tons__row tons__row--axis');
    const ticks = h('div', 'tons__axis');
    ['10 000 t', '100 000 t', '1 Mt', '10 Mt'].forEach((t) => ticks.append(h('span', '', t)));
    axis.append(h('span'), ticks);
    tons.append(axis);

    bench.replaceChildren();
    list.forEach((sup, i) => {
      const c = h('article', `card bench-card boom is-${sup.scope}`);
      c.dataset.spotlight = '';
      c.style.animationDelay = `${i * 0.08}s`;
      const top = h('div', 'bench-card__top');
      const id = h('div');
      id.append(h('span', 'bench-card__zone', SCOPES[sup.scope]), h('h3', '', sup.name), h('p', 'where', sup.country));
      top.append(id, h('span', 'bench-card__rank', String(SUPPLIERS.indexOf(sup) + 1).padStart(2, '0')));
      const tags = h('div', 'bench__tags');
      tags.append(...sup.grades.map((g) => h('span', '', g)), h('span', 'is-soft', `Fibre ${sup.fibre.toLowerCase()}`));
      c.append(top, tags, h('b', 'scale', sup.scale), h('p', 'edge', sup.edge), srcLink(sup.src));
      bench.append(c);
    });
  };

  const choices = [['all', 'Tous'], ...Object.entries(SCOPES)];
  for (const [key, label] of choices) {
    const btn = h('button', '', label);
    btn.type = 'button';
    btn.append(h('small', '', String(key === 'all' ? SUPPLIERS.length : SUPPLIERS.filter((x) => x.scope === key).length)));
    btn.setAttribute('aria-pressed', key === 'all');
    btn.addEventListener('click', () => {
      filter.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === btn));
      zone = key;
      render();
    });
    filter.append(btn);
  }
  const sortBtn = $('[data-sort]');
  sortBtn.addEventListener('click', () => {
    bySize = !bySize;
    sortBtn.textContent = `Trier : ${bySize ? 'par taille' : 'par zone'}`;
    render();
  });
  // première animation à l'entrée dans l'écran
  const sec = $('#papetiers');
  sec.classList.add('is-wait');
  render();
  new IntersectionObserver(
    (e, io) => {
      if (!e[0].isIntersecting) return;
      sec.classList.remove('is-wait');
      render();
      io.disconnect();
    },
    { threshold: 0.15 },
  ).observe(sec);
}

initPremium();

const form = document.querySelector('[data-form]');
if (form) mailtoForm(form, { subject: (d) => `Consultation grands comptes — ${d.get('societe')}` });
