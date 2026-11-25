import { ACTIONS, FLOOD, OBJECTIVES } from '../content/inondation';
import { clockLabel, formatDuration, isTimed, MINUTES_PER_UNIT, newChapter, pendingAt, perform, spend, type Chapter, type Phase } from '../core/chapter';
import { DEFAULT_SETTINGS, markVisited, newGame, withBadges, withChapter, type GameState } from '../core/state';
import type { Store } from '../core/store';
import type { Game } from '../game/game';
import type { Elevation } from '../world/elevation';
import { findPlace, type Commune, type Place, type Sector } from '../world/model';
import { createConfirm, onModalChange, setFallbackFocus } from './dialog';
import { createAnnouncer, requireElement } from './dom';
import { createFlow } from './flow';
import { createPhone } from './phone';
import { createPlaceUi } from './place';
import { createHelpDialog, createPlacesDialog, createStartDialog } from './screens';

/** Ce dont l'interface a besoin du reste du jeu. */
export interface UiDeps {
  commune: Commune;
  elevation: Elevation;
  store: Store<GameState>;
  game: Game;
  hasSave: boolean;
  persistent: boolean;
  isReducedMotion(): boolean;
  setReducedMotion(reduced: boolean): void;
}

export interface Ui {
  setNearPlace(place: Place | null): void;
  setSector(sector: Sector | null): void;
  openPlace(place: Place): void;
  openPanel(panel: 'phone' | 'places' | 'help', trigger?: HTMLElement | null): void;
  /** Le joueur vient de parcourir cette distance à pied : le temps du jeu avance. */
  walked(units: number): void;
  showStart(): void;
}

const VIGILANCE: Record<Phase, { level: string; label: string }> = {
  accueil: { level: 'verte', label: 'Vigilance crues : verte' },
  preparation: { level: 'verte', label: 'Vigilance crues : verte' },
  vigilance: { level: 'orange', label: 'Vigilance crues : orange' },
  crise: { level: 'rouge', label: 'Vigilance crues : rouge' },
  bilan: { level: 'jaune', label: 'Vigilance crues : jaune' },
};

