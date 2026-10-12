// Modèles de découpe (produits DI / DV) présentés en 3D et dans le configurateur.
// Dimensions intérieures en mm ; « limits » = bornes du configurateur.
export const STYLES = {
  pizza: {
    id: 'pizza',
    name: 'Boîte pizza',
    short: 'Pizza',
    ref: 'FEFCO 0426',
    desc: 'Boîte à couvercle et rabat rentrant, livrée à plat, montée en quelques secondes.',
    dims: { L: 330, W: 330, H: 40 },
    limits: { L: [200, 500], W: [200, 500], H: [30, 60] },
    flute: 'E',
    lid: true,
    lidLabel: 'Ouverture du couvercle',
    unit: ['boîte', 'boîtes'],
  },
  mailer: {
    id: 'mailer',
    name: 'Boîte e-commerce',
    short: 'E-commerce',
    ref: 'FEFCO 0427',
    desc: 'Boîte postale à couvercle rabattable : impression extérieure et message à l’intérieur.',
    dims: { L: 300, W: 220, H: 100 },
    limits: { L: [150, 600], W: [100, 450], H: [40, 200] },
    flute: 'E',
    lid: true,
    lidLabel: 'Ouverture du couvercle',
    unit: ['boîte', 'boîtes'],
  },
  tray: {
    id: 'tray',
    name: 'Plateau fruits & légumes',
    short: 'Plateau',
    ref: 'Plateau à poignées',
    desc: 'Plateau ouvert gerbable avec poignées découpées, pour agrumes, dattes et primeurs.',
    dims: { L: 500, W: 300, H: 120 },
    limits: { L: [300, 600], W: [200, 400], H: [80, 250] },
    flute: 'B',
    lid: false,
    unit: ['plateau', 'plateaux'],
  },
  divider: {
    id: 'divider',
    name: 'Croisillons',
    short: 'Croisillons',
    ref: 'Intérieur de caisse',
    desc: 'Séparateurs emboîtés qui calent bouteilles, bocaux et pièces fragiles.',
    dims: { L: 360, W: 240, H: 240 },
    limits: { L: [150, 600], W: [100, 400], H: [80, 350] },
    flute: 'B',
    lid: true,
    lidLabel: 'Démontage',
    noFlat: true,
    unit: ['jeu de croisillons', 'jeux de croisillons'],
  },
};

export const STYLE_ORDER = ['pizza', 'mailer', 'tray', 'divider'];

/** Nombre de cellules des croisillons (≈ 9 cm par cellule). */
export function dividerGrid(L, W) {
  return { nx: Math.max(2, Math.round(L / 90)), nz: Math.max(2, Math.round(W / 90)) };
}

/**
 * Flan découpé à plat (mm) : format de la feuille (a × b), surface de carton réellement utilisée
 * (m², hors chutes de découpe) et épaisseur d'une unité livrée (croisillons : un jeu de bandes).
 */
export function styleBlank(id, { L, W, H }, thickness) {
  if (id === 'divider') {
    const { nx, nz } = dividerGrid(L, W);
    const strips = nx - 1 + nz - 1;
    return { a: Math.max(L, W), b: H, area: (((nz - 1) * L + (nx - 1) * W) * H) / 1e6, thick: strips * thickness };
  }
  // pizza : fond + couvercle + parois doublées sur les côtés ; e-commerce : parois doublées partout
  const f = {
    pizza: { a: L + 4 * H, b: 2 * W + 3 * H, use: 0.8 },
    mailer: { a: L + 4 * H + 20, b: 2 * W + 4 * H, use: 0.82 },
    tray: { a: L + 2 * H + 20, b: W + 2 * H, use: 0.9 },
  }[id] ?? { a: L + 2 * H, b: W + 2 * H, use: 0.9 };
  return { a: f.a, b: f.b, area: (f.a * f.b * f.use) / 1e6, thick: thickness };
}
