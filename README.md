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
- **Web3Forms** — formulaire de soumission de PDF par e-mail, sans backend.

## Concept (POC)

Une bibliothèque de sujets : chaque fiche = **métadonnées** (année, série,
matière, session) + un **PDF du sujet** et/ou un **PDF du corrigé**. Pas de
corrigé rédigé en ligne pour l'instant — seuls les documents PDF font foi.
La soumission se fait via un formulaire (PDF → e-mail de l'équipe), avec
**validation manuelle** avant publication.

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
  content/
    config.ts          # schémas (Zod) des collections
    series/*.md         # métadonnées des séries (A1–A4, C, D)
    sujets/*.md         # une fiche par sujet (métadonnées + PDF)
  components/           # SujetCarte, Filtres, BadgeStatut, Fil…
  layouts/Layout.astro  # gabarit mobile-first + PWA
  pages/                # accueil, /series, /sujets, /recherche, /contribuer…
  lib/data.ts           # helpers (tri, regroupements, statut, slugify)
scripts/seed.mjs               # génère des fiches d'exemple
scripts/make-placeholder-pdfs.mjs  # génère des PDF d'exemple
public/pdfs/            # PDF des sujets et corrigés
```

## Contenus

La base est amorcée avec ~140 fiches d'exemple (séries générales A1–A4, C, D, sur
5 années). Trois fiches de démonstration pointent vers des PDF d'exemple pour
illustrer les états (sujet seul, corrigé seul, sujet + corrigé). Pour ajouter du
contenu réel, voir [CONTRIBUTING.md](CONTRIBUTING.md).

Régénérer les fiches/PDF d'exemple manquants (n'écrase jamais l'existant) :

```bash
node scripts/seed.mjs
node scripts/make-placeholder-pdfs.mjs
```

## Déploiement

Sortie 100 % statique (`dist/`) : déployable gratuitement sur Cloudflare Pages,
Netlify ou GitHub Pages. Commande de build : `npm run build`, dossier publié :
`dist`. Penser à ajuster `site` dans `astro.config.mjs`.
