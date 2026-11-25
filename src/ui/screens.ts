import { UNITS_PER_METER } from '../game/constants';
import { createDialog, type DialogHandle } from './dialog';
import { h } from './dom';

/** Écrans simples : accueil et aide. La liste des lieux est une application du téléphone. */

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
    ...row('Téléphone', keys('T')),
    ...row('Liste des lieux, dans le téléphone', keys('L')),
    ...row('Aide', keys('H')),
    ...row('Fermer une fenêtre', keys('Échap')),
  );
}

const WITHOUT_MAP =
  "Vous pouvez jouer sans la carte : dans le téléphone, l'application Lieux donne accès à toute la commune, au clavier comme avec un lecteur d'écran.";

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
      "Vous venez de rejoindre sa réserve communale de sécurité civile. Le maire vous attend : il vous remettra le DICRIM de la commune, puis vous choisirez vos missions, saison après saison.",
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
    h('h3', null, 'Les chapitres'),
    h(
      'p',
      null,
      "La partie commence par un prologue : rencontrer le maire, lire le DICRIM. Ensuite, l'application Calendrier du téléphone propose les chapitres, un risque par saison. Vous les jouez dans l'ordre que vous voulez ; un chapitre est conseillé pour commencer, aucun n'est imposé. Le chapitre en cours est rappelé en haut de l'écran.",
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
      "Le téléphone est la télécommande du jeu : calendrier des chapitres, carte, lieux, météo, alertes, DICRIM, lexique, bilan, réglages. En haut de l'écran, deux boutons donnent le temps qu'il fait et le niveau de vigilance ; ils ouvrent les applications Météo et Alertes. Une pastille orange sur le téléphone signale qu'une nouveauté vous y attend : une alerte, le DICRIM, le bilan.",
    ),
    h('h3', null, 'Recommencer'),
    h(
      'p',
      null,
      "Dans le téléphone : l'application Calendrier permet de rejouer un chapitre ou d'en changer ; dans l'application Réglages, « Rejouer le chapitre » reprend le chapitre en cours à son début en gardant vos badges, « Tout recommencer » efface la partie, prologue compris.",
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

/** Ce que la liste affiche de chaque lieu, en plus de son nom. */
export interface PlaceInfo {
  /** Nombre de gestes possibles sur place. */
  pending: number;
  /** Dans une zone de risque ? `null` tant que le DICRIM n'a pas été consulté. */
  exposed: boolean | null;
}
