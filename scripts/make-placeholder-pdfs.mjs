// Génère des PDF d'exemple (valides, minimalistes) pour les fiches de
// démonstration. À remplacer par les vrais documents lors de la publication.
// Lancer avec `node scripts/make-placeholder-pdfs.mjs`.
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'pdfs');
mkdirSync(outDir, { recursive: true });

// Échappe les caractères spéciaux PDF et limite à l'ASCII (police standard).
const esc = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\\()]/g, (c) => '\\' + c);

function buildPdf(titre, soustitre) {
  const stream =
    `BT /F1 20 Tf 60 760 Td (${esc(titre)}) Tj ET\n` +
    `BT /F1 13 Tf 60 728 Td (${esc(soustitre)}) Tj ET\n` +
    `BT /F1 11 Tf 60 696 Td (Document d'exemple - a remplacer par le PDF reel.) Tj ET`;
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((o, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((off) => {
    pdf += String(off).padStart(10, '0') + ' 00000 n \n';
  });
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return pdf;
}

const docs = [
  ['2024-serie-d-mathematiques-sujet.pdf', 'Bac 2024 - Serie D', 'Mathematiques - Sujet'],
  ['2024-serie-d-mathematiques-corrige.pdf', 'Bac 2024 - Serie D', 'Mathematiques - Corrige'],
  ['2024-serie-c-physique-chimie-sujet.pdf', 'Bac 2024 - Serie C', 'Physique-Chimie - Sujet'],
  ['2023-serie-a4-philosophie-corrige.pdf', 'Bac 2023 - Serie A4', 'Philosophie - Corrige'],
];

for (const [nom, titre, soustitre] of docs) {
  writeFileSync(join(outDir, nom), buildPdf(titre, soustitre), 'latin1');
}
console.log(`${docs.length} PDF d'exemple générés dans public/pdfs/`);
