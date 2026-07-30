import { describe, it, expect } from 'vitest';
import {
  cleSujet,
  statutSujet,
  titreSujet,
  styleMatiere,
  styleSerie,
  libelleStatut,
  CLASSES_PASTILLE,
  calculerManques,
  anneesCouvrables,
  ANNEE_MIN,
} from './data';

const base = { annee: 2020, serie: 'C', matiere: 'Mathématiques', session: 'Normale' };

describe('cleSujet', () => {
  it('assemble année·série·matière·session', () => {
    expect(cleSujet(base)).toBe('2020|C|Mathématiques|Normale');
  });

  it('distingue deux sessions différentes', () => {
    expect(cleSujet({ ...base, session: 'Remplacement' })).not.toBe(cleSujet(base));
  });
});

describe('statutSujet', () => {
  it("'complet' quand sujet et corrigé sont présents", () => {
    expect(statutSujet({ ...base, sujetPdf: '/a.pdf', corrigePdf: '/b.pdf' })).toBe('complet');
  });

  it("'sujet' quand seul le sujet est présent", () => {
    expect(statutSujet({ ...base, sujetPdf: '/a.pdf' })).toBe('sujet');
  });

  it("'corrige' quand seul le corrigé est présent", () => {
    expect(statutSujet({ ...base, corrigePdf: '/b.pdf' })).toBe('corrige');
  });

  it("'a-venir' quand aucun PDF n'est présent", () => {
    expect(statutSujet({ ...base })).toBe('a-venir');
  });

  it('chaque statut a un libellé', () => {
    expect(libelleStatut.complet).toBeTruthy();
    expect(libelleStatut['a-venir']).toBeTruthy();
  });
});

describe('titreSujet', () => {
  it('formate un titre lisible', () => {
    expect(titreSujet(base)).toBe('Baccalauréat 2020 — Série C — Mathématiques');
  });
});

describe('styleMatiere', () => {
  it('renvoie le style dédié pour une matière connue', () => {
    const st = styleMatiere('Mathématiques');
    expect(st.icon).toBe('calculator');
    expect(st.classe).toBe('pastille-maths');
  });

  it('retombe sur un style générique déterministe pour une matière inconnue', () => {
    const a = styleMatiere('Latin');
    const b = styleMatiere('Latin');
    expect(a.icon).toBe('file');
    expect(a).toEqual(b); // déterministe (basé sur un hash du nom)
    expect(a.classe).toMatch(/^pastille-ramp-\d$/);
  });

  it("ne renvoie que des classes de l'ensemble fini défini dans global.css", () => {
    for (const matiere of ['Mathématiques', 'SVT', 'Latin', 'Musique', '']) {
      expect(CLASSES_PASTILLE.has(styleMatiere(matiere).classe)).toBe(true);
    }
  });
});

describe('styleSerie', () => {
  it('connaît A, C et D (indifférent à la casse)', () => {
    expect(styleSerie('A').classe).toBe('pastille-serie-a');
    expect(styleSerie('d').classe).toBe('pastille-serie-d');
  });

  it('retombe sur la pastille par défaut pour une série inconnue', () => {
    expect(styleSerie('Z').classe).toBe('pastille-serie-defaut');
    expect(CLASSES_PASTILLE.has(styleSerie('Z').classe)).toBe(true);
  });
});

describe('anneesCouvrables', () => {
  it('va de ANNEE_MIN à l’année demandée, incluse', () => {
    const a = anneesCouvrables(ANNEE_MIN + 2);
    expect(a).toEqual([ANNEE_MIN, ANNEE_MIN + 1, ANNEE_MIN + 2]);
  });

  it('ne renvoie jamais de plage vide, même pour une année antérieure', () => {
    expect(anneesCouvrables(ANNEE_MIN - 5)).toEqual([ANNEE_MIN]);
  });
});

describe('calculerManques', () => {
  // Taxonomie réduite : 1 série, 2 matières, 2 années → 4 cases possibles.
  const taxo = { C: ['Mathématiques', 'Philosophie'] };
  const annees = [2020, 2021];

  it('classe chaque case selon les PDF réellement présents', () => {
    const m = calculerManques(
      [
        { annee: 2020, serie: 'C', matiere: 'Mathématiques', sujetPdf: '/a.pdf', corrigePdf: '/b.pdf' },
        { annee: 2021, serie: 'C', matiere: 'Mathématiques', sujetPdf: '/c.pdf' },
      ],
      annees,
      taxo
    );
    expect(m.total).toBe(4);
    expect(m.complets).toBe(1);
    expect(m.sansCorrige).toBe(1);
    expect(m.absents).toBe(2); // les deux années de Philosophie
  });

  it('repère les matières entièrement vides', () => {
    const m = calculerManques(
      [{ annee: 2020, serie: 'C', matiere: 'Mathématiques', sujetPdf: '/a.pdf' }],
      annees,
      taxo
    );
    expect(m.matieresVides).toEqual(['Philosophie']);
  });

  it('repère les années entièrement vides', () => {
    const m = calculerManques(
      [{ annee: 2020, serie: 'C', matiere: 'Mathématiques', sujetPdf: '/a.pdf' }],
      annees,
      taxo
    );
    expect(m.anneesVides).toEqual([2021]);
  });

  it('ne compte pas comme rempli un sujet dépourvu de PDF', () => {
    const m = calculerManques(
      [{ annee: 2020, serie: 'C', matiere: 'Mathématiques' }],
      annees,
      taxo
    );
    expect(m.absents).toBe(4);
    expect(m.matieresVides).toContain('Mathématiques');
  });

  it('reporte le slug de la fiche existante pour permettre le lien', () => {
    const m = calculerManques(
      [
        {
          annee: 2020,
          serie: 'C',
          matiere: 'Mathématiques',
          sujetPdf: '/a.pdf',
          slug: '2020-serie-c-mathematiques',
        },
      ],
      annees,
      taxo
    );
    const c = m.cases.find((x) => x.annee === 2020 && x.matiere === 'Mathématiques');
    expect(c?.slug).toBe('2020-serie-c-mathematiques');
    expect(m.cases.find((x) => x.etat === 'absent')?.slug).toBeUndefined();
  });

  it('sans aucun sujet, toutes les cases sont absentes', () => {
    const m = calculerManques([], annees, taxo);
    expect(m.absents).toBe(m.total);
    expect(m.matieresVides).toEqual(['Mathématiques', 'Philosophie']);
    expect(m.anneesVides).toEqual([2021, 2020]);
  });
});
