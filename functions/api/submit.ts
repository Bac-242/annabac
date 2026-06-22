/// <reference types="@cloudflare/workers-types" />
import { type Env, json, uuid } from '../_lib/util';

const MAX = 5 * 1024 * 1024; // 5 Mo par fichier
const SERIES = ['A', 'C', 'D'];
const SESSIONS = ['Normale', 'Remplacement', 'Spéciale'];

async function verifierTurnstile(env: Env, token: string | null, ip: string | null): Promise<boolean> {
  if (!env.TURNSTILE_SECRET) return true; // non configuré (dev)
  if (!token) return false;
  const body = new FormData();
  body.append('secret', env.TURNSTILE_SECRET);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body,
  });
  const data = (await res.json()) as { success: boolean };
  return data.success === true;
}

function pdfValide(f: File | null): { ok: boolean; raison?: string } {
  if (!f || f.size === 0) return { ok: true };
  const estPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
  if (!estPdf) return { ok: false, raison: 'Format non PDF.' };
  if (f.size > MAX) return { ok: false, raison: 'Fichier supérieur à 5 Mo.' };
  return { ok: true };
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ success: false, message: 'Requête invalide.' }, 400);
  }

  // Anti-spam
  if ((form.get('botcheck') as string)?.length) return json({ success: true }); // honeypot : on ignore
  const ip = request.headers.get('CF-Connecting-IP');
  if (!(await verifierTurnstile(env, form.get('cf-turnstile-response') as string, ip))) {
    return json({ success: false, message: 'Vérification anti-robot échouée.' }, 400);
  }

  // Métadonnées
  const annee = parseInt(String(form.get('Annee') ?? ''), 10);
  const serie = String(form.get('Serie') ?? '');
  const matiere = String(form.get('Matiere') ?? '').trim();
  const session = String(form.get('Session') ?? 'Normale');
  const contributor = String(form.get('Email du contributeur') ?? '').trim() || null;

  if (!annee || annee < 1980 || annee > 2100) return json({ success: false, message: 'Année invalide.' }, 400);
  if (!SERIES.includes(serie)) return json({ success: false, message: 'Série invalide.' }, 400);
  if (!matiere) return json({ success: false, message: 'Matière requise.' }, 400);
  if (!SESSIONS.includes(session)) return json({ success: false, message: 'Session invalide.' }, 400);

  const sujet = form.get('Sujet') as File | null;
  const corrige = form.get('Corrige') as File | null;
  const aSujet = sujet && sujet.size > 0;
  const aCorrige = corrige && corrige.size > 0;
  if (!aSujet && !aCorrige) return json({ success: false, message: 'Joignez au moins un PDF.' }, 400);

  for (const f of [sujet, corrige]) {
    const v = pdfValide(f);
    if (!v.ok) return json({ success: false, message: v.raison }, 400);
  }

  // Stockage R2 (dossier "pending")
  const id = uuid();
  let sujetKey: string | null = null;
  let corrigeKey: string | null = null;
  if (aSujet) {
    sujetKey = `pending/${id}/sujet.pdf`;
    await env.BUCKET.put(sujetKey, await sujet!.arrayBuffer(), {
      httpMetadata: { contentType: 'application/pdf' },
    });
  }
  if (aCorrige) {
    corrigeKey = `pending/${id}/corrige.pdf`;
    await env.BUCKET.put(corrigeKey, await corrige!.arrayBuffer(), {
      httpMetadata: { contentType: 'application/pdf' },
    });
  }

  // File de modération
  await env.DB.prepare(
    `INSERT INTO submissions
       (id, created_at, annee, serie, matiere, session, sujet_key, corrige_key, contributor, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
  )
    .bind(id, new Date().toISOString(), annee, serie, matiere, session, sujetKey, corrigeKey, contributor)
    .run();

  return json({ success: true, id });
};
