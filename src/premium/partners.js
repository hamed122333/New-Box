import { initPremium, mailtoForm } from './fx.js';
import { LineChart, fmt } from './charts.js';
import { DEMO, GROWTH } from '../data/partners.js';
import { CONTEXT, SOURCES } from '../data/market.js';

const $ = (sel) => document.querySelector(sel);

// courbe de croissance (données de src/data/partners.js ; DEMO = valeurs fictives)
const chartEl = $('[data-growth-chart]');
if (chartEl) {
  if (DEMO) $('[data-demo]').hidden = false;
  const chart = new LineChart(chartEl, { height: 340, color: 'var(--c1)' });
  const { years, forecastFrom, firstFullYear, series } = GROWTH;
  const kpi = (k, v, l) => {
    $(`[data-kpi="${k}"]`).textContent = v;
    $(`[data-kpi-l="${k}"]`).textContent = l;
  };
  const show = (key) => {
    const se = series[key];
    chart.set(
      se.values.map((y, i) => ({ x: String(years[i]), y, forecast: years[i] >= forecastFrom })),
      { unit: se.unit, decimals: se.decimals, label: se.label },
    );
    const real = se.values.filter((_, i) => years[i] < forecastFrom);
    const i0 = years.indexOf(firstFullYear);
    const n = real.length - 1 - i0;
    const mult = real.at(-1) / se.values[i0];
    kpi('mult', `×${fmt(mult, 1)}`, `${se.label.toLowerCase()} entre ${firstFullYear} et ${years[real.length - 1]}`);
    kpi('cagr', `+${fmt((mult ** (1 / n) - 1) * 100, 0)} %`, 'croissance annuelle moyenne');
    kpi('last', `${fmt(se.values.at(-1), se.decimals)} ${se.unit}`, `prévision ${forecastFrom}`);
  };
  const tabs = $('[data-growth-tabs]');
  Object.entries(series).forEach(([key, se], i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.role = 'tab';
    b.textContent = se.tab;
    b.setAttribute('aria-selected', i === 0);
    b.addEventListener('click', () => {
      tabs.querySelectorAll('button').forEach((x) => x.setAttribute('aria-selected', x === b));
      show(key);
    });
    tabs.append(b);
  });
  show(Object.keys(series)[0]);
}

// contexte de marché (chiffres sourcés)
$('[data-context]')?.append(
  ...Object.values(CONTEXT).map((c) => {
    const card = document.createElement('article');
    card.className = 'card kpi';
    card.dataset.spotlight = '';
    const b = document.createElement('b');
    b.textContent = c.value;
    b.style.color = '#f49c21';
    const sp = document.createElement('span');
    sp.textContent = c.label;
    const a = document.createElement('a');
    a.className = 'src';
    a.style.color = '#b9c0dc';
    a.href = SOURCES[c.src].url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = `Source : ${SOURCES[c.src].label}`;
    card.append(b, sp, a);
    return card;
  }),
);

initPremium();

const form = document.querySelector('[data-form]');
if (form) mailtoForm(form, { subject: (d) => `Partenaires New Box — demande de ${d.get('institution')}` });
