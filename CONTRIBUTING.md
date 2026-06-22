# Contribuer à Bac 242

Merci de votre aide ! Il y a deux façons de contribuer.

## 1. Envoyer un sujet ou un corrigé (sans connaissances techniques)

Le plus simple : utilisez le **formulaire de soumission** sur la page
[`/contribuer`](/contribuer).

1. Renseignez l'année, la série, la matière et la session.
2. Joignez le **PDF du sujet et/ou du corrigé** (PDF uniquement, 5 Mo max par fichier).
3. Envoyez. Le document est mis en **file de modération** (R2 + D1).
4. Après **vérification** par un mainteneur depuis `/admin`, il est publié sur le site.

Aucun compte ni connaissance de Git n'est nécessaire.

## 2. Publier un document validé (mainteneurs)

> Le plus simple : depuis l'espace **`/admin`** (protégé par Cloudflare Access),
> cliquez sur **Valider** — le PDF et la fiche sont commités automatiquement
> dans le dépôt et le site se reconstruit. Voir [DEPLOY.md](DEPLOY.md).

Pour ajouter un document **à la main** dans la bibliothèque :

1. Déposez le(s) PDF dans `public/pdfs/`, par ex.
   `2022-serie-c-mathematiques-sujet.pdf` et
   `2022-serie-c-mathematiques-corrige.pdf`.
2. Créez la fiche dans `src/content/sujets/`, nommée
   `<annee>-serie-<serie>-<matiere>.md` (sans accents) :

   ```yaml
   ---
   annee: 2022
   serie: "C"            # A, C, D
   matiere: "Mathématiques"
   session: "Normale"     # Normale | Remplacement | Spéciale
   sujetPdf: "/pdfs/2022-serie-c-mathematiques-sujet.pdf"     # optionnel
   corrigePdf: "/pdfs/2022-serie-c-mathematiques-corrige.pdf" # optionnel
   ---
   ```

   Les deux champs PDF sont optionnels : une fiche peut n'avoir que le sujet,
   que le corrigé, ou les deux.
3. Vérifiez en local puis redéployez.

## Chaîne de soumission / modération

Le formulaire `/contribuer` envoie les PDF à une API (Cloudflare Pages
Functions) qui les met en file d'attente (R2 + D1). Un mainteneur les valide
depuis `/admin` ; la validation publie le document en commitant dans le dépôt.
Mise en place complète : [DEPLOY.md](DEPLOY.md).

## Vérifier localement

```bash
npm install
npm run dev      # vérifier l'affichage
npm run build    # vérifier que tout compile (schémas Zod validés)
```

Les métadonnées sont validées par des schémas (`src/content/config.ts`) : une
valeur invalide (mauvaise `session`, etc.) fait échouer le build.
