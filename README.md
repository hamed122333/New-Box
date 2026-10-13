# New Box — Expérience 3D & configurateur de caisses

Prototype de la nouvelle vitrine de **New Box** (fabricant de carton ondulé, Kairouan) :
un récit 3D piloté par le scroll qui ouvre une vraie caisse, plonge dans la tranche du carton
et explique cannelures, grammages et qualité, puis un **configurateur 3D** façon Pacdora
qui transforme la visite en demande de devis.

📄 **Plan complet (benchmark, storyboard, technologies, feuille de route) : [docs/PLAN.md](docs/PLAN.md)**

## Ce que fait le prototype

| Chapitre | Ce qu'on voit |
|---|---|
| Accueil | Caisse américaine imprimée, scotchée, textures kraft procédurales |
| Sur mesure | Le ruban se sépare, les rabats s'ouvrent |
| Plongée | La caméra plonge sur la tranche : les cannelures apparaissent, fondu vers la macro |
| Anatomie | Coupe éclatée : couvertures, cannelure, colle d'amidon + étiquettes 3D |
| Cannelures | Morphing C → F → E → B → C → BC avec fiche technique dynamique |
| Qualité | Test ECT animé, compteurs ECT / BCT / éclatement / Cobb |
| Fabrication | Le flan imprimé à plat se plie en caisse (onduleuse → flexo → Bobst → pliage-collage) |
| Logistique | Palette Europe chargée de caisses **livrées à plat** (paquets cerclés), caisse montée devant |
| Produits & délais | Plaques PL/PLR (5 j), caisses CI/CV/CID/CVD (7–10 j), découpes DI/DV (12–15 j), cannelures, papiers, certifications |
| Configurateur | Produit (code usine + délai), dimensions, cannelure F/E/B/C/EB/BC, papiers KL/KS/TL/TB + FL, logo, ouverture, mise à plat, BCT, gerbage, caisses à plat par palette, capture PNG, devis |

## Deux espaces dédiés (pages légères, sans 3D)

| Page | Pour qui | Contenu |
|---|---|---|
| `investisseurs.html` | Bailleurs de fonds, direction | Thèse d'investissement (export record, PPWR), **baromètre mondial du papier** (niveaux €/t, hausses 2026, chronologie), **benchmark de 10 papetiers** (Tunisie, Méditerranée, mondial), simulateur de sensibilité au prix du papier, simulateur d'investissement (délai de retour, VAN, TRI), feuille de route, certifications, contact |
| `grands-comptes.html` | Grands clients | **Optimiseur de carton** (72 compositions comparées : la moins chère qui tient la charge, économie et papier épargné par an, bouton « Voir en 3D »), **clause d'indexation papier** simulée, bassin d'approvisionnement, conformité PPWR, programme grands comptes, demande d'accord-cadre |

Les chiffres de marché viennent d'une veille d'octobre 2026 (`src/data/market.js`) : chaque valeur cite sa source
et sa date. Les cotations officielles (Fastmarkets, EUWID) étant payantes, ce sont des valeurs indicatives tirées des
communiqués publics et de la presse spécialisée. Les simulateurs partent d'hypothèses de démonstration, à remplacer par
les chiffres de New Box.

## Démarrer

Prérequis : **Node.js 20.19+** (ou 22+) et Git.

```bash
npm install
npm run dev       # http://localhost:5173  (npm start : idem + ouvre le navigateur)
npm run build     # site statique dans dist/
npm run preview   # prévisualiser le build
```

Le dossier `dist/` est 100 % statique (chemins relatifs) : il peut être copié tel quel sur l'hébergement
actuel, par exemple dans `newbox.com.tn/experience/`.

## Installer la version locale sur le Bureau

Les scripts créent le dossier **`NewBox-3D`** sur le Bureau, récupèrent cette branche,
installent les dépendances et ouvrent le site dans le navigateur. Relancez-les pour mettre à jour.

**Windows** — ouvrir PowerShell et coller cette seule ligne :

```powershell
irm https://raw.githubusercontent.com/hamed122333/New-Box/claude/charming-maxwell-jjq9yf/scripts/installer-bureau.ps1 | iex
```

