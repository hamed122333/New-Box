import { FLUTES } from '../data/flutes.js';
import { GRADES, CONDITIONS } from '../data/grades.js';

export const GLUE_FLAP_MM = 35;
const G = 9.81;

/**
 * Composition d'une plaque : liste des papiers, grammage total et
 * performances estimées (ECT, éclatement, Cobb).
 */
export function boardComposition(fluteId, gradeId) {
  const flute = FLUTES[fluteId];
  const grade = GRADES[gradeId];
  const double = flute.layers.length === 2;

  const liners = double ? [grade.inner, grade.inner, grade.outer] : [grade.inner, grade.outer];
  const flutings = flute.layers.map((l) => ({ ...grade.fluting, takeUp: l.takeUp }));

  const grammage =
    liners.reduce((s, p) => s + p.gsm, 0) +
    flutings.reduce((s, p) => s + p.gsm * p.takeUp, 0);

  // ECT ≈ k · (Σ SCT couvertures + Σ α · SCT cannelures)   (kN/m)
  const sct = (p) => (p.sct * p.gsm) / 1000;
  const ect =
    0.75 * (liners.reduce((s, p) => s + sct(p), 0) + flutings.reduce((s, p) => s + p.takeUp * sct(p), 0));

  // Éclatement ≈ somme des éclatements des couvertures (kPa)
  const burst = 0.95 * liners.reduce((s, p) => s + (p.burst ?? 2.4) * p.gsm, 0);

  return {
    flute,
    grade,
    liners,
    flutings,
    grammage,
    thickness: flute.thickness,
    ect,
    burst,
    cobb: grade.outer.cobb,
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
 * Estimation complète pour le configurateur.
 * @param {{L:number,W:number,H:number,flute:string,grade:string,content:number,condition:string}} s
 */
export function estimate(s) {
  const comp = boardComposition(s.flute, s.grade);
  const bctN = mckeeBCT(comp.ect, comp.thickness, s.L, s.W);
  const bctKg = bctN / G;
  const factor = CONDITIONS[s.condition]?.factor ?? 3;
  const maxLoadKg = bctKg / factor;
  const boxWeightG = blankArea(s.L, s.W, s.H) * comp.grammage;
  const unitKg = Math.max(0.05, s.content + boxWeightG / 1000);
  const stack = 1 + Math.floor(maxLoadKg / unitKg);
  const palletLayers = Math.max(1, Math.floor((1800 - 144) / s.H));
  return {
    ...comp,
    bctN,
    bctKg,
    factor,
    maxLoadKg,
    boxWeightG,
    stack,
    stackOnPallet: Math.min(stack, palletLayers),
    palletLayers,
  };
}

export const fmt = (n, d = 0) =>
  Number(n).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
