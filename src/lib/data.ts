import { getCollection, type CollectionEntry } from 'astro:content';

export type Sujet = CollectionEntry<'sujets'>;
export type Serie = CollectionEntry<'series'>;

/**
 * Matières courantes proposées à la soumission (liste de départ, à enrichir).
 * Les libellés doivent rester identiques à ceux des fiches pour que le
 * rapprochement sujet/corrigé fonctionne.
 */
export const MATIERES_COURANTES = [
  'Mathématiques',
  'Physique-Chimie',
  'SVT',
  'Philosophie',
  'Français',
  'Histoire-Géographie',
  'Anglais',
  'Espagnol',
  'Allemand',
  'Arts plastiques',
  'EPS',
] as const;

/** Clé unique d'un sujet : année · série · matière · session. */
export function cleSujet(data: {
  annee: number | string;
  serie: string;
  matiere: string;
  session: string;
}): string {
  return `${data.annee}|${data.serie}|${data.matiere}|${data.session}`;
}

/** Couleur (fond clair + texte/icône foncé) et icône par matière. */
export interface StyleMatiere {
  bg: string;
  fg: string;
  icon: string;
}

const STYLES_MATIERE: Record<string, StyleMatiere> = {
  Mathématiques: { bg: '#E6F1FB', fg: '#0C447C', icon: 'calculator' },
  'Physique-Chimie': { bg: '#EEEDFE', fg: '#3C3489', icon: 'atom' },
  SVT: { bg: '#EAF3DE', fg: '#27500A', icon: 'leaf' },
  Philosophie: { bg: '#FAEEDA', fg: '#633806', icon: 'bulb' },
  Français: { bg: '#FAECE7', fg: '#712B13', icon: 'book' },
  'Histoire-Géographie': { bg: '#E1F5EE', fg: '#085041', icon: 'globe' },
  Anglais: { bg: '#FBEAF0', fg: '#72243E', icon: 'language' },
  Espagnol: { bg: '#FCEBEB', fg: '#791F1F', icon: 'language' },
};

const RAMPS_FALLBACK: { bg: string; fg: string }[] = [
  { bg: '#E6F1FB', fg: '#0C447C' },
  { bg: '#EEEDFE', fg: '#3C3489' },
  { bg: '#EAF3DE', fg: '#27500A' },
  { bg: '#FAEEDA', fg: '#633806' },
  { bg: '#FAECE7', fg: '#712B13' },
  { bg: '#E1F5EE', fg: '#085041' },
  { bg: '#FBEAF0', fg: '#72243E' },
  { bg: '#FCEBEB', fg: '#791F1F' },
];

export function styleMatiere(matiere: string): StyleMatiere {
  const trouve = STYLES_MATIERE[matiere];
  if (trouve) return trouve;
  let h = 0;
  for (const c of matiere) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return { ...RAMPS_FALLBACK[h % RAMPS_FALLBACK.length], icon: 'file' };
}

/** Couleur par série. */
const STYLES_SERIE: Record<string, { bg: string; fg: string }> = {
  A: { bg: '#FAECE7', fg: '#712B13' },
  C: { bg: '#E6F1FB', fg: '#0C447C' },
  D: { bg: '#E1F5EE', fg: '#085041' },
};

export function styleSerie(code: string): { bg: string; fg: string } {
  return STYLES_SERIE[code] ?? { bg: '#F1EFE8', fg: '#2C2C2A' };
}

