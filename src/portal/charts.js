import { el, fmt, hoverTip, getTip } from './ui.js';

const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
};

/** Graduations « rondes » couvrant [min, max]. */
function niceTicks(min, max, count = 5) {
  const span = max - min || 1;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return { lo, hi, ticks };
}

/**
 * Fourchettes de prix sur un axe unique (€/t) : une ligne par qualité, la couleur porte
 * l'origine (légende au-dessus), la valeur est écrite au bout de la barre.
 */
export function rangeChart(container, items, { max = 1000, step = 200, unit = '€/t', color, source }) {
  container.replaceChildren();
  container.classList.add('range-chart');
  const pos = (v) => `${(v / max) * 100}%`;
  for (const it of items) {
    const text = it.lo === it.hi ? `${fmt(it.lo)} ${unit}` : `${fmt(it.lo)}–${fmt(it.hi)} ${unit}`;
    const bar = el('span', { class: 'range-bar', style: `left:${pos(it.lo)};width:max(12px, ${((it.hi - it.lo) / max) * 100}%);--c:${color(it)}` });
    // près du bord droit, la valeur passe à gauche de la barre (jamais coupée)
    const flip = it.hi / max > 0.7;
    const value = el('span', {
      class: 'range-value',
      style: flip ? `right:calc(${100 - (it.lo / max) * 100}% + 6px);padding:0 8px 0 0` : `left:calc(${pos(it.hi)} + 6px)`,
      text,
    });
    const row = el(
      'div',
      { class: 'range-row', tabindex: '0', 'aria-label': `${it.grade}, ${it.where} : ${text}` },
      el('div', { class: 'range-row__label' }, el('b', { text: it.grade }), el('span', { text: it.where })),
      el('div', { class: 'range-track' }, bar, value),
    );
    hoverTip(row, () => ({ value: text, label: `${it.grade} · ${it.where}`, rows: source ? [{ color: color(it), text: source(it) }] : [] }));
    container.append(row);
  }
  const axis = el('div', { class: 'range-axis', 'aria-hidden': 'true' });
  for (let v = 0; v <= max; v += step) axis.append(el('span', { style: `left:${pos(v)}`, text: fmt(v) }));
  container.append(el('div', { class: 'range-row range-row--axis' }, el('span'), axis));
}

/**
 * Courbe (une série) avec réticule : le pointeur s'aligne sur l'abscisse la plus proche.
 * `markers` : repères verticaux (ex. point mort). Pas de légende : le titre nomme la série.
 */
export class LineChart {
  constructor(container, { height = 260, color = 'var(--series-1)', xFormat = String, yFormat = (v) => fmt(v), label = '' } = {}) {
    this.container = container;
    this.opts = { height, color, xFormat, yFormat, label };
    container.classList.add('svg-chart');
    this.svg = svgEl('svg', { role: 'img' });
    container.append(this.svg);
    this.data = [];
    this.markers = [];
    new ResizeObserver(() => this._render()).observe(container);
    const tip = getTip();
    const move = (e) => {
      if (!this.data.length || !this._sx) return;
      const r = this.svg.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * this._w;
      let best = 0;
      for (let i = 1; i < this.data.length; i++) if (Math.abs(this._sx(this.data[i].x) - x) < Math.abs(this._sx(this.data[best].x) - x)) best = i;
      const d = this.data[best];
      const cx = this._sx(d.x);
      this._cross.setAttribute('x1', cx);
      this._cross.setAttribute('x2', cx);
      this._dot.setAttribute('cx', cx);
      this._dot.setAttribute('cy', this._sy(d.y));
      this._dot.style.opacity = 1;
      container.classList.add('is-hover');
      tip.show(e.clientX, e.clientY, { value: this.opts.yFormat(d.y), label: this.opts.xFormat(d.x), rows: [{ color: this.opts.color, text: this.opts.label }] });
    };
    const leave = () => {
      container.classList.remove('is-hover');
      if (this._dot) this._dot.style.opacity = 0;
      tip.hide();
    };
    this.svg.addEventListener('pointermove', move);
    this.svg.addEventListener('pointerleave', leave);
  }

  update(data, markers = []) {
    this.data = data;
    this.markers = markers;
    this._render();
  }

