// Veille marché : papiers pour carton ondulé, fournisseurs, prix mondiaux, contexte tunisien.
// Recherche d'octobre 2026 : chaque chiffre renvoie à une source datée (SOURCES).
// Les cotations officielles (Fastmarkets/RISI, EUWID) sont payantes : ces valeurs viennent de
// leurs communiqués publics et de la presse spécialisée, et restent indicatives.

export const UPDATED = 'octobre 2026';

export const SOURCES = {
  hortidaily25: { label: 'HortiDaily — prix européens, janvier 2025', url: 'https://www.hortidaily.com/article/9703028/european-packaging-paper-prices-decline-amid-weak-demand-and-industry-consolidation/' },
  sca90: { label: 'SCA — kraftliner +90 €/t (mars 2025)', url: 'https://www.sca.com/en/media/press-releases/2025/sca-to-increase-kraftliner-prices-by--90-per-tonne/' },
  sca60: { label: 'SCA — kraftliner +60 €/t (mai 2025)', url: 'https://www.sca.com/en/media/press-releases/2025/sca-to-increase-kraftliner-prices-by--60-per-tonne/' },
  sca100: { label: 'SCA — kraftliner +100 €/t (septembre 2026)', url: 'https://www.sca.com/en/media/press-releases/2026/sca-to-increase-kraftliner-prices-by-100-per-tonne/' },
  fresh26: { label: 'FreshPlaza — papiers d’emballage européens, avril 2026', url: 'https://www.freshplaza.com/europe/article/9836683/european-packaging-paper-prices-rise-by-up-to-eur100-ton/' },
  fmPoland: { label: 'Fastmarkets — Pologne, juin 2026', url: 'https://www.fastmarkets.com/insights/https-www-fastmarkets-com-insights-poland-containerboard-kraftliner-prices-stable/' },
  fmSept: { label: 'Fastmarkets — Packaging focus, septembre 2026', url: 'https://www.fastmarkets.com/insights/packaging-focus-september-recycled-containerboard-and-ukl-prices-rise-while-fbb-and-wlc-prices-remain-stable/' },
  fmLiner: { label: 'Fastmarkets — linerboard, mars 2026', url: 'https://www.fastmarkets.com/insights/navigating-linerboard-price-hikes-and-volatility/' },
  pdJune: { label: 'Packaging Dive — containerboard, juin 2026', url: 'https://www.packagingdive.com/news/containerboard-pricing-june-2026-fastmarkets-risi-increase-demand-supply/823172/' },
  pdFall: { label: 'Packaging Dive — hausses annoncées, automne 2026', url: 'https://www.packagingdive.com/news/international-paper-containerboard-price-hike-boxboard-sbs-smurfit-westrock/826355/' },
  ipClose: { label: 'Packaging Dive — fermetures International Paper', url: 'https://www.packagingdive.com/news/international-paper-two-mill-closures-riceboro-savannah-georgia-layoffs/758254/' },
  china: { label: 'The Packaging Portal — papetiers chinois, avril 2026', url: 'https://www.thepackagingportal.com/industry-news/chinese-paper-mills-announce-price-increases-amid-weak-market-conditions-domestically/' },
  klabin: { label: 'Genial Investimentos — Klabin T1 2026', url: 'https://media-genial-analisa.genialinvestimentos.com.br/wp-content/uploads/2026/05/06182621/Genial_KLBN11_1Q26_Review.pdf' },
  ranking: { label: 'corruga.expert — classement par chiffre d’affaires', url: 'https://corruga.expert/news/top-10-corrugated-board-and-paper-based-packaging-giants-by-revenue-who-controls-the-global-market/' },
  mondi: { label: 'Mondi — résultats annuels 2025', url: 'https://www.mondigroup.com/globalassets/mondigroup.com/investors/results-reports-and-presentations/2025/fy-results/2025-presentation-master---final.pdf' },
  mondiDuino: { label: 'Industry Europe — Mondi Duino (avril 2025)', url: 'https://industryeurope.com/sectors/consumer-goods/mondi-duino-marks-start-up-of-recycled-containerboard-mill-w/' },
  modern: { label: 'Voith — Modern Karton PM 6 (septembre 2025)', url: 'https://www.voith.com/corp-en/news-room/press-releases/2025-09-04_vp-production-line-6-at-modern-karton-in-turkey.html' },
  turkey: { label: 'Mordor Intelligence — marché turc du carton', url: 'https://www.mordorintelligence.com/industry-reports/turkey-containerboard-market' },
  afripaper: { label: 'PaperIndex — fiche Afripaper', url: 'https://www.paperindex.com/profile/afripaper/11120904/4086' },
  sotipapier: { label: 'CMF — Sotipapier, indicateurs T1 2026', url: 'https://www.cmf.tn/sites/default/files/pdfs/emetteurs/informations/indicateurs/indic_1trim26_sotipapier.pdf' },
  gmi: { label: 'Global Market Insights — corrugated packaging', url: 'https://www.gminsights.com/industry-analysis/corrugated-packaging-market' },
  olive: { label: 'AllAfrica / ONAGRI — huile d’olive 2025-2026', url: 'https://fr.allafrica.com/stories/202609220408.html' },
  dates: { label: 'TSA — dattes, saison 2025-2026', url: 'https://www.tsa-algerie.com/dattes-apres-lhuile-dolive-la-tunisie-realise-des-chiffres-record-a-lexport/' },
  packtec: { label: 'WMC — Packaging 2025 (PACKTEC, novembre 2025)', url: 'https://www.webmanagercenter.com/2025/11/28/556769/packaging-2025-quelles-tendances-pour-le-marche-tunisien/' },
  eurTnd: { label: 'Tunisie Numérique — cours BCT du 10/09/2026', url: 'https://www.tunisienumerique.com/taux-de-change-tunisie-2026-09-10/' },
  ppwr: { label: 'S-GE — règlement européen PPWR', url: 'https://www.s-ge.com/export/fr/articles/guide/nouveau-reglement-europeen-sur-les-emballages-ppwr' },
};

