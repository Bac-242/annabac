# Sources LaTeX des sujets et corrigés

Ce dossier contient les **sources `.tex`** des documents publiés sur le site,
afin que chaque sujet soit **reproductible et modifiable** (esprit open source).
Les PDF correspondants, eux, vivent dans `public/pdfs/` et sont servis par le
site.

> **Le format d'arrivée n'engage à rien, le format de publication est unique.**
> Un contributeur envoie ce qu'il a — scan, photo, PDF, document Word : aucune
> exigence. Tout est ensuite **réécrit** selon les conventions ci-dessous, pour
> que la bibliothèque reste homogène, lisible et corrigeable, quelle que soit
> l'origine. C'est ce travail de réécriture qui fait la valeur du site : rien
> n'est publié tel quel.

## Arborescence

```
sources/
├─ commun.tex          # fragment partagé : pied de page, entête corrigé, encadrés
├─ mathematiques/
│  ├─ serie-a/         # maths série A + style-sujet.tex / style-corrige.tex
│  ├─ serie-c/         # maths série C (2009–2020) + styles
│  └─ serie-d/         # maths série D (2010–2021) + styles
└─ physique-chimie/
   ├─ serie-c/         # PC série C (2010–2020) + style-pc.tex
   └─ serie-d/         # PC série D (2010–2020) + style-pc.tex
```

Chaque document suit la convention de nommage du site :
`<annee>-serie-<serie>-<matiere>-{sujet|corrige}.tex`, identique au PDF associé
dans `public/pdfs/` (la matière est le *slug* du site, ex. `physique-chimie`).

Chaque dossier embarque son préambule (`style-sujet.tex`, `style-corrige.tex`
ou `style-pc.tex`), inclus par chaque document via `\input{...}`. Tous les
styles incluent à leur tour **`sources/commun.tex`** (via
`\input{../../commun}`), qui centralise :

- le **pied de page de provenance** (« Bac 242 — annales gratuites… ») et la
  macro `\bacsiteurl` — si le domaine du site change, c'est le **seul** point
  à mettre à jour avant de recompiler tous les PDF ;
- l'**entête structuré des corrigés** `\entetecorrige{annee}{serie}{matiere}` ;
- les **encadrés pédagogiques** (voir ci-dessous).

## Style des documents

Le style reste volontairement **sobre** : filets fins, jamais d'aplats — les
élèves impriment et photocopient, et les fichiers doivent rester légers. La
mise en page est légèrement **aérée** (interligne, espace entre les réponses,
air autour des équations) : ces réglages vivent dans `commun.tex`.

- **Sujets** : reproductions de documents officiels — **noir et blanc
  strict**, mise en page neutre, titre via `\entetesujet{...}`, aucun
  habillage au-delà du pied de page de provenance.
- **Corrigés** : œuvres originales de la communauté — titre via
  `\entetecorrige{2020}{C}{Mathématiques}`, encadrés pédagogiques, et
  **couleur fonctionnelle autorisée** avec trois garde-fous :
  1. aucune information portée par la couleur seule (toujours étiqueter les
     flèches, courbes, zones — une photocopie N&B doit rester 100 % lisible) ;
  2. jamais de fonds colorés (coût d'encre, photocopie) ;
  3. couleurs sombres qui dégradent bien en gris — la structure (entête,
     titres d'exercices, encadrés) utilise le bleu nuit du site, défini dans
     `commun.tex` (`\color{bacnuit}`).

## Encadrés pédagogiques (corrigés uniquement)

Trois environnements, rendus avec un filet vertical gauche et un texte
légèrement réduit :

```latex
\begin{methode}  ... \end{methode}   % « Méthode » : démarche générale réutilisable
\begin{rappel}   ... \end{rappel}    % « Rappel de cours » : théorème/formule mobilisé
\begin{piege}    ... \end{piege}     % « Piège classique » : erreur fréquente à éviter
```

**Avec parcimonie** : 2–3 encadrés par corrigé, placés là où ils éclairent
une démarche — un corrigé n'est pas un cours. Exemple de référence :
`mathematiques/serie-c/2020-serie-c-mathematiques-corrige.tex`.

## Recompiler un document

Depuis le dossier de la série concernée (pour que les `\input` résolvent),
**deux passes** (références croisées) :

```bash
cd sources/mathematiques/serie-c
pdflatex 2020-serie-c-mathematiques-corrige.tex
pdflatex 2020-serie-c-mathematiques-corrige.tex
```

Une distribution LaTeX classique suffit (TeX Live, MiKTeX…). Les paquets
requis sont standards (`amsmath`, `amssymb`, `enumitem`, `geometry`,
`fancyhdr`, `lmodern`, `framed`, `tikz` pour les figures).

## Contribuer / corriger un document

1. Modifier le `.tex` voulu.
2. Recompiler (deux passes) pour obtenir le PDF.
3. Copier le PDF mis à jour dans `public/pdfs/` (même nom de fichier).

Les artefacts de compilation (`.aux`, `.log`, `.out`, etc.) sont ignorés par
git : seuls les `.tex` sont versionnés.
