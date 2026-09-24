// Qualités papier proposées. Les indices SCT (N·m/g) et éclatement (kPa·m²/g)
// sont des ordres de grandeur pour l'estimation : à remplacer par les mesures labo.

export const GRADES = {
  eco: {
    id: 'eco',
    name: 'Économique',
    desc: 'Testliner et fluting 100 % recyclés',
    outer: { name: 'Testliner', gsm: 125, sct: 16.5, burst: 2.3, cobb: 55 },
    inner: { name: 'Testliner', gsm: 125, sct: 16.5, burst: 2.3 },
    fluting: { name: 'Fluting recyclé', gsm: 112, sct: 17 },
    color: 'kraft',
  },
  standard: {
    id: 'standard',
    name: 'Standard',
    desc: 'Kraftliner brun et fluting mi-chimique',
    outer: { name: 'Kraftliner', gsm: 175, sct: 19.5, burst: 4.2, cobb: 32 },
    inner: { name: 'Testliner', gsm: 140, sct: 17, burst: 2.6 },
    fluting: { name: 'Fluting mi-chimique', gsm: 127, sct: 19 },
    color: 'kraft',
  },
  renforce: {
    id: 'renforce',
    name: 'Renforcé',
    desc: 'Kraftliner haute performance, idéal export',
    outer: { name: 'Kraftliner HP', gsm: 250, sct: 20.5, burst: 4.6, cobb: 28 },
    inner: { name: 'Kraftliner', gsm: 175, sct: 19.5, burst: 4.2 },
    fluting: { name: 'Fluting HP', gsm: 150, sct: 21 },
    color: 'kraft',
  },
  blanc: {
    id: 'blanc',
    name: 'Blanc (white top)',
    desc: 'Couverture blanchie pour une impression éclatante',
    outer: { name: 'White top testliner', gsm: 140, sct: 17, burst: 2.8, cobb: 40 },
    inner: { name: 'Testliner', gsm: 125, sct: 16.5, burst: 2.3 },
    fluting: { name: 'Fluting recyclé', gsm: 112, sct: 17 },
    color: 'white',
  },
};

export const GRADE_ORDER = ['eco', 'standard', 'renforce', 'blanc'];

// Coefficient de sécurité appliqué au BCT selon les conditions de stockage.
export const CONDITIONS = {
  court: { id: 'court', name: 'Court & sec (< 1 semaine)', factor: 2.2 },
  standard: { id: 'standard', name: 'Standard (≈ 1 mois, 50–65 % HR)', factor: 3 },
  humide: { id: 'humide', name: 'Long / humide (chambre froide, export)', factor: 4.5 },
};