/** Cours de référence utilisé pour les conversions (BCT, 10 septembre 2026). */
export const EUR_TND = 3.3824;

// Sotipapier 2025 (indicateurs publiés) : chiffre d'affaires ÷ production = prix moyen implicite.
const SOTI = { tlflTonnes: 31649, tlflDT: 43.1e6, kraftTonnes: 16320, kraftDT: 56.0e6 };
export const TUNISIA_IMPLIED = {
  tlflDT: SOTI.tlflDT / SOTI.tlflTonnes, // ≈ 1 362 DT/t
  kraftDT: SOTI.kraftDT / SOTI.kraftTonnes, // ≈ 3 431 DT/t (kraft pour sacs)
};

/**
 * Niveaux de prix en €/t (fourchettes). Une seule unité, un seul axe : l'Europe (cotations
 * publiques) face au prix moyen implicite tunisien (converti au cours BCT).
 */
export const PRICE_LEVELS = [
  { id: 'kl-pl', grade: 'Kraftliner brun', where: 'Pologne, juin 2026', origin: 'europe', lo: 850, hi: 880, src: 'fmPoland', paper: 'KL' },
  { id: 'kl-eu25', grade: 'Kraftliner', where: 'Europe, janvier 2025', origin: 'europe', lo: 865, hi: 865, src: 'hortidaily25', paper: 'KL' },
  { id: 'tl-eu25', grade: 'Testliner', where: 'Europe, janvier 2025', origin: 'europe', lo: 670, hi: 670, src: 'hortidaily25', paper: 'TL' },
  { id: 'tl-pl', grade: 'Testliner 2, 140 g', where: 'Pologne, juin 2026', origin: 'europe', lo: 460, hi: 480, src: 'fmPoland', paper: 'TL' },
  { id: 'fl-pl', grade: 'Fluting recyclé', where: 'Pologne, juin 2026', origin: 'europe', lo: 440, hi: 460, src: 'fmPoland', paper: 'FL' },
  {
    id: 'tlfl-tn',
    grade: 'Testliner + fluting',
    where: 'Tunisie, moyenne 2025*',
    origin: 'tunisie',
    lo: Math.round(TUNISIA_IMPLIED.tlflDT / EUR_TND),
    hi: Math.round(TUNISIA_IMPLIED.tlflDT / EUR_TND),
    src: 'sotipapier',
    paper: 'TL',
    note: 'Prix moyen implicite : chiffre d’affaires ÷ production publiés par Sotipapier, converti au cours BCT.',
  },
];

