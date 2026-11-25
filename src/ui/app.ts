import { ALL_BADGES, findChapter, ownedIn, playbookOf, type ChapterInfo, type Playbook } from '../content/chapitres';
import { mixOf } from '../audio/mix';
import type { Sound } from '../audio/sound';
import type { SkyId } from '../content/model';
import {
  clockLabel,
  formatDuration,
  isTimed,
  isUnderway,
  leaveChapter,
  MINUTES_PER_UNIT,
  pendingAt,
  perform,
  spend,
  startChapter,
  timeAlert,
  TIME_ALERTS,
  type Chapter,
  type Phase,
} from '../core/chapter';
import { DEFAULT_SETTINGS, markVisited, newGame, withAsset, withBadges, withChapter, withNews, withoutNews, withRecord, type GameState, type NewsId } from '../core/state';
import { distToPolygon, type Vec } from '../core/geometry';
import type { Store } from '../core/store';
import { ZOOM_LEVELS } from '../game/constants';
import type { Game } from '../game/game';
import { RISK_NAMES } from '../render/riskmap';
import { SKIES, type WeatherLayer } from '../render/weather';
import type { Elevation } from '../world/elevation';
import { buildFireField, FIRE_OUT, FIRE_SPENT, type FireField } from '../world/fire';
import { exposuresAt, isExposed } from '../world/hazards';
import { findPlace, RISK_IDS, type Commune, type Place, type RiskId, type Sector } from '../world/model';
import { createConfirm, onModalChange, setFallbackFocus } from './dialog';
import { createDicrimViewer } from './dicrim';
import { createAnnouncer, h, icon, requireElement } from './dom';
import { createFlow, type Scene } from './flow';
import { guardBack, guardUnload } from './leave';
import { createMapLegend } from './legend';
import { createMission } from './mission';
import { createPhone, type PhoneView } from './phone';
import { createPlaceUi } from './place';
import { createHelpDialog, createStartDialog } from './screens';
import { createToaster } from './toast';

/** Ce dont l'interface a besoin du reste du jeu. */
export interface UiDeps {
  commune: Commune;
  elevation: Elevation;
  store: Store<GameState>;
  game: Game;
  /** Le temps qu'il fait, dessiné par-dessus la carte. */
  weather: WeatherLayer;
  /** Le son du jeu. */
  sound: Sound;
  hasSave: boolean;
  persistent: boolean;
  isReducedMotion(): boolean;
  setReducedMotion(reduced: boolean): void;
}

export type Panel = 'phone' | 'places' | 'help' | 'mission' | 'legend';

export interface Ui {
  setNearPlace(place: Place | null): void;
  setSector(sector: Sector | null): void;
  openPlace(place: Place): void;
  openPanel(panel: Panel, trigger?: HTMLElement | null): void;
  /** Le joueur vient de parcourir cette distance à pied : le temps du jeu avance. */
  walked(units: number): void;
  /** Le niveau de zoom de la carte vient de changer. */
  zoomChanged(level: number): void;
  /** Nombre de gestes à signaler sur le repère d'un lieu. */
  pendingAt(placeId: string): number;
  showStart(): void;
}

