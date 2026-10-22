// Espace partenaires : croissance de New Box depuis 2020.
//
// ⚠️ DONNÉES D'ILLUSTRATION — ces valeurs sont fictives (maquette). Remplacez-les par les chiffres
// réels de New Box avant toute diffusion, puis passez DEMO à false pour retirer la mention
// « Données d'illustration » affichée sur le graphique (et la mise en garde de public/llms.txt).
export const DEMO = true;

export const GROWTH = {
  years: [2020, 2021, 2022, 2023, 2024, 2025, 2026],
  /** Première année de prévision (tracée en pointillés, point creux). */
  forecastFrom: 2026,
  /** Première année pleine d'activité (base des multiplicateurs et du taux de croissance). */
  firstFullYear: 2021,
  series: {
    ca: {
      tab: 'Chiffre d’affaires',
      label: 'Chiffre d’affaires',
      unit: 'MDT',
      decimals: 1,
      values: [3.2, 9.8, 15.6, 19.4, 24.1, 29.5, 35.0],
    },
    volume: {
      tab: 'Volume vendu',
      label: 'Volume vendu',
      unit: 't',
      decimals: 0,
      values: [1100, 3400, 5300, 6500, 8000, 9600, 11200],
    },
  },
};
