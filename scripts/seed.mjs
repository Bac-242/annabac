// Génère des fiches de sujets d'exemple pour amorcer la bibliothèque.
// POC : chaque fiche = métadonnées + (plus tard) un PDF de sujet/corrigé.
// À relancer avec `node scripts/seed.mjs`. N'ÉCRASE PAS les fichiers existants.
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

function slug(s) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

let crees = 0;
for (const [serie, matieres] of Object.entries(MATIERES)) {
  for (const annee of ANNEES) {
    for (const matiere of matieres) {
      const nom = `${annee}-serie-${slug(serie)}-${slug(matiere)}.md`;
      const chemin = join(outDir, nom);
      if (existsSync(chemin)) continue; // ne pas écraser
      const fm = `---
annee: ${annee}
serie: "${serie}"
matiere: "${matiere}"
session: "Normale"
---
`;
      writeFileSync(chemin, fm, 'utf8');
      crees++;
    }
  }
}

console.log(`${crees} fiche(s) d'exemple générée(s) dans src/content/sujets/`);
