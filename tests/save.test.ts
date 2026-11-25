import { describe, expect, it } from 'vitest';
import { clearGame, loadGame, memoryStorage, saveGame, type LoadContext } from '../src/core/save';
import { markVisited, movePlayer, newGame, withAsset, withNews, withoutNews, withRecord, withResult } from '../src/core/state';
import { Store } from '../src/core/store';

const context: LoadContext = {
  placeIds: new Set(['mairie', 'ecole']),
  actionIds: new Set(['mairie-accueil', 'mairie-dicrim', 'maison-kit']),
  chapterIds: new Set(['automne']),
  legacy: { chapterId: 'automne', prologue: ['mairie-accueil', 'mairie-dicrim'] },
  situationChoices: new Map([['enfants', new Set(['ecole', 'a-pied'])]]),
  badgeIds: new Set(['kit']),
  grants: new Map([['maison-kit', 'kit']]),
  riskIds: new Set(['inondation', 'cavites']),
  isFree: (pos) => pos.x >= 0,
  spawn: { x: 100, y: 100 },
};

describe('sauvegarde', () => {
  it('relit ce qui a été enregistré', () => {
    const storage = memoryStorage();
    let state = newGame({ x: 10, y: 20 });
    state = markVisited(state, 'mairie');
    state = movePlayer(state, { x: 42, y: 43 });
    state = withAsset(state, 'kit', 'automne');
    expect(saveGame(storage, state)).toBe(true);
    expect(loadGame(storage, context)).toEqual(state);
  });

  it("renvoie null s'il n'y a pas de partie", () => {
    expect(loadGame(memoryStorage(), context)).toBeNull();
  });

  it('ignore une sauvegarde corrompue ou d’une autre version', () => {
    const storage = memoryStorage();
    storage.setItem('jcrm:partie', '{pas du json');
    expect(loadGame(storage, context)).toBeNull();
    storage.setItem('jcrm:partie', JSON.stringify({ version: 99, player: { x: 1, y: 1 } }));
    expect(loadGame(storage, context)).toBeNull();
    storage.setItem('jcrm:partie', JSON.stringify({ version: 2, player: { x: 'a', y: 1 } }));
    expect(loadGame(storage, context)).toBeNull();
    storage.setItem('jcrm:partie', JSON.stringify([1, 2, 3]));
    expect(loadGame(storage, context)).toBeNull();
  });

  it('écarte les lieux inconnus et les doublons', () => {
    const storage = memoryStorage();
    storage.setItem(
      'jcrm:partie',
      JSON.stringify({ version: 2, player: { x: 5, y: 5 }, visited: ['mairie', 'disparu', 'mairie', 12], settings: {} }),
    );
    expect(loadGame(storage, context)?.visited).toEqual(['mairie']);
  });

  it('replace le joueur au départ si sa position n’est plus valable', () => {
    const storage = memoryStorage();
    storage.setItem('jcrm:partie', JSON.stringify({ version: 2, player: { x: -50, y: 5 }, visited: [] }));
    expect(loadGame(storage, context)?.player).toEqual(context.spawn);
  });

  it('reprend une partie de la version 1 au prologue', () => {
    const storage = memoryStorage();
    storage.setItem('jcrm:partie', JSON.stringify({ version: 1, player: { x: 5, y: 5 }, visited: ['mairie'], settings: { reducedMotion: true } }));
    const state = loadGame(storage, context);
    expect(state?.version).toBe(3);
    expect(state?.chapterId).toBeNull();
    expect(state?.visited).toEqual(['mairie']);
    expect(state?.chapter.phase).toBe('accueil');
    expect(state?.badges).toEqual([]);
    expect(state?.settings).toEqual({ reducedMotion: true, hazardLayer: null, zoom: null, sound: true });
  });

  it('nettoie un chapitre sauvegardé : actions, réponses et badges inconnus sont écartés', () => {
    const storage = memoryStorage();
    storage.setItem(
      'jcrm:partie',
      JSON.stringify({
        version: 2,
        player: { x: 5, y: 5 },
        chapter: { phase: 'crise', minutesLeft: -4, done: ['maison-kit', 'inventee'], answers: { enfants: 'ecole', cave: 'descendre', autre: 3 } },
        badges: ['kit', 'triche'],
      }),
    );
    const state = loadGame(storage, context);
    // Partie de la version 2 : elle était dans le seul chapitre d'alors, et reçoit les acquis du prologue.
    expect(state?.chapter).toEqual({ phase: 'crise', minutesLeft: 0, done: ['mairie-accueil', 'mairie-dicrim', 'maison-kit'], answers: { enfants: 'ecole' } });
    expect(state?.chapterId).toBe('automne');
    expect(state?.badges).toEqual(['kit']);
  });

  it('reprend une partie de la version 2 restée à l’accueil sans lui prêter de chapitre', () => {
    const storage = memoryStorage();
    storage.setItem('jcrm:partie', JSON.stringify({ version: 2, player: { x: 5, y: 5 }, chapter: { phase: 'accueil', minutesLeft: 0, done: [], answers: {} } }));
    const state = loadGame(storage, context);
    expect(state?.chapter.phase).toBe('accueil');
    expect(state?.chapterId).toBeNull();
  });

  it('reprend le chapitre choisi et les indices obtenus, en écartant ce qui est inconnu', () => {
    const storage = memoryStorage();
    const write = (extra: object) => storage.setItem('jcrm:partie', JSON.stringify({ version: 3, player: { x: 5, y: 5 }, ...extra }));
    write({ chapterId: 'automne', chapter: { phase: 'vigilance', minutesLeft: 90, done: ['mairie-accueil', 'mairie-dicrim'], answers: {} }, record: { automne: 71.4, hiver: 50, ete: 'beaucoup' } });
    let state = loadGame(storage, context);
    expect(state?.chapterId).toBe('automne');
    expect(state?.chapter.phase).toBe('vigilance');
    expect(state?.record).toEqual({ automne: 71 });
    // Un chapitre en cours qui n'existe plus : retour au choix, prologue acquis.
    write({ chapterId: 'disparu', chapter: { phase: 'vigilance', minutesLeft: 90, done: ['mairie-accueil', 'mairie-dicrim'], answers: {} } });
    state = loadGame(storage, context);
    expect(state?.chapterId).toBeNull();
    expect(state?.chapter).toEqual({ phase: 'libre', minutesLeft: 0, done: ['mairie-accueil', 'mairie-dicrim'], answers: {} });
  });

  it('reprend ce que le joueur garde d’un chapitre à l’autre, en écartant ce qui est inconnu', () => {
    const storage = memoryStorage();
    const write = (extra: object) => storage.setItem('jcrm:partie', JSON.stringify({ version: 3, player: { x: 5, y: 5 }, ...extra }));
    write({ assets: { kit: 'automne', jetpack: 'automne' } });
    expect(loadGame(storage, context)?.assets).toEqual({ kit: 'automne' });
    write({ assets: { kit: 'disparu' } });
    expect(loadGame(storage, context)?.assets).toEqual({});
    // Préparé hors chapitre : il vaut pour tous.
    write({ assets: { kit: 'hors-chapitre' } });
    expect(loadGame(storage, context)?.assets).toEqual({ kit: 'hors-chapitre' });
    write({ assets: ['kit'] });
    expect(loadGame(storage, context)?.assets).toEqual({});
    // Une partie d'avant les acquis, enregistrée en cours de chapitre : le kit déjà préparé est retenu.
    write({ chapterId: 'automne', chapter: { phase: 'preparation', minutesLeft: 200, done: ['mairie-accueil', 'mairie-dicrim', 'maison-kit'], answers: {} } });
    expect(loadGame(storage, context)?.assets).toEqual({ kit: 'automne' });
    write({ chapterId: 'automne', chapter: { phase: 'preparation', minutesLeft: 200, done: ['mairie-accueil', 'mairie-dicrim'], answers: {} } });
    expect(loadGame(storage, context)?.assets).toEqual({});
  });

  it('garde la dernière partie de chaque chapitre mené au bout, pour en redonner le bilan', () => {
    const storage = memoryStorage();
    const write = (extra: object) => storage.setItem('jcrm:partie', JSON.stringify({ version: 3, player: { x: 5, y: 5 }, ...extra }));
    write({ results: { automne: { done: ['maison-kit', 'inventee'], answers: { enfants: 'ecole', cave: 'descendre' } }, disparu: { done: [], answers: {} }, hiver: 3 } });
    expect(loadGame(storage, context)?.results).toEqual({ automne: { done: ['maison-kit'], answers: { enfants: 'ecole' } } });
    // Une partie d'avant, enregistrée sur son bilan : il est gardé.
    write({ chapterId: 'automne', chapter: { phase: 'bilan', minutesLeft: 0, done: ['mairie-accueil', 'mairie-dicrim', 'maison-kit'], answers: { enfants: 'a-pied' } } });
    expect(loadGame(storage, context)?.results).toEqual({ automne: { done: ['mairie-accueil', 'mairie-dicrim', 'maison-kit'], answers: { enfants: 'a-pied' } } });
    // En cours de chapitre : rien à garder encore.
    write({ chapterId: 'automne', chapter: { phase: 'crise', minutesLeft: 0, done: ['mairie-accueil', 'mairie-dicrim'], answers: {} } });
    expect(loadGame(storage, context)?.results).toEqual({});
  });

  it('repart d’un chapitre neuf si la phase sauvegardée est inconnue', () => {
    const storage = memoryStorage();
    storage.setItem('jcrm:partie', JSON.stringify({ version: 2, player: { x: 5, y: 5 }, chapter: { phase: 'hiver', done: ['maison-kit'] } }));
    expect(loadGame(storage, context)?.chapter.phase).toBe('accueil');
  });

  it('reprend la carte de risque affichée, y compris depuis l’ancien format oui/non', () => {
    const storage = memoryStorage();
    const write = (hazardLayer: unknown) => storage.setItem('jcrm:partie', JSON.stringify({ version: 2, player: { x: 5, y: 5 }, settings: { hazardLayer } }));
    write(true);
    expect(loadGame(storage, context)?.settings.hazardLayer).toBe('inondation');
    write('cavites');
    expect(loadGame(storage, context)?.settings.hazardLayer).toBe('cavites');
    write('inconnue');
    expect(loadGame(storage, context)?.settings.hazardLayer).toBeNull();
    write(false);
    expect(loadGame(storage, context)?.settings.hazardLayer).toBeNull();
  });

  it('reprend les nouveautés du téléphone et le niveau de zoom, en écartant ce qui est inconnu', () => {
    const storage = memoryStorage();
    const write = (extra: object) => storage.setItem('jcrm:partie', JSON.stringify({ version: 2, player: { x: 5, y: 5 }, ...extra }));
    write({ news: ['badges', 'inconnue', 'badges', 3], settings: { zoom: 1 } });
    expect(loadGame(storage, context)?.news).toEqual(['badges']);
    expect(loadGame(storage, context)?.settings.zoom).toBe(1);
    // Une sauvegarde d'avant ces réglages, ou une valeur aberrante : valeurs par défaut.
    write({ settings: { zoom: 2.5 } });
    expect(loadGame(storage, context)?.news).toEqual([]);
    expect(loadGame(storage, context)?.settings.zoom).toBeNull();
    write({ settings: { zoom: -1 } });
    expect(loadGame(storage, context)?.settings.zoom).toBeNull();
  });

  it('garde le son actif tant que le joueur ne l’a pas coupé', () => {
    const storage = memoryStorage();
    const write = (settings: object) => storage.setItem('jcrm:partie', JSON.stringify({ version: 2, player: { x: 5, y: 5 }, settings }));
    write({});
    expect(loadGame(storage, context)?.settings.sound).toBe(true);
    write({ sound: false });
    expect(loadGame(storage, context)?.settings.sound).toBe(false);
    write({ sound: 'oui' });
    expect(loadGame(storage, context)?.settings.sound).toBe(true);
  });

  it('efface la partie', () => {
    const storage = memoryStorage();
    saveGame(storage, newGame({ x: 1, y: 1 }));
    clearGame(storage);
    expect(loadGame(storage, context)).toBeNull();
  });

  it('signale un échec d’écriture sans lever d’erreur', () => {
    const full = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => undefined,
    };
    expect(saveGame(full, newGame({ x: 1, y: 1 }))).toBe(false);
  });
});

