import { FLUTES } from '../data/flutes.js';
import { PAPERS, FLUTING, CONDITIONS } from '../data/papers.js';
import { PRODUCTS, leadText } from '../data/products.js';

export const GLUE_FLAP_MM = 35;
const G = 9.81;
const PALLET = { L: 1200, W: 800, load: 1100 }; // palette Europe, hauteur de chargement (mm)

/**
 * Composition d'une plaque : papiers (extérieur / cannelure FL / intérieur), grammage total
 * et performances estimées (ECT, éclatement, Cobb).
 */
export function boardComposition(fluteId, outerCode = 'KL', innerCode = 'TL') {
  const flute = FLUTES[fluteId];
  const outer = PAPERS[outerCode];
  const inner = PAPERS[innerCode];
  const fluting = PAPERS[FLUTING];
  const double = flute.layers.length === 2;

  // en double cannelure, la couverture médiane est de la qualité intérieure
  const liners = double ? [inner, inner, outer] : [inner, outer];
  const flutings = flute.layers.map((l) => ({ ...fluting, takeUp: l.takeUp }));

  const grammage =
    liners.reduce((s, p) => s + p.gsm, 0) +
    flutings.reduce((s, p) => s + p.gsm * p.takeUp, 0);

  // ECT ≈ k · (Σ SCT couvertures + Σ α · SCT cannelures)   (kN/m)
  const sct = (p) => (p.sct * p.gsm) / 1000;
  const ect =
    0.75 * (liners.reduce((s, p) => s + sct(p), 0) + flutings.reduce((s, p) => s + p.takeUp * sct(p), 0));

  // Éclatement ≈ somme des éclatements des couvertures (kPa)
  const burst = 0.95 * liners.reduce((s, p) => s + (p.burst ?? 2.4) * p.gsm, 0);

  const papers = double
    ? `${outer.code} / ${FLUTING} / ${inner.code} / ${FLUTING} / ${inner.code}`
    : `${outer.code} / ${FLUTING} / ${inner.code}`;

  return {
    flute,
    outer,
    inner,
    fluting,
    papers,
    liners,
    flutings,
    grammage,
    thickness: flute.thickness,
    ect,
    burst,
    cobb: outer.cobb,
    color: outer.color,
  };
}

/** Formule simplifiée de McKee — BCT en newtons. */
export function mckeeBCT(ectKNm, thicknessMm, L, W) {
  const perimeter = (2 * (L + W)) / 1000;
  return 5.874 * ectKNm * 1000 * Math.sqrt((thicknessMm / 1000) * perimeter);
}

/** Surface du flan d'une caisse américaine FEFCO 0201 (m²). */
export function blankArea(L, W, H) {
  return ((2 * L + 2 * W + GLUE_FLAP_MM) * (H + W)) / 1e6;
}

/**
 * Format livré à plat (mm) : caisse pliée-collée à plat (2 épaisseurs), découpe (flan),
 * plaque (feuille). Sert au plan de palettisation et à l'animation de la palette.
 */
export function flatFormat(family, s, thicknessMm) {
  if (family === 'plaque') return { a: s.L, b: s.W, thick: thicknessMm };
  if (family === 'decoupe') return { a: 2 * s.L + 2 * s.W + GLUE_FLAP_MM, b: s.H + s.W, thick: thicknessMm };
  return { a: s.L + s.W + 20, b: s.H + s.W, thick: 2 * thicknessMm };
}

/** Nombre d'unités à plat par palette Europe (meilleure orientation, 1,10 m de chargement). */
export function palletLoad(fmt) {
  const fit = (a, b) => Math.floor(PALLET.L / a) * Math.floor(PALLET.W / b);
  const perLayer = Math.max(1, fit(fmt.a, fmt.b), fit(fmt.b, fmt.a));
  const perPile = Math.floor(PALLET.load / fmt.thick);
  return { perLayer, perPile, perPallet: perLayer * perPile };
}

/**
 * Estimation complète pour le configurateur.
 * @param {{product:string,L:number,W:number,H:number,flute:string,outer:string,inner:string,content:number,condition:string}} s
 */
export function estimate(s) {
  const product = PRODUCTS[s.product] ?? PRODUCTS.CI;
  const comp = boardComposition(s.flute, s.outer, s.inner);
  const isCase = product.family === 'caisse';
  const area = product.family === 'plaque' ? (s.L * s.W) / 1e6 : blankArea(s.L, s.W, s.H);
  const weightG = area * comp.grammage;
  const pallet = palletLoad(flatFormat(product.family, s, comp.thickness));

  const out = { ...comp, product, lead: leadText(product), isCase, area, weightG, boxWeightG: weightG, pallet };
  if (!isCase) return out;

  const bctN = mckeeBCT(comp.ect, comp.thickness, s.L, s.W);
  const bctKg = bctN / G;
  const factor = CONDITIONS[s.condition]?.factor ?? 3;
  const maxLoadKg = bctKg / factor;
  const unitKg = Math.max(0.05, s.content + weightG / 1000);
  const stack = 1 + Math.floor(maxLoadKg / unitKg);
  const palletLayers = Math.max(1, Math.floor((1800 - 144) / s.H));
  return { ...out, bctN, bctKg, factor, maxLoadKg, stack, stackOnPallet: Math.min(stack, palletLayers), palletLayers };
}

export const fmt = (n, d = 0) =>
  Number(n).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
