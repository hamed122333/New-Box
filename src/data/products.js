import { SINGLE_FLUTES, DOUBLE_FLUTES, FLUTE_ORDER } from './flutes.js';

// Gamme de l'usine (codes internes) et délais de fabrication indicatifs, en jours.
//  family   : 'caisse' (caisse américaine montée), 'decoupe' (article découpé Bobst), 'plaque'
//  walls    : 1 = simple cannelure, 2 = double cannelure, 0 = au choix
//  diecut   : caisse découpée (CID / CVD) → poignées découpées sur les petits côtés
export const PRODUCTS = {
  CI: { code: 'CI', name: 'Caisse imprimée', short: 'Caisse imprimée', family: 'caisse', printed: true, walls: 0, lead: [7, 10] },
  CV: { code: 'CV', name: 'Caisse vierge', short: 'Caisse vierge', family: 'caisse', printed: false, walls: 0, lead: [7, 10] },
  CID: { code: 'CID', name: 'Caisse imprimée découpée', short: 'Imprimée découpée', family: 'caisse', printed: true, diecut: true, walls: 0, lead: [7, 10] },
  CVD: { code: 'CVD', name: 'Caisse vierge découpée', short: 'Vierge découpée', family: 'caisse', printed: false, diecut: true, walls: 0, lead: [7, 10] },
  DI: { code: 'DI', name: 'Découpe imprimée', short: 'Découpe imprimée', family: 'decoupe', printed: true, walls: 0, lead: [12, 15] },
  DV: { code: 'DV', name: 'Découpe vierge', short: 'Découpe vierge', family: 'decoupe', printed: false, walls: 0, lead: [12, 15] },
  PL: { code: 'PL', name: 'Plaque', short: 'Plaque', family: 'plaque', printed: false, walls: 0, scored: false, lead: [5, 5] },
  PLR: { code: 'PLR', name: 'Plaque rainée', short: 'Plaque rainée', family: 'plaque', printed: false, walls: 0, scored: true, lead: [5, 5] },
};

export const PRODUCT_ORDER = ['CI', 'CV', 'CID', 'CVD', 'DI', 'DV', 'PL', 'PLR'];

export const leadText = (p) => (p.lead[0] === p.lead[1] ? `${p.lead[0]} jours` : `${p.lead[0]} à ${p.lead[1]} jours`);

/** Cannelures proposées pour un produit. */
export function flutesFor(p) {
  if (p.walls === 1) return SINGLE_FLUTES;
  if (p.walls === 2) return DOUBLE_FLUTES;
  return FLUTE_ORDER;
}