describe('état', () => {
  it('ne recrée pas l’état quand rien ne change', () => {
    const state = markVisited(newGame({ x: 1, y: 1 }), 'mairie');
    expect(markVisited(state, 'mairie')).toBe(state);
    expect(movePlayer(state, { x: 1, y: 1 })).toBe(state);
  });

  it('signale une nouveauté une seule fois, et la retire quand elle a été vue', () => {
    const state = withNews(newGame({ x: 1, y: 1 }), 'alertes');
    expect(withNews(state, 'alertes')).toBe(state);
    expect(withNews(state, 'badges').news).toEqual(['alertes', 'badges']);
    expect(withoutNews(state, 'alertes').news).toEqual([]);
    expect(withoutNews(state, 'dicrim')).toBe(state);
  });

  it('retient le premier chapitre où un acquis a été obtenu', () => {
    const state = withAsset(newGame({ x: 1, y: 1 }), 'kit', 'ete');
    expect(state.assets).toEqual({ kit: 'ete' });
    expect(withAsset(state, 'kit', 'automne')).toBe(state);
  });

  it('garde la partie achevée sans la lier à celle qui continue', () => {
    const chapter = { phase: 'bilan' as const, minutesLeft: 0, done: ['maison-kit'], answers: { enfants: 'ecole' } };
    const state = withResult(newGame({ x: 1, y: 1 }), 'automne', chapter);
    expect(state.results.automne).toEqual({ done: ['maison-kit'], answers: { enfants: 'ecole' } });
    expect(state.results.automne.done).not.toBe(chapter.done);
  });

  it('ne retient que le meilleur indice d’un chapitre', () => {
    const state = withRecord(newGame({ x: 1, y: 1 }), 'automne', 57);
    expect(state.record).toEqual({ automne: 57 });
    expect(withRecord(state, 'automne', 43)).toBe(state);
    expect(withRecord(state, 'automne', 86).record).toEqual({ automne: 86 });
  });

  it('prévient les abonnés uniquement en cas de changement', () => {
    const store = new Store(newGame({ x: 1, y: 1 }));
    let calls = 0;
    const unsubscribe = store.subscribe(() => calls++);
    store.update((s) => s);
    store.update((s) => markVisited(s, 'ecole'));
    unsubscribe();
    store.update((s) => markVisited(s, 'mairie'));
    expect(calls).toBe(1);
  });
});
