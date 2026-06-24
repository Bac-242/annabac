/// <reference types="@cloudflare/workers-types" />
import { type Env, json, erreurServeur } from '../../_lib/util';
import { adminEmail } from '../../_lib/access';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await adminEmail(request, env))) return json({ error: 'Non autorisé' }, 403);

  try {
    const url = new URL(request.url);
    const statut = url.searchParams.get('statut') ?? 'pending';

    const { results } = await env.DB.prepare(
      `SELECT id, created_at, annee, serie, matiere, session,
              sujet_key, corrige_key, contributor, status, decided_at, decided_by, note
         FROM submissions
        WHERE status = ?
        ORDER BY created_at DESC
        LIMIT 200`
    )
      .bind(statut)
      .all();

    return json({ submissions: results });
  } catch (e) {
    return erreurServeur('admin/list', e);
  }
};
