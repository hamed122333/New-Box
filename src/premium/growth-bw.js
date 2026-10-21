import { fmt } from './charts.js';

// Courbe de croissance noir et blanc (partenaires) : SVG construit ici, animations en CSS
// (classe .is-play, rejouée à chaque changement d'onglet et à l'entrée dans l'écran).

const NS = 'http://www.w3.org/2000/svg';
const s = (tag, attrs = {}, text) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  return n;
};

function niceMax(max) {
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((v) => v >= raw);
  return { step, top: Math.ceil(max / step) * step };
}

const curve = (pts) =>
  pts
    .map(([x, y], i) => {
      if (!i) return `M${x},${y}`;
      const [px, py] = pts[i - 1];
      const cx = (px + x) / 2;
      return `C${cx},${py} ${cx},${y} ${x},${y}`;
    })
    .join(' ');

export function growthBW(section, { years, forecastFrom, firstFullYear, series }, demo) {
  const $ = (q) => section.querySelector(q);
  if (demo) $('[data-demo]').hidden = false;
  const chartEl = $('[data-growth-chart]');
  const svg = s('svg', { viewBox: '0 0 1200 520', role: 'img' });
  chartEl.append(svg);
  const fi = years.indexOf(forecastFrom);
  const i0 = years.indexOf(firstFullYear);

  const draw = (key) => {
    const se = series[key];
    const L = 70, R = 1170, T = 50, B = 470;
    const { step, top } = niceMax(Math.max(...se.values));
    const sx = (i) => L + (i / (years.length - 1)) * (R - L);
    const sy = (v) => T + (1 - v / top) * (B - T);
    const xy = se.values.map((v, i) => [sx(i), sy(v)]);
    const solid = fi > 0 ? xy.slice(0, fi) : xy;
    svg.setAttribute('aria-label', `${se.label} de ${years[0]} à ${years.at(-1)} : ${se.values.map((v, i) => `${years[i]} ${fmt(v, se.decimals)} ${se.unit}`).join(', ')}`);
    svg.replaceChildren();

    const defs = s('defs');
    const g = s('linearGradient', { id: 'bw-grad', x1: 0, x2: 0, y1: 0, y2: 1 });
    g.append(s('stop', { offset: '0%', 'stop-color': '#0a0a0a', 'stop-opacity': 0.22 }), s('stop', { offset: '100%', 'stop-color': '#0a0a0a', 'stop-opacity': 0 }));
    const pat = s('pattern', { id: 'bw-hatch', width: 8, height: 8, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
    pat.append(s('line', { x1: 0, y1: 0, x2: 0, y2: 8, stroke: '#0a0a0a', 'stroke-opacity': 0.18 }));
    defs.append(g, pat);
    svg.append(defs);

    for (let v = 0; v <= top + step / 2; v += step) {
      svg.append(s('line', { x1: L, x2: R, y1: sy(v), y2: sy(v), class: 'bw-grid' }));
      svg.append(s('text', { x: L - 12, y: sy(v) + 4, 'text-anchor': 'end', class: 'bw-axis' }, fmt(v)));
    }
    years.forEach((y, i) => svg.append(s('text', { x: sx(i), y: 505, 'text-anchor': 'middle', class: 'bw-year' }, String(y))));

    const area = `${curve(solid)} L${solid.at(-1)[0]},${B} L${L},${B} Z`;
    svg.append(s('path', { d: area, fill: 'url(#bw-grad)', class: 'bw-area' }), s('path', { d: area, fill: 'url(#bw-hatch)', class: 'bw-area' }));
    svg.append(s('path', { d: curve(solid), pathLength: 1, class: 'bw-line' }));
    if (fi > 0) svg.append(s('path', { d: curve(xy.slice(fi - 1)), class: 'bw-fc' }));
    xy.forEach(([x, y], i) => {
      const style = `animation-delay:${0.1 + i * 0.18}s`;
      const last = i === xy.length - 1;
      svg.append(s('circle', { cx: x, cy: y, r: last ? 9 : 6, class: `bw-dot${years[i] >= forecastFrom ? ' is-fc' : ''}`, style }));
      svg.append(s('text', { x, y: y - 22, 'text-anchor': 'middle', class: 'bw-val', style }, fmt(se.values[i], se.decimals)));
    });
    const [lx, ly] = xy.at(-1);
    svg.append(s('circle', { cx: lx, cy: ly, r: 10, class: 'bw-ring' }), s('circle', { cx: lx, cy: ly, r: 10, class: 'bw-ring', style: 'animation-delay:.9s' }));

    const real = se.values.slice(0, fi);
    const mult = real.at(-1) / se.values[i0];
    const n = real.length - 1 - i0;
    $('[data-big]').textContent = `×${fmt(mult, 1)}`;
    $('[data-big-unit]').textContent = `de ${se.label.toLowerCase()}`;
    $('[data-big-label]').textContent = `entre ${firstFullYear}, première année pleine, et ${years[fi - 1]}.`;
    const kpis = $('[data-kpis]');
    kpis.replaceChildren();
    [
      [`+${fmt((mult ** (1 / n) - 1) * 100)} %`, 'croissance annuelle moyenne'],
      [fmt(se.values[fi - 1], se.decimals), `${se.unit} réalisés en ${years[fi - 1]}`],
      [fmt(se.values[fi], se.decimals), `${se.unit} visés en ${forecastFrom}`],
    ].forEach(([v, l], i) => {
      const d = document.createElement('div');
      d.style.animationDelay = `${0.2 + i * 0.1}s`;
      const b = document.createElement('b');
      b.textContent = v;
      const sp = document.createElement('span');
      sp.textContent = l;
      d.append(b, sp);
      kpis.append(d);
    });
  };

  const play = () => {
    section.classList.remove('is-play');
    void section.offsetWidth; // relance les animations CSS
    section.classList.add('is-play');
  };

  const tabs = $('[data-growth-tabs]');
  const keys = Object.keys(series);
  keys.forEach((key, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.textContent = series[key].tab;
    b.setAttribute('aria-selected', i === 0);
    b.addEventListener('click', () => {
      if (b.getAttribute('aria-selected') === 'true') return;
      tabs.querySelectorAll('button').forEach((x) => x.setAttribute('aria-selected', x === b));
      draw(key);
      play();
    });
    tabs.append(b);
  });
  draw(keys[0]);
  new IntersectionObserver(
    (entries, io) => {
      if (!entries[0].isIntersecting) return;
      play();
      io.disconnect();
    },
    { threshold: 0.3 },
  ).observe(section);
}
