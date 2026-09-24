import * as THREE from 'three';
import { FLUTES } from '../data/flutes.js';
import { fmt } from '../lib/calc.js';

// ---------------------------------------------------------------------------
// Textures 100 % procédurales (Canvas 2D) : aucun fichier image à charger,
// rendu net quelle que soit la dimension de la caisse.
// ---------------------------------------------------------------------------

export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const PALETTES = {
  kraft: { base: '#b8864f', light: '#d2a56f', dark: '#8a5c32', fibers: ['#6f4726', '#dcb689', '#9b6b3c', '#c89560'] },
  kraftInner: { base: '#c9a273', light: '#dcbb90', dark: '#a27a4d', fibers: ['#8c6640', '#e8cfa8', '#b08553'] },
  fluting: { base: '#cfab78', light: '#e0c292', dark: '#a98556', fibers: ['#9c7a4c', '#ecd5ae', '#b89262'] },
  white: { base: '#ebe5d8', light: '#f8f4ec', dark: '#cfc4b0', fibers: ['#c2b59c', '#ffffff', '#d9cfbd'] },
};

// Couleurs de la charte New Box (relevées sur le logo officiel)
export const BRAND = { blue: '#14259b', orange: '#f49c21' };

export const INKS = {
  bleu: BRAND.blue,
  noir: '#231a14',
  rouge: '#a3261c',
  vert: '#1f5a3a',
};

const FONT_HEAD = '"Space Grotesk Variable", "Space Grotesk", system-ui, sans-serif';
const FONT_BODY = '"Inter Variable", Inter, system-ui, sans-serif';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.round(w));
  c.height = Math.max(2, Math.round(h));
  return c;
}

