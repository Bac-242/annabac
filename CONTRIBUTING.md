# Contribuer à Bac 242

Merci de votre aide ! Il y a deux façons de contribuer.

## 1. Envoyer un sujet ou un corrigé (sans connaissances techniques)

**Écrivez-nous** en joignant le document. L'adresse est `contact.bac242 (chez)
gmail (point) com`, écrite ainsi pour éviter les aspirateurs d'adresses. La page
[`/contribuer`](/contribuer) l'affiche en clair et indique ce qui manque
aujourd'hui à la bibliothèque.

> **Une photo suffit.** Le format d'arrivée n'a aucune importance : scan, photo
> prise au téléphone, PDF, document Word. Chaque document reçu est ensuite
> **réécrit** au format du projet, voir [sources/README.md](sources/README.md).

Précisez si possible dans votre message :

1. L'**année** (ex. 2019).
2. La **série** (A, C ou D).
3. La **matière** (Mathématiques, Physique-Chimie…).
4. La **session** (Normale, Remplacement ou Spéciale).
5. S'il s'agit d'un **sujet** ou d'un **corrigé**.
6. Pour un **corrigé** : son **auteur ou son origine** (affiché en attribution
   sur la fiche).
7. Au choix, un **crédit** : le nom ou pseudonyme sous lequel vous souhaitez
   apparaître. Sans indication, vous restez anonyme.

Aucun compte ni connaissance de Git n'est nécessaire. Après vérification, le
document est publié. Le crédit, s'il est fourni, apparaît sur la fiche et dans
l'historique Git public.

## 2. Publier un document (mainteneurs)

Pour un document produit en **LaTeX** (sujets retranscrits, corrigés rédigés),
suivez les conventions de [sources/README.md](sources/README.md) — style sobre
N&B, entête `\entetecorrige` et encadrés pédagogiques (`methode`, `rappel`,
`piege`) pour les corrigés.

Pour ajouter un document dans la bibliothèque :

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
   source: "Examen officiel du Ministère"                     # optionnel (attribution)
   credit: "Pseudonyme du contributeur"                       # optionnel (crédit public)
   ---
   ```

   Les champs PDF sont optionnels (une fiche peut n'avoir que le sujet, que le
   corrigé, ou les deux). `source` et `credit` sont également optionnels.
3. Vérifiez en local, committez, poussez : Cloudflare Pages reconstruit le site.

## Vérifier localement

```bash
npm install
npm run dev      # vérifier l'affichage
npm run build    # vérifier que tout compile (schémas Zod validés)
npm test         # tests unitaires
```

Les métadonnées sont validées par des schémas (`src/content/config.ts`) : une
valeur invalide (mauvaise `session`, etc.) fait échouer le build.
