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
4. Configurateur : changer dimensions / cannelure / papier → la caisse et le BCT se mettent à jour ;
   « Capture PNG » télécharge une image ; « Demander un devis » ouvre un e-mail pré-rempli.
5. La console expose `window.__newbox` (état du scroll, scène, configurateur) pour le débogage.
   `?capture` dans l'URL passe en horloge pilotée (`__newbox.step(dt)`) pour l'enregistrement vidéo.

## Repères

- Storyboard (timeline du scroll) : `src/scroll/story.js` ; hauteurs des chapitres : `data-units` dans `index.html`
- Application de l'état à la 3D (caméras, test ECT, palette, configurateur) : `src/experience.js`
- Caisse FEFCO 0201 paramétrique : `src/three/box.js` ; coupe de carton : `src/three/board.js`
- Textures procédurales, impression du logo : `src/three/textures.js`
- Valeurs papier / cannelures (indicatives, à valider par New Box) : `src/data/` ; calculs ECT / McKee : `src/lib/calc.js`
- Logo officiel : `src/assets/brand/logo-new-box.png` ; charte : bleu `#14259B`, orange `#F49C21`, bleu nuit `#0D1642`
- Plan et feuille de route : `docs/PLAN.md`
