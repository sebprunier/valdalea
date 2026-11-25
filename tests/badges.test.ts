import { describe, expect, it } from 'vitest';
import { GLOBAL_BADGES } from '../src/content/badges';
import { ALL_BADGES, assessChapter, BADGE_GROUPS, badgesOf, CHAPTERS, globalBadges } from '../src/content/chapitres';
import { SITUATIONS as FIRE_SITUATIONS } from '../src/content/feu';
import { OFF_CHAPTER } from '../src/core/state';

const PLAYABLE = CHAPTERS.filter((chapter) => chapter.playable).map((chapter) => chapter.id);
const nothing = { assets: {}, visited: [], places: 14, finished: [] };

describe('badges de toute la partie', () => {
  it('ne donne rien à qui commence', () => {
    expect(globalBadges(nothing)).toEqual([]);
  });

  it('récompense le kit d’urgence, où qu’il ait été préparé', () => {
    expect(globalBadges({ ...nothing, assets: { kit: OFF_CHAPTER } })).toEqual(['kit']);
    expect(globalBadges({ ...nothing, assets: { kit: 'ete' } })).toEqual(['kit']);
  });

  it('récompense la visite de tous les lieux, pas d’une partie', () => {
    const visited = Array.from({ length: 14 }, (_, i) => `lieu-${i}`);
    expect(globalBadges({ ...nothing, visited: visited.slice(0, 13) })).toEqual([]);
    expect(globalBadges({ ...nothing, visited })).toEqual(['explorateur']);
  });

  it('récompense qui a mené tous les chapitres jusqu’à leur bilan', () => {
    expect(globalBadges({ ...nothing, finished: PLAYABLE.slice(0, 1) })).toEqual([]);
    expect(globalBadges({ ...nothing, finished: PLAYABLE })).toEqual(['reserviste-confirme']);
  });

  it('range tous les badges du jeu en groupes, sans doublon : la partie, puis chaque chapitre', () => {
    expect(BADGE_GROUPS[0].badges.map((badge) => badge.id)).toEqual(GLOBAL_BADGES.map((badge) => badge.id));
    expect(BADGE_GROUPS.slice(1).map((group) => group.chapterId)).toEqual(PLAYABLE);
    for (const id of PLAYABLE) expect(badgesOf(id).length, id).toBeGreaterThan(3);
    expect(new Set(ALL_BADGES.map((badge) => badge.id)).size).toBe(ALL_BADGES.length);
    for (const badge of ALL_BADGES) expect(badge.description.length, badge.id).toBeGreaterThan(15);
  });
});

describe('bilan d’un chapitre mené au bout', () => {
  it('se recalcule à partir de la partie gardée', () => {
    const answers = Object.fromEntries(FIRE_SITUATIONS.map((situation) => [situation.id, situation.choices.find((choice) => choice.correct)!.id]));
    const result = assessChapter('ete', { done: ['lucien-debroussailler', 'lucien-abords', 'lucien-fermer'], answers });
    expect(result).not.toBeNull();
    const levels = Object.fromEntries(result!.stakes.map((s) => [s.stake.id, s.level]));
    expect(levels['maison-lucien']).toBe(2);
    expect(levels['reflexes-feu']).toBe(2);
    expect(levels.hameau).toBe(0);
    expect(result!.badges.map((badge) => badge.id).sort()).toEqual(['debroussailleur', 'maison-close', 'sang-froid']);
  });

  it('n’existe pas pour un chapitre inconnu', () => {
    expect(assessChapter('inconnu', { done: [], answers: {} })).toBeNull();
  });
});
