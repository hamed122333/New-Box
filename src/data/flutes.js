// Profils de cannelures — valeurs typiques du marché (FEFCO / usages onduleurs).
// Toutes les cotes sont en millimètres. À ajuster avec les fiches techniques New Box.
//
// pitch   : pas de l'onde (distance entre deux sommets)
// height  : hauteur d'onde entre les deux couvertures
// takeUp  : coefficient d'ondulation (longueur de papier cannelure / longueur de plaque)
//
// Pour les doubles cannelures, `layers[0]` est l'onde intérieure, `layers[1]` l'onde extérieure.

const E = { pitch: 3.3, height: 1.15, takeUp: 1.27 };
const B = { pitch: 6.3, height: 2.5, takeUp: 1.33 };
const C = { pitch: 7.6, height: 3.6, takeUp: 1.43 };

export const FLUTES = {
  E: {
    id: 'E',
    name: 'Cannelure E',
    family: 'Simple cannelure · micro-onde',
    thickness: 1.5,
    layers: [E],
    usage: 'Boîtes pliantes, e-commerce léger, impression haute définition.',
  },
  B: {
    id: 'B',
    name: 'Cannelure B',
    family: 'Simple cannelure',
    thickness: 3.0,
    layers: [B],
    usage: 'Caisses petites et moyennes, excellente résistance à l’écrasement à plat.',
  },
  C: {
    id: 'C',
    name: 'Cannelure C',
    family: 'Simple cannelure',
    thickness: 4.0,
    layers: [C],
    usage: 'La caisse américaine de référence : compromis idéal gerbage / amortissement.',
  },
  EB: {
    id: 'EB',
    name: 'Double cannelure EB',
    family: 'Double cannelure',
    thickness: 4.5,
    layers: [B, E],
    usage: 'Emballages imprimés résistants, présentoirs, produits lourds et fragiles.',
  },
  BC: {
    id: 'BC',
    name: 'Double cannelure BC',
    family: 'Double cannelure',
    thickness: 7.0,
    layers: [C, B],
    usage: 'Charges lourdes, export, palettisation haute, chambres froides.',
  },
};

export const FLUTE_ORDER = ['E', 'B', 'C', 'EB', 'BC'];

// Parcours de la section « Cannelures » du récit (index flottant animé au scroll).
export const FLUTE_STORY = ['C', 'E', 'B', 'C', 'BC'];
