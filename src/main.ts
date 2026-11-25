import './styles/main.css';
import { Sound } from './audio/sound';
import { ALL_ACTIONS, CHAPTERS } from './content/chapitres';
import { BADGES, SITUATIONS } from './content/inondation';
import { PROLOGUE } from './content/prologue';
import { browserStorage, loadGame, saveGame } from './core/save';
import { movePlayer, newGame, type GameState } from './core/state';
import { Store } from './core/store';
import { DEFAULT_ZOOM, PLAYER_RADIUS } from './game/constants';
import { Game } from './game/game';
import { WeatherLayer } from './render/weather';
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
  actionIds: new Set(ALL_ACTIONS.map((action) => action.id)),
  chapterIds: new Set(CHAPTERS.filter((chapter) => chapter.playable).map((chapter) => chapter.id)),
  legacy: { chapterId: 'automne', prologue: PROLOGUE.map((action) => action.id) },
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
let ui: Ui | undefined;
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
    nearPlaceChanged: (place) => ui?.setNearPlace(place),
    sectorChanged: (sector) => ui?.setSector(sector),
    interact: (place) => ui?.openPlace(place),
    shortcut: (action) => ui?.openPanel(action),
    zoomChanged: (level) => ui?.zoomChanged(level),
    moved: (pos) => store.update((state) => movePlayer(state, pos)),
    walked: (units) => ui?.walked(units),
    isVisited: (placeId) => store.get().visited.includes(placeId),
    pendingAt: (placeId) => ui?.pendingAt(placeId) ?? 0,
  },
});

// Le zoom choisi lors d'une partie précédente est repris avant que l'interface n'existe : rien n'est annoncé.
game.setZoom(store.get().settings.zoom ?? DEFAULT_ZOOM);
const weather = new WeatherLayer(requireElement<HTMLCanvasElement>('weather'));
const sound = new Sound(store.get().settings.sound);

// ------------------------------------------------------- Animations réduites
const systemMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const isReducedMotion = (): boolean => store.get().settings.reducedMotion ?? systemMotion.matches;
const applyMotion = (): void => {
  const reduced = isReducedMotion();
  game.reducedMotion = reduced;
  weather.setStill(reduced);
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
  weather,
  sound,
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
  Object.assign(window, { jcrm: { game, store, commune, grid, elevation, weather, sound } });
  // Banc de mesure du son, chargé à part : il n'entre pas dans le jeu publié.
  void import('./audio/lab').then(({ soundLab }) => Object.assign((window as unknown as { jcrm: object }).jcrm, { soundLab }));
}
