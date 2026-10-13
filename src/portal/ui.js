import { SOURCES } from '../data/market.js';

/** Nombre au format français (espaces fines, virgule décimale). */
export const fmt = (n, d = 0) =>
  Number(n).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });

export const pct = (n, d = 1, sign = true) => `${sign && n > 0 ? '+' : ''}${fmt(n, d)} %`;

/** Petit utilitaire de création d'éléments (le texte passe toujours par textContent). */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'style') node.style.cssText = v;
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null) node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return node;
}

/** Lien vers une source de la veille marché. */
export function sourceLink(key, short = false) {
  const s = SOURCES[key];
  if (!s) return null;
  return el('a', { href: s.url, target: '_blank', rel: 'noopener', text: short ? 'source' : s.label });
}

/** Info-bulle unique de la page : valeur en premier, libellé ensuite. */
class Tip {
  constructor() {
    this.node = el('div', { class: 'tip', role: 'status', 'aria-live': 'polite' });
    document.body.append(this.node);
  }

  /** @param {{value:string, label?:string, rows?:{color:string,text:string}[]}} c */
  show(x, y, c) {
    this.node.replaceChildren(
      el('strong', { text: c.value }),
      c.label ? el('span', { text: c.label }) : null,
      ...(c.rows || []).map((r) => el('div', { class: 'tip__row' }, el('i', { style: `--c:${r.color}` }), el('span', { text: r.text }))),
    );
    const w = this.node.offsetWidth;
    const h = this.node.offsetHeight;
    const left = Math.min(window.innerWidth - w - 8, Math.max(8, x + 14));
    const top = y - h - 12 < 8 ? y + 16 : y - h - 12;
    this.node.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
    this.node.classList.add('is-on');
  }

  hide() {
    this.node.classList.remove('is-on');
  }
}

let tip = null;
export const getTip = () => (tip ??= new Tip());

/** Info-bulle au survol et au focus d'un élément (`content()` est appelé à chaque affichage). */
export function hoverTip(node, content) {
  const t = getTip();
  node.addEventListener('pointermove', (e) => t.show(e.clientX, e.clientY, content()));
  node.addEventListener('pointerleave', () => t.hide());
  node.addEventListener('focus', () => {
    const r = node.getBoundingClientRect();
    t.show(r.left + r.width / 2, r.top, content());
  });
  node.addEventListener('blur', () => t.hide());
}

/**
 * Formulaire de simulation : lit les champs `[name]`, affiche les valeurs des curseurs
 * (`output[for]`) et recalcule une fois par image au plus.
 */
export function bindForm(form, compute, formats = {}) {
  let raf = 0;
  const read = () => {
    const v = {};
    for (const input of form.querySelectorAll('input[name], select[name]')) {
      v[input.name] = input.type === 'range' || input.type === 'number' ? Number(input.value) : input.value;
    }
    return v;
  };
  const run = () => {
    raf = 0;
    const v = read();
    for (const out of form.querySelectorAll('output[for]')) {
      const k = out.getAttribute('for');
      const text = formats[k] ? formats[k](v[k]) : fmt(v[k]);
      if (out.textContent !== text) out.textContent = text;
    }
    compute(v);
  };
  form.addEventListener('input', () => (raf ||= requestAnimationFrame(run)));
  form.addEventListener('submit', (e) => e.preventDefault());
  run();
  return run;
}

/** Écrit un texte seulement s'il change (pas d'invalidation de style inutile). */
export function setText(root, sel, text) {
  const node = typeof sel === 'string' ? root.querySelector(sel) : sel;
  if (node && node.textContent !== text) node.textContent = text;
}
