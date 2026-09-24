# New Box — Plan de la solution 3D innovante

> **Objectif :** transformer le site de New Box ([newbox.com.tn](https://newbox.com.tn/)) en une vitrine
> immersive qui *montre* la qualité du carton ondulé au lieu de la décrire, puis la convertir en demandes de devis
> qualifiées grâce à un configurateur 3D dans l'esprit de Pacdora.

---

## 1. Constat & ambition

| Aujourd'hui | Demain |
|---|---|
| Site vitrine classique (produits, actualités, contact) | Récit 3D piloté par le scroll : la caisse s'ouvre, la caméra plonge dans la tranche, la matière est expliquée |
| Le client doit imaginer sa caisse | Le client **dessine** sa caisse (dimensions, cannelure, papier, logo) et voit le rendu en direct |
| Devis par e-mail « à froid » | Devis pré-rempli avec toutes les spécifications techniques + estimation ECT / BCT |
| Discours qualité abstrait | Grammage, cannelures, ECT, BCT, éclatement, Cobb **visualisés et chiffrés** |

Positionnement visé : *le fabricant tunisien le plus transparent sur sa matière*. Les grands groupes
l'ont compris depuis longtemps ; New Box peut le faire avec un outil plus direct et plus interactif qu'eux.

---

## 2. Benchmark : ce qu'on reprend

> Note : les sites de référence n'étaient pas accessibles depuis l'environnement de développement ; les points ci-dessous
> résument les codes connus de ces groupes et sont à confronter à une visite des sites.

| Référence | Ce qu'on en retient pour New Box |
|---|---|
| **DS Smith** (groupe International Paper depuis 2025) | Discours « économie circulaire » omniprésent, emballage pensé comme un service, grandes accroches courtes |
| **Smurfit Westrock** (fusion Smurfit Kappa + WestRock, 2024) | Navigation par **secteurs / marchés**, mise en avant de l'innovation et du design d'emballage, chiffres-clés |
| **Mondi** | Esthétique sobre et premium, beaucoup d'espace blanc, durabilité intégrée à chaque produit |
| **Pacdora** (mockup 3D) | Caisse 3D manipulable, **curseur d'ouverture**, vue à plat (plan de découpe), import de visuel, export PNG |

**Synthèse appliquée :** hiérarchie claire (accroche → preuve → action), segmentation par filière, chiffres-clés,
durabilité en fil rouge, et **l'interactivité 3D de Pacdora mise au service de la vente**.

---

## 3. Concept : « Du carton à la caisse » — storyboard du scroll

Un seul canvas WebGL en arrière-plan, deux « mondes » (caisse à l'échelle / macro de la matière).
1 unité de timeline = 1 écran de défilement.

| # | Chapitre | Scène 3D | Message | Durée |
|---|---|---|---|---|
| 0 | **Accueil** | Caisse fermée, scotchée, légère oscillation | « L'emballage qui protège ce qui compte » | 1 |
| 1 | **Sur mesure** | Le ruban se sépare, les grands puis les petits rabats s'ouvrent | Produits : caisses, plaques, découpes, croisillons, calages | 1,2 |
| 2 | **Plongée** | La caméra plonge sur la tranche d'un rabat (cannelures visibles), fondu vers le monde macro | « Regardons de plus près » | 1 |
| 3 | **Anatomie** | Coupe de plaque qui s'éclate en 3 papiers + colle, étiquettes 3D (papier & grammage) | Couverture extérieure / cannelure / couverture intérieure | 1,5 |
| 4 | **Cannelures** | Morphing continu C → E → B → C → BC (double cannelure) | Fiche dynamique : épaisseur, pas, hauteur, coefficient, grammage, ECT | 2,4 |
| 5 | **Qualité** | L'échantillon se dresse, la presse descend (test ECT) | Compteurs ECT, BCT, éclatement, Cobb | 1,5 |
| 6 | **Fabrication** | Retour au monde caisse : le **flan imprimé à plat** se plie en caisse | Onduleuse → impression flexo 4 couleurs → découpe Bobst → pliage-collage | 1,8 |
| 7 | **Logistique** | Palette Europe, les caisses tombent couche par couche, la caisse « héros » se pose en dernier | Plan de palettisation, gerbage | 1,5 |
| 8 | **Engagement** | Plan large sur la palette | 100 % recyclable, chutes compactées en balles | 2 |
| — | Secteurs · Chiffres | (sections pleines) | Segmentation par filière | — |
| — | **Configurateur 3D** | Caisse manipulable | Conversion → devis | — |

---

## 4. Configurateur 3D (MVP livré dans ce prototype)

- Dimensions intérieures L × l × H (curseurs + saisie), limites 100–800 / 80–600 / 50–800 mm
- Cannelure **E, B, C, EB, BC** (épaisseur réelle de la tranche, texture de coupe adaptée)
- Qualité papier : Économique (testliner), Standard (kraftliner), Renforcé, Blanc (white top)
- Impression : **import du logo client** (PNG, JPG, SVG, WebP) + couleur d'encre, rendu flexo « multiplié » sur le kraft
- Curseurs **ouverture des rabats** et **mise à plat** (flan / plan de découpe), rotation auto / à la souris
- Cachet qualité imprimé qui se met à jour (cannelure, ECT, grammage, dimensions)
- Estimations : ECT, **BCT (McKee)**, éclatement, grammage, poids de la caisse, charge admissible et hauteur de gerbage selon le poids du contenu et les conditions de stockage
- **Capture PNG transparente** (visuel commercial) et **demande de devis pré-remplie** (e-mail)

### Formules utilisées (indicatives)

- ECT ≈ 0,75 × (Σ SCT couvertures + Σ α·SCT cannelures), avec α = coefficient d'ondulation
- BCT (N) = 5,874 × ECT (N/m) × √(épaisseur (m) × périmètre (m)) — formule simplifiée de McKee
- Charge admissible = BCT ÷ coefficient de sécurité (2,2 / 3 / 4,5 selon durée et humidité)
- Poids caisse = surface du flan FEFCO 0201 × grammage total

> ⚠️ Toutes les valeurs papier (grammages, indices SCT, éclatement, Cobb) sont des **ordres de grandeur du marché**.
> Elles sont centralisées dans `src/data/grades.js` et `src/data/flutes.js` pour être remplacées par les fiches
> techniques et mesures de laboratoire New Box.

---

## 5. Architecture technique

| Couche | Choix | Pourquoi |
|---|---|---|
| Build | **Vite 8** | Démarrage instantané, build statique optimisé, aucun serveur requis en production |
| 3D | **Three.js r186** (WebGL) | Standard du web 3D, léger, contrôle total du rendu (PBR, ombres, tone mapping) |
| Animation scroll | **GSAP 3 + ScrollTrigger** (gratuit, y compris usage commercial) | Timeline « scrubbée » réversible, synchronisation précise scroll ↔ 3D |
| Défilement | **Lenis** | Scroll fluide, compatible ScrollTrigger |
| Polices | Space Grotesk + Inter (auto-hébergées via Fontsource) | Pas d'appel externe, fonctionne hors ligne |
| Textures | **100 % procédurales** (Canvas 2D) | Kraft, fibres, ondulations fantômes, impression flexo, tranche cannelée : zéro image à charger, net à toute taille, s'adapte aux dimensions et au logo |

### Principes

1. **Un seul état piloté par le scroll** (`src/scroll/story.js`) : toutes les valeurs (ouverture, éclaté,
   cannelure, caméra…) sont des nombres continus tweenés par une timeline GSAP. La scène les lit à chaque image
   → le récit est entièrement réversible et se règle en modifiant une ligne.
2. **Modèle paramétrique** de la caisse FEFCO 0201 (`src/three/box.js`) : chaîne de charnières (panneaux, rabats,
   patte de collage). Le même modèle sert au récit, au pliage/dépliage et au configurateur.
3. **Coupe de carton volumique** (`src/three/board.js`) : l'onde est une géométrie recalculée en place,
   ce qui permet le morphing entre cannelures et l'éclaté.
4. **Deux scènes, un renderer** : monde caisse (1 unité = 100 mm) et monde macro (1 unité = 1 mm), avec un
   near/far dynamique pour garder la précision du Z-buffer du plan large au gros plan.

### Arborescence

```
index.html                 contenu (FR), chapitres du récit, configurateur, contact
src/main.js                amorçage : scène, scroll, modes récit / configurateur
src/experience.js          applique l'état à la 3D (caméras, test ECT, palettisation)
src/scroll/story.js        timeline maître (storyboard)
src/three/stage.js         renderer, caméra, lumières, deux scènes
src/three/box.js           caisse FEFCO 0201 paramétrique
src/three/board.js         échantillon de carton en coupe (morphing / éclaté)
src/three/stack.js         palette Europe + plan de palettisation instancié
src/three/textures.js      textures procédurales (kraft, impression, tranche, bois)
src/ui/*.js                chapitres, étiquettes 3D, configurateur
src/data/*.js              cannelures, qualités papier  ← à valider par New Box
src/lib/calc.js            ECT, McKee, flan, gerbage
```

### Budget performance (mesuré sur le prototype)

- JS : ~205 Ko gzip au total (Three.js 139 Ko, GSAP + Lenis 50 Ko, code 17 Ko)
- Aucune image, aucun modèle 3D à télécharger
- Pixel ratio plafonné (2 sur ordinateur, 1,5 sur mobile), ombres 2048 px / 1024 px mobile
- Rendu suspendu quand une section opaque recouvre le canvas

### Accessibilité & robustesse

- Contenu texte réel dans le HTML (SEO, lecteurs d'écran) ; la 3D est décorative (`aria-hidden`)
- `prefers-reduced-motion` : pas de scroll lissé, pas d'oscillation
- Sans WebGL ou sans JavaScript : le récit s'affiche en texte classique, les estimations restent disponibles
- Mise en page mobile dédiée (cartes en bas d'écran, panneau du configurateur défilant)

---

## 6. Feuille de route

### Phase 0 — Prototype ✅ *(cette branche)*
Récit 3D complet, configurateur MVP, calculs, responsive, build statique.

### Phase 1 — Contenu & marque (≈ 2 semaines)
- ✅ Logo officiel (PNG) et couleurs de la charte intégrés (bleu `#14259B`, orange `#F49C21`) ;
  reste à obtenir une version **vectorielle (SVG)** du logo pour l'impression haute définition
- Fiches techniques réelles : papiers utilisés, grammages, cannelures produites, résultats labo (ECT, BCT, Mullen, Cobb)
- Photos / vidéos de l'usine (onduleuse, Bobst, impression) pour les sections Fabrication et Secteurs
- Relecture des textes, version **anglaise** puis **arabe** (RTL)

### Phase 2 — Configurateur avancé (≈ 3–4 semaines)
- Catalogue FEFCO : 0201 (caisse américaine), **0427 (boîte postale type Pacdora)**, 0203, plateaux, croisillons
- Import de visuels **par face**, positionnement / échelle du logo, jusqu'à 4 couleurs
- **Export du plan de découpe** (SVG / PDF coté, traits de coupe et de rainage)
- Enregistrement de la configuration (lien partageable) et formulaire de devis relié au CRM / e-mail
- Calculateur de palettisation complet (nombre de caisses par couche, hauteur, poids palette)

### Phase 3 — Intégration & mesure (≈ 2 semaines)
- Option A : page « expérience » dans le site actuel (`/experience/`) — le build est un dossier statique
- Option B : refonte complète du site sur cette base (multi-pages : produits, secteurs, actualités, contact)
- Analytics (entonnoir scroll → configurateur → devis), SEO technique, Open Graph
- Tests appareils réels (Android d'entrée de gamme, iPhone, tablettes)

### Phase 4 — Au-delà
- **Réalité augmentée** : « voir la caisse sur mon bureau » (export GLB / USDZ, `<model-viewer>` ou WebXR)
- Matériaux plus réalistes (scan photogrammétrique d'un vrai carton New Box, textures PBR)
- Vidéo 360° / visite virtuelle de l'usine
- Espace client : historique des références, re-commande

---

## 7. Ce dont nous avons besoin de New Box

1. Logo en SVG (le PNG officiel est déjà intégré) et charte graphique complète (typographies)
2. Liste des cannelures et papiers réellement produits + résultats de laboratoire
3. Photos HD de l'usine et des produits, références clients autorisées
4. Téléphone, horaires, coordonnées commerciales, lien Google Maps
5. Validation des textes (en particulier engagements environnementaux et chiffres)

---

## 8. Version locale (dossier sur le Bureau)

Voir le [README](../README.md#installer-la-version-locale-sur-le-bureau) : un script crée le dossier
`NewBox-3D` sur le Bureau, installe les dépendances et lance le site en local.
