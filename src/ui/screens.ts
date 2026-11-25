import { distance, type Vec } from '../core/geometry';
import { PLACE_TEXTS } from '../content/places';
import { UNITS_PER_METER } from '../game/constants';
import { findSector, type Commune, type Place } from '../world/model';
import { createDialog, type DialogHandle } from './dialog';
import { h, icon } from './dom';

/** Écrans simples : accueil, aide, fiche d'un lieu et liste des lieux. */

function keys(...labels: string[]): HTMLElement {
  const group = h('span', { class: 'keys' });
  labels.forEach((label, index) => {
    if (index > 0) group.append(' ');
    group.append(h('kbd', null, label));
  });
  return group;
}

/** Les quatre flèches : les glyphes sont décoratifs, un texte les remplace pour les lecteurs d'écran. */
function arrowKeys(): HTMLElement {
  const glyphs = keys('←', '↑', '↓', '→');
  glyphs.setAttribute('aria-hidden', 'true');
  return h('span', null, glyphs, h('span', { class: 'sr-only' }, 'les flèches du clavier'));
}

function controlsList(): HTMLElement {
  const row = (action: string, ...how: Array<Node | string>): HTMLElement[] => [h('dt', null, action), h('dd', null, ...how)];
  return h(
    'dl',
    { class: 'controls' },
    ...row('Se déplacer', arrowKeys(), ' ou ', keys('Z', 'Q', 'S', 'D'), ', ou désignez un point de la carte (clic ou doigt)'),
    ...row('Courir', 'maintenir ', keys('Maj')),
    ...row('Ouvrir un lieu', keys('Entrée'), ' ou ', keys('E')),
    ...row('Liste des lieux', keys('L')),
    ...row('Téléphone', keys('T')),
    ...row('Aide', keys('H')),
    ...row('Fermer une fenêtre', keys('Échap')),
  );
}

const WITHOUT_MAP =
  "Vous pouvez jouer sans la carte : la liste des lieux donne accès à toute la commune, au clavier comme avec un lecteur d'écran.";

// ------------------------------------------------------------------ Accueil

export interface StartOptions {
  hasSave: boolean;
  /** Faux si le navigateur empêche d'enregistrer la partie. */
  persistent: boolean;
  onContinue(): void;
  onNewGame(): void;
}

export function createStartDialog(options: StartOptions): DialogHandle {
  const dialog = createDialog({ id: 'accueil', title: "Val-d'Aléa", className: 'dialog--start', closable: false });

  const actions = h('div', { class: 'dialog__actions dialog__actions--start' });
  if (options.hasSave) {
    const resume = h('button', { type: 'button', class: 'button button--primary' }, 'Continuer la partie');
    const restart = h('button', { type: 'button', class: 'button' }, 'Nouvelle partie');
    resume.addEventListener('click', options.onContinue);
    restart.addEventListener('click', options.onNewGame);
    actions.append(resume, restart);
  } else {
    const begin = h('button', { type: 'button', class: 'button button--primary' }, 'Commencer');
    begin.addEventListener('click', options.onNewGame);
    actions.append(begin);
  }

  dialog.body.append(
    h('p', { class: 'dialog__kicker' }, 'Un jeu pour se préparer aux risques majeurs'),
    h(
      'p',
      { class: 'lead' },
      "Une rivière, une falaise, une forêt, une usine : Val-d'Aléa est une commune comme beaucoup d'autres, exposée à des risques avec lesquels il faut apprendre à vivre.",
    ),
    h(
      'p',
      null,
      "Vous venez de rejoindre sa réserve communale de sécurité civile. Avant d'agir, prenez le temps de découvrir votre territoire.",
    ),
    actions,
    h('h3', null, 'Commandes'),
    controlsList(),
    h('p', null, WITHOUT_MAP),
    h(
      'p',
      { class: 'fine-print' },
      "Version de travail : pour l'instant, seule la découverte de la commune est jouable. ",
      "Jeu indépendant, sans lien avec les services de l'État. Aucune donnée personnelle n'est collectée. ",
      options.persistent
        ? 'La partie est enregistrée uniquement dans votre navigateur.'
        : "Votre navigateur bloque l'enregistrement local : la partie ne sera pas conservée après la fermeture de la page.",
    ),
  );
  return dialog;
}

