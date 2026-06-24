/// <reference types="@cloudflare/workers-types" />
import type { Env } from './util';

/**
 * Garde d'accès admin.
 *
 * La politique Cloudflare Access posée sur `/admin*` et `/api/admin/*` reste la
 * première barrière, mais on NE se contente PAS de lire l'en-tête
 * `Cf-Access-Authenticated-User-Email` : il est faux-friable si la route n'est
 * pas (ou plus) couverte par Access. On vérifie donc cryptographiquement le
 * jeton signé `Cf-Access-Jwt-Assertion` contre les clés publiques de l'équipe,
 * en contrôlant la signature, l'expiration et l'audience (AUD).
 *
 * Renvoie l'e-mail authentifié, ou `null` si la vérification échoue
 * (fail-closed).
 */

interface Jwk extends JsonWebKey {
  kid: string;
}

// Cache mémoire des clés publiques (par instance d'isolate), rafraîchi à TTL.
let cacheCles: { cles: Map<string, CryptoKey>; expire: number } | null = null;
const TTL_CLES_MS = 60 * 60 * 1000; // 1 h

async function clesPubliques(teamDomain: string): Promise<Map<string, CryptoKey>> {
  const maintenant = Date.now();
  if (cacheCles && cacheCles.expire > maintenant) return cacheCles.cles;

  const res = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error(`certs Access: ${res.status}`);
  const data = (await res.json()) as { keys?: Jwk[] };

  const cles = new Map<string, CryptoKey>();
  for (const jwk of data.keys ?? []) {
    try {
      const cle = await crypto.subtle.importKey(
        'jwk',
        jwk,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['verify']
      );
      if (jwk.kid) cles.set(jwk.kid, cle);
    } catch {
      /* clé ignorée */
    }
  }
  cacheCles = { cles, expire: maintenant + TTL_CLES_MS };
  return cles;
}

function base64UrlVersOctets(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 ? 4 - (b64.length % 4) : 0;
  const bin = atob(b64 + '='.repeat(pad));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function decoderSegmentJson(s: string): any {
  return JSON.parse(new TextDecoder().decode(base64UrlVersOctets(s)));
}

export async function adminEmail(request: Request, env: Env): Promise<string | null> {
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) return null;

  const teamDomain = env.ACCESS_TEAM_DOMAIN;
  const aud = env.ACCESS_AUD;
  if (!teamDomain || !aud) {
    console.error('Access non configuré : ACCESS_TEAM_DOMAIN / ACCESS_AUD manquant.');
    return null; // fail-closed
  }

  const parties = token.split('.');
  if (parties.length !== 3) return null;
  const [enteteB64, payloadB64, signatureB64] = parties;

  let entete: { alg?: string; kid?: string };
  let payload: { exp?: number; nbf?: number; iss?: string; aud?: string | string[]; email?: string };
  try {
    entete = decoderSegmentJson(enteteB64);
    payload = decoderSegmentJson(payloadB64);
  } catch {
    return null;
  }

  if (entete.alg !== 'RS256' || !entete.kid) return null;

  try {
    const cles = await clesPubliques(teamDomain);
    const cle = cles.get(entete.kid);
    if (!cle) return null;
    const valide = await crypto.subtle.verify(
      { name: 'RSASSA-PKCS1-v1_5' },
      cle,
      base64UrlVersOctets(signatureB64),
      new TextEncoder().encode(`${enteteB64}.${payloadB64}`)
    );
    if (!valide) return null;
  } catch (e) {
    console.error('Vérification du jeton Access échouée', e);
    return null;
  }

  // Vérification des revendications (claims).
  const maintenant = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === 'number' && payload.exp < maintenant) return null;
  if (typeof payload.nbf === 'number' && payload.nbf > maintenant) return null;
  if (payload.iss && payload.iss !== `https://${teamDomain}`) return null;
  const auds = Array.isArray(payload.aud) ? payload.aud : payload.aud ? [payload.aud] : [];
  if (!auds.includes(aud)) return null;

  return typeof payload.email === 'string' && payload.email.length > 0 ? payload.email : null;
}
