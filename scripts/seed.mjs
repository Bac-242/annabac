// Génère des fichiers de sujets d'exemple (placeholders) pour amorcer la
// bibliothèque. À relancer avec `node scripts/seed.mjs`.
// N'ÉCRASE PAS les fichiers existants (corrigés rédigés à la main préservés).
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'src', 'content', 'sujets');
mkdirSync(outDir, { recursive: true });

const ANNEES = [2020, 2021, 2022, 2023, 2024];

// Matières par série — enseignement général uniquement (séries A1–A4, C, D).
// Les séries A sont littéraires (dominantes : maths, langues, arts, philosophie).
const MATIERES = {
  A1: ['Philosophie', 'Français', 'Mathématiques', 'Histoire-Géographie', 'Anglais'],
  A2: ['Philosophie', 'Français', 'Anglais', 'Espagnol', 'Histoire-Géographie'],
  A3: ['Philosophie', 'Français', 'Arts plastiques', 'Histoire-Géographie'],
  A4: ['Philosophie', 'Français', 'Histoire-Géographie', 'Anglais'],
  C: ['Mathématiques', 'Physique-Chimie', 'SVT', 'Philosophie', 'Anglais'],
  D: ['Mathématiques', 'Physique-Chimie', 'SVT', 'Philosophie', 'Anglais'],
};

// Chapitres indicatifs par matière (pour les filtres et le format pédagogique)
const CHAPITRES = {
  Mathématiques: ['Probabilités', 'Fonctions', 'Nombres complexes', 'Suites'],
  'Physique-Chimie': ['Mécanique', 'Électricité', 'Chimie organique'],
  SVT: ['Génétique', 'Immunologie', 'Géologie'],
  Philosophie: ['La conscience', 'La liberté', "L'État"],
  Français: ['Dissertation', 'Commentaire', 'Résumé'],
  'Histoire-Géographie': ['Décolonisation', 'Mondialisation'],
  Anglais: ['Compréhension', 'Expression écrite'],
};

const DIFF = ['Facile', 'Moyenne', 'Difficile'];

function slug(s) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

let crees = 0;
let i = 0;
for (const [serie, matieres] of Object.entries(MATIERES)) {
  for (const annee of ANNEES) {
    for (const matiere of matieres) {
      const nom = `${annee}-serie-${slug(serie)}-${slug(matiere)}.md`;
      const chemin = join(outDir, nom);
      if (existsSync(chemin)) continue; // ne pas écraser
      const chapitres = CHAPITRES[matiere] ?? [];
      const difficulte = DIFF[i++ % DIFF.length];
      const fm = `---
titre: "Baccalauréat ${annee} — Série ${serie} — ${matiere}"
annee: ${annee}
serie: "${serie}"
matiere: "${matiere}"
session: "Normale"
duree: "4h"
difficulte: "${difficulte}"
chapitres: [${chapitres.map((c) => `"${c}"`).join(', ')}]
statut: "placeholder"
---

> **Contenu à venir.** Ce sujet fait partie des annales recensées mais son
> énoncé et son corrigé n'ont pas encore été numérisés et vérifiés.
>
> Vous possédez ce sujet ou souhaitez rédiger le corrigé ?
> Consultez la page [Contribuer](/contribuer).
`;
      writeFileSync(chemin, fm, 'utf8');
      crees++;
    }
  }
}

console.log(`${crees} sujet(s) d'exemple généré(s) dans src/content/sujets/`);
