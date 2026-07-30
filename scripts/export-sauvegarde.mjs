// Prépare une sauvegarde hors-ligne de la bibliothèque : PDF, sources LaTeX,
// fiches Markdown et inventaire, dans un dossier prêt à déposer sur un Drive.
// Lancer : node scripts/export-sauvegarde.mjs [--sortie <dossier>]
import { readFile, readdir, mkdir, copyFile, writeFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const racine = join(__dirname, '..');

// --sortie <dossier> : où créer la sauvegarde (défaut : export/ à la racine).
const args = process.argv.slice(2);
const iSortie = args.indexOf('--sortie');
const baseSortie = iSortie !== -1 && args[iSortie + 1] ? args[iSortie + 1] : join(racine, 'export');

const date = new Date().toISOString().slice(0, 10);
const dossier = join(baseSortie, `Bac242-sauvegarde-${date}`);

/** Slug sans accents (identique à src/lib/data.ts). */
const slug = (v) =>
  v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Frontmatter plat des fiches (`cle: valeur`), sans dépendance YAML. */
function frontmatter(texte) {
  const m = texte.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const o = {};
  for (const ligne of m[1].split(/\r?\n/)) {
    const p = ligne.match(/^([A-Za-zÀ-ÿ0-9_]+):\s*(.*)$/);
    if (p) o[p[1]] = p[2].trim().replace(/^"(.*)"$/, '$1');
  }
  return o;
}

/** Copie récursive d'un dossier (sans dépendance externe). */
async function copierDossier(src, dest) {
  await mkdir(dest, { recursive: true });
  for (const e of await readdir(src, { withFileTypes: true })) {
    const s = join(src, e.name);
    const d = join(dest, e.name);
    if (e.isDirectory()) await copierDossier(s, d);
    else if (e.isFile()) await copyFile(s, d);
  }
}

const csvChamp = (v) => {
  const s = String(v ?? '');
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// --- 1. Lecture des fiches ---------------------------------------------------
const dossierFiches = join(racine, 'src', 'content', 'sujets');
const fiches = (await readdir(dossierFiches)).filter((f) => f.endsWith('.md'));

const lignes = [];
const manquants = [];
let copies = 0;
let octets = 0;

for (const fichier of fiches.sort()) {
  const data = frontmatter(await readFile(join(dossierFiches, fichier), 'utf8'));
  if (!data) continue;

  for (const [type, champ] of [
    ['Sujet', 'sujetPdf'],
    ['Corrigé', 'corrigePdf'],
  ]) {
    const chemin = data[champ];
    if (!chemin) continue;

    const nom = basename(chemin);
    const source = join(racine, 'public', 'pdfs', nom);
    let taille;
    try {
      taille = (await stat(source)).size;
    } catch {
      manquants.push(`${nom} (référencé par ${fichier})`);
      continue;
    }

    // Même arborescence que sources/ : <matiere>/<serie>/
    const cible = join(dossier, 'pdfs', slug(data.matiere), `serie-${slug(data.serie)}`);
    await mkdir(cible, { recursive: true });
    await copyFile(source, join(cible, nom));
    copies += 1;
    octets += taille;

    lignes.push([
      data.annee,
      data.serie,
      data.matiere,
      data.session ?? 'Normale',
      type,
      nom,
      Math.round(taille / 1024),
      data.source ?? '',
      data.credit ?? '',
    ]);
  }
}

// --- 2. Sources LaTeX et fiches ---------------------------------------------
await copierDossier(join(racine, 'sources'), join(dossier, 'sources-latex'));
await copierDossier(dossierFiches, join(dossier, 'fiches'));

// --- 3. Inventaire (CSV, ouvrable dans Sheets ou Excel) ----------------------
const entetes = ['Année', 'Série', 'Matière', 'Session', 'Type', 'Fichier', 'Taille (Ko)', 'Source', 'Crédit'];
lignes.sort((a, b) => a[0] - b[0] || String(a[1]).localeCompare(b[1]) || String(a[2]).localeCompare(b[2]));
const csv = [entetes, ...lignes].map((l) => l.map(csvChamp).join(',')).join('\r\n');
// BOM : sans lui, Excel affiche mal les accents (Sheets s'en passe très bien).
await writeFile(join(dossier, 'INVENTAIRE.csv'), '﻿' + csv + '\r\n', 'utf8');

// --- 4. Notice de restauration ----------------------------------------------
const mo = (octets / 1024 / 1024).toFixed(1);
await writeFile(
  join(dossier, 'LISEZ-MOI.txt'),
  `Sauvegarde Bac 242 — ${date}
========================================

Contenu
  pdfs/<matiere>/serie-<x>/   ${copies} PDF (${mo} Mo), noms identiques au dépôt
  sources-latex/              sources .tex des documents rédigés
  fiches/                     métadonnées Markdown (année, série, matière, PDF liés)
  INVENTAIRE.csv              liste complète, ouvrable dans Google Sheets

Restauration
  1. Reposer tous les PDF à plat dans public/pdfs/ du dépôt
     (l'arborescence par matière/série n'existe que dans cette sauvegarde).
  2. Reposer fiches/*.md dans src/content/sujets/.
  3. Reposer sources-latex/ dans sources/.
  4. npm install && npm run build

Régénérer cette sauvegarde
  node scripts/export-sauvegarde.mjs

Ces documents sont diffusés à des fins pédagogiques non commerciales. Les sujets
restent la propriété de leurs ayants droit, les corrigés celle de leurs auteurs :
garder ce dossier privé.
`,
  'utf8'
);

console.log(`Sauvegarde prête : ${dossier}`);
console.log(`  ${copies} PDF (${mo} Mo) · ${fiches.length} fiches · inventaire CSV`);
if (manquants.length) {
  console.warn(`  ⚠ ${manquants.length} PDF référencé(s) mais introuvable(s) :`);
  for (const m of manquants) console.warn(`     - ${m}`);
}
