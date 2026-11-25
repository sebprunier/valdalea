import { describe, expect, it } from 'vitest';
import { CHAPTERS, GRANTS, ownedIn, playbookOf } from '../src/content/chapitres';
import { KIT_AT_HOME, KIT_CONTENTS, KIT_QUESTIONS } from '../src/content/kit';
import { actionMinutes, actionsAt, actionStatus, newChapter, nextPhase, pendingAt, perform, startChapter, type Chapter } from '../src/core/chapter';
import { OFF_CHAPTER } from '../src/core/state';

const PLAYABLE = CHAPTERS.filter((chapter) => chapter.playable).map((chapter) => chapter.id);
/** Le geste du kit dans un chapitre, selon que le joueur a déjà son kit ou non. */
const kitOf = (chapterId: string, assets: Record<string, string> = {}) => {
  // Hors chapitre mis à part : on regarde le geste du chapitre lui-même.
  const found = playbookOf(chapterId, assets).actions.filter((action) => action.grants === 'kit' && action.phase !== 'libre');
  expect(found, chapterId).toHaveLength(1);
  return found[0];
};

describe('le kit d’urgence, commun à tous les chapitres', () => {
  it('se prépare dans chaque chapitre, chez soi, pendant la préparation', () => {
    expect(PLAYABLE.length).toBeGreaterThan(1);
    for (const id of PLAYABLE) {
      const kit = kitOf(id);
      expect(kit.place, id).toBe('domicile');
      expect(kit.phase, id).toBe('preparation');
      expect(kit.title, id).toMatch(/^Préparer/);
      expect(kit.questions, id).toEqual(KIT_QUESTIONS.map((question) => question.id));
      // Les questions sur le contenu du sac sont bien proposées par le chapitre.
      const asked = new Set(playbookOf(id).questions.map((question) => question.id));
      for (const question of KIT_QUESTIONS) expect(asked.has(question.id), `${id} / ${question.id}`).toBe(true);
      expect(GRANTS.get(kit.id), id).toBe('kit');
    }
  });

  it('se vérifie, plus vite et sans question, quand il a été préparé dans un autre chapitre', () => {
    for (const id of PLAYABLE) {
      const first = kitOf(id);
      const later = kitOf(id, { kit: 'un-autre-chapitre' });
      // C'est le même geste : le bilan du chapitre le reconnaît sous ses deux formes.
      expect(later.id, id).toBe(first.id);
      expect(later.title, id).toMatch(/^Vérifier/);
      expect(later.questions, id).toEqual([]);
      expect(later.minutes, id).toBeLessThan(first.minutes);
      expect(later.sources.length, id).toBeGreaterThan(0);
      expect(later.done, id).not.toBe(first.done);
      // Les règles suivent la forme proposée : le temps décompté est celui de la vérification.
      const started = startChapter({ ...newChapter(), phase: 'libre', done: ['mairie-accueil', 'mairie-dicrim'] }, playbookOf(id, { kit: 'un-autre-chapitre' }).actions, playbookOf(id).timing);
      expect(actionMinutes(later, started), id).toBe(later.minutes);
      expect(perform(started, later, playbookOf(id).timing).done, id).toContain(first.id);
    }
  });

  it('reste à préparer dans le chapitre où il l’a été la première fois, même en le rejouant', () => {
    expect(ownedIn({}, 'ete')).toEqual([]);
    expect(ownedIn({ kit: 'ete' }, 'ete')).toEqual([]);
    expect(ownedIn({ kit: 'ete' }, 'automne')).toEqual(['kit']);
    expect(ownedIn({ kit: 'automne' }, 'ete')).toEqual(['kit']);
    expect(ownedIn({ kit: 'automne' }, null)).toEqual(['kit']);
    // Préparé hors chapitre, il vaut pour tous les chapitres.
    for (const id of PLAYABLE) expect(ownedIn({ kit: OFF_CHAPTER }, id), id).toEqual(['kit']);
  });
});

describe('le kit d’urgence, hors chapitre', () => {
  const free: Chapter = { ...newChapter(), phase: 'libre', done: ['mairie-accueil', 'mairie-dicrim'] };
  const offered = (chapter: Chapter, chapterId: string | null, assets: Record<string, string> = {}) =>
    actionsAt(playbookOf(chapterId, assets).actions, chapter, 'domicile').map((action) => action.id);

  it('se prépare chez soi quand on veut : avant de choisir un chapitre, ou après un bilan', () => {
    expect(offered(free, null)).toEqual([KIT_AT_HOME.id]);
    expect(actionStatus(KIT_AT_HOME, free)).toEqual({ state: 'possible', minutes: 0 });
    // Les questions sur le contenu du sac sont disponibles même sans chapitre.
    const asked = new Set(playbookOf(null).questions.map((question) => question.id));
    for (const id of KIT_AT_HOME.questions ?? []) expect(asked.has(id), id).toBe(true);
    for (const id of PLAYABLE) {
      const { actions, timing } = playbookOf(id);
      let chapter = startChapter(free, actions, timing);
      // Pendant un chapitre, c'est le geste du chapitre qui est proposé, pas le geste libre.
      expect(offered(chapter, id), id).not.toContain(KIT_AT_HOME.id);
      while (chapter.phase !== 'bilan') chapter = nextPhase(chapter, timing);
      expect(offered(chapter, id), id).toEqual([KIT_AT_HOME.id]);
    }
  });

  it('n’est pas proposé pendant le prologue, et ne fait pas signe depuis la carte', () => {
    expect(offered(newChapter(), null)).toEqual([]);
    expect(pendingAt(playbookOf(null).actions, free, 'domicile')).toBe(0);
  });

  it('n’est plus à préparer une fois prêt, où qu’il l’ait été', () => {
    expect(offered(free, null, { kit: OFF_CHAPTER })).toEqual([]);
    expect(offered(free, null, { kit: 'automne' })).toEqual([]);
    expect(GRANTS.get(KIT_AT_HOME.id)).toBe('kit');
  });

  it('se retrouve chez soi, avec la liste officielle de son contenu', () => {
    expect(KIT_CONTENTS).toHaveLength(14);
    expect(KIT_CONTENTS[0]).toMatch(/radio à piles/);
    expect(KIT_CONTENTS.join(' ')).toMatch(/6 litres par personne/);
  });
});
