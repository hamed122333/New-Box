# Mise en production sur newbox.com.tn

Le site est 100 % statique : `npm.cmd run build` produit `dist/`, à déposer à la racine de l'hébergement.

## Étapes

1. `npm.cmd ci` puis `npm.cmd run build` (ou télécharger l'artefact `site-newbox` du workflow GitHub « Build »).
2. Sauvegarder l'ancien site (FTP / gestionnaire de fichiers de l'hébergeur).
3. Copier **le contenu** de `dist/` à la racine web (`public_html/` sous cPanel), fichier `.htaccess` compris
   (fichier caché : activer l'affichage des fichiers cachés dans le client FTP).
4. Vérifier : https://newbox.com.tn/ , une URL inexistante (page 404), `robots.txt`, `sitemap.xml`.
5. Google Search Console : ajouter la propriété `newbox.com.tn` et soumettre `sitemap.xml`.

`public/.htaccess` (Apache) force HTTPS sans `www`, active la compression, le cache long des fichiers
empreintés par Vite et des en-têtes de sécurité. Sur Nginx, Netlify ou Cloudflare Pages, reproduire ces règles
dans leur configuration propre.

## À compléter par New Box avant la mise en ligne

- `public/mentions-legales.html` : forme juridique, matricule fiscal, directeur de publication, hébergeur
  (zones surlignées « à compléter »).
- Téléphone et réseaux sociaux officiels (pied de page de `index.html`, données structurées JSON-LD dans `<head>`).
- Valider les délais, grammages et indices papier (`src/data/`) — marqués indicatifs.
- Certificat SSL actif sur le domaine (la redirection HTTPS de `.htaccess` en dépend).

## Contrôles qualité

- Lighthouse (onglet Chrome DevTools) sur mobile : performance, accessibilité, SEO.
- Test du partage : https://www.opengraph.xyz/ (image `og-newbox.jpg`, titre, description).
- Sans WebGL / avec « réduire les animations » : le contenu et le devis restent accessibles.
