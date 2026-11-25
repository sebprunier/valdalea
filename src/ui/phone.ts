import type { Vec } from '../core/geometry';
import type { GameState } from '../core/state';
import { PLACE_TEXTS } from '../content/places';
import type { Commune } from '../world/model';
import { createDialog } from './dialog';
import { h, icon, type IconName } from './dom';

/**
 * Le téléphone du joueur : c'est le tableau de bord du jeu. Il accueillera
 * ensuite les alertes, le DICRIM, le kit d'urgence et les badges.
 */

export interface PhoneDeps {
  commune: Commune;
  /** Plan de la commune à petite échelle. */
  overview: HTMLCanvasElement;
  getPlayer(): Vec;
  getSectorName(): string;
  getState(): GameState;
  isReducedMotion(): boolean;
  setReducedMotion(reduced: boolean): void;
  /** Le joueur demande à recommencer ; renvoie vrai si la partie a bien été remise à zéro. */
  restart(): Promise<boolean>;
}

export interface Phone {
  open(returnFocus: HTMLElement | null): void;
}

type View = 'accueil' | 'carte' | 'carnet' | 'reglages';

const APPS: Array<{ view: Exclude<View, 'accueil'>; label: string; icon: IconName }> = [
  { view: 'carte', label: 'Carte', icon: 'carte' },
  { view: 'carnet', label: 'Carnet', icon: 'carnet' },
  { view: 'reglages', label: 'Réglages', icon: 'reglages' },
];

const TITLES: Record<View, string> = {
  accueil: 'Téléphone',
  carte: 'Carte',
  carnet: 'Carnet',
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
  const mapView = h(
    'div',
    { class: 'stack' },
    mapWhere,
    mapCanvas,
    h('p', { class: 'fine-print' }, 'Votre position est le point orange. Les numéros renvoient à la liste ci-dessous.'),
    mapLegend,
  );

  function renderMap(): void {
    const state = deps.getState();
    const player = deps.getPlayer();
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

  // --------------------------------------------------------------- Réglages
  const motion = h('input', { type: 'checkbox', id: 'reglage-animations' });
  motion.addEventListener('change', () => deps.setReducedMotion(motion.checked));
  const restart = h('button', { type: 'button', class: 'button' }, 'Recommencer la partie');
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
      h('p', { class: 'fine-print' }, 'La caméra suit le personnage sans glissement et les repères ne clignotent plus. Par défaut, le jeu reprend le réglage de votre système.'),
    ),
    h('h3', null, 'Partie'),
    h('p', null, 'La partie est enregistrée automatiquement dans ce navigateur.'),
    restart,
  );

  // ------------------------------------------------------------ Navigation
  const views: Record<View, HTMLElement> = { accueil: home, carte: mapView, carnet: notebookView, reglages: settingsView };
  dialog.body.append(back, ...Object.values(views));

  function show(view: View, moveFocus = true): void {
    for (const [name, element] of Object.entries(views)) element.hidden = name !== view;
    back.hidden = view === 'accueil';
    dialog.setTitle(TITLES[view]);
    if (view === 'carte') renderMap();
    if (view === 'carnet') renderNotebook();
    if (view === 'reglages') motion.checked = deps.isReducedMotion();
    if (moveFocus) dialog.focusTitle();
  }

  return {
    open(returnFocus) {
      show('accueil', false);
      dialog.open(returnFocus);
    },
  };
}
