import './styles/main.css';
import { ACTIONS, BADGES, SITUATIONS } from './content/inondation';
import { pendingAt } from './core/chapter';
import { browserStorage, loadGame, saveGame } from './core/save';
import { movePlayer, newGame, type GameState } from './core/state';
import { Store } from './core/store';
import { PLAYER_RADIUS } from './game/constants';
import { Game } from './game/game';
import { createUi, type Ui } from './ui/app';
import { requireElement } from './ui/dom';
import { buildElevation } from './world/elevation';
import { buildRoadMask, buildWalkGrid } from './world/grid';
import { RISK_IDS } from './world/model';
import { Pathfinder } from './world/pathfinding';
import { buildValDAlea } from './world/valdalea';

const commune = buildValDAlea();
const grid = buildWalkGrid(commune);
const elevation = buildElevation(commune);

// --------------------------------------------------------------- Sauvegarde
const { storage, persistent } = browserStorage();
const saved = loadGame(storage, {
  placeIds: new Set(commune.places.map((place) => place.id)),
  actionIds: new Set(ACTIONS.map((action) => action.id)),
  situationChoices: new Map(SITUATIONS.map((situation) => [situation.id, new Set(situation.choices.map((choice) => choice.id))])),
  badgeIds: new Set(BADGES.map((badge) => badge.id)),
  riskIds: new Set(RISK_IDS),
  isFree: (pos) => grid.circleFree(pos.x, pos.y, PLAYER_RADIUS),
  spawn: commune.spawn,
});
const store = new Store<GameState>(saved ?? newGame(commune.spawn));

let saveTimer = 0;
const flush = (): void => {
  window.clearTimeout(saveTimer);
  saveTimer = 0;
  saveGame(storage, store.get());
};
store.subscribe(() => {
  if (saveTimer === 0) saveTimer = window.setTimeout(flush, 800);
});
window.addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flush();
});

// --------------------------------------------------------------------- Jeu
// `ui` est créé juste après le jeu ; les signaux du jeu ne partent qu'une fois la partie lancée.
let ui: Ui;
const game = new Game({
  surface: requireElement('map'),
  canvas: requireElement<HTMLCanvasElement>('canvas'),
  commune,
  grid,
  // Une petite marge sur le rayon : les itinéraires ne frôlent pas les murs.
  pathfinder: new Pathfinder(grid, PLAYER_RADIUS + 0.5, buildRoadMask(commune)),
  elevation,
  start: store.get().player,
  hooks: {
    nearPlaceChanged: (place) => ui.setNearPlace(place),
    sectorChanged: (sector) => ui.setSector(sector),
    interact: (place) => ui.openPlace(place),
    shortcut: (action) => ui.openPanel(action),
    moved: (pos) => store.update((state) => movePlayer(state, pos)),
    walked: (units) => ui.walked(units),
    isVisited: (placeId) => store.get().visited.includes(placeId),
    pendingAt: (placeId) => pendingAt(ACTIONS, store.get().chapter, placeId),
  },
});

// ------------------------------------------------------- Animations réduites
const systemMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const isReducedMotion = (): boolean => store.get().settings.reducedMotion ?? systemMotion.matches;
const applyMotion = (): void => {
  const reduced = isReducedMotion();
  game.reducedMotion = reduced;
  document.documentElement.dataset.motion = reduced ? 'reduced' : 'full';
};
systemMotion.addEventListener('change', applyMotion);
applyMotion();

// --------------------------------------------------------------- Interface
ui = createUi({
  commune,
  elevation,
  store,
  game,
  hasSave: saved !== null,
  persistent,
  isReducedMotion,
  setReducedMotion: (reduced) => {
    store.update((state) => ({ ...state, settings: { ...state.settings, reducedMotion: reduced } }));
    applyMotion();
  },
});

game.start();
ui.showStart();

// En développement uniquement : accès au jeu depuis la console du navigateur.
if (import.meta.env.DEV) {
  Object.assign(window, { jcrm: { game, store, commune, grid, elevation } });
}
