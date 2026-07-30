# Déploiement — Cloudflare Pages

Le site est **entièrement statique** (Astro → `dist/`), servi par Cloudflare
Pages. Il n'y a ni API, ni base de données, ni stockage de fichiers : les
contributions arrivent **par e-mail** (voir [la page Contribuer](src/pages/contribuer.astro))
et sont publiées à la main dans le dépôt (voir [CONTRIBUTING.md](CONTRIBUTING.md)).

## Prérequis

```bash
npm i -g wrangler
wrangler login
```

## 1. Projet Pages

Connectez le dépôt `Bac-242/annabac` à Cloudflare Pages (Git) :

- **Build command** : `npm run build`
- **Build output** : `dist`

Chaque `git push` sur `main` déclenche un build et met le site en ligne.

## 2. Où vivent les PDF ?

**Dans le dépôt git**, et nulle part ailleurs. C'était déjà le cas avant :
R2 ne stockait que les fichiers *en attente de modération*, jamais les documents
publiés.

Le circuit est entièrement statique :

1. Le PDF est committé dans `public/pdfs/<annee>-serie-<serie>-<matiere>-{sujet|corrige}.pdf`.
2. Une fiche `src/content/sujets/*.md` le référence par son chemin public
   (`sujetPdf: "/pdfs/…"`, `corrigePdf: "/pdfs/…"`).
3. Au build, Astro recopie `public/` tel quel dans `dist/`.
4. Cloudflare Pages sert `dist/` depuis son CDN. `public/_headers` met les PDF
   en cache 7 jours.
5. La fiche du sujet expose un simple lien `<a href="/pdfs/…" download>`, et le
   service worker (PWA) garde les PDF consultés en cache pour la lecture
   hors-ligne (`CacheFirst`, 50 documents max).

Conséquence à surveiller : les PDF pèsent dans l'historique git (≈ 18 Mo pour
83 fichiers aujourd'hui, dépôt à ≈ 73 Mo). C'est confortable pour l'instant.
Si la bibliothèque grossit beaucoup, les pistes seraient Git LFS ou un vrai
bucket R2 public en frontal — pas nécessaire avant plusieurs centaines de
documents.

## 3. Variables d'environnement (toutes optionnelles)

Dans le dashboard Pages → **Variables d'environnement** (build & production) :

- `PUBLIC_CF_BEACON_TOKEN` : Web Analytics Cloudflare (sans cookie)
- `PUBLIC_GSC_VERIFICATION` : vérification Google Search Console

Sans elles, le site fonctionne normalement — simplement sans statistiques ni
balise de vérification. Il n'y a **aucun secret serveur** à configurer.

## 4. Référencement (Google Search Console / Bing)

Le site expose déjà : `robots.txt` (avec la directive `Sitemap:`), un sitemap
(`/sitemap-index.xml`, généré au build, sans `/offline`), des canoniques,
Open Graph, et des données structurées (`WebSite`, `Organization`,
`BreadcrumbList`, `LearningResource`, `CollectionPage`).

1. **Google Search Console** → ajouter une propriété **préfixe d'URL**
   `https://annabac.pages.dev`.
2. Vérification par **balise HTML** : copier la valeur `content` de la balise
   fournie et la mettre dans la variable de build **`PUBLIC_GSC_VERIFICATION`**
   (dashboard Pages → variables d'environnement), puis redéployer. La balise
   `<meta name="google-site-verification">` est alors injectée sur toutes les pages.
3. Dans Search Console, **soumettre le sitemap** : `sitemap-index.xml`. Puis
   *Inspection d'URL* → *Demander l'indexation* sur quelques pages clés.
4. **Bing Webmaster Tools** : créer un compte et **importer depuis Search
   Console** (récupère propriété + sitemap).

> Domaine custom plus tard : changer `SITE` dans `astro.config.mjs` (et le
> `Sitemap:` de `public/robots.txt`), redéployer, puis créer une **nouvelle
> propriété** Search Console pour le nouveau domaine.

## Aperçu local du site déployé

```bash
npm run build
wrangler pages dev dist   # sert dist/ comme le fera Pages (en-têtes compris)
```

C'est le seul moyen de tester les en-têtes de `public/_headers` : ils ne
s'appliquent pas sous `astro dev`.

## Sécurité, coûts et identité du projet

Le projet est public et open source. Quelques précautions, surtout tant que
tout repose sur des comptes personnels (GitHub, Cloudflare).

### En-têtes de sécurité (CSP)

Les en-têtes HTTP (CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy,
cache des PDF et des assets) sont servis par Cloudflare Pages depuis
[public/_headers](public/_headers). Points d'attention :

- La CSP interdit les scripts inline, **sauf** le script anti-FOUC du thème
  (dans `src/layouts/Layout.astro`), autorisé par son **hash SHA-256**. Si ce
  script change, recalculer le hash après build (commande en commentaire de
  `_headers`) et le reporter dans la directive `script-src`.
- `astro.config.mjs` force l'externalisation des scripts et styles bundlés
  (`assetsInlineLimit: 0`, `inlineStylesheets: 'never'`) : ne pas ajouter de
  `<script is:inline>` sans mettre à jour la CSP.
- Les `_headers` ne s'appliquent pas sous `astro dev` : tester avec
  `npm run build` puis `wrangler pages dev dist`.

### Surface d'attaque

Le site n'expose **aucun point d'entrée en écriture** : pas de formulaire, pas
d'API, pas d'espace d'administration, pas de secret déployé. L'adresse e-mail de
contact n'apparaît jamais en clair dans le HTML servi (assemblée côté client
depuis une chaîne base64, dans `src/layouts/Layout.astro`) afin de limiter les
aspirateurs d'adresses.

