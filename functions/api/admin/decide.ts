/// <reference types="@cloudflare/workers-types" />
import { type Env, json, baseNom, erreurServeur } from '../../_lib/util';
import { adminEmail } from '../../_lib/access';
import { commitFiles, getFileText, type FichierACommiter } from '../../_lib/github';

interface Ligne {
  id: string;
  annee: number;
  serie: string;
  matiere: string;
  session: string;
  sujet_key: string | null;
  corrige_key: string | null;
  credit: string | null;
  source: string | null;
  status: string;
}

function bytesToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

/** Lit un chemin PDF déjà référencé dans une fiche existante. */
function champ(md: string | null, cle: string): string | null {
  if (!md) return null;
  const m = md.match(new RegExp(`^${cle}:\\s*["']?([^"'\\n]+)["']?`, 'm'));
  return m ? m[1].trim() : null;
}

/** Échappe une valeur pour une chaîne YAML entre guillemets doubles. */
function yaml(v: string): string {
  return v.replace(/[\r\n]+/g, ' ').replace(/\\/g, '\\\\').replace(/"/g, '\\"').trim();
}

function construireMd(
  d: Ligne,
  sujetPdf: string | null,
  corrigePdf: string | null,
  source: string | null,
  credit: string | null
): string {
  const lignes = [
    '---',
    `annee: ${d.annee}`,
    `serie: "${d.serie}"`,
    `matiere: "${d.matiere}"`,
    `session: "${d.session}"`,
  ];
  if (sujetPdf) lignes.push(`sujetPdf: "${sujetPdf}"`);
  if (corrigePdf) lignes.push(`corrigePdf: "${corrigePdf}"`);
  if (source) lignes.push(`source: "${yaml(source)}"`);
  if (credit) lignes.push(`credit: "${yaml(credit)}"`);
  lignes.push('---', '');
  return lignes.join('\n');
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const email = await adminEmail(request, env);
  if (!email) return json({ error: 'Non autorisé' }, 403);

  const body = (await request.json().catch(() => null)) as
    | { id?: string; action?: string; note?: string }
    | null;
  if (!body?.id || (body.action !== 'approve' && body.action !== 'reject')) {
    return json({ error: 'Requête invalide' }, 400);
  }

  try {
    const ligne = (await env.DB.prepare(
      `SELECT id, annee, serie, matiere, session, sujet_key, corrige_key, credit, source, status
         FROM submissions WHERE id = ?`
    )
      .bind(body.id)
      .first()) as Ligne | null;
    if (!ligne) return json({ error: 'Soumission introuvable' }, 404);
    if (ligne.status !== 'pending') return json({ error: 'Déjà traitée' }, 409);

    const finir = async (status: 'approved' | 'rejected') => {
      // Minimisation RGPD : une fois la décision prise, l'e-mail privé et
      // l'IP hachée n'ont plus d'utilité (recontact / anti-abus) : on les efface.
      await env.DB.prepare(
        `UPDATE submissions
            SET status = ?, decided_at = ?, decided_by = ?, note = ?,
                contributor = NULL, ip_hash = NULL
          WHERE id = ?`
      )
        .bind(status, new Date().toISOString(), email, body.note ?? null, ligne.id)
        .run();
      // Nettoyage des fichiers en attente
      if (ligne.sujet_key) await env.BUCKET.delete(ligne.sujet_key);
      if (ligne.corrige_key) await env.BUCKET.delete(ligne.corrige_key);
    };

    if (body.action === 'reject') {
      await finir('rejected');
      return json({ success: true, status: 'rejected' });
    }

    // --- Validation : publier dans le dépôt via un commit Git ---
    if (!env.GITHUB_TOKEN) return json({ error: 'GITHUB_TOKEN non configuré' }, 500);

    // Verrou atomique : on ne publie que si la ligne était encore « pending ».
    // Évite un double commit en cas de double-clic ou de requêtes concurrentes.
    const verrou = await env.DB.prepare(
      `UPDATE submissions SET status = 'processing' WHERE id = ? AND status = 'pending'`
    )
      .bind(ligne.id)
      .run();
    if (!verrou.meta.changes) return json({ error: 'Déjà traitée' }, 409);

    try {
      const base = baseNom(ligne);
      const mdPath = `src/content/sujets/${base}.md`;
      const existant = await getFileText(env, mdPath); // fiche déjà présente ?

      const fichiers: FichierACommiter[] = [];
      let sujetPdf = champ(existant, 'sujetPdf');
      let corrigePdf = champ(existant, 'corrigePdf');
      // On conserve l'attribution déjà présente si la nouvelle soumission
      // (ex. ajout d'un corrigé à un sujet existant) n'en fournit pas.
      const source = ligne.source ?? champ(existant, 'source');
      const credit = ligne.credit ?? champ(existant, 'credit');

      if (ligne.sujet_key) {
        const obj = await env.BUCKET.get(ligne.sujet_key);
        if (!obj) throw new Error('PDF sujet introuvable dans R2');
        sujetPdf = `/pdfs/${base}-sujet.pdf`;
        fichiers.push({ path: `public${sujetPdf}`, contentBase64: bytesToBase64(await obj.arrayBuffer()) });
      }
      if (ligne.corrige_key) {
        const obj = await env.BUCKET.get(ligne.corrige_key);
        if (!obj) throw new Error('PDF corrigé introuvable dans R2');
        corrigePdf = `/pdfs/${base}-corrige.pdf`;
        fichiers.push({ path: `public${corrigePdf}`, contentBase64: bytesToBase64(await obj.arrayBuffer()) });
      }

      fichiers.push({ path: mdPath, contentText: construireMd(ligne, sujetPdf, corrigePdf, source, credit) });

      // Le message de commit (historique public) crédite le contributeur quand
      // il a fourni un pseudonyme, mais ne contient jamais l'e-mail de l'admin ;
      // la traçabilité de la décision reste dans la colonne `decided_by` (privée).
      const messageCommit = credit ? `Publier ${base} (contribution de ${yaml(credit)})` : `Publier ${base}`;
      const sha = await commitFiles(env, fichiers, messageCommit);

      await finir('approved');
      return json({ success: true, status: 'approved', commit: sha });
    } catch (e) {
      // La publication a échoué : on relâche le verrou pour permettre un retry.
      await env.DB.prepare(
        `UPDATE submissions SET status = 'pending' WHERE id = ? AND status = 'processing'`
      )
        .bind(ligne.id)
        .run()
        .catch(() => {});
      return erreurServeur('admin/decide', e);
    }
  } catch (e) {
    return erreurServeur('admin/decide', e);
  }
};