/** Fond papier kraft : marbrure, ondulations fantômes (« washboard »), fibres, points. */
export function paintPaper(ctx, w, h, pal, seed = 7, opts = {}) {
  const { stripes = 0, fibers = 1, mottle = 1 } = opts;
  const r = rng(seed);
  ctx.fillStyle = pal.base;
  ctx.fillRect(0, 0, w, h);

  // Marbrure basse fréquence
  const blobs = Math.round(40 * mottle);
  for (let i = 0; i < blobs; i++) {
    const x = r() * w;
    const y = r() * h;
    const rad = (0.08 + r() * 0.25) * Math.max(w, h);
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    const col = r() > 0.5 ? pal.light : pal.dark;
    g.addColorStop(0, hexA(col, 0.10 + r() * 0.08));
    g.addColorStop(1, hexA(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  // Ondulations fantômes des cannelures sous la couverture (verticales)
  if (stripes > 2) {
    for (let x = -stripes; x < w + stripes; x += stripes) {
      const g = ctx.createLinearGradient(x, 0, x + stripes, 0);
      g.addColorStop(0, 'rgba(60,35,15,0.045)');
      g.addColorStop(0.5, 'rgba(255,240,215,0.035)');
      g.addColorStop(1, 'rgba(60,35,15,0.045)');
      ctx.fillStyle = g;
      ctx.fillRect(x, 0, stripes, h);
    }
  }

  // Fibres : regroupées par couleur pour limiter les appels de dessin
  const n = Math.round(((w * h) / 150) * fibers);
  ctx.lineCap = 'round';
  const buckets = pal.fibers.length;
  for (let b = 0; b < buckets; b++) {
    ctx.strokeStyle = hexA(pal.fibers[b], 0.16);
    ctx.lineWidth = 0.6 + b * 0.25;
    ctx.beginPath();
    for (let i = 0; i < n / buckets; i++) {
      const x = r() * w;
      const y = r() * h;
      const len = 2 + r() * 9;
      const a = r() * Math.PI;
      const bend = (r() - 0.5) * 3;
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(
        x + Math.cos(a) * len * 0.5 + bend,
        y + Math.sin(a) * len * 0.5 - bend,
        x + Math.cos(a) * len,
        y + Math.sin(a) * len,
      );
    }
    ctx.stroke();
  }

  // Petites inclusions (papier recyclé)
  const specks = Math.round((w * h) / 2600);
  for (let i = 0; i < specks; i++) {
    ctx.fillStyle = r() > 0.6 ? 'rgba(40,25,12,0.35)' : 'rgba(255,245,225,0.25)';
    const s = 0.6 + r() * 1.6;
    ctx.fillRect(r() * w, r() * h, s, s);
  }
}

function hexA(hex, a) {
  const v = parseInt(hex.slice(1), 16);
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`;
}

function finishTexture(tex, aniso, { repeat = false, srgb = true } = {}) {
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = aniso;
  if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

/** Tuile de papier sans impression (volets, faces intérieures, échantillon macro). */
export function paperTile(palName, aniso, { size = 512, seed = 3, stripes = 0 } = {}) {
  const c = canvas(size, size);
  paintPaper(c.getContext('2d'), size, size, PALETTES[palName], seed, { stripes });
  return finishTexture(new THREE.CanvasTexture(c), aniso, { repeat: true });
}

/** Carte de relief (niveaux de gris) partagée pour le grain du papier. */
export function bumpTile(aniso, size = 512) {
  const c = canvas(size, size);
  const ctx = c.getContext('2d');
  paintPaper(ctx, size, size, { base: '#808080', light: '#9a9a9a', dark: '#666666', fibers: ['#5a5a5a', '#aaaaaa'] }, 11, {
    fibers: 1.4,
    mottle: 0.6,
  });
  return finishTexture(new THREE.CanvasTexture(c), aniso, { repeat: true, srgb: false });
}

// ---------------------------------------------------------------------------
// Tranche de carton : couvertures + onde(s), vue en coupe.
// ---------------------------------------------------------------------------
export function edgeTexture(fluteId, aniso) {
  const flute = FLUTES[fluteId];
  const maxPitch = Math.max(...flute.layers.map((l) => l.pitch));
  const tileMm = maxPitch * 4;
  const W = 1024;
  const H = 160;
  const c = canvas(W, H);
  const ctx = c.getContext('2d');
  const pxPerMm = H / flute.thickness;
  const liner = Math.max(3, 0.28 * pxPerMm);

  // Cavités sombres
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#3b2717');
  g.addColorStop(0.5, '#2a1b10');
  g.addColorStop(1, '#3b2717');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const n = flute.layers.length;
  const inner = n + 1; // nombre de couvertures
  const waveSpace = H - inner * liner;
  const total = flute.layers.reduce((s, l) => s + l.height, 0);

  // Y canvas : 0 en haut = couverture extérieure (v = 1)
  let yCursor = H; // on part du bas (couverture intérieure)
  const drawLiner = (yBottom, col) => {
    ctx.fillStyle = col;
    ctx.fillRect(0, yBottom - liner, W, liner);
  };
  drawLiner(yCursor, '#c9a273');
  yCursor -= liner;
  flute.layers.forEach((layer, i) => {
    const hpx = (layer.height / total) * waveSpace;
    const periods = Math.max(1, Math.round(tileMm / layer.pitch));
    const yb = yCursor;
    const yt = yCursor - hpx;
    ctx.strokeStyle = '#d8b37d';
    ctx.lineWidth = liner * 0.8;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 2) {
      const ph = (x / W) * periods * Math.PI * 2;
      const y = yb - (hpx * (1 - Math.cos(ph))) / 2;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // colle d'amidon aux points de contact
    ctx.fillStyle = 'rgba(245,232,200,0.55)';
    for (let k = 0; k <= periods * 2; k++) {
      const x = (k / (periods * 2)) * W;
      const y = k % 2 === 0 ? yb - 1 : yt + 1;
      ctx.beginPath();
      ctx.ellipse(x, y, liner * 0.9, liner * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    yCursor = yt;
    drawLiner(yCursor, i === n - 1 ? '#b8864f' : '#c49d6c');
    yCursor -= liner;
  });

  // léger bruit de fibres
  const r = rng(5);
  for (let i = 0; i < 2500; i++) {
    ctx.fillStyle = r() > 0.5 ? 'rgba(255,240,210,0.08)' : 'rgba(0,0,0,0.12)';
    ctx.fillRect(r() * W, r() * H, 1 + r() * 2, 1);
  }

  const tex = finishTexture(new THREE.CanvasTexture(c), aniso, { repeat: true });
  tex.userData.tileMm = tileMm;
  return tex;
}

// ---------------------------------------------------------------------------
// Faces imprimées (flexographie) : logo, pictogrammes, cachet qualité.
// ---------------------------------------------------------------------------

/**
 * @param {'front'|'side'} kind
 * @param {{w:number,h:number,palette:string,ink:string,logo?:HTMLImageElement|null,
 *          comp:any,dims:{L:number,W:number,H:number},seed:number}} o
 */
export function printedPanel(kind, o, aniso) {
  const longSide = 1280;
  const scale = longSide / Math.max(o.w, o.h);
  const W = Math.round(o.w * scale);
  const H = Math.round(o.h * scale);
  const c = canvas(W, H);
  const ctx = c.getContext('2d');
  const pal = PALETTES[o.palette];
  const flutePitch = o.comp.flute.layers.at(-1).pitch;
  paintPaper(ctx, W, H, pal, o.seed, { stripes: flutePitch * scale });

  // Calque d'encre séparé pour simuler la trame flexo, puis multiplication.
  const ink = canvas(W, H);
  const ic = ink.getContext('2d');
  ic.fillStyle = o.ink;
  ic.strokeStyle = o.ink;
  const u = Math.min(W, H) / 100; // unité relative

  if (kind === 'front') drawFront(ic, W, H, u, o);
  else drawSide(ic, W, H, u, o);

  // Trame : petites lacunes d'encre
  const r = rng(o.seed + 99);
  ic.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < (W * H) / 90; i++) {
    ic.fillStyle = `rgba(0,0,0,${0.15 + r() * 0.5})`;
    ic.fillRect(r() * W, r() * H, 1 + r() * 1.5, 1 + r() * 1.5);
  }
  ic.globalCompositeOperation = 'source-over';

  ctx.save();
  ctx.globalAlpha = o.palette === 'white' ? 0.95 : 0.88;
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(ink, 0, 0);
  ctx.restore();

  // Logo New Box imprimé dans ses propres couleurs (bleu + orange), les réserves
  // blanches du logo laissent apparaître le papier comme sur une vraie impression.
  if (kind === 'front' && !o.logo && o.brandLogo) printBrandLogo(ctx, W, H, o, r);

  return finishTexture(new THREE.CanvasTexture(c), aniso);
}

function logoBox(img, W, H) {
  const maxW = W * 0.5;
  const maxH = H * 0.56;
  const k = Math.min(maxW / img.width, maxH / img.height);
  const w = img.width * k;
  const h = img.height * k;
  return { x: W / 2 - w / 2, y: H * 0.39 - h / 2, w, h };
}

function printBrandLogo(ctx, W, H, o, r) {
  const b = logoBox(o.brandLogo, W, H);
  const layer = canvas(W, H);
  const lc = layer.getContext('2d');
  lc.drawImage(o.brandLogo, b.x, b.y, b.w, b.h);
  // encre : on retire le blanc (non imprimé) puis on applique la trame
  const data = lc.getImageData(Math.floor(b.x), Math.floor(b.y), Math.ceil(b.w) + 1, Math.ceil(b.h) + 1);
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    const min = Math.min(d[i], d[i + 1], d[i + 2]);
    if (min > 200) d[i + 3] = Math.max(0, d[i + 3] - (min - 200) * 5);
  }
  lc.putImageData(data, Math.floor(b.x), Math.floor(b.y));
  lc.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < (b.w * b.h) / 70; i++) {
    lc.fillStyle = `rgba(0,0,0,${0.1 + r() * 0.45})`;
    lc.fillRect(b.x + r() * b.w, b.y + r() * b.h, 1 + r() * 1.5, 1 + r() * 1.5);
  }
  const white = o.palette === 'white';
  ctx.save();
  ctx.globalAlpha = white ? 0.96 : 0.86;
  ctx.drawImage(layer, 0, 0);
  if (!white) {
    // l'encre se teinte légèrement au contact du kraft
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.45;
    ctx.drawImage(layer, 0, 0);
  }
  ctx.restore();
}

function drawLogoMark(ctx, x, y, s) {
  // Pictogramme : caisse isométrique
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round';
  ctx.lineWidth = s * 0.09;
  const a = s * 0.5;
  const b = s * 0.29;
  ctx.beginPath();
  ctx.moveTo(0, -a);
  ctx.lineTo(a * 0.87, -a + b);
  ctx.lineTo(a * 0.87, a - b + b * 0.4);
  ctx.lineTo(0, a);
  ctx.lineTo(-a * 0.87, a - b + b * 0.4);
  ctx.lineTo(-a * 0.87, -a + b);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-a * 0.87, -a + b);
  ctx.lineTo(0, -a + 2 * b);
  ctx.lineTo(a * 0.87, -a + b);
  ctx.moveTo(0, -a + 2 * b);
  ctx.lineTo(0, a);
  ctx.stroke();
  // ruban
  ctx.lineWidth = s * 0.07;
  ctx.beginPath();
  ctx.moveTo(-a * 0.43, -a + b * 0.5);
  ctx.lineTo(a * 0.43, -a + b * 1.5);
  ctx.stroke();
  ctx.restore();
}

function drawWordmark(ctx, cx, cy, size) {
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${size}px ${FONT_HEAD}`;
  const text = 'NEW BOX';
  const tw = ctx.measureText(text).width;
  const mark = size * 1.05;
  const gap = size * 0.35;
  const total = mark + gap + tw;
  const x0 = cx - total / 2;
  drawLogoMark(ctx, x0 + mark / 2, cy, mark);
  ctx.fillText(text, x0 + mark + gap, cy + size * 0.04);
  ctx.restore();
  return total;
}

function drawFront(ctx, W, H, u, o) {
  const cx = W / 2;
  if (!o.logo && o.brandLogo) {
    // le logo officiel est composé à part (printBrandLogo) ; ici la mention sous le logo
    const b = logoBox(o.brandLogo, W, H);
    ctx.textAlign = 'center';
    ctx.font = `600 ${u * 4}px ${FONT_BODY}`;
    ctx.fillText('EMBALLAGE EN CARTON ONDULÉ', cx, b.y + b.h + u * 6.5);
  } else if (o.logo) {
    const img = o.logo;
    const maxW = W * 0.62;
    const maxH = H * 0.42;
    const k = Math.min(maxW / img.width, maxH / img.height);
    const w = img.width * k;
    const h = img.height * k;
    ctx.drawImage(img, cx - w / 2, H * 0.44 - h / 2, w, h);
  } else {
    drawWordmark(ctx, cx, H * 0.4, u * 13);
    ctx.textAlign = 'center';
    ctx.font = `500 ${u * 4.2}px ${FONT_BODY}`;
    ctx.fillText('EMBALLAGE EN CARTON ONDULÉ', cx, H * 0.4 + u * 13);
    ctx.fillRect(cx - u * 14, H * 0.4 + u * 18, u * 28, u * 0.6);
  }

  // Bas de face : pictos + mentions
  const by = H - u * 13;
  drawRecycle(ctx, u * 12, by, u * 8);
  ctx.textAlign = 'left';
  ctx.font = `600 ${u * 3.4}px ${FONT_BODY}`;
  ctx.fillText('100 % RECYCLABLE', u * 19, by - u * 1.5);
  ctx.font = `400 ${u * 2.8}px ${FONT_BODY}`;
  ctx.fillText('Carton ondulé · Corrugated', u * 19, by + u * 2.8);

  ctx.textAlign = 'right';
  ctx.font = `600 ${u * 3.4}px ${FONT_BODY}`;
  ctx.fillText('FABRIQUÉ EN TUNISIE', W - u * 8, by - u * 1.5);
  ctx.font = `400 ${u * 2.8}px ${FONT_BODY}`;
  ctx.fillText('newbox.com.tn', W - u * 8, by + u * 2.8);

  drawArrowsUp(ctx, W - u * 14, u * 14, u * 10);
}

function drawSide(ctx, W, H, u, o) {
  const { comp, dims } = o;
  // Pictogrammes de manutention (ISO 780)
  const s = u * 11;
  drawArrowsUp(ctx, u * 12, u * 13, s);
  drawGlass(ctx, u * 27, u * 13, s);
  drawUmbrella(ctx, u * 42, u * 13, s);

  // Cachet qualité du fabricant
  const R = Math.min(W, H) * 0.22;
  const cx = W / 2;
  const cy = H * 0.55;
  ctx.lineWidth = u * 0.8;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = u * 0.4;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.78, 0, Math.PI * 2);
  ctx.stroke();
  textOnArc(ctx, 'NEW BOX · KAIROUAN · TUNISIE ·', cx, cy, R * 0.89, `600 ${u * 3.2}px ${FONT_BODY}`);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${u * 6}px ${FONT_HEAD}`;
  ctx.fillText(comp.flute.id, cx, cy - R * 0.38);
  ctx.font = `600 ${u * 3}px ${FONT_BODY}`;
  ctx.fillText(`ECT ${fmt(comp.ect, 1)} kN/m`, cx, cy - R * 0.08);
  ctx.fillText(`${fmt(comp.grammage)} g/m²`, cx, cy + R * 0.18);
  ctx.font = `500 ${u * 2.4}px ${FONT_BODY}`;
  ctx.fillText(comp.grade.name.toUpperCase(), cx, cy + R * 0.42);

  // Dimensions intérieures
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `600 ${u * 3.6}px ${FONT_BODY}`;
  ctx.fillText(`${dims.L} × ${dims.W} × ${dims.H} mm`, cx, H - u * 7);
  ctx.textBaseline = 'alphabetic';
}

function textOnArc(ctx, text, cx, cy, r, font) {
  ctx.save();
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const chars = [...text];
  const step = (Math.PI * 2) / chars.length;
  chars.forEach((ch, i) => {
    const a = -Math.PI / 2 + i * step;
    ctx.save();
    ctx.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  });
  ctx.restore();
}

function drawArrowsUp(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = s * 0.1;
  ctx.lineCap = 'butt';
  for (const dx of [-0.2, 0.2]) {
    ctx.beginPath();
    ctx.moveTo(dx * s, s * 0.32);
    ctx.lineTo(dx * s, -s * 0.12);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(dx * s - s * 0.14, -s * 0.1);
    ctx.lineTo(dx * s, -s * 0.36);
    ctx.lineTo(dx * s + s * 0.14, -s * 0.1);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillRect(-s * 0.36, s * 0.36, s * 0.72, s * 0.08);
  ctx.restore();
}

function drawGlass(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = s * 0.08;
  ctx.beginPath();
  ctx.moveTo(-s * 0.22, -s * 0.38);
  ctx.lineTo(s * 0.22, -s * 0.38);
  ctx.quadraticCurveTo(s * 0.22, s * 0.02, 0, s * 0.06);
  ctx.quadraticCurveTo(-s * 0.22, s * 0.02, -s * 0.22, -s * 0.38);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, s * 0.06);
  ctx.lineTo(0, s * 0.34);
  ctx.moveTo(-s * 0.16, s * 0.36);
  ctx.lineTo(s * 0.16, s * 0.36);
  ctx.stroke();
  ctx.restore();
}

function drawUmbrella(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = s * 0.07;
  ctx.beginPath();
  ctx.arc(0, -s * 0.05, s * 0.34, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.05);
  ctx.lineTo(0, s * 0.3);
  ctx.arc(-s * 0.08, s * 0.3, s * 0.08, 0, Math.PI);
  ctx.stroke();
  // gouttes
  for (const [dx, dy] of [[-0.25, -0.46], [0, -0.52], [0.25, -0.46]]) {
    ctx.beginPath();
    ctx.ellipse(dx * s, dy * s, s * 0.03, s * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawRecycle(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = s * 0.12;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI * 2) / 3);
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.42, -Math.PI * 0.62, -Math.PI * 0.12);
    ctx.stroke();
    const a = -Math.PI * 0.12;
    const px = Math.cos(a) * s * 0.42;
    const py = Math.sin(a) * s * 0.42;
    ctx.beginPath();
    ctx.moveTo(px + s * 0.16, py - s * 0.02);
    ctx.lineTo(px - s * 0.06, py + s * 0.2);
    ctx.lineTo(px - s * 0.08, py - s * 0.14);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

/** Face supérieure d'une caisse fermée (pour l'empilement palette). */
export function topPanel(w, h, palette, aniso, seed = 21) {
  const scale = 512 / Math.max(w, h);
  const W = Math.round(w * scale);
  const H = Math.round(h * scale);
  const c = canvas(W, H);
  const ctx = c.getContext('2d');
  paintPaper(ctx, W, H, PALETTES[palette], seed, { fibers: 0.6 });
  // jointure des rabats + ruban adhésif
  ctx.fillStyle = 'rgba(40,24,10,0.55)';
  ctx.fillRect(0, H / 2 - 1, W, 2);
  ctx.fillStyle = 'rgba(196,150,92,0.85)';
  ctx.fillRect(0, H / 2 - 50 * scale * 0.5, W, 50 * scale);
  ctx.fillStyle = 'rgba(255,240,210,0.18)';
  ctx.fillRect(0, H / 2 - 50 * scale * 0.5, W, 3);
  return finishTexture(new THREE.CanvasTexture(c), aniso);
}

/** Bois de palette. */
export function woodTexture(aniso) {
  const W = 256;
  const H = 1024;
  const c = canvas(W, H);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#c7a57a';
  ctx.fillRect(0, 0, W, H);
  const r = rng(42);
  for (let i = 0; i < 180; i++) {
    const x = r() * W;
    ctx.strokeStyle = r() > 0.5 ? 'rgba(120,80,40,0.18)' : 'rgba(240,215,170,0.2)';
    ctx.lineWidth = 0.5 + r() * 2.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    for (let y = 0; y <= H; y += 32) ctx.lineTo(x + Math.sin(y * 0.01 + i) * 4 * r(), y);
    ctx.stroke();
  }
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = 'rgba(90,55,25,0.35)';
    ctx.beginPath();
    ctx.ellipse(r() * W, r() * H, 4 + r() * 6, 8 + r() * 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  return finishTexture(new THREE.CanvasTexture(c), aniso, { repeat: true });
}
