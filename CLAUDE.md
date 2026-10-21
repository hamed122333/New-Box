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
- Mise en production sur newbox.com.tn : `docs/DEPLOIEMENT.md` (fichiers d'hébergement, SEO, 404 et mentions légales dans `public/`)

Prérequis : Node.js 20.19+ ou 22.12+ (Vite 8), Git.

## Tester

Pas de suite de tests automatisés dans le dépôt. Vérification manuelle ou via le navigateur :

1. `npm.cmd run build` doit réussir sans erreur.
2. Lancer `npm.cmd run dev`, ouvrir http://localhost:5173 : aucune erreur dans la console.
3. Parcourir le récit : la caisse s'ouvre (01), plongée dans la tranche puis vue macro (02–03),
   morphing des cannelures jusqu'à BC (04), test ECT (05), flan qui se plie (06), palette (07).
4. Configurateur : changer produit / dimensions / cannelure / papiers → le modèle 3D, le délai et le BCT se mettent à jour ;
   « Capture PNG » télécharge une image ; « Demander un devis » ouvre un e-mail pré-rempli.
5. `grands-comptes.html` et `partenaires.html` : aucune erreur console, filtres et sélection du benchmark,
   survol / flèches du graphique de croissance, formulaires → e-mail pré-rempli, pas de défilement horizontal à 390 px.
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
- Plan et feuille de route : `docs/PLAN.md`
- Tableaux de bord `grands-comptes.html` (acheteurs : benchmark des papetiers, prix du papier, programme) et
  `partenaires.html` (partenaires financiers actuels : croissance, marché, engagements) : code `src/dash/`
  (`common.js` utilitaires, `accounts.js`, `partners.js`, `trend.js` courbe animée des prix des bobines), styles `src/styles/dashboard.css`, entrées Vite dans
  `vite.config.js`. Pas de Three.js ni de GSAP sur ces pages. Engagements de service à valider par la direction.
- Veille papier, papetiers et contexte tunisien :
  `src/data/market.js` — chaque chiffre a une source datée dans `SOURCES` ; n'en ajouter aucun sans source.
  Croissance des partenaires : `src/data/partners.js` — **valeurs fictives** (`DEMO = true` affiche « Données
  d'illustration ») : les remplacer par les chiffres New Box puis passer `DEMO` à `false`.
