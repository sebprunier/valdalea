import { describe, expect, it } from 'vitest';
import { BROCHURE, brochureSources } from '../src/content/brochure';
import { ALL_ACTIONS, CHAPTERS } from '../src/content/chapitres';
import { DICRIM } from '../src/content/dicrim';
import { DOCUMENT_IDS, DOCUMENTS, earnedDocuments, earnedIn, findDocument, shelf } from '../src/content/documents';
import { ASSET_IDS, SOURCES } from '../src/content/model';
import { newChapter } from '../src/core/chapter';
import { newGame, withDocuments } from '../src/core/state';

const actionIds = new Set(ALL_ACTIONS.map((action) => action.id));
const game = newGame({ x: 0, y: 0 });
const PROLOGUE = ['mairie-accueil', 'mairie-dicrim'];

describe('documents du téléphone', () => {
  it('range le DICRIM en premier, puis la brochure, puis les fiches officielles', () => {
    expect(DOCUMENTS[0].id).toBe('dicrim');
    expect(DOCUMENTS.map((document) => document.kind)).toEqual(['livret', 'livret', 'fiche', 'fiche', 'fiche', 'fiche']);
    expect(DOCUMENT_IDS.size).toBe(DOCUMENTS.length);
    expect(findDocument('brochure-usine')?.title).toBe(BROCHURE.title);
    expect(findDocument('inconnu')).toBeUndefined();
  });

  it('ne reproduit aucune fiche officielle : chacune renvoie à sa page, sur un site de l’État', () => {
    for (const document of DOCUMENTS) {
      expect(document.summary.length, document.id).toBeGreaterThan(30);
      if (document.kind === 'livret') {
        expect(document.source, document.id).toBeUndefined();
        continue;
      }
      const source = SOURCES[document.source!];
      expect(source, document.id).toBeDefined();
      expect(source.url, document.id).toMatch(/^https:\/\/www\.georisques\.gouv\.fr\//);
      // Le titre et l'éditeur affichés sont ceux de la page.
      expect(document.title, document.id).toBe(source.titre);
      expect(document.from, document.id).toBe(source.editeur);
    }
  });

  it('s’obtient en jouant : par un geste, un chapitre ou un acquis qui existent', () => {
    for (const { id, earnedBy } of DOCUMENTS) {
      if ('action' in earnedBy) expect(actionIds.has(earnedBy.action), id).toBe(true);
      else if ('chapter' in earnedBy) expect(CHAPTERS.some((chapter) => chapter.playable && chapter.id === earnedBy.chapter), id).toBe(true);
      else expect(ASSET_IDS as readonly string[], id).toContain(earnedBy.asset);
    }
    // Chaque chapitre jouable remet la fiche officielle de son risque.
    for (const chapter of CHAPTERS.filter((info) => info.playable)) {
      const sheet = DOCUMENTS.filter((document) => 'chapter' in document.earnedBy && document.earnedBy.chapter === chapter.id);
      expect(sheet.map((document) => document.kind), chapter.id).toEqual(['fiche']);
    }
  });

  it('donne chaque document au bon moment', () => {
    expect(earnedDocuments({ actions: [], chapters: [], assets: [] })).toEqual([]);
    expect(earnedDocuments({ actions: PROLOGUE, chapters: [], assets: [] })).toEqual(['dicrim']);
    expect(earnedDocuments({ actions: PROLOGUE, chapters: ['ete'], assets: ['kit'] })).toEqual(['dicrim', 'fiche-kit', 'fiche-feu']);
    expect(earnedDocuments({ actions: [...PROLOGUE, 'mairie-brochures'], chapters: ['hiver', 'automne'], assets: [] })).toEqual(['dicrim', 'brochure-usine', 'fiche-inondation', 'fiche-industriel']);
  });

  it('lit dans une partie ce qu’elle a valu : gestes en cours ou passés, chapitres commencés, kit', () => {
    expect(earnedIn(game)).toEqual([]);
    // Le prologue fait, aucun chapitre choisi : le DICRIM seulement.
    const free = { ...game, chapter: { ...newChapter(), phase: 'libre' as const, done: PROLOGUE } };
    expect(earnedIn(free)).toEqual(['dicrim']);
    // Un chapitre choisi n'est commencé qu'une fois sa préparation entamée.
    expect(earnedIn({ ...free, chapterId: 'hiver' })).toEqual(['dicrim']);
    const started = { ...free, chapterId: 'hiver', chapter: { ...free.chapter, phase: 'preparation' as const } };
    expect(earnedIn(started)).toEqual(['dicrim', 'fiche-industriel']);
    expect(earnedIn({ ...started, chapter: { ...started.chapter, done: [...PROLOGUE, 'mairie-brochures'] } })).toEqual(['dicrim', 'brochure-usine', 'fiche-industriel']);
    // Le chapitre mené au bout puis un autre commencé : la brochure prise alors n'est pas perdue.
    const later = {
      ...free,
      chapterId: 'automne',
      chapter: { ...free.chapter, phase: 'vigilance' as const },
      results: { hiver: { done: [...PROLOGUE, 'mairie-brochures'], answers: {} } },
      record: { hiver: 60 },
      assets: { kit: 'hiver' },
    };
    expect(earnedIn(later)).toEqual(['dicrim', 'brochure-usine', 'fiche-kit', 'fiche-inondation', 'fiche-industriel']);
  });

  it('garde les documents une fois rangés, sans doublon, et les montre dans l’ordre du catalogue', () => {
    const one = withDocuments(game, ['fiche-feu']);
    expect(withDocuments(one, ['fiche-feu'])).toBe(one);
    const two = withDocuments(one, ['dicrim', 'fiche-feu']);
    expect(two.documents).toEqual(['fiche-feu', 'dicrim']);
    expect(shelf(two.documents).map((document) => document.id)).toEqual(['dicrim', 'fiche-feu']);
    expect(shelf(['inconnu'])).toEqual([]);
  });
});

describe('brochure de l’usine', () => {
  const risk = DICRIM.risks.find((entry) => entry.id === 'industriel')!;
  const texts = [...BROCHURE.why.paragraphs, ...BROCHURE.where.paragraphs, ...BROCHURE.signal.paragraphs, BROCHURE.signal.figure, BROCHURE.more.text, ...BROCHURE.conduct.groups.flatMap((group) => group.items)];

  it('cite des sources officielles connues', () => {
    for (const id of brochureSources()) expect(SOURCES[id], id).toBeDefined();
    expect(BROCHURE.conduct.sources).toContain('georisques-industriel');
  });

  it('ne dit rien de plus que le DICRIM : la même conduite à tenir, le même site, le même périmètre', () => {
    expect(BROCHURE.conduct.groups).toBe(risk.reflexes);
    expect(BROCHURE.conduct.groups.map((group) => group.heading)).toEqual(['Se préparer', "Dès le signal d'alerte", "Jusqu'à la fin de l'alerte"]);
    expect(BROCHURE.why.paragraphs[0]).toBe(risk.local[0]);
    // Le périmètre : la phrase du DICRIM, où « son plan » devient « le plan de l'usine ».
    expect(BROCHURE.where.paragraphs[0]).toBe(risk.local[1].replace("de son plan particulier d'intervention (PPI)", "du plan particulier d'intervention (PPI) de l'usine"));
    expect(BROCHURE.where.mapSummary).toBe(risk.mapSummary);
  });

  it('décrit le signal d’alerte comme sa source : trois fois 1 minute 41, puis 30 secondes', () => {
    expect(BROCHURE.signal.paragraphs[0]).toMatch(/trois fois pendant 1 minute et 41 secondes/);
    expect(BROCHURE.signal.paragraphs[1]).toMatch(/30 secondes/);
    expect(BROCHURE.signal.figure).toMatch(/trois fois/);
    expect(BROCHURE.signal.figure).toMatch(/30 secondes/);
  });

  it('n’invente aucune donnée technique : ni quantité, ni distance, ni numéro, ni fréquence', () => {
    for (const text of texts) {
      expect(text).not.toMatch(/tonnes?|kilom|\bkm\b|\bmètres?\b|MHz|kHz|\b0\d(?:[ .]\d{2}){3,}\b|chauffage/i);
      // Les seuls chiffres sont ceux du signal d'alerte, et le « 72 heures » du kit.
      for (const number of text.match(/\d+/g) ?? []) expect(['1', '41', '30', '72'], text).toContain(number);
    }
  });

  it('se présente pour ce qu’elle est : un document fictif, édité comme le dit la source', () => {
    expect(BROCHURE.editor).toMatch(/en lien avec la préfecture/);
    expect(findDocument('brochure-usine')?.earnedBy).toEqual({ action: 'mairie-brochures' });
  });
});
