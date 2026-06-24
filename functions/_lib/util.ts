/// <reference types="@cloudflare/workers-types" />

export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
  GITHUB_BRANCH: string;
  GITHUB_TOKEN?: string;
  TURNSTILE_SECRET?: string;
  /** Domaine d'équipe Cloudflare Access, ex. `monequipe.cloudflareaccess.com`. */
  ACCESS_TEAM_DOMAIN?: string;
  /** Tag « Application Audience (AUD) » de l'application Access admin. */
  ACCESS_AUD?: string;
}

/**
 * Matières acceptées à la soumission. Doit rester aligné avec
 * `MATIERES_COURANTES` de `src/lib/data.ts` (la validation côté serveur ne peut
 * pas importer le code du front).
 */
export const MATIERES_ACCEPTEES = [
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

/** Slug sans accents (identique à src/lib/data.ts). */
export function slugify(valeur: string): string {
  return valeur
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Base de nommage des fichiers : <annee>-serie-<serie>-<matiere>[-<session>]. */
export function baseNom(d: {
  annee: number | string;
  serie: string;
  matiere: string;
  session: string;
}): string {
  const session = d.session && d.session !== 'Normale' ? `-${slugify(d.session)}` : '';
  return `${d.annee}-serie-${slugify(d.serie)}-${slugify(d.matiere)}${session}`;
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

/**
 * Réponse d'erreur serveur générique. On journalise le détail réel côté serveur
 * (visible dans les logs Cloudflare / `wrangler tail`) mais on ne renvoie au
 * client qu'un message neutre, sans fuite d'information interne.
 */
export function erreurServeur(contexte: string, e: unknown): Response {
  console.error(`[${contexte}]`, e);
  return json({ success: false, error: 'Erreur serveur. Réessayez plus tard.' }, 500);
}

export function uuid(): string {
  return crypto.randomUUID();
}
