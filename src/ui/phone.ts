import type { ChapterInfo } from '../content/chapitres';
import { CREDITS } from '../content/credits';
import { VIGILANCE_SCALE } from '../content/inondation';
import { LEXICON } from '../content/lexique';
import type { BadgeDef, Bulletin, VigilanceLevel } from '../content/model';
import { PLACE_TEXTS } from '../content/places';
import type { Assessment } from '../core/chapter';
import { distance, type Vec } from '../core/geometry';
import { NEWS_IDS, type GameState, type NewsId } from '../core/state';
import { RISK_NAMES } from '../render/riskmap';
import { RISK_IDS, type Commune, type Place, type RiskId } from '../world/model';
import { createCalendarView } from './calendar';
import { createDialog } from './dialog';
import { badgeList, bilanContent, bulletinContent, lexiconEntry, sourceList } from './documents';
import { h, icon, type IconName } from './dom';
import { formatDistance, type PlaceInfo } from './screens';

/**
 * Le téléphone du joueur : c'est la télécommande du jeu. On y choisit ses
 * chapitres, on y retrouve le plan et la liste des lieux, la météo, la vigilance
 * et les alertes reçues, le DICRIM, le lexique, le bilan et les réglages. Une
 * pastille signale les applications où quelque chose de nouveau attend d'être regardé.
 */

/** Le temps qu'il fait et celui qui vient, tels que l'application Météo les présente. */
export interface WeatherNow {
  label: string;
  icon: IconName;
  /** L'état de la rivière. */
  river: string;
  /** Prévisions du chapitre en cours ; vide hors chapitre. */
  forecast: ReadonlyArray<{ when: string; icon: IconName; text: string }>;
  /** Indicateur de danger lié à la météo (la Météo des forêts) : son niveau du moment, et ce qu'il est d'après sa source. */
  hazard: { title: string; text: string; sources: readonly string[]; level: VigilanceLevel; indicator: string } | null;
}

export interface PhoneDeps {
  commune: Commune;
  /** Plan de la commune à petite échelle. */
  overview: HTMLCanvasElement;
  /** Dessine la zone de risque affichée, la crue et le feu par-dessus le plan (contexte en coordonnées monde). */
  paintWater(ctx: CanvasRenderingContext2D): void;
  getPlayer(): Vec;
  getSectorName(): string;
  getState(): GameState;
  getBulletins(): Bulletin[];
  /** Niveau de la vigilance crues ; `null` quand le chapitre en cours ne la concerne pas. */
  getVigilance(): VigilanceLevel | null;
  getWeather(): WeatherNow;
  getAssessment(): Assessment | null;
  /** Les badges à montrer : ceux du chapitre en cours, ou tous ceux du jeu quand aucun ne l'est. */
  getBadgeDefs(): readonly BadgeDef[];
  /** Ce que la liste des lieux affiche de chacun. */
  getPlaceInfo(place: Place): PlaceInfo;
  /** Emmène le joueur dans un lieu et l'ouvre. */
  travel(place: Place): void;
  /** Le joueur choisit de jouer ce chapitre. Renvoie vrai s'il a bien commencé. */
  startChapter(chapter: ChapterInfo): Promise<boolean>;
  /** Une nouveauté a été regardée : sa pastille disparaît. */
  clearNews(id: NewsId): void;
  isDicrimRead(): boolean;
  /** Ouvre le DICRIM par-dessus le téléphone. */
  openDicrim(): void;
  /** Ouvre la légende de la carte par-dessus le téléphone. */
  openLegend(): void;
  /** Affiche une carte de risque sur le plan du jeu, ou aucune. */
  setLayer(risk: RiskId | null): void;
  isReducedMotion(): boolean;
  setReducedMotion(reduced: boolean): void;
  isSoundOn(): boolean;
  setSound(on: boolean): void;
  /** Recommence le chapitre en gardant les badges. */
  replay(): void;
  /** Le joueur demande à rejouer le chapitre en cours ; renvoie vrai s'il a confirmé. */
  replayChapter(): Promise<boolean>;
  /** Le joueur demande à tout recommencer ; renvoie vrai si la partie a bien été remise à zéro. */
  restart(): Promise<boolean>;
}

