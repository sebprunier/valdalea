import { describe, expect, it } from 'vitest';
import { clearGame, loadGame, memoryStorage, saveGame, type LoadContext } from '../src/core/save';
import { markVisited, movePlayer, newGame, withNews, withoutNews } from '../src/core/state';
import { Store } from '../src/core/store';

const context: LoadContext = {
  placeIds: new Set(['mairie', 'ecole']),
  actionIds: new Set(['mairie-accueil', 'maison-kit']),
  situationChoices: new Map([['enfants', new Set(['ecole', 'a-pied'])]]),
  badgeIds: new Set(['kit']),
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

  it('reprend une partie de la version 1 avec un chapitre neuf', () => {
    const storage = memoryStorage();
    storage.setItem('jcrm:partie', JSON.stringify({ version: 1, player: { x: 5, y: 5 }, visited: ['mairie'], settings: { reducedMotion: true } }));
    const state = loadGame(storage, context);
    expect(state?.version).toBe(2);
    expect(state?.visited).toEqual(['mairie']);
    expect(state?.chapter.phase).toBe('accueil');
    expect(state?.badges).toEqual([]);
    expect(state?.settings).toEqual({ reducedMotion: true, hazardLayer: null, zoom: null });
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
    expect(state?.chapter).toEqual({ phase: 'crise', minutesLeft: 0, done: ['maison-kit'], answers: { enfants: 'ecole' } });
    expect(state?.badges).toEqual(['kit']);
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
    write({ news: ['bilan', 'inconnue', 'bilan', 3], settings: { zoom: 1 } });
    expect(loadGame(storage, context)?.news).toEqual(['bilan']);
    expect(loadGame(storage, context)?.settings.zoom).toBe(1);
    // Une sauvegarde d'avant ces réglages, ou une valeur aberrante : valeurs par défaut.
    write({ settings: { zoom: 2.5 } });
    expect(loadGame(storage, context)?.news).toEqual([]);
    expect(loadGame(storage, context)?.settings.zoom).toBeNull();
    write({ settings: { zoom: -1 } });
    expect(loadGame(storage, context)?.settings.zoom).toBeNull();
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
    expect(withNews(state, 'bilan').news).toEqual(['alertes', 'bilan']);
    expect(withoutNews(state, 'alertes').news).toEqual([]);
    expect(withoutNews(state, 'dicrim')).toBe(state);
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