// --------------------------------------------------------------------- Aide

export function createHelpDialog(): DialogHandle {
  const dialog = createDialog({ id: 'aide', title: 'Aide' });
  dialog.body.append(
    h('h3', null, 'Commandes'),
    controlsList(),
    h('p', null, 'Les raccourcis clavier fonctionnent lorsque la carte a le focus : cliquez dessus, ou atteignez-la avec la touche Tabulation.'),
    h('h3', null, 'Jouer sans la carte'),
    h('p', null, WITHOUT_MAP),
    h('h3', null, 'Les repères sur la carte'),
    h(
      'p',
      null,
      'Chaque lieu à découvrir est signalé par une pastille. Approchez-vous : son nom apparaît en bas de l’écran, et vous pouvez ouvrir sa fiche. Une coche marque les lieux déjà visités.',
    ),
  );
  return dialog;
}

// ------------------------------------------------------------ Fiche de lieu

export interface PlaceDialog {
  show(place: Place, returnFocus: HTMLElement | null): void;
}

export function createPlaceDialog(commune: Commune): PlaceDialog {
  const dialog = createDialog({ id: 'fiche-lieu', title: '' });
  const sector = h('p', { class: 'dialog__kicker' });
  const description = h('p', { class: 'lead' });
  const back = h('button', { type: 'button', class: 'button button--primary' }, 'Revenir à la carte');
  back.addEventListener('click', () => dialog.close());
  dialog.body.append(sector, description, h('div', { class: 'dialog__actions' }, back));

  return {
    show(place, returnFocus) {
      dialog.setTitle(place.name);
      sector.textContent = findSector(commune, place.sectorId)?.name ?? commune.name;
      description.textContent = PLACE_TEXTS[place.id]?.description ?? '';
      dialog.open(returnFocus);
    },
  };
}

// --------------------------------------------------------- Liste des lieux

export function formatDistance(units: number): string {
  const meters = units / UNITS_PER_METER;
  if (meters < 15) return 'vous y êtes';
  if (meters < 1000) return `à ${Math.round(meters / 10) * 10} m`;
  return `à ${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}

export interface PlacesDialog {
  show(player: Vec, visited: readonly string[], returnFocus: HTMLElement | null): void;
}

/**
 * Liste de tous les lieux, groupés par secteur. C'est l'alternative à la carte :
 * tout ce que la carte permet d'atteindre doit rester atteignable d'ici.
 */
export function createPlacesDialog(commune: Commune, onTravel: (place: Place) => void): PlacesDialog {
  const dialog = createDialog({ id: 'lieux', title: 'Lieux de la commune' });
  const list = h('div', { class: 'place-groups' });
  dialog.body.append(h('p', null, 'Choisissez un lieu pour vous y rendre directement.'), list);

  return {
    show(player, visited, returnFocus) {
      list.replaceChildren();
      for (const sector of commune.sectors) {
        const places = commune.places.filter((place) => place.sectorId === sector.id);
        if (places.length === 0) continue;
        const items = places.map((place) => {
          const seen = visited.includes(place.id);
          const button = h(
            'button',
            { type: 'button', class: 'place-row' },
            h('span', { class: 'place-row__name' }, place.name),
            h(
              'span',
              { class: 'place-row__meta' },
              formatDistance(distance(place.pos, player)),
              seen ? h('span', { class: 'tag' }, icon('coche'), 'déjà visité') : null,
            ),
          );
          button.addEventListener('click', () => {
            dialog.close();
            onTravel(place);
          });
          return h('li', null, button);
        });
        list.append(h('section', null, h('h3', null, sector.name), h('ul', { class: 'place-list' }, ...items)));
      }
      dialog.open(returnFocus);
    },
  };
}
