import { getCollection, type CollectionEntry } from 'astro:content';
import matieresParSerieData from '../../shared/matieres.json';

export type Sujet = CollectionEntry<'sujets'>;
export type Serie = CollectionEntry<'series'>;

/**
 * Matières proposées à la soumission, par série. Source unique partagée avec la
 * validation serveur (functions/_lib/util.ts) via shared/matieres.json.
 */
export const MATIERES_PAR_SERIE: Record<string, string[]> = matieresParSerieData;

/** Matières d'une série donnée (liste vide si série inconnue). */
export function matieresDeSerie(code: string): string[] {
  return MATIERES_PAR_SERIE[code] ?? [];
}

/** Union de toutes les matières (toutes séries confondues). */
export const MATIERES_COURANTES = [
  ...new Set(Object.values(MATIERES_PAR_SERIE).flat()),
];

/** Clé unique d'un sujet : année · série · matière · session. */
export function cleSujet(data: {
  annee: number | string;
  serie: string;
  matiere: string;
  session: string;
}): string {
  return `${data.annee}|${data.serie}|${data.matiere}|${data.session}`;
}

/**
 * Style d'une matière : classe de pastille + icône. Les couleurs vivent dans
 * global.css (classes .pastille-*, déclinées en clair et en sombre) — jamais
 * de hex ici, pour que tout suive le thème actif.
 */
export interface StyleMatiere {
  classe: string;
  icon: string;
}

const STYLES_MATIERE: Record<string, StyleMatiere> = {
  Mathématiques: { classe: 'pastille-maths', icon: 'calculator' },
  'Physique-Chimie': { classe: 'pastille-physique', icon: 'atom' },
  SVT: { classe: 'pastille-svt', icon: 'leaf' },
  Philosophie: { classe: 'pastille-philo', icon: 'bulb' },
  Français: { classe: 'pastille-francais', icon: 'book' },
  'Histoire-Géographie': { classe: 'pastille-histoire-geo', icon: 'globe' },
  Anglais: { classe: 'pastille-anglais', icon: 'language' },
  Espagnol: { classe: 'pastille-espagnol', icon: 'language' },
};

const NB_RAMPS = 8;

/** Ensemble fini des classes de pastille existant dans global.css. */
export const CLASSES_PASTILLE: ReadonlySet<string> = new Set([
  ...Object.values(STYLES_MATIERE).map((s) => s.classe),
  ...Array.from({ length: NB_RAMPS }, (_, i) => `pastille-ramp-${i}`),
  'pastille-serie-a',
  'pastille-serie-c',
  'pastille-serie-d',
  'pastille-serie-defaut',
]);

export function styleMatiere(matiere: string): StyleMatiere {
  const trouve = STYLES_MATIERE[matiere];
  if (trouve) return trouve;
  let h = 0;
  for (const c of matiere) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return { classe: `pastille-ramp-${h % NB_RAMPS}`, icon: 'file' };
}

/** Classe de pastille par série. */
const SERIES_CONNUES = new Set(['a', 'c', 'd']);

export function styleSerie(code: string): { classe: string } {
  const c = code.toLowerCase();
  return {
    classe: SERIES_CONNUES.has(c) ? `pastille-serie-${c}` : 'pastille-serie-defaut',
  };
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

// --- Couverture de la bibliothèque -----------------------------------------
// La taxonomie (shared/matieres.json) décrit l'ensemble des épreuves qui
// *existent* au baccalauréat ; la collection `sujets` décrit celles qu'on a
// réellement. L'écart entre les deux est ce qu'il reste à collecter — c'est la
// matière de la page /manques.

/** Première année couverte par la bibliothèque. */
export const ANNEE_MIN = 2009;

/** État d'une épreuve possible (série × matière × année). */
export type EtatCase = 'complet' | 'sans-corrige' | 'absent';

export interface CaseGrille {
  serie: string;
  matiere: string;
  annee: number;
  etat: EtatCase;
  /** Slug de la fiche existante, pour lier depuis la grille (si présente). */
  slug?: string;
}

export interface Manques {
  annees: number[];
  cases: CaseGrille[];
  total: number;
  complets: number;
  sansCorrige: number;
  absents: number;
  /** Matières sans le moindre document, toutes séries et années confondues. */
  matieresVides: string[];
  /** Années sans le moindre document. */
  anneesVides: number[];
}

/** Entrée minimale attendue par `calculerManques` (facilite les tests). */
export interface SujetConnu {
  annee: number;
  serie: string;
  matiere: string;
  sujetPdf?: string;
  corrigePdf?: string;
  slug?: string;
}

/**
 * Croise la taxonomie avec le contenu réel et renvoie l'état de chaque épreuve
 * possible. Les années sont passées explicitement : la fonction reste pure et
 * les tests ne dépendent pas de la date du jour.
 */
export function calculerManques(
  sujets: SujetConnu[],
  annees: number[],
  matieresParSerie: Record<string, string[]> = MATIERES_PAR_SERIE
): Manques {
  const connus = new Map<string, SujetConnu>();
  for (const s of sujets) connus.set(`${s.serie}|${s.matiere}|${s.annee}`, s);

  const cases: CaseGrille[] = [];
  for (const [serie, matieres] of Object.entries(matieresParSerie)) {
    for (const matiere of matieres) {
      for (const annee of annees) {
        const trouve = connus.get(`${serie}|${matiere}|${annee}`);
        const etat: EtatCase = !trouve?.sujetPdf && !trouve?.corrigePdf
          ? 'absent'
          : trouve?.sujetPdf && trouve?.corrigePdf
            ? 'complet'
            : 'sans-corrige';
        cases.push({ serie, matiere, annee, etat, slug: trouve?.slug });
      }
    }
  }

  const compte = (e: EtatCase) => cases.filter((c) => c.etat === e).length;
  const rempli = (c: CaseGrille) => c.etat !== 'absent';

  // Matières vides : présentes dans la taxonomie, absentes du contenu.
  const matieres = [...new Set(Object.values(matieresParSerie).flat())];
  const matieresVides = matieres
    .filter((m) => !cases.some((c) => c.matiere === m && rempli(c)))
    .sort((a, b) => a.localeCompare(b, 'fr'));

  const anneesVides = annees
    .filter((a) => !cases.some((c) => c.annee === a && rempli(c)))
    .sort((a, b) => b - a);

  return {
    annees,
    cases,
    total: cases.length,
    complets: compte('complet'),
    sansCorrige: compte('sans-corrige'),
    absents: compte('absent'),
    matieresVides,
    anneesVides,
  };
}

/** Années couvrables : de `ANNEE_MIN` à l'année la plus récente attendue. */
export function anneesCouvrables(anneeMax: number): number[] {
  const max = Math.max(anneeMax, ANNEE_MIN);
  return Array.from({ length: max - ANNEE_MIN + 1 }, (_, i) => ANNEE_MIN + i);
}

/** État de couverture de la bibliothèque, prêt à afficher. */
export async function manques(
  anneeMax: number = new Date().getFullYear()
): Promise<Manques> {
  const sujets = await tousLesSujets();
  return calculerManques(
    sujets.map((s) => ({ ...s.data, slug: s.slug })),
    anneesCouvrables(anneeMax)
  );
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