/** Mouvements de prix récents par marché (unités d'origine, pas de conversion). */
export const MOVES = [
  { market: 'Europe', grade: 'Kraftliner', value: '+200 €/t', detail: 'cumul depuis janvier 2026 (septembre)', src: 'fmSept', dir: 1 },
  { market: 'Europe', grade: 'Recyclé (testliner, fluting)', value: '+60 €/t', detail: 'en septembre 2026 (Allemagne, France, Pologne)', src: 'fmSept', dir: 1 },
  { market: 'Europe', grade: 'Vieux papiers', value: '+15 à 30 %', detail: 'en avril 2026, selon la qualité et le pays', src: 'fresh26', dir: 1 },
  { market: 'Amérique du Nord', grade: 'Linerboard', value: '+100 $/t', detail: 'net depuis janvier 2026 (fin juin), ≈ 925 $/t en mars', src: 'pdJune', dir: 1 },
  { market: 'Chine', grade: 'Papiers pour ondulé', value: '+50 CNY/t', detail: 'Nine Dragons et autres papetiers, avril 2026', src: 'china', dir: 1 },
  { market: 'Brésil', grade: 'Kraftliner (Klabin)', value: '3 632 R$/t', detail: 'prix moyen réalisé T1 2026 (−2,2 % sur le trimestre)', src: 'klabin', dir: -1 },
];

/** Chronologie : ce qui fait bouger les prix (annonces, cotations, offre). */
export const TIMELINE = [
  { date: 'janv. 2025', text: 'Europe : testliner à 670 €/t (−3 %) et kraftliner à 865 €/t (−2 %), demande faible et surcapacité.', src: 'hortidaily25', kind: 'baisse' },
  { date: 'mars 2025', text: 'SCA annonce +90 €/t sur le kraftliner européen.', src: 'sca90', kind: 'annonce' },
  { date: 'avril 2025', text: 'Mondi démarre Duino (Italie) : 420 000 t/an de carton recyclé en Méditerranée.', src: 'mondiDuino', kind: 'offre' },
  { date: 'mai 2025', text: 'SCA annonce une nouvelle hausse de +60 €/t.', src: 'sca60', kind: 'annonce' },
  { date: 'sept. 2025', text: 'Turquie : Modern Karton démarre sa ligne 6, plus de 1,45 Mt/an de papiers recyclés.', src: 'modern', kind: 'offre' },
  { date: '2025-2026', text: 'Amérique du Nord : International Paper ferme Savannah et Riceboro (≈ 1 Mt/an en moins).', src: 'ipClose', kind: 'offre' },
  { date: 'avril 2026', text: 'Europe : testliner +90 €/t, kraftliner +30 €/t, vieux papiers +15 à 30 %. Chine : +50 CNY/t.', src: 'fresh26', kind: 'hausse' },
  { date: 'juin 2026', text: 'Amérique du Nord : +100 $/t nets depuis janvier sur le linerboard.', src: 'pdJune', kind: 'hausse' },
  { date: 'sept. 2026', text: 'Europe : kraftliner +200 €/t depuis janvier, recyclé +60 €/t ; SCA annonce +100 €/t.', src: 'fmSept', kind: 'hausse' },
  { date: 'automne 2026', text: 'Amérique du Nord : hausses annoncées de 80 à 140 $/t (PCA, Smurfit Westrock, International Paper).', src: 'pdFall', kind: 'annonce' },
];

/**
 * Benchmark des papetiers. `scope` : local (Tunisie), med (Méditerranée), world (mondial).
 * `scale` : ordre de grandeur publié (capacité, production ou chiffre d'affaires, selon la source).
 */
