# Bac 242

Bibliothèque **collaborative, libre et gratuite** des annales (sujets et
corrigés) du baccalauréat congolais. Site statique, pensé pour le mobile et la
consultation hors-ligne.

> Projet à ses débuts. Séries A, C, D (enseignement général). Le site n'affiche
> que les ressources réellement disponibles.

## Stack technique

- **[Astro](https://astro.build)** : site statique, HTML rapide, JS minimal.
- **Content Collections** : contenu en fichiers Markdown versionnables.
- **Tailwind CSS v4** : interface mobile-first (bleu nuit + turquoise).
- **PWA** (`@vite-pwa/astro`) : installation et consultation hors-ligne.
- **SEO / partage** : Open Graph + Twitter Card, données structurées schema.org,
  image de partage générée (`public/og.png`).
- **Cloudflare** (Pages Functions + R2 + D1) : API de soumission et file de
  modération, **Turnstile** (anti-spam), **Web Analytics** (sans cookie).
  L'espace admin est protégé par **Cloudflare Access** avec vérification
  cryptographique du jeton (JWT). Voir [DEPLOY.md](DEPLOY.md).
- **Pagefind** : moteur de recherche statique (présent mais désactivé pour
  l'instant côté interface).

## Concept

Une fiche par sujet : **métadonnées** (année, série, matière, session) + un
**PDF du sujet** et/ou un **PDF du corrigé**.

Les visiteurs **soumettent** des PDF via `/contribuer` ; ils sont mis en file
d'attente (R2 + D1). Un mainteneur les **valide** depuis `/admin` (protégé par
Cloudflare Access) ; la validation **commite** le document dans le dépôt, ce qui
reconstruit le site. Le contenu reste donc versionné dans git.

## Démarrage

```bash
npm install
npm run dev        # serveur de développement (http://localhost:4321)
npm run build      # génère le site statique dans dist/
npm run preview    # prévisualise le site généré
```

## Structure

```
src/
  content/config.ts      # schémas (Zod) des collections
  content/series/*.md     # séries (A, C, D)
  content/sujets/*.md     # fiches : métadonnées + chemins des PDF
  components/             # SujetCarte, Filtres, Icone, BadgeStatut, Fil…
  layouts/Layout.astro    # gabarit + SEO/Open Graph + PWA
  pages/                  # accueil, /series, /annees, /matieres, /sujets, /contribuer, /a-propos, 404
  pages/admin/            # modération (protégé par Cloudflare Access)
  lib/data.ts             # helpers (tri, regroupements, statut, couleurs/icônes)
functions/                # Pages Functions : /api/submit, /api/admin/* (+ _lib)
scripts/make-og-image.mjs # génère l'image de partage Open Graph
public/                   # favicon, icône PWA, og.png, PDF des sujets
wrangler.toml, schema.sql # config Cloudflare (D1/R2) + schéma de modération
```

## Contribuer

Le plus simple : le formulaire `/contribuer` (envoi d'un PDF, sans connaissance
technique). Détails et ajout manuel dans [CONTRIBUTING.md](CONTRIBUTING.md).

## Configuration

Variables publiques (au build) : copier `.env.example` en `.env`.

- `PUBLIC_TURNSTILE_SITEKEY` : widget anti-spam du formulaire (optionnel)
- `PUBLIC_CF_BEACON_TOKEN` : analytics Cloudflare sans cookie (optionnel)

Sans ces clés, le site fonctionne (sans captcha ni statistiques). Les secrets
serveur et la mise en place complète sont décrits dans [DEPLOY.md](DEPLOY.md).

## Licence

Le **code** est publié sous licence **MIT** (voir [LICENSE](LICENSE)).

Le **contenu pédagogique** (sujets et corrigés) **n'est pas** couvert par cette
licence : il reste la propriété de ses auteurs et est publié avec leur
autorisation. Merci de ne pas le réutiliser sans l'accord des ayants droit, et
de conserver l'attribution affichée sur chaque document.