### Coûts et limites du free tier Cloudflare

L'architecture reste gratuite ; l'**egress est gratuit et illimité**, donc pas de
facture surprise liée au trafic.

| Service | Inclus (plan gratuit) | Au-delà |
| --- | --- | --- |
| Pages | 500 builds/mois, bande passante illimitée | Arrêt des builds |
| Web Analytics | illimité | — |

Activez tout de même les **notifications de facturation / budget** dans le
dashboard Cloudflare (alerte au moindre montant).

### Dissocier le projet de l'identité personnelle

Recommandé dès que le projet prend de l'ampleur :

- **Organisation GitHub** dédiée : le dépôt appartient à l'orga `Bac-242`.
- **Adresse e-mail dédiée** au projet (alias) à utiliser partout : contact du
  site, compte Cloudflare, compte/orga GitHub — afin de ne pas exposer l'e-mail
  personnel.
- **Page « À propos »** (`/a-propos`) : tenir à jour le contact, les mentions
  légales et la procédure de retrait ; retirer rapidement tout document sur
  demande d'un ayant droit.
- À terme, envisager une structure (association) pour porter le projet plutôt
  qu'à titre personnel.

## Annexe — Démantèlement de l'ancienne chaîne de modération

Le site a un temps proposé un formulaire de soumission adossé à **R2** (PDF en
attente), **D1** (file de modération), **Turnstile** (anti-robot) et
**Cloudflare Access** (espace `/admin`), avec publication automatique via un
`GITHUB_TOKEN`. Tout cela a été retiré du dépôt ; il reste à supprimer les
ressources correspondantes côté Cloudflare.

> ⚠️ Ces commandes sont **irréversibles**. Faites l'export D1 d'abord.

### 1. Sauvegarder la file de modération (recommandé)

```bash
wrangler d1 export annabac --remote --output=backup-annabac.sql
```

Le fichier obtenu n'est pas à committer (données de modération) : rangez-le
hors du dépôt.

### 2. Supprimer le bucket R2

Vérifiez d'abord qu'il est vide — chaque décision (publication ou rejet)
supprimait déjà le PDF en attente, il devrait donc l'être :

```bash
wrangler r2 bucket info annabac-soumissions
```

Si `object_count` vaut `0`, supprimez directement :

```bash
wrangler r2 bucket delete annabac-soumissions
```

> S'il restait des objets, `wrangler` ne sait pas vider un bucket en masse :
> `wrangler r2 object delete` ne prend qu'**un seul objet** à la fois, sous la
> forme `{bucket}/{clé}` et avec `--remote` (sans quoi il vise le stockage
> local). Passez alors par le dashboard **R2 → annabac-soumissions → Objects**,
> tout sélectionner puis supprimer.

### 3. Supprimer la base D1

```bash
wrangler d1 delete annabac
```

### 4. Supprimer les secrets devenus inutiles

Trois secrets seulement — **gardez `PUBLIC_CF_BEACON_TOKEN` et
`PUBLIC_GSC_VERIFICATION`**, qui servent toujours (analytics et vérification
Search Console, injectés au build).

```bash
wrangler pages secret delete GITHUB_TOKEN --project-name annabac
```

```bash
wrangler pages secret delete TURNSTILE_SECRET --project-name annabac
```

```bash
wrangler pages secret delete PUBLIC_TURNSTILE_SITEKEY --project-name annabac
```

Vérifiez le résultat :

```bash
wrangler pages secret list --project-name annabac
```

### 5. Dashboard Cloudflare

- **Turnstile** → supprimer le widget du site.
- **Zero Trust → Access → Applications** → supprimer l'application `/admin*`.
- **Pages → Settings → Variables d'environnement** → supprimer, s'ils y ont été
  ajoutés à la main, `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH`,
  `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`. (Ils venaient de `wrangler.toml`, qui ne
  les déclare plus : sinon ils disparaissent d'eux-mêmes au prochain déploiement.)

### 6. GitHub

**Developer settings → Personal access tokens** → révoquer le jeton
fine-grained qui servait à publier les documents validés.
