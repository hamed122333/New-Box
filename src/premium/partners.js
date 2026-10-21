import { initPremium, mailtoForm } from './fx.js';
import { growthBW } from './growth-bw.js';
import { DEMO, GROWTH } from '../data/partners.js';
import { CONTEXT, SOURCES } from '../data/market.js';

const $ = (sel) => document.querySelector(sel);

// courbe de croissance noir et blanc (DEMO = valeurs fictives, badge affiché)
const bw = $('[data-bw]');
if (bw) growthBW(bw, GROWTH, DEMO);

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
