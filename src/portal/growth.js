import { fmt, getTip } from './ui.js';

const NS = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs = {}) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
};
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Échelle « ronde » de 0 au maximum. */
function niceMax(max, count = 4) {
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
  return { step, top: Math.ceil(max / step) * step };
}

/**
 * Courbe de croissance pour fond sombre : aire en dégradé, trait lumineux, prévision en pointillés,
 * apparition dessinée, transition animée entre séries (chiffre d'affaires ↔ volume),
 * réticule + info-bulle au pointeur et aux flèches du clavier.
 */
export class GrowthChart {
  constructor(container, { years, forecastFrom, color = '#d97510' }) {
    this.container = container;
    this.years = years;
    this.fi = years.indexOf(forecastFrom); // index de la première année prévue (−1 : aucune)
    this.color = color;
    this.series = null;
    this.ys = null; // ordonnées affichées (px), interpolées pendant les transitions
    this.focus = -1;
    this.revealed = false;
    container.classList.add('growth-chart');
    container.tabIndex = 0;
    container.setAttribute('role', 'img');
    this.root = svg('svg', { 'aria-hidden': 'true' });
    container.append(this.root);
    new ResizeObserver(() => this._layout()).observe(container);
    this._bindPointer();
  }

  /** Affiche une série ; avec `animate`, la courbe glisse de l'ancienne série vers la nouvelle. */
  setSeries(series, animate = true) {
    const prev = this.ys;
    this.series = series;
    this.container.setAttribute('aria-label', `${series.label} de ${this.years[0]} à ${this.years.at(-1)} : ${series.values.map((v, i) => `${this.years[i]} ${fmt(v, series.decimals)} ${series.unit}`).join(', ')}`);
    this._layout();
    if (!animate || !prev || !this.revealed) return;
    const target = this.ys.slice();
    const t0 = performance.now();
    cancelAnimationFrame(this._raf);
    const step = (t) => {
      const k = ease(Math.min(1, (t - t0) / 700));
      this.ys = target.map((y, i) => prev[i] + (y - prev[i]) * k);
      this._draw();
      if (k < 1) this._raf = requestAnimationFrame(step);
    };
    this._raf = requestAnimationFrame(step);
  }

  /** Première apparition : le trait se dessine, puis l'aire et les points. */
  reveal() {
    if (this.revealed) return;
    this.revealed = true;
    this.container.classList.add('is-drawn');
  }

  _geometry() {
    const w = Math.max(300, this.container.clientWidth);
    const h = w < 560 ? 280 : 380;
    const pad = { l: w < 560 ? 44 : 60, r: w < 560 ? 18 : 28, t: 54, b: 40 };
    return { w, h, pad };
  }

  _layout() {
    if (!this.series) return;
    const { w, h, pad } = this._geometry();
    const { values } = this.series;
    const { step, top } = niceMax(Math.max(...values) * 1.08);
    this.g = { w, h, pad, top, step };
    this.sx = (i) => pad.l + (i / (this.years.length - 1)) * (w - pad.l - pad.r);
    this.sy = (v) => pad.t + (1 - v / top) * (h - pad.t - pad.b);
    this.ys = values.map((v) => this.sy(v)); // cible ; setSeries interpole ensuite si besoin
    this._build();
    this._draw();
  }

  /** Structure SVG (axes, dégradé, calques) ; `_draw` ne fait que déplacer les points. */
  _build() {
    const { w, h, pad, top, step } = this.g;
    const r = this.root;
    r.setAttribute('viewBox', `0 0 ${w} ${h}`);
    r.replaceChildren();
    const defs = svg('defs');
    const grad = svg('linearGradient', { id: 'growth-fill', x1: 0, y1: 0, x2: 0, y2: 1 });
    grad.append(
      svg('stop', { offset: '0%', 'stop-color': '#f49c21', 'stop-opacity': 0.42 }),
      svg('stop', { offset: '55%', 'stop-color': '#f49c21', 'stop-opacity': 0.1 }),
      svg('stop', { offset: '100%', 'stop-color': '#f49c21', 'stop-opacity': 0 }),
    );
    const glow = svg('filter', { id: 'growth-glow', x: '-20%', y: '-40%', width: '140%', height: '180%' });
    glow.append(svg('feGaussianBlur', { stdDeviation: 5, result: 'b' }));
    const merge = svg('feMerge');
    merge.append(svg('feMergeNode', { in: 'b' }), svg('feMergeNode', { in: 'SourceGraphic' }));
    glow.append(merge);
    defs.append(grad, glow);
    r.append(defs);

    const grid = svg('g', { class: 'growth-grid' });
    for (let v = 0; v <= top + step / 2; v += step) {
      const y = this.sy(v);
      grid.append(svg('line', { x1: pad.l, x2: w - pad.r, y1: y, y2: y }));
      const t = svg('text', { x: pad.l - 12, y: y + 4, 'text-anchor': 'end' });
      t.textContent = fmt(v, this.series.decimals && step < 1 ? 1 : 0);
      grid.append(t);
    }
    const unit = svg('text', { x: pad.l - 12, y: pad.t - 22, 'text-anchor': 'end', class: 'growth-unit' });
    unit.textContent = this.series.unit;
    grid.append(unit);
    this.years.forEach((yr, i) => {
      const t = svg('text', { x: this.sx(i), y: h - 12, 'text-anchor': 'middle', class: i >= this.fi && this.fi >= 0 ? 'is-forecast' : '' });
      // sur petit écran, l'année prévue n'est distinguée que par sa couleur (sinon les libellés se chevauchent)
      t.textContent = i === this.fi && w >= 560 ? `${yr} prév.` : String(yr);
      grid.append(t);
    });
    r.append(grid);

    this.el = {
      area: svg('path', { class: 'growth-area', fill: 'url(#growth-fill)' }),
      line: svg('path', { class: 'growth-line', stroke: this.color, filter: 'url(#growth-glow)' }),
      lineF: svg('path', { class: 'growth-line--f', stroke: this.color }),
      cross: svg('line', { class: 'growth-cross', y1: pad.t - 8, y2: h - pad.b }),
      dots: [],
      halo: svg('circle', { class: 'growth-halo', r: 14, fill: this.color }),
      lastLbl: svg('text', { class: 'growth-label', 'text-anchor': 'middle' }),
      fLbl: svg('text', { class: 'growth-label growth-label--f', 'text-anchor': 'middle' }),
      hover: svg('circle', { class: 'growth-hover', r: 7, fill: this.color }),
    };
    r.append(this.el.area, this.el.cross, this.el.line, this.el.lineF, this.el.halo);
    this.years.forEach((_, i) => {
      const forecast = this.fi >= 0 && i >= this.fi;
      const d = svg('circle', { class: `growth-dot${forecast ? ' is-forecast' : ''}`, r: forecast ? 5 : 4.5, style: `transition-delay:${0.9 + i * 0.08}s` });
      d.setAttribute('fill', forecast ? '#0d1642' : this.color);
      d.setAttribute('stroke', forecast ? this.color : '#0d1642');
      this.el.dots.push(d);
      r.append(d);
    });
    r.append(this.el.hover, this.el.lastLbl, this.el.fLbl);
  }

