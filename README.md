# Annales Bac Congo

Bibliothèque numérique **gratuite** des sujets et corrigés du baccalauréat
congolais (Congo-Brazzaville). Pensée pour le smartphone, la connexion limitée
et la consultation hors-ligne.

> Un élève ne devrait pas être désavantagé dans sa préparation au baccalauréat
> simplement parce qu'il n'a pas accès aux bonnes ressources.

## Stack technique

- **[Astro](https://astro.build)** — site statique, HTML rapide, JS minimal.
- **Content Collections** — base de données en fichiers Markdown versionnables.
- **Tailwind CSS v4** — interface épurée, mobile-first.
- **Pagefind** — moteur de recherche statique (index généré au build).
- **PWA** (`@vite-pwa/astro`) — installation et consultation hors-ligne.
- **SEO / partage** — Open Graph + Twitter Card (aperçus WhatsApp), données
  structurées schema.org, image de partage générée (`public/og.png`).
- **Cloudflare** (Pages Functions + R2 + D1) — API de soumission et file de
  modération ; **Turnstile** (anti-spam) et **Web Analytics** (sans cookie).
  Voir [DEPLOY.md](DEPLOY.md).

## Concept (POC)

Une bibliothèque de sujets : chaque fiche = **métadonnées** (année, série,
matière, session) + un **PDF du sujet** et/ou un **PDF du corrigé**. Pas de
corrigé rédigé en ligne pour l'instant — seuls les documents PDF font foi.

Les visiteurs **soumettent** des PDF via `/contribuer` ; ils sont mis en file
d'attente (R2 + D1). Un mainteneur les **valide** depuis `/admin` (protégé par
Cloudflare Access) ; la validation **commite** le document dans le dépôt, ce qui
reconstruit le site. Contenu donc toujours versionné dans git (pérennité).

## Démarrage

```bash
npm install
npm run dev          # serveur de développement (http://localhost:4321)
npm run build        # génère le site statique + l'index de recherche
npm run preview      # prévisualise le site généré (recherche active)
```

> La recherche (Pagefind) n'est active qu'après `npm run build` / `npm run preview`.

## Structure

```
src/
  content/config.ts     # schémas (Zod) des collections
  content/series/*.md    # séries (A1–A4, C, D)
  content/sujets/*.md    # fiches : métadonnées + chemins des PDF
  components/            # SujetCarte, Filtres, BadgeStatut, Fil…
  layouts/Layout.astro   # gabarit + SEO/Open Graph + PWA
  pages/                 # accueil, /series, /annees, /matieres, /sujets, /recherche, /contribuer, 404
  pages/admin/           # modération (protégé par Cloudflare Access)
  lib/data.ts            # helpers (tri, regroupements, statut, slugify)
functions/               # Pages Functions : /api/submit, /api/admin/* (+ _lib)
scripts/make-og-image.mjs # génère l'image de partage Open Graph
public/pdfs/             # PDF des sujets et corrigés
public/og.png            # image de partage (Open Graph)
wrangler.toml, schema.sql # config Cloudflare (D1/R2) + schéma de modération
```

## Contenus

Séries couvertes : **A, C, D** (enseignement général). Une fiche par sujet dans
`src/content/sujets/` (métadonnées + PDF). Le site n'affiche que les
**ressources réellement disponibles** : une année ou une matière n'apparaît que
si au moins un sujet existe. Pour ajouter du contenu, voir
[CONTRIBUTING.md](CONTRIBUTING.md).

## Configuration

Variables publiques (injectées au build) — copier `.env.example` en `.env` :

- `PUBLIC_TURNSTILE_SITEKEY` — widget anti-spam du formulaire (optionnel)
- `PUBLIC_CF_BEACON_TOKEN` — analytics Cloudflare sans cookie (optionnel)

Sans ces clés, le site fonctionne (juste sans captcha ni statistiques). Les
secrets serveur (jeton GitHub, secret Turnstile) et la mise en place complète
sont décrits dans [DEPLOY.md](DEPLOY.md).

## Déploiement

Hébergé sur **Cloudflare Pages** : site statique (`dist/`) + Pages Functions
(soumission/modération) + R2 (PDF en attente) + D1 (file de modération). Build :
`npm run build`, sortie `dist`. Procédure pas à pas (ressources, secrets,
Cloudflare Access) : [DEPLOY.md](DEPLOY.md).

La bibliothèque est du HTML statique (déployable n'importe où) ; seule la chaîne
de soumission/modération dépend de Cloudflare. Adresse publique configurée dans
`astro.config.mjs` (`site`).
