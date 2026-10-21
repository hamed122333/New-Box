import '@fontsource-variable/inter';
import '@fontsource-variable/space-grotesk';
import '../styles/dashboard.css';

// Utilitaires partagés des tableaux de bord (pas de Three.js ni de bibliothèque de graphiques).

export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
document.documentElement.classList.add('js');
document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));

export const $ = (q, root = document) => root.querySelector(q);
export const fmt = (v, d = 0) => v.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });

/** Élément HTML : h('div', { class, text, style, ...attrs }, ...enfants). */
export function h(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'text') n.textContent = v;
    else if (k === 'class') n.className = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  n.append(...kids.flat().filter((x) => x != null));
  return n;
}

const NS = 'http://www.w3.org/2000/svg';
export function svg(tag, attrs = {}, text) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  return n;
}

let tipEl;
export function tip(x, y, value, label) {
  tipEl ??= document.body.appendChild(h('div', { class: 'tip', role: 'status' }));
  tipEl.replaceChildren(h('b', { text: value }), h('span', { text: label }));
  const w = tipEl.offsetWidth;
  tipEl.style.transform = `translate(${Math.min(x + 14, innerWidth - w - 8)}px, ${y - 52}px)`;
  tipEl.classList.add('is-on');
}
export const hideTip = () => tipEl?.classList.remove('is-on');

/** Lien de source (nouvel onglet). */
export const srcLink = (src, prefix = 'Source : ') => h('a', { href: src.url, target: '_blank', rel: 'noopener', text: `${prefix}${src.label}` });

/** Apparition douce des cartes à l'entrée dans l'écran (une seule fois). */
export function reveal() {
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }),
    { rootMargin: '0px 0px -8% 0px' },
  );
  document.querySelectorAll('[data-in]').forEach((el, i) => {
    el.style.transitionDelay = `${(i % 4) * 60}ms`;
    io.observe(el);
  });
}

/** Animation d'apparition (WAAPI), ignorée si l'utilisateur réduit les animations. */
export function animate(el, keyframes, opts) {
  if (reduced || !el.animate) return;
  el.animate(keyframes, { fill: 'backwards', easing: 'cubic-bezier(.2,.7,.1,1)', ...opts });
}

/** Formulaire → e-mail pré-rempli (aucune donnée stockée par le site). */
export function mailtoForm(form, subject) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const lines = [];
    for (const f of form.querySelectorAll('[name]')) {
      const v = data.get(f.name);
      if (v) lines.push(`${f.closest('label')?.firstChild?.textContent?.trim() || f.name} : ${v}`);
    }
    location.href = `mailto:info@newbox.com.tn?subject=${encodeURIComponent(subject(data))}&body=${encodeURIComponent(lines.join('\n'))}`;
    form.querySelector('[data-sent]').hidden = false;
  });
}