Ensuite, pour relancer le site : double-clic sur **`demarrer.bat`** dans le dossier `NewBox-3D` du Bureau.

**Dans un autre dossier** (ex. `C:\Users\hamed\work`) : définir `NEWBOX_DIR` avant la même commande :

```powershell
$env:NEWBOX_DIR = 'C:\Users\hamed\work\NewBox-3D'; irm https://raw.githubusercontent.com/hamed122333/New-Box/claude/charming-maxwell-jjq9yf/scripts/installer-bureau.ps1 | iex
```

Le script prépare aussi l'environnement : si Git ou Node.js manquent (ou si Node est trop ancien),
il propose de les installer avec `winget`. Tester sur téléphone (même Wi-Fi) : `npm.cmd run dev:lan`.

Équivalent manuel (sous PowerShell, utiliser `npm.cmd` : `npm` seul est bloqué quand l'exécution
des scripts est désactivée, ce qui est le réglage par défaut de Windows) :

```powershell
cd $([Environment]::GetFolderPath('Desktop'))
git clone -b claude/charming-maxwell-jjq9yf https://github.com/hamed122333/New-Box.git NewBox-3D
cd NewBox-3D
npm.cmd install
npm.cmd start
```

**macOS / Linux**

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/hamed122333/New-Box/claude/charming-maxwell-jjq9yf/scripts/installer-bureau.sh)
```

## Identité visuelle

- Logo officiel : `src/assets/brand/logo-new-box.png` (repris du dépôt `Site-New-Box-Tunsie`) — en-tête,
  écran de chargement, pied de page, favicon et **impression flexo sur la caisse 3D** (bleu + orange,
  réserves blanches laissant voir le kraft).
- Couleurs de la charte : bleu `#14259B`, orange `#F49C21`, bleu nuit `#0D1642` (variables en tête de
  `src/styles/main.css`, constante `BRAND` dans `src/three/textures.js`).
- Certifications SGS (FSSC 22000, ISO 9001, ISO 45001) et FSC C191615 : `src/assets/brand/certifications.png`,
  imprimées sous le logo sur les caisses et présentées dans la section « Produits & délais ».

## Structure

```
src/main.js            amorçage (scène, scroll, modes récit / configurateur)
src/experience.js      applique l'état du scroll à la 3D (caméras, test ECT, palette)
src/scroll/story.js    timeline maître : tout le storyboard est ici
src/three/             caisse FEFCO 0201, coupe de carton, palette, textures procédurales
src/ui/                chapitres, étiquettes 3D, configurateur
src/data/              produits & délais, cannelures, qualités papier  ← valeurs à valider par New Box
src/lib/calc.js        ECT, BCT (McKee), flan, gerbage
investisseurs.html     espace investisseurs & direction  ┐ pages légères : src/portal/*.js,
grands-comptes.html    espace grands comptes             ┘ src/styles/portal.css, graphiques SVG maison
src/data/market.js     veille marché : prix du papier, papetiers, contexte tunisien (sources datées)
```

## Réglages rapides

- **Changer le rythme du récit** : `data-units` de chaque `<section class="chapter">` dans `index.html`
  (1 unité = 1 écran de scroll) et les positions des animations dans `src/scroll/story.js`.
- **Produits & délais** : `src/data/products.js` (codes usine, libellés, délais, découpe).
- **Papiers & performances** : `src/data/papers.js` (KL, KS, TL, TB, FL : grammages, SCT, éclatement, Cobb).
- **Cannelures** : `src/data/flutes.js` (pas, hauteur, coefficient d'ondulation, épaisseur).
- **Couleurs du site** : variables CSS en tête de `src/styles/main.css`.
- **Console** : `window.__newbox` expose l'état, la scène et le configurateur pour le débogage.
- **Veille marché** : `src/data/market.js` (prix, mouvements, chronologie, papetiers, cours EUR/TND) ; mettre à jour
  `UPDATED` et les sources à chaque révision.
- **Lien direct vers le configurateur** : `index.html?produit=CI&L=400&W=300&H=300&cannelure=B&ext=KL&int=TL#configurateur`.

> Les performances affichées sont des **estimations indicatives** (formule de McKee, indices papier moyens) et
> doivent être remplacées par les mesures du laboratoire avant une mise en ligne.
