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