export const SUPPLIERS = [
  {
    name: 'Afripaper',
    country: 'Tunisie · Chebika (Kairouan)',
    scope: 'local',
    grades: ['Testliner', 'Fluting'],
    fibre: 'Recyclée',
    scale: '≈ 100 000 t/an (capacité, 2 machines)',
    edge: 'Même gouvernorat que l’usine New Box : délai court, achat en dinars, pas de risque de change.',
    src: 'afripaper',
  },
  {
    name: 'Sotipapier',
    country: 'Tunisie · cotée à la BVMT',
    scope: 'local',
    grades: ['Testliner', 'Fluting', 'Kraft sacs'],
    fibre: 'Recyclée et vierge',
    scale: '47 969 t produites en 2025 · CA 102,2 MDT',
    edge: 'Seul papetier coté : prix moyens implicites publics (≈ 1 362 DT/t en testliner et fluting en 2025).',
    src: 'sotipapier',
  },
  {
    name: 'Modern Karton (Eren)',
    country: 'Turquie',
    scope: 'med',
    grades: ['Testliner', 'Fluting'],
    fibre: 'Recyclée',
    scale: '> 1,45 Mt/an (ligne 6 démarrée en 2025)',
    edge: 'Turquie exportatrice nette vers le Moyen-Orient et l’Afrique du Nord : alternative méditerranéenne.',
    src: 'modern',
  },
  {
    name: 'Kipaş Kağıt',
    country: 'Turquie',
    scope: 'med',
    grades: ['Testliner', 'Fluting'],
    fibre: 'Recyclée',
    scale: '+650 000 t/an (machine PM3, Söke)',
    edge: 'Nouvelle capacité qui élargit l’offre turque, du kraftliner au testliner blanc.',
    src: 'turkey',
  },
  {
    name: 'Mondi',
    country: 'Autriche · Royaume-Uni',
    scope: 'med',
    grades: ['Kraftliner', 'Testliner', 'Fluting'],
    fibre: 'Vierge et recyclée',
    scale: '2,1 Mt de carton vierge produites en 2025 · Duino (Italie) 420 000 t/an',
    edge: 'Kraftliner vierge haute résistance ; site recyclé en Méditerranée depuis 2025.',
    src: 'mondi',
  },
  {
    name: 'SCA',
    country: 'Suède',
    scope: 'world',
    grades: ['Kraftliner'],
    fibre: 'Vierge',
    scale: 'Référence du kraftliner européen',
    edge: 'Ses annonces (+90, +60, +100 €/t) donnent le tempo des prix du kraftliner en Europe.',
    src: 'sca100',
  },
  {
    name: 'Smurfit Westrock',
    country: 'Irlande · États-Unis',
    scope: 'world',
    grades: ['Kraftliner', 'Testliner', 'Fluting'],
    fibre: 'Vierge et recyclée',
    scale: 'CA ≈ 31,2 Md$ · n° 1 mondial par le chiffre d’affaires',
    edge: 'Né de la fusion Smurfit Kappa – WestRock (2024) : fixe les prix des deux côtés de l’Atlantique.',
    src: 'ranking',
  },
  {
    name: 'International Paper (+ DS Smith)',
    country: 'États-Unis · Europe',
    scope: 'world',
    grades: ['Kraftliner', 'Testliner', 'Fluting'],
    fibre: 'Vierge et recyclée',
    scale: 'CA ≈ 23,6 Md$',
    edge: 'Rachat de DS Smith en 2025 ; fermetures d’usines aux États-Unis qui tendent l’offre.',
    src: 'ranking',
  },
  {
    name: 'Klabin',
    country: 'Brésil',
    scope: 'world',
    grades: ['Kraftliner'],
    fibre: 'Vierge (eucalyptus, pin)',
    scale: '162 000 t de kraftliner livrées au T1 2026',
    edge: 'Grand exportateur de kraftliner vers l’Europe et la Méditerranée.',
    src: 'klabin',
  },
  {
    name: 'Nine Dragons',
    country: 'Chine',
    scope: 'world',
    grades: ['Kraftliner', 'Testliner', 'Fluting'],
    fibre: 'Recyclée',
    scale: 'CA ≈ 8,8 Md$',
    edge: 'Plus grand papetier d’Asie : ses hausses (+50 CNY/t en avril 2026) pèsent sur l’offre mondiale.',
    src: 'ranking',
  },
];

export const SCOPES = { local: 'Tunisie', med: 'Méditerranée', world: 'Mondial' };

/** Contexte tunisien et marché (pour les investisseurs et les grands comptes). */
export const CONTEXT = {
  market: { value: '≈ 225 Md$', label: 'marché mondial de l’emballage en carton ondulé en 2025, +3,3 %/an prévus jusqu’en 2035', src: 'gmi' },
  olive: { value: '4 780 MDT', label: 'exportations d’huile d’olive en 10 mois de campagne 2025-2026 (381 200 t, +50,8 % en volume)', src: 'olive' },
  dates: { value: '> 1 000 MDT', label: 'exportations de dattes sur la saison 2025-2026 (160 000 t), contre 830 MDT la saison précédente', src: 'dates' },
  sector: { value: '≈ 250', label: 'entreprises d’emballage en Tunisie, plus de 25 000 emplois directs (novembre 2025)', src: 'packtec' },
  ppwr: { value: '12 août 2026', label: 'entrée en application du règlement européen PPWR (UE 2025/40), y compris pour les emballages fabriqués hors UE', src: 'ppwr' },
  fx: { value: `${EUR_TND.toFixed(4).replace('.', ',')} DT`, label: 'pour 1 € (cours BCT du 10 septembre 2026)', src: 'eurTnd' },
};