export function createUi(deps: UiDeps): Ui {
  const { commune, elevation, store, game, weather, sound } = deps;
  const map = requireElement<HTMLElement>('map');
  const sectorLabel = requireElement<HTMLElement>('hud-sector');
  const weatherChip = requireElement<HTMLButtonElement>('hud-weather');
  const weatherIcon = requireElement<HTMLElement>('hud-weather-icon');
  const weatherText = requireElement<HTMLElement>('hud-weather-text');
  const vigilanceChip = requireElement<HTMLButtonElement>('hud-vigilance');
  const vigilanceText = requireElement<HTMLElement>('hud-vigilance-text');
  const clock = requireElement<HTMLElement>('hud-clock');
  const clockText = requireElement<HTMLElement>('hud-clock-text');
  const clockBar = requireElement<HTMLElement>('hud-clock-bar');
  const progress = requireElement<HTMLElement>('hud-progress');
  const objective = requireElement<HTMLElement>('hud-objective');
  const phoneNews = requireElement<HTMLElement>('phone-news');
  const zoomIn = requireElement<HTMLButtonElement>('zoom-in');
  const zoomOut = requireElement<HTMLButtonElement>('zoom-out');
  const layerChip = requireElement<HTMLElement>('layer-chip');
  const layerName = requireElement<HTMLElement>('layer-name');
  const layerHide = requireElement<HTMLButtonElement>('layer-hide');
  const chapterText = requireElement<HTMLElement>('hud-chapter-text');
  const soundButton = requireElement<HTMLButtonElement>('button-sound');
  const soundIcon = requireElement<HTMLElement>('sound-icon');
  const prompt = requireElement<HTMLElement>('prompt');
  const promptButton = requireElement<HTMLButtonElement>('prompt-button');
  const promptName = requireElement<HTMLElement>('prompt-name');
  const announce = createAnnouncer(requireElement<HTMLElement>('announcer'));
  const toasts = requireElement<HTMLElement>('toasts');
  const toast = createToaster(toasts);

  setFallbackFocus(map);
  onModalChange((anyOpen) => game.setPaused(anyOpen));

  const chapter = (): Chapter => store.get().chapter;
  /** Ce qui se joue en ce moment : le prologue, puis le chapitre choisi. */
  let bookKey: string | undefined;
  let book: Playbook = playbookOf(null);
  function playbook(): Playbook {
    const { chapterId, assets } = store.get();
    // Ce que le joueur a acquis dans un autre chapitre change les gestes de celui-ci : son kit se vérifie au lieu de se préparer.
    const owned = ownedIn(assets, chapterId);
    const key = `${chapterId ?? ''}|${owned.join(',')}`;
    if (key !== bookKey) {
      bookKey = key;
      book = playbookOf(chapterId, owned);
    }
    return book;
  }
  const dicrimRead = (): boolean => chapter().done.includes('mairie-dicrim');

  /**
   * Nouveautés à signaler sur le téléphone quand le chapitre arrive dans une phase :
   * les messages et les alertes que le récit va y faire arriver, puis le bilan.
   */
  function newsAt(phase: Phase): NewsId[] {
    if (phase === 'bilan') return ['bilan'];
    const crisis = playbook().content?.crisis;
    const beats = phase === 'vigilance' ? crisis?.vigilance : phase === 'crise' ? crisis?.onset : undefined;
    return (beats ?? []).flatMap((beat) => ('bulletin' in beat ? [beat.bulletin.kind === 'alerte' ? ('alertes' as const) : ('messages' as const)] : []));
  }

  /**
   * Modifie le chapitre. Au passage : prévient le joueur si le temps commence à
   * manquer, et signale sur le téléphone ce qui vient d'y arriver.
   */
  function setChapter(recipe: (chapter: Chapter) => Chapter): void {
    const before = chapter();
    store.update((state) => withChapter(state, recipe(state.chapter)));
    const after = chapter();

    if (after.done.includes('mairie-dicrim') && !before.done.includes('mairie-dicrim')) store.update((state) => withNews(state, 'dicrim'));
    if (after.phase !== before.phase) {
      for (const news of newsAt(after.phase)) store.update((state) => withNews(state, news));
      if (after.phase === 'bilan') keepRecord();
      return;
    }

    if (!isTimed(after.phase)) return;
    const threshold = timeAlert(before.minutesLeft, after.minutesLeft);
    if (threshold === null) return;
    const left = formatDuration(after.minutesLeft);
    const message = playbook().content?.alerts[after.phase];
    if (message) toast(message.replace('{reste}', left));
    // Une cloche double le message : un coup à une heure de la fin, deux à la demi-heure, trois aux dix dernières minutes.
    sound.toll(TIME_ALERTS.indexOf(threshold as (typeof TIME_ALERTS)[number]) + 1, 0.6);
  }

  /** Carte de risque réellement montrée sur le plan. Pendant la crue et les moments de récit, c'est le ciel et l'eau qui se voient : les zones théoriques s'effacent. */
  function shownLayer(): RiskId | null {
    const layer = store.get().settings.hazardLayer as RiskId | null;
    return layer && dicrimRead() && chapter().phase !== 'crise' && !scene ? layer : null;
  }

  /** Retient l'indice de préparation du chapitre qui vient de s'achever, s'il est meilleur que le précédent. */
  function keepRecord(): void {
    const result = flow.assessment();
    const id = store.get().chapterId;
    if (result && id) store.update((state) => withRecord(state, id, result.score));
  }

  let near: Place | null = null;
  let sectorName = commune.name;
  /** Moment de récit en cours : il remplace, dans la barre et sur la carte, l'état de la phase. */
  let scene: Scene | null = null;

  /** Le temps qu'il fait : celui du récit en cours, sinon celui de la phase. */
  function sky(): SkyId {
    if (scene) return scene.sky;
    const current = chapter();
    const { content, situation } = playbook();
    if (current.phase === 'preparation' && content?.dusk && current.minutesLeft <= content.dusk.minutesLeft) return content.dusk.sky;
    return situation(current.phase).sky;
  }

  // Ce que l'on entend dépend d'où l'on est : la forêt, l'usine, l'église, l'école.
  const forest = commune.grounds.find((ground) => ground.kind === 'foret')?.poly ?? null;
  const plant = commune.grounds.find((ground) => ground.kind === 'industrie')?.poly ?? null;

  // Le feu de forêt : ce qui brûle dépend de ce qui a été débroussaillé. Les maisons, elles, ne font pas partie du combustible.
  const fireFields = new Map<boolean, FireField>();
  function fireField(cleared: boolean): FireField | null {
    const { wildfire } = commune;
    if (!wildfire || !forest) return null;
    let field = fireFields.get(cleared);
    if (!field) {
      field = buildFireField(
        wildfire,
        cleared ? [forest] : [forest, wildfire.clearing],
        commune.buildings.map((building) => building.rect),
      );
      fireFields.set(cleared, field);
    }
    return field;
  }

  /** Niveau du danger montré sur la carte en ce moment : hauteur de la crue, ou avancée du feu. */
  let hazardNow = 0;
  const hazardKind = (): 'crue' | 'feu' | null => playbook().content?.crisis?.hazard ?? null;

  /** Montre le danger du chapitre sur la carte : la crue, ou le feu. */
  function showHazard(level: number, immediate = false): void {
    const crisis = playbook().content?.crisis;
    hazardNow = level;
    if (crisis?.hazard === 'feu') {
      // Une clairière débroussaillée ne brûle pas : le feu la contourne.
      const cleared = !crisis.firebreak || chapter().done.includes(crisis.firebreak);
      game.setFlood(0, true);
      game.setFire(level, fireField(cleared), immediate);
    } else {
      game.setFire(0, null, true);
      game.setFlood(level, immediate);
    }
  }

  /** Hauteur de la crue en cours ; nulle dans les chapitres sans crue. */
  const floodNow = (): number => (hazardKind() === 'crue' ? hazardNow : 0);

  /** Force du feu, pour le son : il enfle en avançant, puis s'éteint une fois fixé. */
  function fireNow(): number {
    if (hazardKind() !== 'feu' || hazardNow <= 0) return 0;
    if (hazardNow > FIRE_SPENT) return Math.max(0, (FIRE_OUT - hazardNow) / (FIRE_OUT - FIRE_SPENT));
    return 0.35 + 0.65 * hazardNow;
  }

  /**
   * Hauteur du joueur au-dessus de la rivière, pour le son. On regarde aussi de
   * part et d'autre : sur le pont, dont le tablier est haut, c'est l'eau juste à
   * côté que l'on entend.
   */
  function heightAboveWater(p: Vec): number {
    return Math.min(elevation.at(p), elevation.at({ x: p.x - 70, y: p.y }), elevation.at({ x: p.x + 70, y: p.y }));
  }

  /** Active ou coupe le son. Le réglage est enregistré avec la partie. */
  function setSound(on: boolean): void {
    store.update((state) => (state.settings.sound === on ? state : { ...state, settings: { ...state.settings, sound: on } }));
  }

  function setLayer(risk: RiskId | null): void {
    store.update((state) => (state.settings.hazardLayer === risk ? state : { ...state, settings: { ...state.settings, hazardLayer: risk } }));
  }

  // ------------------------------------------------------------- Documents
  const dicrim = createDicrimViewer({
    commune,
    elevation,
    overview: game.overview,
    showOnMap: (risk) => {
      setLayer(risk);
      toast(`Carte affichée sur le plan : ${RISK_NAMES[risk].toLowerCase()}. Vous pouvez la changer dans le téléphone, application Carte.`);
    },
  });

  // ------------------------------------------------------------- Déroulé
  const flow = createFlow({
    getChapter: chapter,
    getContent: () => playbook().content,
    leaveChapter: () => store.update((state) => ({ ...withChapter(state, leaveChapter(state.chapter, playbook().actions)), news: state.news.filter((id) => id === 'dicrim') })),
    setChapter,
    getBadges: () => store.get().badges,
    addBadges: (ids) => store.update((state) => withBadges(state, ids)),
    replay,
    openCalendar,
    closePlace: () => placeUi.close(),
    goTo: (placeId) => {
      const place = findPlace(commune, placeId);
      if (place) game.moveTo(place.pos);
    },
    stage: (next) => {
      scene = next;
      sync();
    },
    readBulletin: (bulletin) => phone.read(bulletin, map),
    play: (cue) => sound.play(cue),
    setHazard: showHazard,
    setFocus: (placeId, south = 0) => {
      const place = placeId ? findPlace(commune, placeId) : undefined;
      game.setFocus(place ? { x: place.pos.x, y: place.pos.y + south } : null);
    },
    focusTarget: map,
    announce,
  });

  /**
   * Commence, ou recommence, un chapitre. Les acquis du prologue, les badges,
   * les lieux visités et les réglages sont conservés ; le récit ouvre le chapitre.
   */
  function begin(chapterId: string): void {
    const next = playbookOf(chapterId, ownedIn(store.get().assets, chapterId));
    store.update((state) => ({ ...withChapter(state, startChapter(state.chapter, next.actions, next.timing)), chapterId, news: state.news.filter((id) => id === 'dicrim') }));
    showHazard(0, true);
    game.setFocus(null);
    flow.begin();
  }

  /** Recommence le chapitre en cours, ou le dernier joué. */
  function replay(): void {
    const id = store.get().chapterId;
    if (id) begin(id);
  }

  /** Le joueur choisit un chapitre dans le calendrier. Renvoie vrai s'il a bien commencé. */
  async function chooseChapter(info: ChapterInfo): Promise<boolean> {
    const { phase } = chapter();
    if (!info.playable || phase === 'accueil') return false;
    // Quitter un chapitre en cours le fait perdre : on le dit avant.
    if (isUnderway(phase)) {
      const confirmed = await confirm({
        title: info.id === store.get().chapterId ? 'Recommencer ce chapitre ?' : 'Changer de chapitre ?',
        message: 'Le chapitre en cours sera abandonné, et sa progression perdue. Vos badges et les lieux découverts sont conservés.',
        confirmLabel: 'Commencer',
      });
      if (!confirmed) return false;
    }
    begin(info.id);
    return true;
  }

  /** Le calendrier est une application du téléphone : c'est là que se choisissent les chapitres. */
  function openCalendar(): void {
    openPhone(map, 'calendrier');
  }

  // -------------------------------------------------------------- Fenêtres
  const confirm = createConfirm();
  const helpDialog = createHelpDialog();

  const placeUi = createPlaceUi({
    commune,
    getChapter: chapter,
    getWater: (place) => ({ depth: elevation.depthAt(place.pos, floodNow()), flood: floodNow() }),
    getReferenceDepth: (place) => elevation.depthAt(place.pos, commune.relief.referenceFlood),
    getExposures: (place) => (dicrimRead() ? exposuresAt(commune, elevation, place.pos).map((risk) => RISK_NAMES[risk]) : null),
    getActions: () => playbook().actions,
    getQuestions: () => playbook().questions,
    perform: (action) => setChapter((current) => perform(current, action, playbook().timing)),
    performed: (action) => {
      // Consulter le DICRIM, c'est l'ouvrir : le document vient sous les yeux du joueur au moment
      // même du geste. Aucune carte de risque n'est posée d'office sur le plan : c'est lui qui choisit.
      if (action.id === 'mairie-dicrim') dicrim.open(null);
      // Le kit d'urgence, une fois préparé, suit le joueur dans les autres chapitres.
      const { grants } = action;
      const chapterId = store.get().chapterId;
      if (grants && chapterId) store.update((state) => withAsset(state, grants, chapterId));
    },
    afterAction: (action) => {
      // Le prologue s'achève avec la lecture du DICRIM : il reste à choisir une mission.
      if (action.endsPhase && chapter().phase === 'libre') {
        placeUi.close();
        openCalendar();
        return;
      }
      void flow.afterAction(action);
    },
  });

  /** Emmène le joueur dans un lieu (le trajet compte), puis l'ouvre. */
  function goTo(place: Place): void {
    game.travelTo(place);
    // Si le trajet a épuisé le temps de la phase, la suite du récit prend la main.
    if (!flow.isBusy()) openPlace(place);
  }


  const mission = createMission({
    commune,
    getChapter: chapter,
    getPlaybook: playbook,
    getPlayer: () => game.position,
    goTo,
    openBilan: () => openPhone(map, 'bilan'),
    openCalendar,
    replay,
  });

  const legend = createMapLegend({
    getLayer: () => shownLayer(),
    hideLayer: () => setLayer(null),
  });

  /** Rejoue le chapitre en cours de route : la progression du chapitre est perdue, d'où la confirmation. */
  async function replayChapter(): Promise<boolean> {
    // Aucun chapitre choisi : il n'y a rien à rejouer, c'est le calendrier qu'il faut.
    if (!store.get().chapterId || !isUnderway(chapter().phase)) {
      if (chapter().phase === 'bilan') replay();
      else openCalendar();
      return true;
    }
    const confirmed = await confirm({
      title: 'Rejouer le chapitre ?',
      message: 'Le chapitre reprend à son début. Vos badges et les lieux découverts sont conservés.',
      confirmLabel: 'Rejouer le chapitre',
    });
    if (confirmed) replay();
    return confirmed;
  }

  async function restart(): Promise<boolean> {
    const confirmed = await confirm({
      title: 'Tout recommencer ?',
      message: 'Les lieux découverts, les badges et le chapitre en cours seront effacés.',
      confirmLabel: 'Tout recommencer',
    });
    if (confirmed) {
      const { reducedMotion, zoom, sound: soundOn } = store.get().settings;
      store.update(() => newGame(commune.spawn, { ...DEFAULT_SETTINGS, reducedMotion, zoom, sound: soundOn }));
      showHazard(0, true);
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
    getVigilance: () => (playbook().content?.hazardApp === 'meteo' ? null : playbook().situation(chapter().phase).level),
    getWeather: () => {
      const { phase } = chapter();
      const now = SKIES[sky()];
      const { content, situation } = playbook();
      const forecast = phase === 'accueil' || phase === 'libre' ? undefined : content?.forecast[phase];
      const state = situation(phase);
      return { label: now.label, icon: now.icon, river: state.river, forecast: forecast ?? [], hazard: content?.hazardInfo ? { ...content.hazardInfo, level: state.level, indicator: state.indicator } : null };
    },
    getPlaceInfo: (place) => ({
      pending: pendingAt(playbook().actions, chapter(), place.id),
      exposed: dicrimRead() ? RISK_IDS.some((risk) => isExposed(commune, elevation, risk, place.pos)) : null,
    }),
    travel: goTo,
    startChapter: chooseChapter,
    getAssessment: () => flow.assessment(),
    getBadgeDefs: () => (isUnderway(chapter().phase) ? playbook().content?.crisis?.badges : undefined) ?? ALL_BADGES,
    clearNews: (id) => store.update((state) => withoutNews(state, id)),
    isDicrimRead: dicrimRead,
    openDicrim: () => dicrim.open(null),
    openLegend: () => legend.open(null),
    setLayer,
    isReducedMotion: deps.isReducedMotion,
    setReducedMotion: deps.setReducedMotion,
    isSoundOn: () => store.get().settings.sound,
    setSound,
    replay,
    replayChapter,
    restart,
  });

  const startDialog = createStartDialog({
    hasSave: deps.hasSave,
    persistent: deps.persistent,
    sound: { isOn: () => store.get().settings.sound, set: setSound },
    onContinue: () => startDialog.close(),
    onNewGame: async () => {
      if (deps.hasSave && !(await restart())) return;
      startDialog.close();
    },
  });
  /** La partie a commencé : l'écran d'accueil est refermé. */
  let playing = false;
  // Une fois l'accueil refermé, on reprend le récit là où il en était.
  startDialog.onClose(() => {
    playing = true;
    announce(mission.hint().text);
    flow.resume();
  });

  function openPlace(place: Place): void {
    // Pendant un bulletin ou la crue, le récit a la main : on n'ouvre pas de lieu par-dessus.
    if (flow.isBusy()) return;
    store.update((state) => markVisited(state, place.id));
    placeUi.show(place, map);
  }

  function openPhone(trigger: HTMLElement | null, view: PhoneView = 'accueil'): void {
    if (flow.isBusy()) return;
    phone.open(trigger, view);
  }

  function openPanel(panel: Panel, trigger: HTMLElement | null = map): void {
    if (flow.isBusy()) return;
    if (panel === 'phone') openPhone(trigger);
    else if (panel === 'help') helpDialog.open(trigger);
    else if (panel === 'mission') mission.open(trigger);
    else if (panel === 'legend') legend.open(trigger);
    else openPhone(trigger, 'carnet');
  }

  // Boutons de la barre : au clavier, le focus revient sur le bouton ; à la souris, sur la carte.
  const onPress = (button: HTMLButtonElement, open: (trigger: HTMLElement) => void): void => {
    button.addEventListener('click', (event) => open(event.detail === 0 ? button : map));
  };
  const bind = (id: string, panel: Panel): void => onPress(requireElement<HTMLButtonElement>(id), (trigger) => openPanel(panel, trigger));
  bind('button-mission', 'mission');
  bind('button-phone', 'phone');
  bind('button-help', 'help');
  bind('button-legend', 'legend');
  layerHide.addEventListener('click', () => {
    setLayer(null);
    map.focus({ preventScroll: true });
  });

  soundButton.addEventListener('click', (event) => {
    const on = !store.get().settings.sound;
    setSound(on);
    announce(on ? 'Son activé.' : 'Son coupé.');
    if (event.detail !== 0) map.focus({ preventScroll: true });
  });
  // Les navigateurs ne laissent le son démarrer qu'après un premier geste du joueur.
  const unlock = (): void => sound.unlock();
  window.addEventListener('pointerup', unlock, { once: true, capture: true });
  window.addEventListener('keydown', unlock, { once: true, capture: true });

  // Un « retour » du navigateur ne quitte pas le jeu sans prévenir.
  guardBack(() =>
    confirm({
      title: 'Quitter le jeu ?',
      message: deps.persistent
        ? 'Votre partie est enregistrée dans ce navigateur : vous la retrouverez en revenant sur cette page.'
        : "Votre navigateur bloque l'enregistrement : la partie en cours sera perdue.",
      confirmLabel: 'Quitter',
      cancelLabel: 'Rester',
      preferCancel: true,
    }),
  );
  // Fermer l'onglet, recharger ou partir vers un autre site : c'est le navigateur qui pose la question, à sa façon.
  guardUnload(() => playing);
  // Le temps qu'il fait et la vigilance ouvrent leur application, dans le téléphone.
  onPress(weatherChip, (trigger) => openPhone(trigger, 'meteo'));
  onPress(vigilanceChip, (trigger) => openPhone(trigger, playbook().content?.hazardApp ?? 'alertes'));

  promptButton.addEventListener('click', () => {
    if (near) openPlace(near);
  });

  // -------------------------------------------------------------------- Zoom
  const zoomButton = (button: HTMLButtonElement, step: number): void => {
    button.addEventListener('click', (event) => {
      // Un bouton en butée reste focalisable (il ne « disparaît » pas sous le clavier), mais ne fait rien.
      if (button.getAttribute('aria-disabled') !== 'true') game.setZoom(game.zoomLevel + step);
      if (event.detail !== 0) map.focus({ preventScroll: true });
    });
  };
  zoomButton(zoomIn, 1);
  zoomButton(zoomOut, -1);

  function showZoom(level: number): void {
    zoomIn.setAttribute('aria-disabled', String(level >= ZOOM_LEVELS.length - 1));
    zoomOut.setAttribute('aria-disabled', String(level <= 0));
  }
  showZoom(game.zoomLevel);

  // ------------------------------------------------------- Barre d'état
  let shownPhase: Phase | null = null;
  let shownSky: SkyId | null = null;
  let shownSound: boolean | null = null;

  /** Reporte l'état du jeu sur la barre et sur la carte. Appelé à chaque changement. */
  function sync(): void {
    const state = store.get();
    const current = state.chapter;

    // Le chapitre en cours : son nom, ou ce qui tient lieu de chapitre avant d'en avoir choisi un.
    const info = current.phase === 'accueil' || current.phase === 'libre' ? undefined : findChapter(state.chapterId);
    if (info) chapterText.textContent = info.title;
    else chapterText.textContent = current.phase === 'accueil' ? 'Prologue' : 'Aucun chapitre en cours';

    const situation = playbook().situation(current.phase);
    const level = scene?.vigilance ?? situation.level;
    vigilanceChip.dataset.level = level;
    // Pendant un moment de récit, l'indicateur suit le récit ; sinon, il dit l'état de la phase.
    vigilanceText.textContent = scene ? (playbook().content?.levels[scene.vigilance] ?? situation.indicator) : situation.indicator;

    // Pendant la vigilance, le danger grandit avec l'heure : le feu gagne du terrain pendant que le joueur s'active.
    if (current.phase === 'vigilance' && !scene && !flow.isBusy()) {
      const level = flow.hazardLevel();
      if (level !== hazardNow) showHazard(level);
    }

    const now = sky();
    if (now !== shownSky) {
      shownSky = now;
      weatherIcon.replaceChildren(icon(SKIES[now].icon));
      weatherText.textContent = SKIES[now].label;
      weather.set(now);
    }

    // Le son : son réglage, et une ambiance qui suit le ciel, la distance à la rivière et la crue.
    const soundOn = state.settings.sound;
    if (soundOn !== shownSound) {
      shownSound = soundOn;
      sound.setEnabled(soundOn);
      soundButton.setAttribute('aria-pressed', String(soundOn));
      soundIcon.replaceChildren(icon(soundOn ? 'son' : 'muet'));
    }
    sound.setMix(
      mixOf({
        sky: SKIES[now],
        height: heightAboveWater(state.player),
        flood: floodNow(),
        toForest: forest ? distToPolygon(state.player, forest) : Infinity,
        toPlant: plant ? distToPolygon(state.player, plant) : Infinity,
        fire: fireNow(),
      }),
    );

    // Le bandeau de mission : pendant un moment de récit, il dit où l'on en est ;
    // le reste du temps, quoi faire ensuite, avec l'heure et l'avancement.
    objective.textContent = scene?.caption ?? mission.hint().text;
    const time = scene ? null : clockLabel(current, playbook().timing);
    clock.hidden = time === null;
    if (time !== null && isTimed(current.phase)) {
      clockText.textContent = `${time} — reste ${formatDuration(current.minutesLeft)}`;
      const share = current.minutesLeft / playbook().timing[current.phase].minutes;
      clockBar.style.width = `${Math.round(share * 100)}%`;
      // Le temps qui presse se lit dans le texte ; la couleur ne fait que le souligner.
      clock.dataset.urgent = String(current.minutesLeft <= 60);
    }
    const done = scene ? null : mission.progress();
    progress.hidden = done === null;
    if (done) progress.replaceChildren(`${done.done} sur ${done.total}`, h('span', { class: 'sr-only' }, ' gestes accomplis'));

    // Pastille du téléphone : le nombre d'applications où une nouveauté attend.
    const news = state.news.length;
    phoneNews.hidden = news === 0;
    if (news > 0) phoneNews.replaceChildren(h('span', { 'aria-hidden': 'true' }, String(news)), h('span', { class: 'sr-only' }, news > 1 ? ` — ${news} nouveautés` : ' — 1 nouveauté'));

    if (shownPhase !== null && shownPhase !== current.phase) {
      announce(playbook().objective(current.phase));
      // Les messages de la phase précédente (« le temps presse ») n'ont plus lieu d'être.
      toasts.replaceChildren();
    }
    shownPhase = current.phase;

    // La carte de risque posée sur le plan est nommée sur la carte elle-même : on sait ce qu'on regarde.
    const layer = shownLayer();
    game.setHazardLayer(layer);
    layerChip.hidden = layer === null;
    if (layer) layerName.textContent = RISK_NAMES[layer].toLowerCase();
    game.invalidate();
  }
  // Une partie terminée avant que les indices ne soient retenus : on rattrape le sien.
  if (chapter().phase === 'bilan') keepRecord();
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
        const pending = pendingAt(playbook().actions, chapter(), place.id);
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
    // Pendant un moment de récit, la carte ne réclame rien : les gestes de la phase qui s'ouvre attendront.
    pendingAt: (placeId) => (scene ? 0 : pendingAt(playbook().actions, chapter(), placeId)),
    zoomChanged(level) {
      showZoom(level);
      store.update((state) => (state.settings.zoom === level ? state : { ...state, settings: { ...state.settings, zoom: level } }));
      announce(`Zoom : niveau ${level + 1} sur ${ZOOM_LEVELS.length}.`);
    },
    showStart() {
      startDialog.open(map);
    },
  };
}
