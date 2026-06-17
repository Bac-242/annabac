# Contribuer à Annales Bac Congo

Merci de votre aide ! Il y a deux façons de contribuer.

## 1. Envoyer un sujet ou un corrigé (sans connaissances techniques)

Le plus simple : utilisez le **formulaire de soumission** sur la page
[`/contribuer`](https://annales-bac-congo.example/contribuer).

1. Renseignez l'année, la série, la matière et la session.
2. Joignez le **PDF du sujet et/ou du corrigé** (PDF uniquement, 5 Mo max par fichier).
3. Envoyez. Le document arrive dans la boîte e-mail de l'équipe.
4. Après **vérification**, il est publié sur le site.

Aucun compte ni connaissance de Git n'est nécessaire.

## 2. Publier un document validé (mainteneurs)

Une fois un document vérifié, on l'ajoute à la bibliothèque :

1. Déposez le(s) PDF dans `public/pdfs/`, par ex.
   `2022-serie-c-mathematiques-sujet.pdf` et
   `2022-serie-c-mathematiques-corrige.pdf`.
2. Créez la fiche dans `src/content/sujets/`, nommée
   `<annee>-serie-<serie>-<matiere>.md` (sans accents) :

   ```yaml
   ---
   annee: 2022
   serie: "C"            # A1, A2, A3, A4, C, D
   matiere: "Mathématiques"
   session: "Normale"     # Normale | Remplacement | Spéciale
   sujetPdf: "/pdfs/2022-serie-c-mathematiques-sujet.pdf"     # optionnel
   corrigePdf: "/pdfs/2022-serie-c-mathematiques-corrige.pdf" # optionnel
   ---
   ```

   Les deux champs PDF sont optionnels : une fiche peut n'avoir que le sujet,
   que le corrigé, ou les deux.
3. Vérifiez en local puis redéployez.

## Configurer le formulaire de soumission

Le formulaire utilise [Web3Forms](https://web3forms.com) (gratuit, sans
backend). Obtenez une clé d'accès en indiquant l'adresse e-mail dédiée, puis
renseignez-la dans `.env` :

```
PUBLIC_WEB3FORMS_KEY=votre-cle
```

## Vérifier localement

```bash
npm install
npm run dev      # vérifier l'affichage
npm run build    # vérifier que tout compile (schémas Zod validés)
```

Les métadonnées sont validées par des schémas (`src/content/config.ts`) : une
valeur invalide (mauvaise `session`, etc.) fait échouer le build.
