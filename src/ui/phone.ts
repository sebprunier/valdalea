import { BADGES, VIGILANCE_SCALE } from '../content/inondation';
import { LEXICON } from '../content/lexique';
import type { Bulletin, VigilanceLevel } from '../content/model';
import { PLACE_TEXTS } from '../content/places';
import type { Assessment } from '../core/chapter';
import type { Vec } from '../core/geometry';
import { NEWS_IDS, type GameState, type NewsId } from '../core/state';
import { RISK_NAMES } from '../render/riskmap';
import { RISK_IDS, type Commune, type RiskId } from '../world/model';
import { createDialog } from './dialog';
import { badgeList, bilanContent, bulletinContent, lexiconEntry, sourceList } from './documents';
import { h, icon, type IconName } from './dom';

/**
 * Le téléphone du joueur : c'est le tableau de bord du jeu. On y retrouve le
 * plan, la vigilance et les alertes reçues, le DICRIM une fois consulté, le
 * bilan et les badges. Une pastille signale les applications où quelque chose
 * de nouveau attend d'être regardé.
 */

/** La situation du moment, telle que l'application Alertes la résume. */
export interface SituationNow {
  vigilance: VigilanceLevel;
  /** Le temps qu'il fait. */
  sky: string;
  /** L'état de la rivière. */
  river: string;
}

export interface PhoneDeps {
  commune: Commune;
  /** Plan de la commune à petite échelle. */
  overview: HTMLCanvasElement;
  /** Dessine la zone inondable et la crue par-dessus le plan (contexte en coordonnées monde). */
  paintWater(ctx: CanvasRenderingContext2D): void;
  getPlayer(): Vec;
  getSectorName(): string;
  getState(): GameState;
  getBulletins(): Bulletin[];
  getSituation(): SituationNow;
  getAssessment(): Assessment | null;
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

export type PhoneView = 'accueil' | 'carte' | 'carnet' | 'alertes' | 'dicrim' | 'lexique' | 'bilan' | 'reglages';

export interface Phone {
  /** Ouvre le téléphone, sur l'écran des applications ou directement dans l'une d'elles. */
  open(returnFocus: HTMLElement | null, view?: PhoneView): void;
}

type View = PhoneView;

const isNews = (view: string): view is NewsId => (NEWS_IDS as readonly string[]).includes(view);

const APPS: Array<{ view: Exclude<View, 'accueil'>; label: string; icon: IconName }> = [
  { view: 'carte', label: 'Carte', icon: 'carte' },
  { view: 'alertes', label: 'Alertes', icon: 'alerte' },
  { view: 'dicrim', label: 'DICRIM', icon: 'document' },
  { view: 'lexique', label: 'Lexique', icon: 'aide' },
  { view: 'carnet', label: 'Lieux', icon: 'carnet' },
  { view: 'bilan', label: 'Bilan', icon: 'medaille' },
  { view: 'reglages', label: 'Réglages', icon: 'reglages' },
];

const TITLES: Record<View, string> = {
  accueil: 'Téléphone',
  carte: 'Carte',
  carnet: 'Lieux découverts',
  alertes: 'Vigilance et alertes',
  dicrim: 'DICRIM',
  lexique: 'Lexique',
  bilan: 'Bilan et badges',
  reglages: 'Réglages',
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

  // ----------------------------------------------------------------- Carnet
  const notebookCount = h('p', { class: 'lead' });
  const notebookList = h('ul', { class: 'notebook' });
  const notebookView = h('div', { class: 'stack' }, notebookCount, notebookList);

  function renderNotebook(): void {
    const { visited } = deps.getState();
    const total = commune.places.length;
    notebookCount.textContent =
      visited.length === 0
        ? `Aucun lieu découvert pour l'instant, sur ${total}.`
        : `${visited.length} lieu${visited.length > 1 ? 'x' : ''} découvert${visited.length > 1 ? 's' : ''} sur ${total}.`;
    notebookList.replaceChildren(
      ...commune.places.map((place) => {
        const seen = visited.includes(place.id);
        return h(
          'li',
          { class: seen ? 'notebook__item' : 'notebook__item notebook__item--unknown' },
          h('h3', null, place.name),
          h('p', null, seen ? (PLACE_TEXTS[place.id]?.description ?? '') : 'Lieu à découvrir.'),
        );
      }),
    );
  }

  // ---------------------------------------------------------------- Alertes
  const alertsView = h('div', { class: 'stack' });

  const swatch = (level: VigilanceLevel): HTMLElement => h('span', { class: 'swatch', 'data-level': level, 'aria-hidden': 'true' });

  function renderAlerts(): void {
    const situation = deps.getSituation();
    const bulletins = deps.getBulletins();
    const current = VIGILANCE_SCALE.levels.find((level) => level.id === situation.vigilance) ?? VIGILANCE_SCALE.levels[0];
    alertsView.replaceChildren(
      h('h3', null, 'En ce moment'),
      h(
        'dl',
        { class: 'facts' },
        h('dt', null, 'Vigilance crues'),
        h('dd', null, h('span', { class: 'level-name' }, swatch(current.id), current.name), ` — ${current.meaning}`),
        h('dt', null, 'Météo'),
        h('dd', null, situation.sky),
        h('dt', null, 'La Follette'),
        h('dd', null, `${situation.river[0].toUpperCase()}${situation.river.slice(1)}.`),
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
      const again = h('button', { type: 'button', class: 'button' }, "Rejouer l'automne");
      again.addEventListener('click', () => {
        deps.replay();
        dialog.close();
      });
      bilanView.replaceChildren(bilanContent(assessment, BADGES, earned, []), again);
    } else {
      bilanView.replaceChildren(h('p', { class: 'lead' }, 'Le bilan sera établi après la crue.'), h('h3', null, 'Badges'), badgeList(BADGES, earned));
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
      h('p', { class: 'fine-print' }, 'La caméra suit le personnage sans glissement, les repères ne clignotent plus et la crue change de niveau sans transition. Par défaut, le jeu reprend le réglage de votre système.'),
    ),
    h(
      'div',
      { class: 'field' },
      soundBox,
      h('label', { for: 'reglage-son' }, 'Son du jeu'),
      h('p', { class: 'fine-print' }, "Ambiance (pluie, rivière, forêt, cloches…) et signaux du récit. Tout ce que dit le son est aussi écrit à l'écran. Le signal d'alerte est inventé : ce n'est pas le vrai signal de FR-Alert."),
    ),
    h('h3', null, 'Partie'),
    h('p', null, 'La partie est enregistrée automatiquement dans ce navigateur. Aucune limite de temps réel : le temps du jeu n’avance que lorsque vous agissez ou vous déplacez.'),
    h(
      'dl',
      { class: 'restart' },
      h('dt', null, replayChapter),
      h('dd', null, "Reprend l'automne au début, chez le maire. Vos badges et les lieux découverts sont conservés."),
      h('dt', null, restart),
      h('dd', null, 'Efface toute la partie : badges, lieux découverts et chapitre en cours.'),
    ),
  );

  // ------------------------------------------------------------ Navigation
  const views: Record<View, HTMLElement> = {
    accueil: home,
    carte: mapView,
    carnet: notebookView,
    alertes: alertsView,
    dicrim: dicrimView,
    lexique: lexiconView,
    bilan: bilanView,
    reglages: settingsView,
  };
  const renderers: Partial<Record<View, () => void>> = {
    accueil: renderHome,
    carte: renderMap,
    carnet: renderNotebook,
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