export function createUi(deps: UiDeps): Ui {
  const { commune, elevation, store, game } = deps;
  const map = requireElement<HTMLElement>('map');
  const sectorLabel = requireElement<HTMLElement>('hud-sector');
  const vigilanceChip = requireElement<HTMLElement>('hud-vigilance');
  const vigilanceText = requireElement<HTMLElement>('hud-vigilance-text');
  const clockChip = requireElement<HTMLElement>('hud-clock');
  const clockText = requireElement<HTMLElement>('hud-clock-text');
  const objective = requireElement<HTMLElement>('hud-objective');
  const prompt = requireElement<HTMLElement>('prompt');
  const promptButton = requireElement<HTMLButtonElement>('prompt-button');
  const promptName = requireElement<HTMLElement>('prompt-name');
  const announce = createAnnouncer(requireElement<HTMLElement>('announcer'));

  setFallbackFocus(map);
  onModalChange((anyOpen) => game.setPaused(anyOpen));

  const chapter = (): Chapter => store.get().chapter;
  const setChapter = (recipe: (chapter: Chapter) => Chapter): void => store.update((state) => withChapter(state, recipe(state.chapter)));
  const dicrimRead = (): boolean => chapter().done.includes('mairie-dicrim');
  const home = findPlace(commune, 'domicile')?.pos ?? commune.spawn;

  let near: Place | null = null;
  let sectorName = commune.name;
  /** Vigilance affichée le temps d'un bulletin, à la place de celle de la phase. */
  let interlude: 'jaune' | null = null;

  // ------------------------------------------------------------- Déroulé
  const flow = createFlow({
    getChapter: chapter,
    setChapter,
    getBadges: () => store.get().badges,
    addBadges: (ids) => store.update((state) => withBadges(state, ids)),
    isHazardShown: () => store.get().settings.hazardLayer,
    setHazardShown,
    replay,
    closePlace: () => placeUi.close(),
    goHome: () => game.moveTo(home),
    showVigilance: (level) => {
      interlude = level;
      sync();
    },
    setFlood: (level, immediate) => game.setFlood(level, immediate),
    setFocus: (point) => game.setFocus(point),
    // La fenêtre des décisions occupe le bas de l'écran : on vise plus au sud, pour que le quai reste visible au-dessus.
    crisisFocus: { x: home.x, y: home.y + 170 },
    focusTarget: map,
    announce,
  });

  function setHazardShown(shown: boolean): void {
    store.update((state) => (state.settings.hazardLayer === shown ? state : { ...state, settings: { ...state.settings, hazardLayer: shown } }));
  }

  /** Recommence le chapitre : les badges, les lieux visités et les réglages sont conservés. */
  function replay(): void {
    store.update((state) => withChapter(state, newChapter()));
    game.setFlood(0, true);
    game.setFocus(null);
    game.moveTo(commune.spawn);
    announce(`Nouveau départ. ${OBJECTIVES.accueil}`);
  }

  // -------------------------------------------------------------- Fenêtres
  const confirm = createConfirm();
  const helpDialog = createHelpDialog();

  const placeUi = createPlaceUi({
    commune,
    getChapter: chapter,
    getWater: (place) => ({ depth: elevation.depthAt(place.pos, flow.floodLevel()), flood: flow.floodLevel() }),
    isExposed: (place) => (dicrimRead() ? elevation.isFlooded(place.pos, FLOOD.reference) : null),
    perform: (action) => setChapter((current) => perform(current, action)),
    afterAction: (action) => void flow.afterAction(action),
  });

  const placesDialog = createPlacesDialog(
    commune,
    (place) => {
      game.travelTo(place);
      // Si le trajet a épuisé le temps de la phase, la suite du récit prend la main.
      if (!flow.isBusy()) openPlace(place);
    },
    (place) => ({
      pending: pendingAt(ACTIONS, chapter(), place.id),
      exposed: dicrimRead() ? elevation.isFlooded(place.pos, FLOOD.reference) : null,
    }),
  );

  async function restart(): Promise<boolean> {
    const confirmed = await confirm({
      title: 'Tout recommencer ?',
      message: 'Les lieux découverts, les badges et le chapitre en cours seront effacés.',
      confirmLabel: 'Tout recommencer',
    });
    if (confirmed) {
      const settings = { ...DEFAULT_SETTINGS, reducedMotion: store.get().settings.reducedMotion };
      store.update(() => newGame(commune.spawn, settings));
      game.setFlood(0, true);
      game.setFocus(null);
      game.moveTo(commune.spawn);
    }
    return confirmed;
  }

  const phone = createPhone({
    commune,
    overview: game.overview,
    paintWater: (ctx) => game.paintWater(ctx),
    getPlayer: () => game.position,
    getSectorName: () => sectorName,
    getState: () => store.get(),
    getBulletins: () => flow.bulletins(),
    getAssessment: () => flow.assessment(),
    isDicrimRead: dicrimRead,
    setHazardShown,
    isReducedMotion: deps.isReducedMotion,
    setReducedMotion: deps.setReducedMotion,
    replay,
    restart,
  });

  const startDialog = createStartDialog({
    hasSave: deps.hasSave,
    persistent: deps.persistent,
    onContinue: () => startDialog.close(),
    onNewGame: async () => {
      if (deps.hasSave && !(await restart())) return;
      startDialog.close();
    },
  });
  // Une fois l'accueil refermé, on reprend le récit là où il en était.
  startDialog.onClose(() => {
    announce(OBJECTIVES[chapter().phase]);
    flow.resume();
  });

  function openPlace(place: Place): void {
    // Pendant un bulletin ou la crue, le récit a la main : on n'ouvre pas de lieu par-dessus.
    if (flow.isBusy()) return;
    store.update((state) => markVisited(state, place.id));
    placeUi.show(place, map);
  }

  function openPanel(panel: 'phone' | 'places' | 'help', trigger: HTMLElement | null = map): void {
    if (panel === 'phone') phone.open(trigger);
    else if (panel === 'help') helpDialog.open(trigger);
    else placesDialog.show(game.position, store.get().visited, trigger);
  }

  // Boutons de la barre : au clavier, le focus revient sur le bouton ; à la souris, sur la carte.
  const bind = (id: string, panel: 'phone' | 'places' | 'help'): void => {
    const button = requireElement<HTMLButtonElement>(id);
    button.addEventListener('click', (event) => openPanel(panel, event.detail === 0 ? button : map));
  };
  bind('button-places', 'places');
  bind('button-phone', 'phone');
  bind('button-help', 'help');

  promptButton.addEventListener('click', () => {
    if (near) openPlace(near);
  });

  // ------------------------------------------------------- Barre d'état
  let shownPhase: Phase | null = null;

  /** Reporte l'état du jeu sur la barre et sur la carte. Appelé à chaque changement. */
  function sync(): void {
    const state = store.get();
    const current = state.chapter;

    const vigilance = interlude ? { level: interlude, label: `Vigilance crues : ${interlude}` } : VIGILANCE[current.phase];
    vigilanceChip.dataset.level = vigilance.level;
    vigilanceText.textContent = vigilance.label;

    const clock = interlude ? null : clockLabel(current);
    clockChip.hidden = clock === null;
    if (clock !== null) clockText.textContent = `${clock} — reste ${formatDuration(current.minutesLeft)}`;

    objective.textContent = OBJECTIVES[current.phase];
    if (shownPhase !== null && shownPhase !== current.phase) announce(OBJECTIVES[current.phase]);
    shownPhase = current.phase;

    // Pendant la crue, c'est l'eau elle-même qui se voit : la zone inondable théorique s'efface.
    const showZone = state.settings.hazardLayer && current.done.includes('mairie-dicrim') && current.phase !== 'crise';
    game.setHazardZone(showZone ? FLOOD.reference : null);
    game.invalidate();
  }
  store.subscribe(sync);
  sync();

  // Temps de trajet : il s'accumule par fractions de minute et se décompte par minutes entières.
  let walkDebt = 0;

  return {
    setNearPlace(place) {
      near = place;
      prompt.hidden = place === null;
      if (place) {
        promptName.textContent = place.name;
        const pending = pendingAt(ACTIONS, chapter(), place.id);
        announce(`${place.name}. ${pending > 0 ? `${pending > 1 ? `${pending} gestes possibles` : '1 geste possible'}. ` : ''}Appuyez sur Entrée pour ouvrir.`);
      }
    },
    setSector(sector) {
      sectorName = sector?.name ?? 'Campagne';
      sectorLabel.textContent = sectorName;
      // Si un lieu vient d'être annoncé, on ne le recouvre pas par l'annonce du secteur.
      if (near === null) announce(`Secteur : ${sectorName}.`);
    },
    openPlace,
    openPanel,
    walked(units) {
      if (!isTimed(chapter().phase)) {
        walkDebt = 0;
        return;
      }
      walkDebt += units * MINUTES_PER_UNIT;
      if (walkDebt < 1) return;
      const minutes = Math.floor(walkDebt);
      walkDebt -= minutes;
      setChapter((current) => spend(current, minutes));
      flow.check();
    },
    showStart() {
      startDialog.open(map);
    },
  };
}
