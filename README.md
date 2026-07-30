# Bac 242

Bibliothèque **collaborative, libre et gratuite** des annales (sujets et
corrigés) du baccalauréat congolais. Site statique, pensé pour le mobile et la
consultation hors-ligne.

> Projet à ses débuts. Séries A, C, D (enseignement général). Le site n'affiche
> que les ressources réellement disponibles.

## Stack technique

- **[Astro](https://astro.build)** : site statique, HTML rapide, JS minimal.
- **Content Collections** : contenu en fichiers Markdown versionnables, schémas
  Zod avec une **taxonomie partagée** prête pour d'autres types de ressources
  (cours, fiches…) — voir `src/lib/ressources.ts`.
- **Tailwind CSS v4** : interface mobile-first (bleu nuit + turquoise), design
  tokens sémantiques (`src/styles/global.css`) et **mode sombre** (bascule
  clair / sombre / système dans l'en-tête, clair par défaut, sans flash au
  chargement).
- **PWA** (`@vite-pwa/astro`) : installation et consultation hors-ligne.
- **Sécurité** : en-têtes HTTP durcis via `public/_headers` — CSP stricte (les
  scripts inline sont interdits, à l'exception du script anti-FOUC autorisé
  par hash), X-Frame-Options, Referrer-Policy, Permissions-Policy.
- **SEO / partage** : Open Graph + Twitter Card, données structurées schema.org,
  image de partage générée (`public/og.png`).
- **Cloudflare Pages** : hébergement du site statique et **Web Analytics**
  (sans cookie). Aucune fonction serveur, aucune base de données, aucun secret
  déployé. Voir [DEPLOY.md](DEPLOY.md).
- **Pagefind** : recherche plein texte statique sur `/recherche` (facettes
  série / matière / année), indexée à chaque build, utilisable hors-ligne.
- **Vitest** : tests unitaires des fonctions pures (helpers de données, nommage
  des fichiers) et **garde-fou de contrastes WCAG AA** sur les couleurs des
  deux thèmes (`src/styles/tokens.test.ts`).

## Concept

Une fiche par sujet : **métadonnées** (année, série, matière, session) + un
**PDF du sujet** et/ou un **PDF du corrigé**.

Les visiteurs **envoient leurs documents par e-mail** (page `/contribuer`). Un
mainteneur vérifie le document, puis le **commite** dans le dépôt : le PDF dans
`public/pdfs/` et la fiche Markdown dans `src/content/sujets/`. Cloudflare Pages
reconstruit le site. Tout le contenu reste donc versionné dans git.

Le site n'expose **aucun formulaire** et n'enregistre **aucune donnée** : les
boutons « Contactez-nous » (menu « Le projet ») et « Écrire au projet »
(`/contribuer`) se contentent d'ouvrir la messagerie de l'utilisateur via un
lien `mailto`.

### Attribution

- Un contributeur peut demander un **crédit** public (nom ou pseudonyme), ou
  rester anonyme ; le crédit est affiché sur la fiche et inscrit dans
  l'historique git. La page [`/contributeurs`](/contributeurs) les liste.
- Un corrigé porte une **source / auteur** publiée en attribution sur la fiche.

## Démarrage

```bash
npm install
npm run dev        # serveur de développement (http://localhost:4321)
npm run build      # génère le site statique dans dist/ + index de recherche Pagefind
npm run preview    # prévisualise le site généré
npm test           # lance les tests unitaires (Vitest)
npm run test:watch # tests en mode interactif
```

> La page `/recherche` n'est fonctionnelle qu'après un build (l'index Pagefind
> n'existe pas sous `astro dev`) : utilisez `npm run build && npm run preview`.

## Structure

```
src/
  content/config.ts      # schémas (Zod) des collections + taxonomie partagée
  content/series/*.md     # séries (A, C, D)
  content/sujets/*.md     # fiches : métadonnées + chemins des PDF
  components/             # SujetCarte, Filtres, Icone, BadgeStatut, Fil, BasculeTheme…
  layouts/Layout.astro    # gabarit + SEO/Open Graph + PWA + anti-FOUC du thème
  pages/                  # accueil, /series, /annees, /matieres, /sujets, /recherche, /contribuer, /contributeurs, /a-propos, 404
  lib/data.ts             # helpers annales (tri, regroupements, statut, pastilles/icônes)
  lib/ressources.ts       # registre des catégories de ressources (nav/accueil en dérivent)
  styles/global.css       # design tokens (clair/sombre) + utilitaires
  **/*.test.ts            # tests unitaires (Vitest), co-localisés avec le code
scripts/make-og-image.mjs # génère l'image de partage Open Graph
scripts/export-sauvegarde.mjs # prépare une sauvegarde (PDF + sources + inventaire)
test/stubs/               # stubs pour les tests (ex. astro:content)
shared/matieres.json      # taxonomie des matières par série
public/                   # favicon, icône PWA, og.png, PDF des sujets, _headers (CSP)
wrangler.toml             # config Cloudflare Pages (site statique)
vitest.config.ts          # configuration des tests
```

## Tests

Tests unitaires avec **Vitest**, ciblant les fonctions pures (helpers de
[src/lib/data.ts](src/lib/data.ts)) : pas de dépendance à Astro au runtime. Le
module virtuel `astro:content` est remplacé par un stub (voir
[vitest.config.ts](vitest.config.ts)).

[src/styles/tokens.test.ts](src/styles/tokens.test.ts) vérifie en outre que
chaque paire fond/texte des deux thèmes (clair et sombre) atteint un contraste
**WCAG AA ≥ 4.5:1** : ajouter une paire `--x-bg` / `--x-fg` dans
`global.css` suffit pour qu'elle soit couverte.

```bash
npm test           # une passe
npm run test:watch # mode interactif
```

## Contribuer

Le plus simple : envoyer le document **par e-mail** (voir `/contribuer`), sans
aucune connaissance technique. Détails et ajout manuel dans
[CONTRIBUTING.md](CONTRIBUTING.md).

## Configuration

Variables publiques (au build) : copier `.env.example` en `.env`.

- `PUBLIC_CF_BEACON_TOKEN` : analytics Cloudflare sans cookie (optionnel)
- `PUBLIC_GSC_VERIFICATION` : vérification Google Search Console (optionnel)

Sans ces clés, le site fonctionne (simplement sans statistiques). La mise en
place complète est décrite dans [DEPLOY.md](DEPLOY.md).

## Licence

Le **code** est publié sous licence **MIT** (voir [LICENSE](LICENSE)).

Le **contenu pédagogique** (sujets et corrigés) **n'est pas** couvert par cette
licence : il reste la propriété de ses auteurs et est publié avec leur
autorisation. Merci de ne pas le réutiliser sans l'accord des ayants droit, et
de conserver l'attribution affichée sur chaque document.
