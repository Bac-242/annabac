/// <reference types="@cloudflare/workers-types" />
import { type Env, json, uuid, erreurServeur, MATIERES_ACCEPTEES } from '../_lib/util';

const MAX = 5 * 1024 * 1024; // 5 Mo par fichier
const SERIES = ['A', 'C', 'D'];
const SESSIONS = ['Normale', 'Remplacement', 'Spéciale'];
const TYPES = ['sujet', 'corrige'];

// Un sujet est par nature un document officiel : son origine est fixée côté
// serveur, sans demander au contributeur. Un corrigé, lui, déclare son origine.
const SUJET_ORIGINE = "Sujet officiel d'examen";
const ORIGINES_CORRIGE = [
  'Corrigé rédigé par moi-même',
  "Corrigé d'un tiers (avec autorisation)",
  'Autre',
];

// Garde-fous anti-abus (protègent le stockage R2 et la file de modération).
const MAX_PENDING_GLOBAL = 300; // nb max de soumissions en attente, tous contributeurs confondus
const MAX_PER_IP_24H = 15; // nb max de soumissions par IP sur 24 h

/** Hache l'IP (SHA-256) pour limiter les abus sans jamais stocker l'IP en clair. */
async function hashIp(ip: string | null): Promise<string | null> {
  if (!ip) return null;
  const data = new TextEncoder().encode(ip);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function verifierTurnstile(env: Env, token: string | null, ip: string | null): Promise<boolean> {
  // Fail-closed : sans secret configuré, on refuse plutôt que d'ouvrir l'API aux
  // robots. En local, utilisez la clé secrète de test Turnstile (toujours OK) :
  // 1x0000000000000000000000000000000AA.
  if (!env.TURNSTILE_SECRET) {
    console.error('TURNSTILE_SECRET absent : vérification anti-robot impossible (refus).');
    return false;
  }
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

/** Vérifie que le contenu commence bien par l'en-tête PDF (« %PDF- »). */
function estEnTetePdf(buf: ArrayBuffer): boolean {
  const t = new Uint8Array(buf.slice(0, 5));
  return t[0] === 0x25 && t[1] === 0x50 && t[2] === 0x44 && t[3] === 0x46 && t[4] === 0x2d;
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
  const type = String(form.get('Type') ?? '').trim();
  // Crédit public (pseudonyme) et déclaration de droits.
  const credit = String(form.get('Credit') ?? '').trim().slice(0, 80) || null;
  const declaration = String(form.get('Declaration') ?? '').trim();

  // Origine et attribution dépendent du type de document.
  let origine: string;
  let source: string | null;
  if (type === 'sujet') {
    origine = SUJET_ORIGINE;
    source = null;
  } else {
    origine = String(form.get('Origine') ?? '').trim();
    source = String(form.get('Source') ?? '').trim().slice(0, 200) || null;
  }

  if (!annee || annee < 1980 || annee > 2100) return json({ success: false, message: 'Année invalide.' }, 400);
  if (!SERIES.includes(serie)) return json({ success: false, message: 'Série invalide.' }, 400);
  if (!(MATIERES_ACCEPTEES as readonly string[]).includes(matiere)) {
    return json({ success: false, message: 'Matière invalide.' }, 400);
  }
  if (!SESSIONS.includes(session)) return json({ success: false, message: 'Session invalide.' }, 400);
  if (!TYPES.includes(type)) return json({ success: false, message: 'Type de document invalide.' }, 400);
  if (type === 'corrige') {
    if (!ORIGINES_CORRIGE.includes(origine)) {
      return json({ success: false, message: 'Origine du corrigé invalide.' }, 400);
    }
    if (!source) return json({ success: false, message: "Indiquez la source / l'auteur du corrigé." }, 400);
  }
  if (declaration !== 'oui') {
    return json({ success: false, message: 'Vous devez confirmer la déclaration de droits.' }, 400);
  }

  const fichier = form.get('Fichier') as File | null;
  if (!fichier || fichier.size === 0) return json({ success: false, message: 'Joignez un PDF.' }, 400);
  const v = pdfValide(fichier);
  if (!v.ok) return json({ success: false, message: v.raison }, 400);

  const id = uuid();
  let sujetKey: string | null = null;
  let corrigeKey: string | null = null;
  try {
    // Anti-abus : plafond global de la file et limite par IP sur 24 h.
    const enAttente = (await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM submissions WHERE status = 'pending'`
    ).first()) as { n: number } | null;
    if (enAttente && enAttente.n >= MAX_PENDING_GLOBAL) {
      return json(
        { success: false, message: 'La file de modération est pleine. Réessayez plus tard.' },
        503
      );
    }

    const ipHash = await hashIp(ip);
    if (ipHash) {
      const depuis = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const recent = (await env.DB.prepare(
        `SELECT COUNT(*) AS n FROM submissions WHERE ip_hash = ? AND created_at >= ?`
      )
        .bind(ipHash, depuis)
        .first()) as { n: number } | null;
      if (recent && recent.n >= MAX_PER_IP_24H) {
        return json(
          { success: false, message: 'Trop d\u2019envois depuis cet appareil. Réessayez demain.' },
          429
        );
      }
    }

    // Lecture + contrôle du contenu (en-tête PDF) avant tout stockage.
    const buf = await fichier.arrayBuffer();
    if (!estEnTetePdf(buf)) {
      return json({ success: false, message: "Le fichier n\u2019est pas un PDF valide." }, 400);
    }

    // Stockage R2 (dossier "pending") selon le type de document.
    if (type === 'sujet') {
      sujetKey = `pending/${id}/sujet.pdf`;
      await env.BUCKET.put(sujetKey, buf, { httpMetadata: { contentType: 'application/pdf' } });
    } else {
      corrigeKey = `pending/${id}/corrige.pdf`;
      await env.BUCKET.put(corrigeKey, buf, { httpMetadata: { contentType: 'application/pdf' } });
    }

    // File de modération (aucune donnée de contact n'est collectée ici).
    await env.DB.prepare(
      `INSERT INTO submissions
         (id, created_at, annee, serie, matiere, session, sujet_key, corrige_key, credit, origine, source, ip_hash, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
    )
      .bind(id, new Date().toISOString(), annee, serie, matiere, session, sujetKey, corrigeKey, credit, origine, source, ipHash)
      .run();

    return json({ success: true, id });
  } catch (e) {
    // En cas d'échec après un ou des `put`, on supprime les PDF orphelins.
    if (sujetKey) await env.BUCKET.delete(sujetKey).catch(() => {});
    if (corrigeKey) await env.BUCKET.delete(corrigeKey).catch(() => {});
    return erreurServeur('api/submit', e);
  }
};