export type PhoneView = 'accueil' | 'calendrier' | 'carte' | 'carnet' | 'meteo' | 'alertes' | 'dicrim' | 'lexique' | 'bilan' | 'reglages' | 'apropos';

export interface Phone {
  /** Ouvre le téléphone, sur l'écran des applications ou directement dans l'une d'elles. */
  open(returnFocus: HTMLElement | null, view?: PhoneView): void;
}

type View = PhoneView;

const isNews = (view: string): view is NewsId => (NEWS_IDS as readonly string[]).includes(view);

const APPS: Array<{ view: Exclude<View, 'accueil'>; label: string; icon: IconName }> = [
  { view: 'calendrier', label: 'Calendrier', icon: 'calendrier' },
  { view: 'carte', label: 'Carte', icon: 'carte' },
  { view: 'carnet', label: 'Lieux', icon: 'lieux' },
  { view: 'meteo', label: 'Météo', icon: 'eclaircie' },
  { view: 'alertes', label: 'Alertes', icon: 'alerte' },
  { view: 'dicrim', label: 'DICRIM', icon: 'document' },
  { view: 'lexique', label: 'Lexique', icon: 'aide' },
  { view: 'bilan', label: 'Bilan', icon: 'medaille' },
  { view: 'reglages', label: 'Réglages', icon: 'reglages' },
  { view: 'apropos', label: 'À propos', icon: 'info' },
];

const TITLES: Record<View, string> = {
  accueil: 'Téléphone',
  calendrier: 'Calendrier',
  carte: 'Carte',
  carnet: 'Lieux de la commune',
  meteo: 'Météo',
  alertes: 'Vigilance et alertes',
  dicrim: 'DICRIM',
  lexique: 'Lexique',
  bilan: 'Bilan et badges',
  reglages: 'Réglages',
  apropos: 'À propos',
};

