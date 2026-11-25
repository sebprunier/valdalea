import type { Vec } from '../core/geometry';
import type { GameState } from '../core/state';
import type { Commune, Place, Sector } from '../world/model';
import { createConfirm, onModalChange, setFallbackFocus } from './dialog';
import { createAnnouncer, requireElement } from './dom';
import { createPhone } from './phone';
import { createHelpDialog, createPlaceDialog, createPlacesDialog, createStartDialog } from './screens';

/** Ce dont l'interface a besoin du reste du jeu. */
export interface UiDeps {
  commune: Commune;
  overview: HTMLCanvasElement;
  hasSave: boolean;
  persistent: boolean;
  getState(): GameState;
  getPlayer(): Vec;
  isReducedMotion(): boolean;
  setReducedMotion(reduced: boolean): void;
  /** Une fenêtre vient de s'ouvrir, ou la dernière vient de se fermer. */
  setPaused(paused: boolean): void;
  /** La fiche d'un lieu est ouverte : il compte désormais comme visité. */
  visit(place: Place): void;
  travelTo(place: Place): void;
  newGame(): void;
}

export interface Ui {
  setNearPlace(place: Place | null): void;
  setSector(sector: Sector | null): void;
  openPlace(place: Place): void;
  openPanel(panel: 'phone' | 'places' | 'help', trigger?: HTMLElement | null): void;
  showStart(): void;
}

export function createUi(deps: UiDeps): Ui {
  const { commune } = deps;
  const map = requireElement<HTMLElement>('map');
  const sectorLabel = requireElement<HTMLElement>('hud-sector');
  const prompt = requireElement<HTMLElement>('prompt');
  const promptButton = requireElement<HTMLButtonElement>('prompt-button');
  const promptName = requireElement<HTMLElement>('prompt-name');
  const announce = createAnnouncer(requireElement<HTMLElement>('announcer'));

  setFallbackFocus(map);
  onModalChange((anyOpen) => deps.setPaused(anyOpen));

  let near: Place | null = null;
  let sectorName = commune.name;

  const confirm = createConfirm();
  const placeDialog = createPlaceDialog(commune);
  const helpDialog = createHelpDialog();
  const placesDialog = createPlacesDialog(commune, (place) => {
    deps.travelTo(place);
    openPlace(place);
  });

  async function restart(): Promise<boolean> {
    const confirmed = await confirm({
      title: 'Recommencer la partie ?',
      message: 'Les lieux découverts seront oubliés et vous repartirez de chez vous.',
      confirmLabel: 'Recommencer',
    });
    if (confirmed) deps.newGame();
    return confirmed;
  }

  const phone = createPhone({
    commune,
    overview: deps.overview,
    getPlayer: deps.getPlayer,
    getSectorName: () => sectorName,
    getState: deps.getState,
    isReducedMotion: deps.isReducedMotion,
    setReducedMotion: deps.setReducedMotion,
    restart,
  });

  const startDialog = createStartDialog({
    hasSave: deps.hasSave,
    persistent: deps.persistent,
    onContinue: () => startDialog.close(),
    onNewGame: async () => {
      if (!deps.hasSave) deps.newGame();
      else if (!(await restart())) return;
      startDialog.close();
    },
  });

  function openPlace(place: Place): void {
    deps.visit(place);
    placeDialog.show(place, map);
  }

  function openPanel(panel: 'phone' | 'places' | 'help', trigger: HTMLElement | null = map): void {
    if (panel === 'phone') phone.open(trigger);
    else if (panel === 'help') helpDialog.open(trigger);
    else placesDialog.show(deps.getPlayer(), deps.getState().visited, trigger);
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

  return {
    setNearPlace(place) {
      near = place;
      prompt.hidden = place === null;
      if (place) {
        promptName.textContent = place.name;
        announce(`${place.name}. Appuyez sur Entrée pour ouvrir la fiche du lieu.`);
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
    showStart() {
      startDialog.open(map);
    },
  };
}
