import { findChapter } from '../content/chapitres';
import { ACTIONS, DUSK, OBJECTIVES, SITUATION } from '../content/inondation';
import { mixOf, nearness } from '../audio/mix';
import type { Sound } from '../audio/sound';
import type { SkyId } from '../content/model';
import {
  clockLabel,
  clockMinutes,
  formatDuration,
  hourStruck,
  isTimed,
  isUnderway,
  MINUTES_PER_UNIT,
  pendingAt,
  perform,
  spend,
  startChapter,
  timeAlert,
  TIMED_PHASES,
  type Chapter,
  type Phase,
} from '../core/chapter';
import { DEFAULT_SETTINGS, markVisited, newGame, withBadges, withChapter, withNews, withoutNews, withRecord, type GameState, type NewsId } from '../core/state';
import { distance, distToPolygon, type Vec } from '../core/geometry';
import type { Store } from '../core/store';
import { ZOOM_LEVELS } from '../game/constants';
import type { Game } from '../game/game';
import { RISK_NAMES } from '../render/riskmap';
import { SKIES, type WeatherLayer } from '../render/weather';
import type { Elevation } from '../world/elevation';
import { exposuresAt, isExposed } from '../world/hazards';
import { findPlace, RISK_IDS, type Commune, type Place, type RiskId, type Sector } from '../world/model';
import { createCalendar } from './calendar';
import { createConfirm, onModalChange, setFallbackFocus } from './dialog';
import { createDicrimViewer } from './dicrim';
import { createAnnouncer, h, icon, requireElement } from './dom';
import { createFlow, type Scene } from './flow';
import { guardBack } from './leave';
import { createMapLegend } from './legend';
import { createMission } from './mission';
import { createPhone, type PhoneView } from './phone';
import { createPlaceUi } from './place';
import { createHelpDialog, createPlacesDialog, createStartDialog } from './screens';
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
  const vigilanceLevel = requireElement<HTMLElement>('hud-vigilance-level');
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
  const chapterChip = requireElement<HTMLButtonElement>('hud-chapter');
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
  const dicrimRead = (): boolean => chapter().done.includes('mairie-dicrim');
  const home = findPlace(commune, 'domicile')?.pos ?? commune.spawn;

  /** Nouveauté à signaler sur le téléphone quand le chapitre arrive dans une phase. */
  const NEWS_AT: Partial<Record<Phase, NewsId>> = { vigilance: 'alertes', crise: 'alertes', bilan: 'bilan' };

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
      const news = NEWS_AT[after.phase];
      if (news) store.update((state) => withNews(state, news));
      if (after.phase === 'bilan') keepRecord();
      return;
    }

    if (!isTimed(after.phase)) return;
    ring(before, after);
    const threshold = timeAlert(before.minutesLeft, after.minutesLeft);
    if (threshold === null) return;
    const left = formatDuration(after.minutesLeft);
    toast(after.phase === 'preparation' ? `Le temps presse : il vous reste ${left} avant la nuit.` : `L'eau monte : il vous reste ${left} pour vous mettre à l'abri.`);
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
    if (current.phase === 'preparation' && current.minutesLeft <= DUSK.minutesLeft) return DUSK.sky;
    return SITUATION[current.phase].sky;
  }

  // Ce que l'on entend dépend d'où l'on est : la forêt, l'usine, l'église, l'école.
  const forest = commune.grounds.find((ground) => ground.kind === 'foret')?.poly ?? null;
  const plant = commune.grounds.find((ground) => ground.kind === 'industrie')?.poly ?? null;
  const church = findPlace(commune, 'vieux-bourg')?.pos ?? null;
  const school = findPlace(commune, 'ecole')?.pos ?? null;
  /** L'école sonne à 8 h 30, le lundi : c'est le seul jour d'école du chapitre. */
  const SCHOOL_BELL = 8 * 60 + 30;

  /** Fait sonner les cloches quand l'heure du jeu passe : l'église à chaque heure pleine, l'école à son heure. */
  function ring(before: Chapter, after: Chapter): void {
    const was = clockMinutes(before);
    const now = clockMinutes(after);
    if (was === null || now === null) return;
    const player = game.position;
    const hour = hourStruck(was, now);
    // La cloche de l'église porte loin : on l'entend de presque tout le bourg.
    if (hour !== null && church) sound.toll(hour % 12 || 12, nearness(distance(player, church), 2200));
    if (after.phase === 'vigilance' && was < SCHOOL_BELL && now >= SCHOOL_BELL && school) sound.ringSchool(nearness(distance(player, school), 900));
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
    setChapter,
    getBadges: () => store.get().badges,
    addBadges: (ids) => store.update((state) => withBadges(state, ids)),
    replay,
    openCalendar: () => calendar.open(map),
    closePlace: () => placeUi.close(),
    goHome: () => game.moveTo(home),
    stage: (next) => {
      scene = next;
      sync();
    },
    play: (cue) => sound.play(cue),
    setFlood: (level, immediate) => game.setFlood(level, immediate),
    setFocus: (point) => game.setFocus(point),
    // La fenêtre du récit et des décisions occupe le bas de l'écran : on vise plus au sud, pour que le quai reste visible au-dessus.
    crisisFocus: { x: home.x, y: home.y + 170 },
    focusTarget: map,
    announce,
  });

  /**
   * Commence, ou recommence, un chapitre. Les acquis du prologue, les badges,
   * les lieux visités et les réglages sont conservés ; le récit ouvre le chapitre.
   */
  function begin(chapterId: string): void {
    store.update((state) => ({ ...withChapter(state, startChapter(state.chapter, ACTIONS)), chapterId, news: state.news.filter((id) => id === 'dicrim') }));
    game.setFlood(0, true);
    game.setFocus(null);
    flow.begin();
  }

  /** Recommence le chapitre en cours, ou le dernier joué. */
  function replay(): void {
    const id = store.get().chapterId;
    if (id) begin(id);
  }

  const calendar = createCalendar({
    getProgress: () => {
      const state = store.get();
      return { phase: state.chapter.phase, chapterId: state.chapterId, record: state.record };
    },
    start: async (info) => {
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
    },
  });

  // -------------------------------------------------------------- Fenêtres
  const confirm = createConfirm();
  const helpDialog = createHelpDialog();

  const placeUi = createPlaceUi({
    commune,
    getChapter: chapter,
    getWater: (place) => ({ depth: elevation.depthAt(place.pos, flow.floodLevel()), flood: flow.floodLevel() }),
    getReferenceDepth: (place) => elevation.depthAt(place.pos, commune.relief.referenceFlood),
    getExposures: (place) => (dicrimRead() ? exposuresAt(commune, elevation, place.pos).map((risk) => RISK_NAMES[risk]) : null),
    perform: (action) => setChapter((current) => perform(current, action)),
    performed: (action) => {
      sound.play('fait');
      // Consulter le DICRIM, c'est l'ouvrir : le document vient sous les yeux du joueur
      // au moment même du geste, et la zone inondable apparaît sur le plan.
      if (action.id !== 'mairie-dicrim') return;
      setLayer('inondation');
      dicrim.open(null);
    },
    afterAction: (action) => {
      // Le prologue s'achève avec la lecture du DICRIM : il reste à choisir une mission.
      if (action.endsPhase && chapter().phase === 'libre') {
        placeUi.close();
        calendar.open(map);
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

  const placesDialog = createPlacesDialog(commune, goTo, (place) => ({
    pending: pendingAt(ACTIONS, chapter(), place.id),
    exposed: dicrimRead() ? RISK_IDS.some((risk) => isExposed(commune, elevation, risk, place.pos)) : null,
  }));

  const mission = createMission({
    commune,
    getChapter: chapter,
    getPlayer: () => game.position,
    goTo,
    openBilan: () => openPhone(map, 'bilan'),
    openCalendar: () => calendar.open(map),
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
      else calendar.open(map);
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
    getSituation: () => {
      const situation = SITUATION[chapter().phase];
      return { vigilance: situation.vigilance, sky: SKIES[sky()].label, river: situation.river };
    },
    getAssessment: () => flow.assessment(),
    clearNews: (id) => store.update((state) => withoutNews(state, id)),
    isDicrimRead: dicrimRead,
    openDicrim: () => dicrim.open(null),
    openLegend: () => legend.open(null),
    openCalendar: () => calendar.open(map),
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
  // Une fois l'accueil refermé, on reprend le récit là où il en était.
  startDialog.onClose(() => {
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
    else placesDialog.show(game.position, store.get().visited, trigger);
  }

  // Boutons de la barre : au clavier, le focus revient sur le bouton ; à la souris, sur la carte.
  const onPress = (button: HTMLButtonElement, open: (trigger: HTMLElement) => void): void => {
    button.addEventListener('click', (event) => open(event.detail === 0 ? button : map));
  };
  const bind = (id: string, panel: Panel): void => onPress(requireElement<HTMLButtonElement>(id), (trigger) => openPanel(panel, trigger));
  bind('button-mission', 'mission');
  bind('button-places', 'places');
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
  // Le temps qu'il fait et la vigilance mènent au même endroit : la situation du moment, dans le téléphone.
  onPress(chapterChip, (trigger) => {
    if (!flow.isBusy()) calendar.open(trigger);
  });
  onPress(weatherChip, (trigger) => openPhone(trigger, 'alertes'));
  onPress(vigilanceChip, (trigger) => openPhone(trigger, 'alertes'));

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
    chapterText.replaceChildren(
      ...(info
        ? [info.season, h('span', { class: 'chip__extra' }, ` — ${info.title}`)]
        : [current.phase === 'accueil' ? 'Prologue' : 'Choisir un chapitre']),
    );

    const level = scene?.vigilance ?? SITUATION[current.phase].vigilance;
    vigilanceChip.dataset.level = level;
    vigilanceLevel.textContent = level;

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
        flood: flow.floodLevel(),
        toForest: forest ? distToPolygon(state.player, forest) : Infinity,
        toPlant: plant ? distToPolygon(state.player, plant) : Infinity,
      }),
    );

    // Le bandeau de mission : pendant un moment de récit, il dit où l'on en est ;
    // le reste du temps, quoi faire ensuite, avec l'heure et l'avancement.
    objective.textContent = scene?.caption ?? mission.hint().text;
    const time = scene ? null : clockLabel(current);
    clock.hidden = time === null;
    if (time !== null && isTimed(current.phase)) {
      clockText.textContent = `${time} — reste ${formatDuration(current.minutesLeft)}`;
      const share = current.minutesLeft / TIMED_PHASES[current.phase].minutes;
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
      announce(OBJECTIVES[current.phase]);
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
    // Pendant un moment de récit, la carte ne réclame rien : les gestes de la phase qui s'ouvre attendront.
    pendingAt: (placeId) => (scene ? 0 : pendingAt(ACTIONS, chapter(), placeId)),
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
