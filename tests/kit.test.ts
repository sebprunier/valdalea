import { describe, expect, it } from 'vitest';
import { CHAPTERS, GRANTS, ownedIn, playbookOf } from '../src/content/chapitres';
import { KIT_QUESTIONS } from '../src/content/kit';
import { actionMinutes, newChapter, perform, startChapter } from '../src/core/chapter';

const PLAYABLE = CHAPTERS.filter((chapter) => chapter.playable).map((chapter) => chapter.id);
/** Le geste du kit dans un chapitre, selon que le joueur a déjà son kit ou non. */
const kitOf = (chapterId: string, owned: string[] = []) => {
  const found = playbookOf(chapterId, owned).actions.filter((action) => action.grants === 'kit');
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
      const later = kitOf(id, ['kit']);
      // C'est le même geste : le bilan du chapitre le reconnaît sous ses deux formes.
      expect(later.id, id).toBe(first.id);
      expect(later.title, id).toMatch(/^Vérifier/);
      expect(later.questions, id).toEqual([]);
      expect(later.minutes, id).toBeLessThan(first.minutes);
      expect(later.sources.length, id).toBeGreaterThan(0);
      expect(later.done, id).not.toBe(first.done);
      // Les règles suivent la forme proposée : le temps décompté est celui de la vérification.
      const started = startChapter({ ...newChapter(), phase: 'libre', done: ['mairie-accueil', 'mairie-dicrim'] }, playbookOf(id, ['kit']).actions, playbookOf(id).timing);
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
  });
});