export function createPhone(deps: PhoneDeps): Phone {
  const { commune } = deps;
  const dialog = createDialog({ id: 'telephone', title: TITLES.accueil, className: 'dialog--phone' });

  const back = h('button', { type: 'button', class: 'button button--small phone__back' }, icon('retour'), 'Applications');
  back.addEventListener('click', () => show('accueil'));

  // ----------------------------------------------------------- Applications
  const appDots = new Map<string, HTMLElement>();
  const home = h(
    'ul',
    { class: 'apps' },
    ...APPS.map((app) => {
      // La pastille est doublée d'un texte : « nouveau », lu par les lecteurs d'écran.
      const dot = h('span', { class: 'app__news', hidden: true }, h('span', { class: 'sr-only' }, ' — nouveau'));
      appDots.set(app.view, dot);
      const button = h('button', { type: 'button', class: 'app' }, h('span', { class: 'app__icon' }, icon(app.icon)), app.label, dot);
      button.addEventListener('click', () => show(app.view));
      return h('li', null, button);
    }),
  );

  // ------------------------------------------------------------- Calendrier
  const calendar = createCalendarView({
    getProgress: () => {
      const state = deps.getState();
      return { phase: state.chapter.phase, chapterId: state.chapterId, record: state.record };
    },
    start: (chapter) => deps.startChapter(chapter),
    leave: () => dialog.close(),
  });

  function renderHome(): void {
    const { news } = deps.getState();
    for (const [view, dot] of appDots) dot.hidden = !news.some((id) => id === view);
  }

  // ------------------------------------------------------------------ Carte
  const mapCanvas = h('canvas', { class: 'minimap', role: 'img' });
  const mapWhere = h('p', { class: 'phone__where' });
  const mapLegend = h('ol', { class: 'legend' });
  // Couches de risque : une seule à la fois, comme sur les cartes officielles.
  const layerInputs = new Map<string, HTMLInputElement>();
  const layerChoice = (value: string, label: string): HTMLElement => {
    const id = `couche-${value}`;
    const input = h('input', { type: 'radio', name: 'couche', id, value });
    input.addEventListener('change', () => {
      deps.setLayer(value === 'aucune' ? null : (value as RiskId));
      renderMap();
    });
    layerInputs.set(value, input);
    return h('div', { class: 'check' }, input, h('label', { for: id }, label));
  };
  const mapZoneField = h(
    'fieldset',
    { class: 'choices' },
    h('legend', null, 'Carte de risque à afficher'),
    layerChoice('aucune', 'Aucune'),
    ...RISK_IDS.map((risk) => layerChoice(risk, RISK_NAMES[risk])),
  );
  const legendButton = h('button', { type: 'button', class: 'button button--small' }, 'Légende de la carte');
  legendButton.addEventListener('click', () => deps.openLegend());
  const mapView = h(
    'div',
    { class: 'stack' },
    mapWhere,
    mapCanvas,
    h('p', { class: 'fine-print' }, 'Votre position est le point orange. Les numéros renvoient à la liste ci-dessous.'),
    legendButton,
    mapZoneField,
    mapLegend,
  );

  function renderMap(): void {
    const state = deps.getState();
    const player = deps.getPlayer();
    mapZoneField.hidden = !deps.isDicrimRead();
    for (const [value, input] of layerInputs) input.checked = value === (state.settings.hazardLayer ?? 'aucune');
    mapWhere.textContent = `Vous êtes ici : ${deps.getSectorName()}.`;
    mapCanvas.setAttribute(
      'aria-label',
      `Plan de ${commune.name}. Vous êtes dans le secteur ${deps.getSectorName()}. Les lieux du plan sont repris dans la liste numérotée qui suit.`,
    );

    mapLegend.replaceChildren(
      ...commune.places.map((place) =>
        h('li', null, place.name, state.visited.includes(place.id) ? h('span', { class: 'tag' }, icon('coche'), 'déjà visité') : null),
      ),
    );

    const cssWidth = mapCanvas.clientWidth || 300;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    mapCanvas.width = Math.round(cssWidth * pixelRatio);
    mapCanvas.height = Math.round((cssWidth * pixelRatio * commune.height) / commune.width);
    const ctx = mapCanvas.getContext('2d')!;
    const k = mapCanvas.width / commune.width;
    ctx.drawImage(deps.overview, 0, 0, mapCanvas.width, mapCanvas.height);
    ctx.save();
    ctx.scale(k, k);
    deps.paintWater(ctx);
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${10 * pixelRatio}px system-ui, sans-serif`;
    commune.places.forEach((place, index) => {
      const x = place.pos.x * k;
      const y = place.pos.y * k;
      const visited = state.visited.includes(place.id);
      ctx.beginPath();
      ctx.arc(x, y, 8.5 * pixelRatio, 0, Math.PI * 2);
      // Visité : pastille pleine. À découvrir : pastille claire cerclée. Le numéro reste lisible dans les deux cas.
      ctx.fillStyle = visited ? '#1b2733' : '#ffffff';
      ctx.fill();
      ctx.lineWidth = 1.5 * pixelRatio;
      ctx.strokeStyle = visited ? '#ffffff' : '#1b2733';
      ctx.stroke();
      ctx.fillStyle = visited ? '#ffffff' : '#1b2733';
      ctx.fillText(String(index + 1), x, y + 0.5 * pixelRatio);
    });

    ctx.beginPath();
    ctx.arc(player.x * k, player.y * k, 6 * pixelRatio, 0, Math.PI * 2);
    ctx.fillStyle = '#ea6a22';
    ctx.fill();
    ctx.lineWidth = 2.5 * pixelRatio;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.lineWidth = 1 * pixelRatio;
    ctx.strokeStyle = '#1b2733';
    ctx.beginPath();
    ctx.arc(player.x * k, player.y * k, 7.5 * pixelRatio, 0, Math.PI * 2);
    ctx.stroke();
  }

  // ------------------------------------------------------------------ Lieux
  // La liste de tous les lieux, groupés par secteur : c'est l'alternative à la carte.
  // Tout ce que la carte permet d'atteindre doit rester atteignable d'ici.
  const placesView = h('div', { class: 'stack' });

  function renderPlaces(): void {
    const { visited } = deps.getState();
    const player = deps.getPlayer();
    const groups = commune.sectors.flatMap((sector) => {
      const places = commune.places.filter((place) => place.sectorId === sector.id);
      if (places.length === 0) return [];
      const items = places.map((place) => {
        const seen = visited.includes(place.id);
        const { pending, exposed } = deps.getPlaceInfo(place);
        const button = h(
          'button',
          { type: 'button', class: 'place-row' },
          h(
            'span',
            { class: 'place-row__name' },
            place.name,
            pending > 0 ? h('span', { class: 'tag tag--todo' }, pending > 1 ? `${pending} gestes possibles` : '1 geste possible') : null,
            exposed ? h('span', { class: 'tag tag--alert' }, 'en zone de risque') : null,
          ),
          h('span', { class: 'place-row__meta' }, formatDistance(distance(place.pos, player)), seen ? h('span', { class: 'tag' }, icon('coche'), 'déjà visité') : null),
        );
        button.addEventListener('click', () => {
          dialog.close();
          deps.travel(place);
        });
        return h('li', null, button, seen ? h('p', { class: 'place-row__about' }, PLACE_TEXTS[place.id]?.description ?? '') : null);
      });
      return [h('section', null, h('h3', null, sector.name), h('ul', { class: 'place-list' }, ...items))];
    });
    placesView.replaceChildren(
      h('p', null, `Choisissez un lieu pour vous y rendre : le trajet prend le même temps qu'à pied. ${visited.length} lieu${visited.length > 1 ? 'x' : ''} sur ${commune.places.length} déjà visité${visited.length > 1 ? 's' : ''}.`),
      h('div', { class: 'place-groups' }, ...groups),
    );
  }

  /** Pastille d'un niveau de danger : sa couleur est doublée par sa forme, et par le texte qui la suit. */
  const swatch = (level: VigilanceLevel): HTMLElement => h('span', { class: 'swatch', 'data-level': level, 'aria-hidden': 'true' });

  // ------------------------------------------------------------------ Météo
  const weatherView = h('div', { class: 'stack' });

  function renderWeather(): void {
    const weather = deps.getWeather();
    weatherView.replaceChildren(
      h('p', { class: 'weather-now' }, h('span', { class: 'weather-now__icon' }, icon(weather.icon)), weather.label),
      h('dl', { class: 'facts' }, h('dt', null, 'La Follette'), h('dd', null, `${weather.river[0].toUpperCase()}${weather.river.slice(1)}.`)),
      h('h3', null, 'Prévisions'),
      weather.forecast.length === 0
        ? h('p', null, 'Rien à signaler pour les jours qui viennent.')
        : h('ul', { class: 'forecast' }, ...weather.forecast.map((day) => h('li', null, h('span', { class: 'forecast__icon' }, icon(day.icon)), h('span', null, h('strong', null, `${day.when}. `), day.text)))),
      ...(weather.hazard
        ? [
            h('h3', null, weather.hazard.title),
            h('p', { class: 'level-name' }, swatch(weather.hazard.level), weather.hazard.indicator),
            h('p', null, weather.hazard.text),
            sourceList(weather.hazard.sources),
          ]
        : []),
      h('p', { class: 'fine-print' }, 'Les messages des autorités sont dans l’application Alertes.'),
    );
  }

  // ---------------------------------------------------------------- Alertes
  const alertsView = h('div', { class: 'stack' });

  function renderAlerts(): void {
    const vigilance = deps.getVigilance();
    const bulletins = deps.getBulletins();
    if (vigilance === null) {
      // Chapitre sans vigilance crues : l'application ne garde que les messages des autorités.
      alertsView.replaceChildren(
        h('h3', null, 'Messages reçus'),
        ...(bulletins.length === 0
          ? [h('p', null, 'Aucun message pour le moment.')]
          : bulletins.map((bulletin) => h('article', { class: 'bulletin' }, h('h4', null, bulletin.title), bulletinContent(bulletin)))),
        h('p', { class: 'fine-print' }, 'Le niveau de danger de feu de forêt est dans l’application Météo.'),
      );
      return;
    }
    const current = VIGILANCE_SCALE.levels.find((level) => level.id === vigilance) ?? VIGILANCE_SCALE.levels[0];
    alertsView.replaceChildren(
      h('h3', null, 'En ce moment'),
      h(
        'dl',
        { class: 'facts' },
        h('dt', null, 'Vigilance crues'),
        h('dd', null, h('span', { class: 'level-name' }, swatch(current.id), current.name), ` — ${current.meaning}`),
      ),
      h('h3', null, 'Messages reçus'),
      ...(bulletins.length === 0
        ? [h('p', null, 'Aucun message pour le moment.')]
        : bulletins.map((bulletin) => h('article', { class: 'bulletin' }, h('h4', null, bulletin.title), bulletinContent(bulletin)))),
      h('h3', null, 'Les quatre niveaux de vigilance'),
      h('p', null, VIGILANCE_SCALE.intro),
      h(
        'ul',
        { class: 'scale' },
        ...VIGILANCE_SCALE.levels.map((level) =>
          h(
            'li',
            { class: 'scale__level' },
            h('p', { class: 'level-name' }, swatch(level.id), level.name, level.id === current.id ? h('span', { class: 'tag' }, 'niveau actuel') : null),
            h('p', null, level.meaning),
          ),
        ),
      ),
      sourceList(VIGILANCE_SCALE.sources),
    );
  }

  // ----------------------------------------------------------------- DICRIM
  const dicrimView = h('div', { class: 'stack' });

  function renderDicrim(): void {
    if (deps.isDicrimRead()) {
      const open = h('button', { type: 'button', class: 'button button--primary' }, 'Ouvrir le DICRIM');
      open.addEventListener('click', () => deps.openDicrim());
      dicrimView.replaceChildren(
        h('p', { class: 'lead' }, "Le document d'information communal sur les risques majeurs de Val-d'Aléa."),
        h('p', null, "Six risques, une carte pour chacun, les bons réflexes et un mémo à conserver. Vous l'avez consulté à la mairie ; il reste disponible ici."),
        open,
      );
    } else {
      dicrimView.replaceChildren(
        h('p', { class: 'lead' }, "Vous n'avez pas encore consulté le DICRIM."),
        h('p', null, "Le document d'information communal sur les risques majeurs se consulte à la mairie. Une fois lu, il reste disponible ici."),
      );
    }
  }

  // ---------------------------------------------------------------- Lexique
  const lexiconView = h('div', { class: 'stack' }, h('p', null, 'Les mots de la prévention, expliqués simplement.'), ...LEXICON.map((entry) => lexiconEntry(entry, 'h3')));

  // ------------------------------------------------------------------ Bilan
  const bilanView = h('div', { class: 'stack' });

  function renderBilan(): void {
    const assessment = deps.getAssessment();
    const earned = deps.getState().badges;
    if (assessment) {
      const again = h('button', { type: 'button', class: 'button' }, 'Rejouer ce chapitre');
      again.addEventListener('click', () => {
        deps.replay();
        dialog.close();
      });
      bilanView.replaceChildren(bilanContent(assessment, deps.getBadgeDefs(), earned, []), again);
    } else {
      bilanView.replaceChildren(h('p', { class: 'lead' }, 'Le bilan d’un chapitre est établi à la fin de celui-ci.'), h('h3', null, 'Badges'), badgeList(deps.getBadgeDefs(), earned));
    }
  }

  // --------------------------------------------------------------- Réglages
  const motion = h('input', { type: 'checkbox', id: 'reglage-animations' });
  motion.addEventListener('change', () => deps.setReducedMotion(motion.checked));
  const soundBox = h('input', { type: 'checkbox', id: 'reglage-son' });
  soundBox.addEventListener('change', () => deps.setSound(soundBox.checked));
  const replayChapter = h('button', { type: 'button', class: 'button' }, 'Rejouer le chapitre');
  replayChapter.addEventListener('click', async () => {
    if (await deps.replayChapter()) dialog.close();
  });
  const restart = h('button', { type: 'button', class: 'button' }, 'Tout recommencer');
  restart.addEventListener('click', async () => {
    if (await deps.restart()) dialog.close();
  });
  const settingsView = h(
    'div',
    { class: 'stack' },
    h(
      'div',
      { class: 'field' },
      motion,
      h('label', { for: 'reglage-animations' }, 'Réduire les animations'),
      h('p', { class: 'fine-print' }, 'La caméra suit le personnage sans glissement, les repères ne clignotent plus, et la crue comme le feu changent de niveau sans transition. Par défaut, le jeu reprend le réglage de votre système.'),
    ),
    h(
      'div',
      { class: 'field' },
      soundBox,
      h('label', { for: 'reglage-son' }, 'Son du jeu'),
      h('p', { class: 'fine-print' }, "Ambiance (pluie, rivière, forêt…) et signaux du récit. Tout ce que dit le son est aussi écrit à l'écran. Le signal d'alerte est inventé : ce n'est pas le vrai signal de FR-Alert."),
    ),
    h('h3', null, 'Partie'),
    h('p', null, 'La partie est enregistrée automatiquement dans ce navigateur. Aucune limite de temps réel : le temps du jeu n’avance que lorsque vous agissez ou vous déplacez.'),
    h(
      'dl',
      { class: 'restart' },
      h('dt', null, replayChapter),
      h('dd', null, 'Reprend le chapitre en cours à son début. Vos badges et les lieux découverts sont conservés. L’application Calendrier permet de changer de chapitre.'),
      h('dt', null, restart),
      h('dd', null, 'Efface toute la partie : badges, lieux découverts et chapitre en cours.'),
    ),
  );

  // ---------------------------------------------------------------- À propos
  /** Lien vers l'extérieur : il s'ouvre dans un nouvel onglet, et le dit. */
  const external = (label: string, url: string): HTMLElement => h('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, label, h('span', { class: 'sr-only' }, ' (nouvelle fenêtre)'));
  const aboutView = h(
    'div',
    { class: 'stack about' },
    h('p', { class: 'lead' }, `${CREDITS.name}, un jeu pour se préparer aux risques majeurs.`),
    h('p', null, `Un jeu de ${CREDITS.author}. Version ${CREDITS.version}.`),
    h('h3', null, 'Un jeu libre'),
    h('p', null, 'Le code source est public : chacun peut le lire, le réutiliser, l’améliorer.'),
    h(
      'ul',
      { class: 'bullets' },
      h('li', null, external('Le code source, sur GitHub', CREDITS.repository)),
      h('li', null, external('Signaler un problème ou proposer une amélioration', CREDITS.issues)),
      h('li', null, 'Code : ', external(`licence ${CREDITS.licences.code.name}`, CREDITS.licences.code.url)),
      h('li', null, 'Textes et contenus : ', external(`licence ${CREDITS.licences.contents.name}`, CREDITS.licences.contents.url)),
    ),
    h('h3', null, 'Les consignes'),
    h(
      'p',
      null,
      "Val-d'Aléa est une commune fictive : ses habitants, son histoire et son DICRIM sont inventés. Les consignes de sécurité, elles, reprennent les pages officielles citées à côté de chaque geste : Géorisques, le ministère chargé de la Transition écologique, Vigicrues, Météo-France, FR-Alert.",
    ),
    h('p', null, "Projet indépendant, sans lien avec les services de l'État. En cas de doute, la source officielle fait foi."),
    h('h3', null, 'Vos données'),
    h('p', null, "Le jeu ne collecte rien : pas de compte, pas de traceur, pas de serveur. La partie est enregistrée dans votre navigateur, et nulle part ailleurs."),
  );

  // ------------------------------------------------------------ Navigation
  const views: Record<View, HTMLElement> = {
    accueil: home,
    calendrier: calendar.element,
    carte: mapView,
    carnet: placesView,
    meteo: weatherView,
    alertes: alertsView,
    dicrim: dicrimView,
    lexique: lexiconView,
    bilan: bilanView,
    reglages: settingsView,
    apropos: aboutView,
  };
  const renderers: Partial<Record<View, () => void>> = {
    accueil: renderHome,
    calendrier: calendar.render,
    carte: renderMap,
    carnet: renderPlaces,
    meteo: renderWeather,
    alertes: renderAlerts,
    dicrim: renderDicrim,
    bilan: renderBilan,
    reglages: () => {
      motion.checked = deps.isReducedMotion();
      soundBox.checked = deps.isSoundOn();
    },
  };
  dialog.body.append(back, ...Object.values(views));

  function show(view: View, moveFocus = true): void {
    for (const [name, element] of Object.entries(views)) element.hidden = name !== view;
    back.hidden = view === 'accueil';
    dialog.setTitle(TITLES[view]);
    // Ouvrir une application, c'est en avoir vu la nouveauté.
    if (isNews(view)) deps.clearNews(view);
    renderers[view]?.();
    if (moveFocus) dialog.focusTitle();
  }

  return {
    open(returnFocus, view = 'accueil') {
      show(view, false);
      dialog.open(returnFocus);
    },
  };
}
