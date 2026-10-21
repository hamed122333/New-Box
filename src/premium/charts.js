import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { reduced } from './fx.js';

// Graphiques SVG sans bibliothèque, dessinés au scroll (GSAP), info-bulle au pointeur et au clavier.

const NS = 'http://www.w3.org/2000/svg';
const s = (tag, attrs = {}, text) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  return n;
};
export const fmt = (v, d = 0) => v.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });

let tipEl;
function tip() {
  if (!tipEl) {
    tipEl = document.createElement('div');
    tipEl.className = 'c-tip';
    tipEl.setAttribute('role', 'status');
    document.body.append(tipEl);
  }
  return tipEl;
}
function showTip(x, y, value, label) {
  const t = tip();
  t.innerHTML = '';
  const b = document.createElement('b');
  b.textContent = value;
  const sp = document.createElement('span');
  sp.textContent = label;
  t.append(b, sp);
  t.style.transform = `translate(${Math.min(x + 14, innerWidth - 220)}px, ${y - 56}px)`;
  t.classList.add('is-on');
}
const hideTip = () => tipEl?.classList.remove('is-on');

function niceMax(max, count = 4) {
  const raw = max / count || 1;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((v) => v >= raw);
  return { step, top: Math.ceil(max / step) * step };
}

/**
 * Courbe animée. `points` : [{ x: libellé, y, forecast? }]. `step` : tracé en escalier
 * (hausses cumulées). La partie prévisionnelle est en pointillés.
 */
export class LineChart {
  constructor(el, { height = 320, unit = '', decimals = 0, step = false, color = 'var(--c1)', label = '' } = {}) {
    Object.assign(this, { el, height, unit, decimals, step, color, label });
    el.classList.add('c-line');
    this.svg = s('svg', { role: 'img' });
    el.append(this.svg);
    this.drawn = false;
    new ResizeObserver(() => this.render(false)).observe(el);
    ScrollTrigger.create({ trigger: el, start: 'top 80%', once: true, onEnter: () => this.reveal() });
  }

  set(points, { unit = this.unit, decimals = this.decimals, label = this.label } = {}) {
    const prev = this.points;
    Object.assign(this, { points, unit, decimals, label });
    this.render(this.drawn && prev?.length === points.length ? prev : false);
  }

  reveal() {
    this.drawn = true;
    if (reduced) return this.render(false);
    const line = this.svg.querySelectorAll('.c-line__path');
    line.forEach((p) => {
      const len = p.getTotalLength();
      gsap.fromTo(p, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1.8, ease: 'power2.inOut', clearProps: 'strokeDasharray,strokeDashoffset' });
    });
    gsap.from(this.svg.querySelector('.c-line__area'), { opacity: 0, duration: 1.4, delay: 0.6 });
    gsap.from(this.svg.querySelectorAll('.c-line__dot, .c-line__val'), { opacity: 0, scale: 0, transformOrigin: 'center', stagger: 0.12, duration: 0.5, delay: 0.4, ease: 'back.out(2)' });
  }

  render(morphFrom) {
    const { el, svg, points } = this;
    if (!points?.length) return;
    const w = Math.max(300, el.clientWidth);
    const h = this.height;
    const mobile = w < 560;
    const pad = { l: mobile ? 44 : 64, r: 24, t: 36, b: 36 };
    const max = Math.max(...points.map((p) => p.y));
    const { step, top } = niceMax(max);
    const n = points.length;
    const sx = (i) => pad.l + (i / (n - 1 || 1)) * (w - pad.l - pad.r);
    const sy = (v) => pad.t + (1 - v / top) * (h - pad.t - pad.b);
    this._sx = sx;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('aria-label', `${this.label} : ${points.map((p) => `${p.x} ${fmt(p.y, this.decimals)} ${this.unit}`).join(', ')}`);
    svg.replaceChildren();

    const grid = s('g', { class: 'c-grid' });
    for (let v = 0; v <= top + step / 2; v += step) {
      grid.append(s('line', { x1: pad.l, x2: w - pad.r, y1: sy(v), y2: sy(v) }));
      grid.append(s('text', { x: pad.l - 10, y: sy(v) + 4, 'text-anchor': 'end' }, fmt(v)));
    }
    points.forEach((p, i) => {
      if (mobile && n > 6 && i % 2 && i !== n - 1) return;
      grid.append(s('text', { x: sx(i), y: h - 10, 'text-anchor': 'middle' }, p.x));
    });
    svg.append(grid);

    const path = (pts) => {
      let d = '';
      pts.forEach(([x, y], i) => {
        if (!i) d = `M${x},${y}`;
        else if (this.step) d += ` H${x} V${y}`;
        else {
          const [px, py] = pts[i - 1];
          const cx = (px + x) / 2;
          d += ` C${cx},${py} ${cx},${y} ${x},${y}`;
        }
      });
      return d;
    };
    const xy = points.map((p, i) => [sx(i), sy(p.y)]);
    const fi = points.findIndex((p) => p.forecast);
    const solid = fi > 0 ? xy.slice(0, fi + 1) : xy;
    const area = `${path(solid)} V${sy(0)} H${solid[0][0]} Z`;

    const gid = `g${Math.random().toString(36).slice(2, 8)}`;
    const defs = s('defs');
    const grad = s('linearGradient', { id: gid, x1: 0, x2: 0, y1: 0, y2: 1 });
    grad.append(s('stop', { offset: '0%', 'stop-color': this.color, 'stop-opacity': 0.28 }), s('stop', { offset: '100%', 'stop-color': this.color, 'stop-opacity': 0 }));
    defs.append(grad);
    svg.append(defs);
    svg.append(s('path', { class: 'c-line__area', d: area, fill: `url(#${gid})` }));
    svg.append(s('path', { class: 'c-line__path', d: path(solid), stroke: this.color }));
    if (fi > 0) svg.append(s('path', { class: 'c-line__path c-line__path--fc', d: path(xy.slice(fi)), stroke: this.color }));

    points.forEach((p, i) => {
      const [x, y] = xy[i];
      svg.append(s('circle', { class: `c-line__dot${p.forecast ? ' is-fc' : ''}`, cx: x, cy: y, r: 5, stroke: this.color }));
      const show = !mobile || i === n - 1 || i === 0;
      if (show && (p.label || i === n - 1 || !this.step)) {
        const t = s('text', { class: 'c-line__val', x, y: y - 14, 'text-anchor': i === n - 1 ? 'end' : i === 0 ? 'start' : 'middle' }, p.label ?? fmt(p.y, this.decimals));
        svg.append(t);
      }
    });

    this.cross = s('line', { class: 'c-cross', y1: pad.t, y2: h - pad.b });
    svg.append(this.cross);
    const hit = s('rect', { x: 0, y: 0, width: w, height: h, fill: 'transparent' });
    svg.append(hit);
    hit.addEventListener('pointermove', (e) => {
      const r = svg.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * w;
      let best = 0;
      xy.forEach(([px], i) => Math.abs(px - x) < Math.abs(xy[best][0] - x) && (best = i));
      this.cross.setAttribute('x1', xy[best][0]);
      this.cross.setAttribute('x2', xy[best][0]);
      el.classList.add('is-hover');
      const p = points[best];
      showTip(e.clientX, e.clientY, `${fmt(p.y, this.decimals)} ${this.unit}`, `${p.x}${p.forecast ? ' · prévision' : ''}${p.note ? ` · ${p.note}` : ''}`);
    });
    hit.addEventListener('pointerleave', () => {
      el.classList.remove('is-hover');
      hideTip();
    });

    if (morphFrom && !reduced) {
      const paths = svg.querySelectorAll('.c-line__path, .c-line__area, .c-line__dot, .c-line__val');
      gsap.from(paths, { opacity: 0, y: 16, duration: 0.6, stagger: 0.02, ease: 'power3.out' });
    } else if (!this.drawn) {
      svg.querySelectorAll('.c-line__path').forEach((p) => {
        const len = p.getTotalLength();
        p.style.strokeDasharray = len;
        p.style.strokeDashoffset = len;
      });
    }
  }
}

