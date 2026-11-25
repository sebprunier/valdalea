import { distance, type Vec } from '../core/geometry';
import { UNITS_PER_METER } from '../game/constants';
import type { Commune, Place } from '../world/model';
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
    ...row('Zoomer, dézoomer', keys('+'), ' et ', keys('-'), ', la molette, ou les boutons en bas de la carte'),
    ...row('Légende de la carte', keys('G')),
    ...row('Carnet de mission', keys('M')),
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
  /** Réglage du son, proposé avant de commencer : rien ne se fait entendre sans que le joueur l'ait vu. */
  sound: { isOn(): boolean; set(on: boolean): void };
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

  const sound = h('input', { type: 'checkbox', id: 'accueil-son' });
  sound.checked = options.sound.isOn();
  sound.addEventListener('change', () => options.sound.set(sound.checked));
  const soundField = h(
    'div',
    { class: 'field' },
    sound,
    h('label', { for: 'accueil-son' }, 'Jouer avec le son'),
    h('p', { class: 'fine-print' }, "Une ambiance (pluie, rivière, forêt, cloches…) et quelques signaux. Le bouton en haut à droite de l'écran coupe le son à tout moment."),
  );

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
      "Vous venez de rejoindre sa réserve communale de sécurité civile. L'automne arrive, et avec lui les crues de la Follette : le maire vous attend pour votre première mission.",
    ),
    actions,
    soundField,
    h('h3', null, 'Commandes'),
    controlsList(),
    h('p', null, WITHOUT_MAP),
    h(
      'p',
      { class: 'fine-print' },
      "Version de travail : un seul chapitre est jouable, l'automne et le risque d'inondation. ",
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
    h('h3', null, 'Le temps du jeu'),
    h(
      'p',
      null,
      "Rien n'est chronométré. L'heure affichée en haut de l'écran est celle du jeu : elle n'avance que lorsque vous accomplissez un geste ou que vous vous déplacez. Un geste « de 30 minutes » se fait d'un coup et retire 30 minutes à votre journée. Prenez tout le temps de lire.",
    ),
    h('h3', null, 'Savoir quoi faire'),
    h(
      'p',
      null,
      "Le bandeau « Mission », sous la barre du haut, dit toujours quoi faire ensuite. Il ouvre le carnet de mission (touche M), qui liste les gestes de la journée et vous y conduit. Sur la carte, des flèches orange pointent vers les lieux où il reste quelque chose à faire.",
    ),
    h('h3', null, 'Le temps qu’il fait, la vigilance, le téléphone'),
    h(
      'p',
      null,
      "En haut de l'écran, deux boutons donnent le temps qu'il fait et le niveau de vigilance crues ; ils ouvrent le détail et les messages reçus. Une pastille orange sur le téléphone signale qu'une nouveauté vous y attend : une alerte, le DICRIM, le bilan.",
    ),
    h('h3', null, 'Recommencer'),
    h(
      'p',
      null,
      "Dans le téléphone, application Réglages : « Rejouer le chapitre » reprend l'automne au début en gardant vos badges, « Tout recommencer » efface la partie. À la fin de la crue, le bilan et le carnet de mission proposent aussi de rejouer.",
    ),
    h('h3', null, 'Le son'),
    h(
      'p',
      null,
      "Le jeu fait entendre une ambiance, selon le temps qu'il fait et l'endroit où vous êtes (la pluie, la rivière, la forêt, l'usine, la cloche de l'église qui sonne les heures du jeu), et quelques signaux : le téléphone qui vibre, l'alerte, un geste accompli. Tout ce que dit le son est aussi écrit à l'écran. Le bouton en haut à droite le coupe à tout moment ; le réglage se retrouve dans le téléphone. Le signal d'alerte du jeu est inventé : ce n'est pas le vrai signal de FR-Alert.",
    ),
    h('h3', null, 'Quitter le jeu'),
    h(
      'p',
      null,
      "La partie s'enregistre toute seule : vous pouvez fermer la page et revenir plus tard. Si vous faites « retour » dans le navigateur, le jeu vous demande confirmation avant de vous laisser partir.",
    ),
    h('h3', null, 'Les repères sur la carte'),
    h(
      'p',
      null,
      'Chaque lieu est signalé par une pastille. Approchez-vous : son nom apparaît en bas de l’écran, et vous pouvez l’ouvrir. Un chiffre orange indique le nombre de gestes possibles sur place ; une coche marque les lieux déjà visités. Le bouton « Légende », en bas à gauche de la carte, explique les couleurs et les motifs du plan.',
    ),
  );
  return dialog;
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

/** Ce que la liste affiche de chaque lieu, en plus de son nom. */
export interface PlaceInfo {
  /** Nombre de gestes possibles sur place. */
  pending: number;
  /** En zone inondable ? `null` tant que le DICRIM n'a pas été consulté. */
  exposed: boolean | null;
}

/**
 * Liste de tous les lieux, groupés par secteur. C'est l'alternative à la carte :
 * tout ce que la carte permet d'atteindre doit rester atteignable d'ici.
 */
export function createPlacesDialog(commune: Commune, onTravel: (place: Place) => void, info: (place: Place) => PlaceInfo): PlacesDialog {
  const dialog = createDialog({ id: 'lieux', title: 'Lieux de la commune' });
  const list = h('div', { class: 'place-groups' });
  dialog.body.append(h('p', null, 'Choisissez un lieu pour vous y rendre. Le trajet prend le même temps qu’à pied.'), list);

  return {
    show(player, visited, returnFocus) {
      list.replaceChildren();
      for (const sector of commune.sectors) {
        const places = commune.places.filter((place) => place.sectorId === sector.id);
        if (places.length === 0) continue;
        const items = places.map((place) => {
          const seen = visited.includes(place.id);
          const { pending, exposed } = info(place);
          const button = h(
            'button',
            { type: 'button', class: 'place-row' },
            h(
              'span',
              { class: 'place-row__name' },
              place.name,
              pending > 0 ? h('span', { class: 'tag tag--todo' }, pending > 1 ? `${pending} gestes possibles` : '1 geste possible') : null,
              exposed ? h('span', { class: 'tag tag--alert' }, 'zone inondable') : null,
            ),
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
