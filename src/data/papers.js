// Qualités papier de l'usine (codes internes New Box).
// Grammages et indices (SCT en N·m/g, éclatement en kPa·m²/g, Cobb 60 s en g/m²) :
// ordres de grandeur pour l'estimation, à remplacer par les fiches techniques / mesures labo.
export const PAPERS = {
  KL: { code: 'KL', name: 'Kraftliner', gsm: 175, sct: 19.5, burst: 4.2, cobb: 32, color: 'kraft' },
  KS: { code: 'KS', name: 'Kraft KS', gsm: 150, sct: 18.5, burst: 3.6, cobb: 38, color: 'kraft' },
  TL: { code: 'TL', name: 'Testliner', gsm: 140, sct: 16.5, burst: 2.4, cobb: 55, color: 'kraft' },
  TB: { code: 'TB', name: 'Testliner blanc', gsm: 140, sct: 16.5, burst: 2.6, cobb: 45, color: 'white' },
  FL: { code: 'FL', name: 'Fluting', gsm: 127, sct: 18, color: 'kraft' },
};

export const OUTER_ORDER = ['KL', 'KS', 'TL', 'TB']; // couverture extérieure
export const INNER_ORDER = ['KL', 'KS', 'TL']; // couverture intérieure (et médiane en double cannelure)
export const FLUTING = 'FL'; // papier de cannelure

// Composition utilisée dans le récit (anatomie, cannelures, test qualité)
export const STORY_PAPERS = { outer: 'KL', inner: 'TL' };

// Coefficient de sécurité appliqué au BCT selon les conditions de stockage.
export const CONDITIONS = {
  court: { id: 'court', name: 'Court & sec (< 1 semaine)', factor: 2.2 },
  standard: { id: 'standard', name: 'Standard (≈ 1 mois, 50–65 % HR)', factor: 3 },
  humide: { id: 'humide', name: 'Long / humide (chambre froide, export)', factor: 4.5 },
};