/**
 * Fourchettes horizontales sur un axe unique. items : [{ label, sub, lo, hi, group }].
 * `colors` : { group: couleur }. Les barres s'étirent à l'entrée dans l'écran.
 */
export function rangeBars(el, items, { max, step, unit, colors, source = () => '' }) {
  el.classList.add('c-range');
  el.replaceChildren();
  const pct = (v) => `${(v / max) * 100}%`;
  for (const it of items) {
    const txt = it.lo === it.hi ? `${fmt(it.lo)} ${unit}` : `${fmt(it.lo)}–${fmt(it.hi)} ${unit}`;
    const row = document.createElement('div');
    row.className = 'c-range__row';
    row.tabIndex = 0;
    row.setAttribute('aria-label', `${it.label}, ${it.sub} : ${txt}`);
    row.innerHTML = `<div class="c-range__label"><b></b><span></span></div><div class="c-range__track"><i></i><em></em></div>`;
    row.querySelector('b').textContent = it.label;
    row.querySelector('span').textContent = it.sub;
    const bar = row.querySelector('i');
    bar.style.cssText = `left:${pct(it.lo)};width:max(12px, ${pct(it.hi - it.lo)});--c:${colors[it.group]}`;
    const val = row.querySelector('em');
    val.textContent = txt;
    val.style.left = `calc(${pct(it.hi)} + 10px)`;
    row.addEventListener('pointermove', (e) => showTip(e.clientX, e.clientY, txt, source(it)));
    row.addEventListener('pointerleave', hideTip);
    el.append(row);
  }
  const axis = document.createElement('div');
  axis.className = 'c-range__axis';
  for (let v = 0; v <= max; v += step) {
    const t = document.createElement('span');
    t.style.left = pct(v);
    t.textContent = fmt(v);
    axis.append(t);
  }
  const axisRow = document.createElement('div');
  axisRow.className = 'c-range__row c-range__row--axis';
  axisRow.append(document.createElement('span'), axis);
  el.append(axisRow);
  if (!reduced)
    gsap.from(el.querySelectorAll('.c-range__track i'), {
      scaleX: 0,
      transformOrigin: 'left',
      duration: 1.1,
      ease: 'expo.out',
      stagger: 0.08,
      scrollTrigger: { trigger: el, start: 'top 80%', once: true },
    });
}
