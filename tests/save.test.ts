import { describe, expect, it } from 'vitest';
import { clearGame, loadGame, memoryStorage, saveGame, type LoadContext } from '../src/core/save';
import { markVisited, movePlayer, newGame } from '../src/core/state';
import { Store } from '../src/core/store';

const context: LoadContext = {
  placeIds: new Set(['mairie', 'ecole']),
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
    storage.setItem('jcrm:partie', JSON.stringify({ version: 1, player: { x: 'a', y: 1 } }));
    expect(loadGame(storage, context)).toBeNull();
    storage.setItem('jcrm:partie', JSON.stringify([1, 2, 3]));
    expect(loadGame(storage, context)).toBeNull();
  });

  it('écarte les lieux inconnus et les doublons', () => {
    const storage = memoryStorage();
    storage.setItem(
      'jcrm:partie',
      JSON.stringify({ version: 1, player: { x: 5, y: 5 }, visited: ['mairie', 'disparu', 'mairie', 12], settings: {} }),
    );
    expect(loadGame(storage, context)?.visited).toEqual(['mairie']);
  });

  it('replace le joueur au départ si sa position n’est plus valable', () => {
    const storage = memoryStorage();
    storage.setItem('jcrm:partie', JSON.stringify({ version: 1, player: { x: -50, y: 5 }, visited: [] }));
    expect(loadGame(storage, context)?.player).toEqual(context.spawn);
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
