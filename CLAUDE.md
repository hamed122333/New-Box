# New Box — expérience 3D

Site vitrine 3D (Vite + Three.js + GSAP ScrollTrigger + Lenis) : récit au scroll autour d'une caisse
en carton ondulé et configurateur de caisse. Langue du contenu et des commits : **français**.

## Commandes

Sous Windows PowerShell, utiliser `npm.cmd` (`npm` résout vers `npm.ps1`, bloqué par la politique
d'exécution par défaut).

- Installer : `npm.cmd install`
- Lancer (ouvre le navigateur) : `npm.cmd start` → http://localhost:5173
- Serveur sans ouverture : `npm.cmd run dev` ; accessible sur le réseau local : `npm.cmd run dev:lan`
- Build statique : `npm.cmd run build` (sortie `dist/`, chemins relatifs) ; `npm.cmd run preview`

Prérequis : Node.js 20.19+ ou 22.12+ (Vite 8), Git.

## Tester

Pas de suite de tests automatisés dans le dépôt. Vérification manuelle ou via le navigateur :

1. `npm.cmd run build` doit réussir sans erreur.
2. Lancer `npm.cmd run dev`, ouvrir http://localhost:5173 : aucune erreur dans la console.
3. Parcourir le récit : la caisse s'ouvre (01), plongée dans la tranche puis vue macro (02–03),
   morphing des cannelures jusqu'à BC (04), test ECT (05), flan qui se plie (06), palette (07).
4. Configurateur : changer produit / dimensions / cannelure / papiers → le modèle 3D, le délai et le BCT se mettent à jour ;
   « Capture PNG » télécharge une image ; « Demander un devis » ouvre un e-mail pré-rempli.
5. Pages `partenaires.html` (mode « Présenter » : plein écran, flèches du clavier, Échap), `grands-comptes.html`
   et `dossier-marche.html` : aucune erreur console, curseurs des simulateurs réactifs, filtres du benchmark,
   optimiseur de carton ; « Voir en 3D » ouvre le configurateur réglé (paramètres d'URL).
6. La console expose `window.__newbox` (état du scroll, scène, configurateur) pour le débogage.
   `?capture` dans l'URL passe en horloge pilotée (`__newbox.step(dt)`) pour l'enregistrement vidéo.

## Performance (INP)

- Ne jamais faire de travail lourd (textures Canvas, reconstruction 3D, encodage d'image) dans un
  gestionnaire d'événement : mettre à jour le DOM, puis lancer le calcul avec `afterNextPaint()`
  (`src/lib/schedule.js`). Le configurateur regroupe les rafales et, pendant un glissement de curseur,
  ne reconstruit que la géométrie (`box.build(patch, { deferTextures: true })`).
- Textures : tout ce qui ne dépend pas des dimensions est mis en cache dans `src/three/textures.js`
  (`once()`, `userData.shared` = ne pas libérer). Canvas en `willReadFrequently` ; pas de
  `getImageData` sur le chemin d'une interaction.
- Pas d'écriture DOM identique à chaque image dans la boucle de rendu (styles invalidés).
- Shaders pré-compilés pendant l'écran de chargement (`warmUp` dans `src/main.js`) : tout nouvel
  objet/matériau visible seulement plus tard dans le récit doit y être rendu visible.

## Repères

- Storyboard (timeline du scroll) : `src/scroll/story.js` ; hauteurs des chapitres : `data-units` dans `index.html`
- Application de l'état à la 3D (caméras, test ECT, palette, configurateur) : `src/experience.js`
- Caisse FEFCO 0201 paramétrique : `src/three/box.js` ; coupe de carton : `src/three/board.js`
- Textures procédurales, impression du logo : `src/three/textures.js`
- Gamme et délais (codes usine CI, CV, CID, CVD, DI, DV, PL, PLR) : `src/data/products.js` ;
  CID / CVD = caisse imprimée / vierge **découpée** (poignées ajourées en 3D, masque `holeMask`)
- Cannelures F, E, B, C (+ doubles EB, BC) : `src/data/flutes.js` ; qualités papier KL, KS, TL, TB, FL : `src/data/papers.js`
  (grammages et indices indicatifs, à valider par New Box) ; calculs ECT / McKee / palettisation à plat : `src/lib/calc.js`
- Palette du récit : caisses livrées pliées-collées à plat, en paquets cerclés (`src/three/stack.js`)
- Logo officiel : `src/assets/brand/logo-new-box.png` ; charte : bleu `#14259B`, orange `#F49C21`, bleu nuit `#0D1642`
- Certifications (SGS FSSC 22000, ISO 9001, ISO 45001 ; FSC C191615) : `src/assets/brand/certifications.png`,
  imprimées sous le logo sur la face avant des caisses imprimées et affichées dans la section « Produits & délais »
- « Bailleurs de fonds » = nos **partenaires actuels** (pas des investisseurs à démarcher) : `partenaires.html`,
  page simple et visuelle à présenter à la direction (rendus 3D de la caisse dans `src/assets/partners/`, obtenus
  avec `__newbox.stage.capture()` en mode `?capture`). Annexe chiffrée : `dossier-marche.html`.
  Courbe de croissance (chiffre d'affaires / volume) : `src/portal/growth.js`, données dans `src/data/partners.js` —
  **valeurs fictives** (`DEMO = true` affiche « Données d'illustration ») : ne jamais les présenter comme réelles ;
  les remplacer par les chiffres New Box puis passer `DEMO` à `false`.
  Grands clients : `grands-comptes.html`. Entrées Vite dans `vite.config.js` ; code `src/portal/` (`ui.js` utilitaires et info-bulles, `charts.js` graphiques SVG sans
  bibliothèque, `market-ui.js` rendus partagés), styles `src/styles/portal.css` (palette de graphiques validée :
  `--series-1` #3550d0, `--series-2` #e07a12). Pas de Three.js ni de GSAP sur ces pages : les garder légères.
- Veille marché (prix du papier, papetiers, contexte tunisien) : `src/data/market.js` — chaque chiffre a une source
  datée dans `SOURCES` ; ne jamais ajouter de chiffre sans source. Les hypothèses des simulateurs sont marquées
  « démonstration » et doivent être remplacées par les chiffres New Box.
- Paramètres d'URL du configurateur (`produit`, `L`, `W`, `H`, `cannelure`, `ext`, `int`) : `_readUrl()` dans
  `src/ui/configurator.js`, appliqués à la caisse dans `src/main.js`
- Plan et feuille de route : `docs/PLAN.md`
