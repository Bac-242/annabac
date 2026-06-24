# Déploiement — Cloudflare Pages + modération

Le site est statique (Astro → `dist/`) et l'API de soumission/modération tourne
en **Pages Functions** (dossier `functions/`), avec **R2** (stockage des PDF en
attente) et **D1** (file de modération). La validation publie le document en
**commitant dans le dépôt GitHub**, ce qui déclenche un nouveau build.

## Prérequis

```bash
npm i -g wrangler
wrangler login
```

## 1. Créer les ressources

```bash
# Base de données (file de modération)
wrangler d1 create annabac
# → copiez le database_id renvoyé dans wrangler.toml

# Stockage des PDF en attente
wrangler r2 bucket create annabac-soumissions

# Appliquer le schéma
wrangler d1 execute annabac --remote --file=schema.sql
```

Pour faire **évoluer** une base déjà en service (ajout de colonnes, etc.), voir
la section [Migrations de la base D1](#migrations-de-la-base-d1).

## 2. Projet Pages

Connectez le dépôt `Bac-242/annabac` à Cloudflare Pages (Git) :

- **Build command** : `npm run build`
- **Build output** : `dist`
- Le `wrangler.toml` fournit les bindings `DB` (D1) et `BUCKET` (R2).

## 3. Secrets et variables

```bash
# Jeton GitHub à portée "contents:write" sur le dépôt (publication des fiches)
wrangler pages secret put GITHUB_TOKEN --project-name annabac

# Clé secrète Turnstile (anti-robot)
wrangler pages secret put TURNSTILE_SECRET --project-name annabac
```

Dans le dashboard Pages → **Variables d'environnement** (build & production) :

- `PUBLIC_TURNSTILE_SITEKEY` = clé *site* Turnstile (injectée dans le formulaire au build)
- `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH` (déjà dans `wrangler.toml`)
- `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD` = vérification du jeton Access (voir étape 4)

## 4. Protéger l'espace admin (Cloudflare Access)

Zero Trust → **Access** → Applications → *Add a self-hosted application* :

- **Domaine** : `<votre-domaine>` chemins `/admin*` **et** `/api/admin/*`
- **Politique** : *Allow* limité à votre e-mail (ou un groupe d'admins)

Access injecte alors l'en-tête `Cf-Access-Authenticated-User-Email`. **Mais cet
en-tête seul est falsifiable** si la route n'est pas couverte par Access : les
fonctions admin vérifient donc **cryptographiquement** le jeton signé
`Cf-Access-Jwt-Assertion` (signature, expiration, audience). Renseignez pour cela
deux variables (non secrètes) dans `wrangler.toml` / le dashboard Pages :

- `ACCESS_TEAM_DOMAIN` : votre domaine d'équipe Zero Trust, p. ex.
  `monequipe.cloudflareaccess.com`.
- `ACCESS_AUD` : le tag **Application Audience (AUD)** de l'application Access
  (onglet *Overview* de l'application).

Si ces variables manquent, l'accès admin est **refusé** (fail-closed).

## 5. Turnstile

Cloudflare → **Turnstile** → créez un widget pour votre domaine. Reportez la clé
*site* dans `PUBLIC_TURNSTILE_SITEKEY` et la clé *secrète* via le secret
`TURNSTILE_SECRET`. **Sans `TURNSTILE_SECRET`, l'API `/api/submit` refuse les
envois** (fail-closed) : en local, utilisez la clé secrète de test Turnstile
`1x0000000000000000000000000000000AA` (validation toujours réussie).

## Flux de bout en bout

1. Un visiteur envoie **un PDF** via `/contribuer` (sujet ou corrigé) → `POST /api/submit`.
   Aucune donnée de contact n'est collectée ; le crédit (pseudonyme) et la source
   éventuels sont publics.
2. Le PDF va dans R2 (`pending/<id>/…`), une ligne `pending` est créée en D1
   (avec `credit`, `origine`, `source`).
3. Vous ouvrez `/admin` (derrière Access), vérifiez le PDF et l'origine déclarée,
   puis **Valider**.
4. `/api/admin/decide` commite le PDF (`public/pdfs/…`) + la fiche
   (`src/content/sujets/…`, avec `source`/`credit`) dans le dépôt → Pages
   reconstruit → document en ligne (~1 min).
5. **Rejeter** marque la soumission et supprime le PDF en attente.
6. Dans les deux cas, l'empreinte IP est **purgée** à la décision (minimisation RGPD).

## Développement local des fonctions (optionnel)

```bash
npm run build
wrangler pages dev dist   # sert dist/ + functions/ avec les bindings
```

Créez un fichier `.dev.vars` (non versionné) pour les secrets locaux :

```
GITHUB_TOKEN=...
# Clé secrète de test Turnstile (toujours validée) : indispensable car la
# vérification est désormais fail-closed.
TURNSTILE_SECRET=1x0000000000000000000000000000000AA
# Vérification du jeton Access (sinon l'API admin renvoie 403 en local, ce qui
# est normal — Access ne s'exécute pas en local).
ACCESS_TEAM_DOMAIN=monequipe.cloudflareaccess.com
ACCESS_AUD=<aud-de-application-access>
```

## Migrations de la base D1

`schema.sql` est **idempotent** (`CREATE TABLE IF NOT EXISTS`) : il crée la base
de zéro mais **ne modifie pas** une table déjà existante. Pour faire évoluer une
base **déjà en service** (ex. l'ajout des colonnes de contribution `credit`,
`origine`, `source`), on applique des `ALTER TABLE` à la main. SQLite/D1 ajoute
les colonnes avec la valeur `NULL` pour les lignes existantes : c'est sûr et non
destructif.

### 1. (Recommandé) Sauvegarder avant toute migration

Export complet de la base distante (schéma + données). L'export ne fait que
**lire** la base, sans risque.

```bash
# bash / macOS / Linux (nom de fichier daté)
wrangler d1 export annabac --remote --output=backup-annabac-$(date +%Y%m%d).sql
```

```powershell
# PowerShell (Windows) : la syntaxe de date diffère
wrangler d1 export annabac --remote --output=backup-annabac-$(Get-Date -Format yyyyMMdd).sql
```

Au besoin, un simple nom fixe convient aussi : `--output=backup-annabac.sql`.

### 2. Vérifier les colonnes déjà présentes

```bash
wrangler d1 execute annabac --remote --command "PRAGMA table_info(submissions);"
```

### 3. Appliquer la migration « contribution façon Wikipédia »

Ces trois colonnes sont nécessaires au nouveau formulaire (crédit public, origine
déclarée, attribution). Lancez-les **une seule fois** ; relancer un `ALTER` déjà
appliqué renvoie une erreur « duplicate column », sans danger pour les données.

```bash
wrangler d1 execute annabac --remote --command "ALTER TABLE submissions ADD COLUMN credit TEXT;"
wrangler d1 execute annabac --remote --command "ALTER TABLE submissions ADD COLUMN origine TEXT;"
wrangler d1 execute annabac --remote --command "ALTER TABLE submissions ADD COLUMN source TEXT;"
```

> La colonne historique `contributor` (ancien e-mail facultatif) **n'est plus
> utilisée** : le code ne l'écrit plus et `decide.ts` la remet à `NULL` à chaque
> décision. On peut la laisser telle quelle (SQLite ne facilite pas la suppression
> de colonne) — elle restera vide.

### 4. Vérifier le résultat

```bash
wrangler d1 execute annabac --remote --command "PRAGMA table_info(submissions);"
# → la table doit lister credit, origine, source
```

### 5. Tester en local d'abord (conseillé)

Rejouez exactement les mêmes commandes **sans** `--remote` pour valider sur la
base locale de `wrangler pages dev` avant de toucher à la production :

```bash
wrangler d1 execute annabac --command "ALTER TABLE submissions ADD COLUMN credit TEXT;"
# …idem pour origine et source…
```

Pour une base **neuve**, rien de tout cela : `wrangler d1 execute annabac --remote --file=schema.sql`
crée directement la table à jour.

## Sécurité, coûts et identité du projet

Le projet est public et open source. Quelques précautions, surtout tant que
tout repose sur des comptes personnels (GitHub, Cloudflare, carte bancaire).

### Garde-fous déjà en place côté code

- **Admin** : vérification cryptographique du jeton `Cf-Access-Jwt-Assertion`
  (et non du seul en-tête e-mail, falsifiable) — voir `functions/_lib/access.ts`.
  Fail-closed si `ACCESS_TEAM_DOMAIN` / `ACCESS_AUD` manquent.
- **Soumissions** : Turnstile fail-closed, `matière` validée contre une liste,
  contenu vérifié comme PDF (`%PDF-`), quotas anti-abus, **aucun e-mail collecté**,
  IP seulement hachée et **purgée à la décision**.
- **Erreurs** : journalisées côté serveur (`console.error`, visibles via
  `wrangler tail`) et renvoyées au client sous forme générique, sans fuite
  d'information interne. Les écritures R2/D1 sont nettoyées en cas d'échec.

### Jeton GitHub (limiter la casse en cas de fuite)

Le `GITHUB_TOKEN` sert à committer les documents validés. Utilisez un
**fine-grained personal access token** plutôt qu'un token classique :

- **Repository access** : *Only select repositories* → `Bac-242/annabac` uniquement.
- **Permissions** : *Repository permissions* → **Contents : Read and write** (rien d'autre).
- **Expiration** : 90 jours, avec rappel pour le **rotater** (puis
  `wrangler pages secret put GITHUB_TOKEN`).

Ainsi, même compromis, le jeton ne peut écrire que dans ce dépôt.

### Coûts et limites du free tier Cloudflare

L'architecture est conçue pour rester gratuite ; l'**egress est gratuit et
illimité**, donc pas de facture surprise liée au trafic.

| Service | Inclus (plan gratuit) | Au-delà |
| --- | --- | --- |
| Workers / Pages Functions | 100 000 requêtes/jour (compte entier) | **Arrêt** (erreur 1027), pas de facturation sur le plan Free |
| D1 | 5 M lignes lues/j, 100 k écrites/j, 5 Go | **Arrêt** (erreurs), pas de facturation |
| R2 | 10 Go, 1 M ops écriture, 10 M ops lecture /mois | **Facturé** (≈ 0,015 $/Go-mois) — seul vrai poste facturable |
| Pages | 500 builds/mois, bande passante illimitée | Arrêt des builds |

À faire :

- **Rester sur le plan Workers Free** sauf besoin explicite (Workers et D1
  s'arrêtent au lieu de facturer).
- Activer les **notifications de facturation / budget** dans le dashboard
  Cloudflare (alerte au moindre montant).
- Surveiller le stockage **R2** (10 Go) ; chaque validation/rejet supprime déjà
  les PDF en attente. Garde-fous anti-abus dans `functions/api/submit.ts`
  (`MAX_PENDING_GLOBAL`, `MAX_PER_IP_24H`).
- Optionnel : une règle **WAF Rate Limiting** sur `/api/submit`.

### Dissocier le projet de l'identité personnelle

Recommandé dès que le projet prend de l'ampleur :

- **Organisation GitHub** dédiée : le dépôt appartient à l'orga `Bac-242`
  (`GITHUB_OWNER = "Bac-242"`). En cas de nouveau transfert, mettre à jour
  `GITHUB_OWNER` dans `wrangler.toml` et régénérer le `GITHUB_TOKEN`, puis
  vérifier la connexion Git du projet Cloudflare Pages.
- **Adresse e-mail dédiée** au projet (alias) à utiliser partout : contact du
  site (`src/pages/a-propos.astro`), compte Cloudflare, compte/orga GitHub —
  afin de ne pas exposer l'e-mail personnel.
- **Page « À propos »** (`/a-propos`) : tenir à jour le contact, les mentions
  légales et la procédure de retrait ; retirer rapidement tout document sur
  demande d'un ayant droit.
- À terme, envisager une structure (association) pour porter le projet plutôt
  qu'à titre personnel.
