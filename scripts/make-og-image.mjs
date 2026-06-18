// Génère l'image de partage (Open Graph) 1200×630 → public/og.png.
// Utilise sharp (dépendance d'Astro). Lancer : node scripts/make-og-image.mjs
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = join(__dirname, '..', 'public', 'og.png');

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#15803d"/>
  <g transform="translate(96,150)">
    <path d="M0 30c45-22 90-22 135 0v225c-45-22-90-22-135 0V30z" fill="#ffffff" opacity="0.95"/>
    <path d="M285 30c-45-22-90-22-135 0v225c45-22 90-22 135 0V30z" fill="#ffffff" opacity="0.75"/>
    <rect x="128" y="18" width="30" height="252" rx="15" fill="#15803d"/>
  </g>
  <text x="412" y="262" font-family="Arial, Helvetica, sans-serif" font-size="66" font-weight="700" fill="#ffffff">Annales Bac Congo</text>
  <text x="414" y="328" font-family="Arial, Helvetica, sans-serif" font-size="34" fill="#dcfce7">Sujets et corrigés du baccalauréat</text>
  <text x="414" y="378" font-family="Arial, Helvetica, sans-serif" font-size="34" fill="#dcfce7">congolais — gratuits pour tous.</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(out);
console.log('OG image générée : public/og.png');