/** Slug d'URL (sans accents, minuscule, tirets) pour matières/séries. */
export function slugify(valeur: string): string {
  return valeur
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // retire les accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Titre lisible dérivé des métadonnées. */
export function titreSujet(data: Sujet['data']): string {
  return `Baccalauréat ${data.annee} — Série ${data.serie} — ${data.matiere}`;
}

/** Statut d'un sujet, déduit des PDF disponibles. */
export function statutSujet(
  data: Sujet['data']
): 'complet' | 'sujet' | 'corrige' | 'a-venir' {
  const s = Boolean(data.sujetPdf);
  const c = Boolean(data.corrigePdf);
  if (s && c) return 'complet';
  if (s) return 'sujet';
  if (c) return 'corrige';
  return 'a-venir';
}

export const libelleStatut: Record<string, string> = {
  complet: 'Sujet + corrigé',
  sujet: 'Sujet seul',
  corrige: 'Corrigé seul',
  'a-venir': 'À venir',
};

/** Tous les sujets, triés du plus récent au plus ancien. */
export async function tousLesSujets(): Promise<Sujet[]> {
  const sujets = await getCollection('sujets');
  return sujets.sort((a, b) => {
    if (b.data.annee !== a.data.annee) return b.data.annee - a.data.annee;
    return a.data.matiere.localeCompare(b.data.matiere, 'fr');
  });
}

/** Toutes les séries, dans l'ordre d'affichage défini. */
export async function toutesLesSeries(): Promise<Serie[]> {
  const series = await getCollection('series');
  return series.sort((a, b) => a.data.ordre - b.data.ordre);
}

/** Matières distinctes d'une série, avec le nombre de sujets. */
export async function matieresParSerie(
  codeSerie: string
): Promise<{ matiere: string; nombre: number }[]> {
  const sujets = await tousLesSujets();
  const compte = new Map<string, number>();
  for (const s of sujets) {
    if (s.data.serie !== codeSerie) continue;
    if (statutSujet(s.data) === 'a-venir') continue; // seulement le disponible
    compte.set(s.data.matiere, (compte.get(s.data.matiere) ?? 0) + 1);
  }
  return [...compte.entries()]
    .map(([matiere, nombre]) => ({ matiere, nombre }))
    .sort((a, b) => a.matiere.localeCompare(b.matiere, 'fr'));
}

/** Sujets d'une série + matière donnée. */
export async function sujetsParSerieMatiere(
  codeSerie: string,
  slugMatiere: string
): Promise<Sujet[]> {
  const sujets = await tousLesSujets();
  return sujets.filter(
    (s) => s.data.serie === codeSerie && slugify(s.data.matiere) === slugMatiere
  );
}

/** Années distinctes (les plus récentes d'abord), avec le nombre de sujets. */
export async function toutesLesAnnees(): Promise<
  { annee: number; nombre: number }[]
> {
  const sujets = await tousLesSujets();
  const compte = new Map<number, number>();
  for (const s of sujets) {
    if (statutSujet(s.data) === 'a-venir') continue; // seulement le disponible
    compte.set(s.data.annee, (compte.get(s.data.annee) ?? 0) + 1);
  }
  return [...compte.entries()]
    .map(([annee, nombre]) => ({ annee, nombre }))
    .sort((a, b) => b.annee - a.annee);
}

/** Matières distinctes (toutes séries), avec le nombre de sujets. */
export async function toutesLesMatieres(): Promise<
  { matiere: string; nombre: number }[]
> {
  const sujets = await tousLesSujets();
  const compte = new Map<string, number>();
  for (const s of sujets) {
    if (statutSujet(s.data) === 'a-venir') continue; // seulement le disponible
    compte.set(s.data.matiere, (compte.get(s.data.matiere) ?? 0) + 1);
  }
  return [...compte.entries()]
    .map(([matiere, nombre]) => ({ matiere, nombre }))
    .sort((a, b) => a.matiere.localeCompare(b.matiere, 'fr'));
}

/** Sujets d'une année donnée. */
export async function sujetsParAnnee(annee: number): Promise<Sujet[]> {
  const sujets = await tousLesSujets();
  return sujets.filter((s) => s.data.annee === annee);
}

/** Sujets d'une matière donnée (toutes séries / années). */
export async function sujetsParMatiere(slugMatiere: string): Promise<Sujet[]> {
  const sujets = await tousLesSujets();
  return sujets.filter((s) => slugify(s.data.matiere) === slugMatiere);
}

/**
 * Crédits publics des contributeurs : à la manière de l'historique de
 * Wikipédia, on liste les pseudonymes ayant partagé des documents, avec le
 * nombre de fiches concernées. Triés par nombre décroissant puis alphabétique.
 */
export async function contributeurs(): Promise<
  { credit: string; nombre: number }[]
> {
  const sujets = await tousLesSujets();
  const compte = new Map<string, number>();
  for (const s of sujets) {
    const credit = s.data.credit?.trim();
    if (!credit) continue;
    compte.set(credit, (compte.get(credit) ?? 0) + 1);
  }
  return [...compte.entries()]
    .map(([credit, nombre]) => ({ credit, nombre }))
    .sort((a, b) => b.nombre - a.nombre || a.credit.localeCompare(b.credit, 'fr'));
}
