import { h, svg, fmt, reduced, tip, hideTip } from './common.js';

// Courbe animée des hausses cumulées (prix des bobines) : tracé progressif, aires en dégradé,
// points qui apparaissent au passage du trait, valeurs finales qui défilent, halo sur le dernier
// relevé, annonce en pointillés, réticule au survol.

const ease = (t) => 1 - (1 - t) ** 3;

function countUp(el, to, { prefix = '+', suffix = ' €/t', duration = 1400, delay = 0 } = {}) {
  if (reduced) return (el.textContent = `${prefix}${fmt(to)}${suffix}`);
  const t0 = performance.now() + delay;
  const step = (t) => {
    const k = Math.max(0, Math.min(1, (t - t0) / duration));
    el.textContent = `${prefix}${fmt(Math.round(to * ease(k)))}${suffix}`;
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function trendChart(root, { data, sources, legend, side, srcNote, replay }) {
  const { months, series, announce, year } = data;
  const topVal = Math.max(...series.flatMap((s) => s.points.map((p) => p.v)), announce ? 300 : 0);
  const top = Math.ceil(topVal / 50) * 50;

  legend.replaceChildren(...series.map((s) => h('span', {}, h('i', { class: 'is-line', style: `background:${s.color}` }), s.label)), announce ? h('span', {}, h('i', { class: 'is-line', style: 'background:repeating-linear-gradient(90deg,#14259b 0 4px,transparent 4px 7px)' }), 'Annonce') : null);

  // panneau latéral : compteurs
  const counters = series.map((s) => {
    const last = s.points.at(-1);
    const val = h('b', { class: 'trend__val', style: `color:${s.color}`, text: '+0 €/t' });
    return { s, last, val, box: h('div', { class: 'trend__stat' }, h('span', { class: 'kpi__label', text: s.label }), val, h('span', { class: 'kpi__meta', text: `depuis janvier ${year}` })) };
  });
  side.replaceChildren(
    ...counters.map((c) => c.box),
    announce ? h('div', { class: 'trend__ann' }, h('b', { text: 'À venir' }), h('span', { text: announce.text })) : null,
    h('p', { class: 'trend__why', text: 'Votre contrat-cadre New Box indexe la révision de prix sur ces relevés publics : vous voyez la hausse avant qu’elle n’arrive sur votre facture.' }),
  );
  const used = [...new Set(series.flatMap((s) => s.points.map((p) => p.src)).concat(announce?.src).filter(Boolean))];
  srcNote.replaceChildren('Sources : ', ...used.flatMap((k, i) => [i ? ' · ' : '', h('a', { href: sources[k].url, target: '_blank', rel: 'noopener', text: sources[k].label })]), '. Entre deux relevés, le tracé est une liaison ; seuls les points sont des valeurs publiées.');

  let raf = 0;
  function draw(play) {
    cancelAnimationFrame(raf);
    const w = Math.max(320, root.clientWidth);
    const H = w < 560 ? 260 : 330;
    const pad = { l: 48, r: 24, t: 24, b: 30 };
    const sx = (m) => pad.l + (m / (months.length - 1)) * (w - pad.l - pad.r);
    const sy = (v) => pad.t + (1 - v / top) * (H - pad.t - pad.b);
    const s = svg('svg', { viewBox: `0 0 ${w} ${H}`, role: 'img', 'aria-label': series.map((se) => `${se.label} : ${se.points.map((p) => `${months[p.m]} +${p.v} €/t`).join(', ')}`).join(' ; ') });
    const defs = svg('defs');
    series.forEach((se) => {
      const g = svg('linearGradient', { id: `tg-${se.key}`, x1: 0, x2: 0, y1: 0, y2: 1 });
      g.append(svg('stop', { offset: '0%', 'stop-color': se.color, 'stop-opacity': 0.22 }), svg('stop', { offset: '100%', 'stop-color': se.color, 'stop-opacity': 0 }));
      defs.append(g);
    });
    const clip = svg('clipPath', { id: 'tg-clip' });
    const clipRect = svg('rect', { x: 0, y: 0, width: play && !reduced ? 0 : w, height: H });
    clip.append(clipRect);
    defs.append(clip);
    s.append(defs);

    for (let v = 0; v <= top; v += 50) {
      s.append(svg('line', { class: 'gl', x1: pad.l, x2: w - pad.r, y1: sy(v), y2: sy(v) }));
      s.append(svg('text', { class: 'ax', x: pad.l - 8, y: sy(v) + 4, 'text-anchor': 'end' }, v ? `+${v}` : '0'));
    }
    months.forEach((m, i) => (w > 560 || i % 2 === 0) && s.append(svg('text', { class: 'ax', x: sx(i), y: H - 8, 'text-anchor': 'middle' }, m)));

    const plot = svg('g', { 'clip-path': 'url(#tg-clip)' });
    const dots = [];
    series.forEach((se) => {
      const pts = se.points.map((p) => [sx(p.m), sy(p.v)]);
      const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ');
      plot.append(svg('path', { d: `${line} L${pts.at(-1)[0]},${sy(0)} L${pts[0][0]},${sy(0)} Z`, fill: `url(#tg-${se.key})` }));
      plot.append(svg('path', { d: line, fill: 'none', stroke: se.color, 'stroke-width': 3, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
      se.points.forEach((p, i) => {
        const [x, y] = pts[i];
        const c = svg('circle', { cx: x, cy: y, r: 5, fill: '#fff', stroke: se.color, 'stroke-width': 2.5, class: 'tdot' });
        const t = i ? svg('text', { x: x - (i === se.points.length - 1 ? 8 : 0), y: y - 12, 'text-anchor': i === se.points.length - 1 ? 'end' : 'middle', class: 'lbl tdot', style: `fill:${se.color}` }, `+${p.v}`) : null;
        dots.push({ x, els: [c, t].filter(Boolean) });
      });
    });
    s.append(plot);
    dots.forEach((d) => d.els.forEach((e) => s.append(e)));

    // halo sur les derniers relevés
    const rings = series.map((se) => {
      const p = se.points.at(-1);
      return svg('circle', { cx: sx(p.m), cy: sy(p.v), r: 6, class: 'tring', stroke: se.color });
    });
    // annonce SCA : flèche pointillée au-dessus du dernier relevé kraftliner
    let ann = null;
    if (announce) {
      const k = series[0].points.at(-1);
      const x = sx(announce.m);
      ann = svg('g', { class: 'tann' });
      ann.append(
        svg('line', { x1: x, x2: x, y1: sy(k.v) - 20, y2: sy(k.v + 100) + 6, stroke: series[0].color, 'stroke-width': 2, 'stroke-dasharray': '4 4' }),
        svg('path', { d: `M${x - 5},${sy(k.v + 100) + 12} L${x},${sy(k.v + 100) + 2} L${x + 5},${sy(k.v + 100) + 12}`, fill: 'none', stroke: series[0].color, 'stroke-width': 2 }),
        svg('text', { x: x - 10, y: sy(k.v + 100) + 4, 'text-anchor': 'end', class: 'lbl', style: `fill:${series[0].color}` }, '+100 annoncés'),
      );
      s.append(ann);
    }
    rings.forEach((r) => s.append(r));

    const cross = svg('line', { class: 'tcross', y1: pad.t, y2: H - pad.b });
    s.append(cross);
    const hit = svg('rect', { x: pad.l, y: 0, width: w - pad.l - pad.r, height: H, fill: 'transparent' });
    s.append(hit);
    const stops = [...new Set(series.flatMap((se) => se.points.map((p) => p.m)))];
    hit.addEventListener('pointermove', (e) => {
      const r = s.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * w;
      const m = stops.reduce((a, b) => (Math.abs(sx(b) - x) < Math.abs(sx(a) - x) ? b : a));
      cross.setAttribute('x1', sx(m));
      cross.setAttribute('x2', sx(m));
      cross.style.opacity = 0.5;
      tip(e.clientX, e.clientY, `${months[m]} ${year}`, series.map((se) => { const p = se.points.find((q) => q.m === m); return p ? `${se.label} : +${p.v} €/t` : null; }).filter(Boolean).join(' · '));
    });
    hit.addEventListener('pointerleave', () => {
      cross.style.opacity = 0;
      hideTip();
    });
    root.replaceChildren(s);

    if (!play || reduced) {
      counters.forEach((c) => (c.val.textContent = `+${fmt(c.last.v)} €/t`));
      return;
    }
    // révélation de gauche à droite ; les points apparaissent quand le trait les atteint
    dots.forEach((d) => d.els.forEach((e) => (e.style.opacity = 0)));
    rings.forEach((r) => (r.style.visibility = 'hidden'));
    if (ann) ann.style.opacity = 0;
    const dur = 1800;
    const t0 = performance.now();
    const shown = new Set();
    const frame = (t) => {
      const k = ease(Math.min(1, (t - t0) / dur));
      const xr = pad.l + k * (w - pad.l - pad.r) + 6;
      clipRect.setAttribute('width', xr);
      dots.forEach((d, i) => {
        if (shown.has(i) || d.x > xr) return;
        shown.add(i);
        d.els.forEach((e) => {
          e.style.opacity = 1;
          e.animate?.([{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1.5)', opacity: 1, offset: 0.6 }, { transform: 'scale(1)' }], { duration: 500, easing: 'cubic-bezier(.2,.7,.1,1)' });
        });
      });
      if (k < 1) raf = requestAnimationFrame(frame);
      else {
        rings.forEach((r) => (r.style.visibility = 'visible'));
        if (ann) ann.animate?.([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 600, fill: 'forwards', easing: 'cubic-bezier(.2,.7,.1,1)' });
      }
    };
    raf = requestAnimationFrame(frame);
    counters.forEach((c, i) => countUp(c.val, c.last.v, { delay: 300 + i * 150, duration: dur }));
  }

  draw(false);
  let lastW = root.clientWidth;
  new ResizeObserver(() => {
    if (Math.abs(root.clientWidth - lastW) < 4) return;
    lastW = root.clientWidth;
    draw(false);
  }).observe(root);
  new IntersectionObserver((e, io) => {
    if (!e[0].isIntersecting) return;
    draw(true);
    io.disconnect();
  }, { threshold: 0.35 }).observe(root);
  replay?.addEventListener('click', () => draw(true));
}
