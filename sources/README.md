# Sources LaTeX des sujets

Ce dossier contient les **sources `.tex`** des documents publiés sur le site,
afin que chaque sujet soit **reproductible et modifiable** (esprit open source).
Les PDF correspondants, eux, vivent dans `public/pdfs/` et sont servis par le
site.

## Arborescence

```
sources/
├─ mathematiques/
│  ├─ serie-c/        # sujets série C (2009–2020) + style-sujet.tex
│  └─ serie-d/        # sujets série D (2010–2021) + style-sujet.tex
└─ physique-chimie/
   └─ serie-c/        # sujets série C (2010–2020) + style-pc.tex
```

Chaque sujet suit la convention de nommage du site :
`<annee>-serie-<serie>-<matiere>-sujet.tex`, identique au PDF associé dans
`public/pdfs/` (la matière est le *slug* du site, ex. `physique-chimie`).

Chaque dossier embarque son préambule commun (mise en page sobre, macros) :
`style-sujet.tex` pour les maths, `style-pc.tex` pour la physique-chimie. Il est
inclus par chaque sujet via `\input{...}` ; une copie est présente dans chaque
dossier de série pour que tout sujet se compile de façon autonome.

## Recompiler un sujet

Depuis le dossier de la série concernée (pour que `\input{style-sujet}` résolve) :

```bash
cd sources/mathematiques/serie-c
pdflatex 2020-serie-c-mathematiques-sujet.tex
```

Une distribution LaTeX classique suffit (TeX Live, MiKTeX…). Les paquets requis
sont standards (`amsmath`, `amssymb`, `enumitem`, `geometry`, `fancyhdr`,
`lmodern`).

## Contribuer / corriger un sujet

1. Modifier le `.tex` voulu.
2. Recompiler pour obtenir le PDF.
3. Copier le PDF mis à jour dans `public/pdfs/` (même nom de fichier).

Les artefacts de compilation (`.aux`, `.log`, `.out`, etc.) sont ignorés par
git : seuls les `.tex` sont versionnés.
