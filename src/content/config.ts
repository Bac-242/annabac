import { defineCollection, z } from 'astro:content';

/**
 * Séries du baccalauréat congolais (enseignement général).
 * Un fichier Markdown par série, décrivant son intitulé.
 */
const series = defineCollection({
  type: 'content',
  schema: z.object({
    code: z.string(), // ex: "D", "A1"
    intitule: z.string(),
    filiere: z.enum(['Générale', 'Technique']),
    couleur: z.string().default('emerald'),
    ordre: z.number().default(99),
  }),
});

/**
 * Sujets de la bibliothèque. POC : une simple fiche = métadonnées de
 * classement + un PDF du sujet et/ou un PDF du corrigé (les deux optionnels).
 * Aucun corrigé rédigé : seuls les documents PDF font foi.
 */
const sujets = defineCollection({
  type: 'content',
  schema: z.object({
    annee: z.number().int(),
    serie: z.string(), // référence le `code` d'une série
    matiere: z.string(),
    session: z.enum(['Normale', 'Remplacement', 'Spéciale']).default('Normale'),
    sujetPdf: z.string().optional(), // chemin public vers le PDF du sujet
    corrigePdf: z.string().optional(), // chemin public vers le PDF du corrigé
    source: z.string().optional(), // attribution (auteur / origine des documents)
    credit: z.string().optional(), // crédit public du contributeur (pseudonyme)
  }),
});

export const collections = { series, sujets };