  _draw() {
    const { h, pad } = this.g;
    const { ys, el, fi } = this;
    const last = fi >= 0 ? fi - 1 : ys.length - 1;
    const pts = ys.map((y, i) => [this.sx(i), y]);
    const line = (a, b) => pts.slice(a, b + 1).map(([x, y], k) => `${k ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const base = h - pad.b;
    el.line.setAttribute('d', line(0, last));
    el.area.setAttribute('d', `${line(0, last)} L${pts[last][0]},${base} L${pts[0][0]},${base} Z`);
    if (fi >= 0) el.lineF.setAttribute('d', line(last, ys.length - 1));
    // longueur du trait pour l'animation « dessinée »
    const len = el.line.getTotalLength?.() || 1000;
    el.line.style.setProperty('--len', Math.ceil(len));
    pts.forEach(([x, y], i) => {
      el.dots[i].setAttribute('cx', x);
      el.dots[i].setAttribute('cy', y);
    });
    el.halo.setAttribute('cx', pts[last][0]);
    el.halo.setAttribute('cy', pts[last][1]);
    const s = this.series;
    el.lastLbl.setAttribute('x', pts[last][0]);
    el.lastLbl.setAttribute('y', pts[last][1] - 18);
    el.lastLbl.textContent = `${fmt(s.values[last], s.decimals)} ${s.unit}`;
    if (fi >= 0) {
      const [fx, fy] = pts.at(-1);
      el.fLbl.setAttribute('x', Math.min(fx, this.g.w - 40));
      el.fLbl.setAttribute('y', fy - 18);
      el.fLbl.textContent = `${fmt(s.values.at(-1), s.decimals)} ${s.unit}`;
    }
    if (this.focus >= 0) this._showFocus(this.focus, false);
  }

  _bindPointer() {
    const tip = getTip();
    const near = (clientX) => {
      const r = this.root.getBoundingClientRect();
      const x = ((clientX - r.left) / r.width) * this.g.w;
      let best = 0;
      this.years.forEach((_, i) => {
        if (Math.abs(this.sx(i) - x) < Math.abs(this.sx(best) - x)) best = i;
      });
      return best;
    };
    this.container.addEventListener('pointermove', (e) => {
      if (!this.series) return;
      this.focus = near(e.clientX);
      this._showFocus(this.focus, true, e.clientX, e.clientY);
    });
    this.container.addEventListener('pointerleave', () => this._hideFocus(tip));
    this.container.addEventListener('blur', () => this._hideFocus(tip));
    this.container.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      e.stopPropagation();
      const n = this.years.length;
      this.focus = this.focus < 0 ? n - 2 : (this.focus + (e.key === 'ArrowRight' ? 1 : -1) + n) % n;
      this._showFocus(this.focus, true);
    });
  }

  _hideFocus(tip) {
    this.focus = -1;
    this.container.classList.remove('is-hover');
    tip.hide();
  }

  _showFocus(i, withTip, cx, cy) {
    const x = this.sx(i);
    const y = this.ys[i];
    const { el } = this;
    el.cross.setAttribute('x1', x);
    el.cross.setAttribute('x2', x);
    el.hover.setAttribute('cx', x);
    el.hover.setAttribute('cy', y);
    this.container.classList.add('is-hover');
    if (!withTip) return;
    const s = this.series;
    const v = s.values[i];
    const prev = s.values[i - 1];
    const forecast = this.fi >= 0 && i >= this.fi;
    if (cx == null) {
      const r = this.root.getBoundingClientRect();
      cx = r.left + (x / this.g.w) * r.width;
      cy = r.top + (y / this.g.h) * r.height;
    }
    getTip().show(cx, cy, {
      value: `${fmt(v, s.decimals)} ${s.unit}`,
      label: `${this.years[i]} · ${s.label}${forecast ? ' (prévision)' : ''}`,
      rows: prev ? [{ color: this.color, text: `${v >= prev ? '+' : ''}${fmt((v / prev - 1) * 100, 0)} % sur un an` }] : [],
    });
  }
}