  _render() {
    const { data, svg } = this;
    const w = Math.max(280, this.container.clientWidth);
    const h = this.opts.height;
    if (!data.length || !w) return;
    this._w = w;
    const pad = { l: 64, r: 18, t: 18, b: 30 };
    const ys = data.map((d) => d.y);
    const { lo, hi, ticks } = niceTicks(Math.min(0, ...ys), Math.max(0, ...ys), 5);
    const x0 = data[0].x;
    const x1 = data.at(-1).x;
    const sx = (x) => pad.l + ((x - x0) / (x1 - x0 || 1)) * (w - pad.l - pad.r);
    const sy = (y) => pad.t + (1 - (y - lo) / (hi - lo || 1)) * (h - pad.t - pad.b);
    this._sx = sx;
    this._sy = sy;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('aria-label', this.opts.label);
    svg.replaceChildren();

    const grid = svgEl('g', { class: 'grid' });
    for (const t of ticks) {
      grid.append(svgEl('line', { x1: pad.l, x2: w - pad.r, y1: sy(t), y2: sy(t) }));
      const lbl = svgEl('text', { x: pad.l - 10, y: sy(t) + 4, 'text-anchor': 'end' });
      lbl.textContent = this.opts.yFormat(t);
      grid.append(lbl);
    }
    svg.append(grid);
    for (const d of data) {
      const lbl = svgEl('text', { x: sx(d.x), y: h - 8, 'text-anchor': 'middle' });
      lbl.textContent = this.opts.xFormat(d.x, true);
      svg.append(lbl);
    }
    svg.append(svgEl('line', { class: 'zero', x1: pad.l, x2: w - pad.r, y1: sy(0), y2: sy(0) }));

    const pts = data.map((d) => `${sx(d.x).toFixed(1)},${sy(d.y).toFixed(1)}`);
    const area = `M${sx(x0)},${sy(0)} L${pts.join(' L')} L${sx(x1)},${sy(0)} Z`;
    svg.append(svgEl('path', { d: area, fill: this.opts.color, 'fill-opacity': 0.1, stroke: 'none' }));
    svg.append(svgEl('path', { d: `M${pts.join(' L')}`, fill: 'none', stroke: this.opts.color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));

    for (const m of this.markers) {
      const mx = sx(m.x);
      svg.append(svgEl('line', { x1: mx, x2: mx, y1: pad.t, y2: h - pad.b, stroke: 'var(--ink-2)', 'stroke-width': 1 }));
      const t = svgEl('text', { x: mx + (mx > w * 0.7 ? -6 : 6), y: pad.t + 10, 'text-anchor': mx > w * 0.7 ? 'end' : 'start', style: 'fill:var(--ink);font-weight:600' });
      t.textContent = m.label;
      svg.append(t);
    }
    // valeur finale, seule étiquette directe
    const last = data.at(-1);
    svg.append(svgEl('circle', { cx: sx(last.x), cy: sy(last.y), r: 4, fill: this.opts.color, stroke: '#fff', 'stroke-width': 2 }));
    const endLbl = svgEl('text', { x: sx(last.x) - 8, y: sy(last.y) - 10, 'text-anchor': 'end', style: 'fill:var(--ink);font-weight:600' });
    endLbl.textContent = this.opts.yFormat(last.y);
    svg.append(endLbl);

    this._cross = svgEl('line', { class: 'crosshair', x1: 0, x2: 0, y1: pad.t, y2: h - pad.b });
    this._dot = svgEl('circle', { r: 5, fill: this.opts.color, stroke: '#fff', 'stroke-width': 2, style: 'opacity:0' });
    svg.append(this._cross, this._dot);
    // zone de survol plus grande que la courbe
    svg.append(svgEl('rect', { x: pad.l, y: 0, width: w - pad.l - pad.r, height: h, fill: 'transparent' }));
  }
}

/**
 * Barres empilées horizontales (structure de coût) : 2 px d'écart entre segments, bout arrondi,
 * valeur dans le segment seulement si elle tient, sinon dans l'info-bulle.
 */
export function stackBars(container, rows, keys, { format = (v) => fmt(v), total = (v) => fmt(v) } = {}) {
  container.replaceChildren();
  const max = Math.max(...rows.map((r) => r.parts.reduce((s, p) => s + p.value, 0)));
  const legend = el('ul', { class: 'legend' }, keys.map((k) => el('li', {}, el('i', { style: `--c:${k.color}` }), el('span', { text: k.label }))));
  container.append(legend);
  for (const r of rows) {
    const sum = r.parts.reduce((s, p) => s + p.value, 0);
    const track = el('div', { class: 'stack' });
    r.parts.forEach((p, i) => {
      const k = keys.find((x) => x.key === p.key);
      const seg = el('div', { class: 'stack__seg', tabindex: '0', style: `width:${(p.value / max) * 100}%;--c:${k.color}` });
      if (i === r.parts.length - 1) seg.classList.add('is-end');
      const txt = el('span', { text: format(p.value) });
      seg.append(txt);
      hoverTip(seg, () => ({ value: format(p.value), label: `${k.label} · ${r.label}` }));
      track.append(seg);
    });
    track.append(el('b', { class: 'stack__total', text: total(sum) }));
    container.append(el('div', { class: 'stack-row' }, el('span', { class: 'stack-row__label', text: r.label }), track));
  }
  // une étiquette qui ne tient pas dans son segment est retirée (la valeur reste au survol)
  requestAnimationFrame(() => {
    for (const seg of container.querySelectorAll('.stack__seg')) {
      const span = seg.firstChild;
      span.hidden = false;
      if (span.offsetWidth + 14 > seg.clientWidth) span.hidden = true;
    }
  });
}
