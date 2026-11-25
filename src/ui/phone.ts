import { BADGES, DICRIM } from '../content/inondation';
import type { Bulletin } from '../content/model';
import { PLACE_TEXTS } from '../content/places';
import type { Assessment } from '../core/chapter';
import type { Vec } from '../core/geometry';
import type { GameState } from '../core/state';
import type { Commune } from '../world/model';
import { createDialog } from './dialog';
import { badgeList, bilanContent, bulletinContent, dicrimContent } from './documents';
import { h, icon, type IconName } from './dom';

/**
 * Le téléphone du joueur : c'est le tableau de bord du jeu. On y retrouve le
 * plan, les alertes reçues, le DICRIM une fois consulté, le bilan et les badges.
 */

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
  getAssessment(): Assessment | null;
  isDicrimRead(): boolean;
  setHazardShown(shown: boolean): void;
  isReducedMotion(): boolean;
  setReducedMotion(reduced: boolean): void;
  /** Recommence le chapitre en gardant les badges. */
  replay(): void;
  /** Le joueur demande à tout recommencer ; renvoie vrai si la partie a bien été remise à zéro. */
  restart(): Promise<boolean>;
}

export interface Phone {
  open(returnFocus: HTMLElement | null): void;
}

type View = 'accueil' | 'carte' | 'carnet' | 'alertes' | 'dicrim' | 'bilan' | 'reglages';

const APPS: Array<{ view: Exclude<View, 'accueil'>; label: string; icon: IconName }> = [
  { view: 'carte', label: 'Carte', icon: 'carte' },
  { view: 'alertes', label: 'Alertes', icon: 'alerte' },
  { view: 'dicrim', label: 'DICRIM', icon: 'document' },
  { view: 'carnet', label: 'Carnet', icon: 'carnet' },
  { view: 'bilan', label: 'Bilan', icon: 'medaille' },
  { view: 'reglages', label: 'Réglages', icon: 'reglages' },
];

const TITLES: Record<View, string> = {
  accueil: 'Téléphone',
  carte: 'Carte',
  carnet: 'Carnet',
  alertes: 'Alertes',
  dicrim: 'DICRIM',
  bilan: 'Bilan et badges',
  reglages: 'Réglages',
};

export function createPhone(deps: PhoneDeps): Phone {
  const { commune } = deps;
  const dialog = createDialog({ id: 'telephone', title: TITLES.accueil, className: 'dialog--phone' });

  const back = h('button', { type: 'button', class: 'button button--small phone__back' }, icon('retour'), 'Applications');
  back.addEventListener('click', () => show('accueil'));

  // ----------------------------------------------------------- Applications
  const home = h(
    'ul',
    { class: 'apps' },
    ...APPS.map((app) => {
      const button = h('button', { type: 'button', class: 'app' }, h('span', { class: 'app__icon' }, icon(app.icon)), app.label);
      button.addEventListener('click', () => show(app.view));
      return h('li', null, button);
    }),
  );

  // ------------------------------------------------------------------ Carte
  const mapCanvas = h('canvas', { class: 'minimap', role: 'img' });
  const mapWhere = h('p', { class: 'phone__where' });
  const mapLegend = h('ol', { class: 'legend' });
  const mapZone = h('input', { type: 'checkbox', id: 'carte-zone' });
  mapZone.addEventListener('change', () => {
    deps.setHazardShown(mapZone.checked);
    renderMap();
  });
  const mapZoneField = h('div', { class: 'field' }, mapZone, h('label', { for: 'carte-zone' }, 'Afficher la zone inondable'), h('p', { class: 'fine-print' }, 'En violet sur le plan.'));
  const mapView = h(
    'div',
    { class: 'stack' },
    mapWhere,
    mapCanvas,
    mapZoneField,
    h('p', { class: 'fine-print' }, 'Votre position est le point orange. Les numéros renvoient à la liste ci-dessous.'),
    mapLegend,
  );

  function renderMap(): void {
    const state = deps.getState();
    const player = deps.getPlayer();
    mapZoneField.hidden = !deps.isDicrimRead();
    mapZone.checked = state.settings.hazardLayer;
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

  function renderAlerts(): void {
    const bulletins = deps.getBulletins();
    if (bulletins.length === 0) {
      alertsView.replaceChildren(h('p', { class: 'lead' }, 'Aucune alerte.'), h('p', null, 'La Follette est en vigilance verte : pas de vigilance particulière.'));
      return;
    }
    alertsView.replaceChildren(...bulletins.map((bulletin) => h('article', { class: 'bulletin' }, h('h3', null, bulletin.title), bulletinContent(bulletin))));
  }

  // ----------------------------------------------------------------- DICRIM
  const dicrimView = h('div', { class: 'stack' });

  function renderDicrim(): void {
    if (deps.isDicrimRead()) dicrimView.replaceChildren(dicrimContent(DICRIM));
    else {
      dicrimView.replaceChildren(
        h('p', { class: 'lead' }, "Vous n'avez pas encore consulté le DICRIM."),
        h('p', null, "Le document d'information communal sur les risques majeurs se consulte à la mairie. Une fois lu, il reste disponible ici."),
      );
    }
  }

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
    h('h3', null, 'Partie'),
    h('p', null, 'La partie est enregistrée automatiquement dans ce navigateur. Aucune limite de temps réel : le temps du jeu n’avance que lorsque vous agissez ou vous déplacez.'),
    restart,
  );

  // ------------------------------------------------------------ Navigation
  const views: Record<View, HTMLElement> = {
    accueil: home,
    carte: mapView,
    carnet: notebookView,
    alertes: alertsView,
    dicrim: dicrimView,
    bilan: bilanView,
    reglages: settingsView,
  };
  const renderers: Partial<Record<View, () => void>> = {
    carte: renderMap,
    carnet: renderNotebook,
    alertes: renderAlerts,
    dicrim: renderDicrim,
    bilan: renderBilan,
    reglages: () => {
      motion.checked = deps.isReducedMotion();
    },
  };
  dialog.body.append(back, ...Object.values(views));

  function show(view: View, moveFocus = true): void {
    for (const [name, element] of Object.entries(views)) element.hidden = name !== view;
    back.hidden = view === 'accueil';
    dialog.setTitle(TITLES[view]);
    renderers[view]?.();
    if (moveFocus) dialog.focusTitle();
  }

  return {
    open(returnFocus) {
      show('accueil', false);
      dialog.open(returnFocus);
    },
  };
}
