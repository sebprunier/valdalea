import { KIT_CARE, KIT_CONTENTS, KIT_SOURCES } from '../content/kit';
import type { ActionDef, Question } from '../content/model';
import { PLACE_TEXTS } from '../content/places';
import { actionsAt, actionStatus, formatDuration, isTimed, remaining, type ActionStatus, type Chapter } from '../core/chapter';
import { findPlace, findSector, type Commune, type Place } from '../world/model';
import { createDialog } from './dialog';
import { lexiconBox, mountQuestion, sourceList } from './documents';
import { h, icon } from './dom';
import { floodMarkFigure } from './figures';
import { buildBrushScene, buildScene } from './scenes';

/**
 * Vue rapprochée d'un lieu : son illustration, sa description et les gestes
 * possibles. Chaque geste est un vrai bouton de la liste ; les pastilles posées
 * sur l'illustration n'en sont que des raccourcis pour la souris et le doigt.
 */

export interface PlaceUiDeps {
  commune: Commune;
  getChapter(): Chapter;
  /** Gestes et questions de ce qui se joue : le prologue, puis le chapitre en cours. */
  getActions(): readonly ActionDef[];
  getQuestions(): readonly Question[];
  /** Hauteur d'eau dans le lieu et hauteur de la crue, à cet instant. */
  getWater(place: Place): { depth: number; flood: number };
  /** Hauteur atteinte ici par la crue de référence (celle de 1958), en mètres. */
  getReferenceDepth(place: Place): number;
  /** Risques auxquels le lieu est exposé, par leur nom ; `null` tant que le DICRIM n'a pas été consulté. */
  getExposures(place: Place): string[] | null;
  /** Le kit d'urgence du joueur est-il prêt ? `null` ailleurs que chez lui, où il ne se range pas. */
  hasKit(place: Place): boolean | null;
  /** Titres des chapitres menés au bout dont ce lieu faisait partie. */
  getFinishedChapters(place: Place): string[];
  /** Accomplit l'action. */
  perform(action: ActionDef): void;
  /** L'action vient d'être accomplie et son résultat est affiché : c'est le moment d'ouvrir ce qu'elle donne à voir. */
  performed(action: ActionDef): void;
  /** Le joueur a lu le résultat de l'action et passe à la suite. */
  afterAction(action: ActionDef): void;
}

export interface PlaceUi {
  show(place: Place, returnFocus: HTMLElement | null): void;
  close(): void;
}

function statusLabel(status: ActionStatus): string {
  switch (status.state) {
    case 'possible':
      return status.minutes > 0 ? `${formatDuration(status.minutes)} de jeu` : '';
    case 'faite':
      return 'Fait';
    case 'verrouillee':
      return 'Impossible';
    case 'trop-longue':
      return 'Plus assez de temps';
    default:
      return '';
  }
}

/** Le kit d'urgence, une fois prêt : chez soi, on peut voir ce qu'il contient et comment en prendre soin. */
function kitBox(): HTMLElement {
  return h(
    'section',
    { class: 'kit-box' },
    h('h3', null, "Votre kit d'urgence"),
    h('p', null, "Votre sac est prêt, à portée de main en haut de l'escalier. Il sert pour tous les risques."),
    h('details', null, h('summary', null, "Voir ce qu'il contient"), h('ul', { class: 'bullets' }, ...KIT_CONTENTS.map((item) => h('li', null, item))), h('p', null, KIT_CARE), sourceList(KIT_SOURCES)),
  );
}

export function createPlaceUi(deps: PlaceUiDeps): PlaceUi {
  const dialog = createDialog({ id: 'fiche-lieu', title: '', className: 'dialog--wide' });
  let place: Place | null = null;

  const status = (action: ActionDef): ActionStatus => actionStatus(action, deps.getChapter());

  /** Gestes encore faisables que le joueur laisserait derrière lui en accomplissant cette action. */
  const leftBehind = (action: ActionDef): ActionDef[] => (action.endsPhase ? remaining(deps.getActions(), deps.getChapter()) : []);

  /**
   * Hors chapitre, dans un lieu où il n'y a rien à faire. Si des chapitres déjà terminés passaient par ce lieu,
   * on le rappelle, tous autant qu'ils sont ; sinon on n'en parle pas : ils n'ont rien à voir avec lui.
   * @param choosing aucun chapitre n'est en cours ni tout juste achevé : on invite à en choisir un
   */
  function idle(current: Place, choosing: boolean): string {
    const titles = deps.getFinishedChapters(current).map((title) => `« ${title} »`);
    if (titles.length === 0) return choosing ? "Rien à faire ici pour l'instant. Choisissez un chapitre dans votre téléphone : il vous confiera une mission." : "Rien à faire ici pour l'instant.";
    if (titles.length === 1) return `Rien à faire ici pour l'instant. Ce lieu a compté dans le chapitre ${titles[0]}, que vous avez terminé : son bilan est dans votre téléphone.`;
    const list = `${titles.slice(0, -1).join(', ')} et ${titles[titles.length - 1]}`;
    return `Rien à faire ici pour l'instant. Ce lieu a compté dans les chapitres ${list}, que vous avez terminés : leurs bilans sont dans votre téléphone.`;
  }

  /** Rappel du temps de jeu restant, en tête des listes de gestes. */
  function timeNote(chapter: Chapter): HTMLElement | null {
    if (!isTimed(chapter.phase)) return null;
    return h('p', { class: 'time-note' }, icon('horloge'), h('span', null, h('strong', null, `Il vous reste ${formatDuration(chapter.minutesLeft)} de jeu. `), 'Chaque geste et chaque trajet en utilise une partie.'));
  }

  function overview(focusTitle: boolean): void {
    if (!place) return;
    const current = place;
    const chapter = deps.getChapter();
    const actions = actionsAt(deps.getActions(), chapter, current.id);
    dialog.setTitle(current.name);

    const exposures = deps.getExposures(current);
    const kicker = h(
      'p',
      { class: 'dialog__kicker' },
      findSector(deps.commune, current.sectorId)?.name ?? deps.commune.name,
      exposures === null ? null : h('span', { class: exposures.length > 0 ? 'tag tag--alert' : 'tag' }, exposures.length > 0 ? `Exposé : ${exposures.join(', ').toLowerCase()}` : 'Hors des zones de risque'),
    );

    const water = deps.getWater(current);
    const reference = deps.getReferenceDepth(current);
    const scene = buildScene(current.id, {
      did: (id) => chapter.done.includes(id),
      water: water.depth,
      flood: water.flood,
      mark1958: chapter.done.includes('pont-repere') && reference > 0 ? reference : null,
    });
    let figure: HTMLElement | null = null;
    if (scene) {
      figure = h('div', { class: 'scene' });
      figure.append(scene.svg);
      actions.forEach((action, index) => {
        const spot = scene.spots.get(action.id);
        if (!spot) return;
        const done = chapter.done.includes(action.id);
        // Raccourci visuel : le bouton accessible est celui de la liste, juste à côté.
        const pin = h('button', { type: 'button', class: done ? 'pin pin--done' : 'pin', tabindex: '-1', 'aria-hidden': 'true', title: action.title }, done ? icon('coche') : String(index + 1));
        pin.style.left = `${spot.left}%`;
        pin.style.top = `${spot.top}%`;
        pin.addEventListener('click', () => detail(action));
        figure!.append(pin);
      });
    }

    let todo: HTMLElement;
    if (actions.length === 0) {
      const message =
        chapter.phase === 'accueil'
          ? "Rien à faire ici pour l'instant : le maire vous attend à la mairie."
          : chapter.phase === 'libre' || chapter.phase === 'bilan'
            ? idle(current, chapter.phase === 'libre')
            : 'Rien à faire ici pour le moment. Votre carnet de mission indique où aller.';
      todo = h('p', { class: 'fine-print' }, message);
    } else {
      todo = h(
        'ol',
        { class: 'actions' },
        ...actions.map((action, index) => {
          const state = status(action);
          const left = state.state === 'possible' ? leftBehind(action).length : 0;
          const label = left > 0 ? (left > 1 ? `${left} gestes restants` : '1 geste restant') : statusLabel(state);
          const button = h(
            'button',
            { type: 'button', class: `action action--${state.state}` },
            h('span', { class: 'action__number', 'aria-hidden': 'true' }, String(index + 1)),
            h('span', { class: 'action__title' }, action.title),
            h('span', { class: 'action__status' }, state.state === 'faite' ? icon('coche') : state.state === 'possible' && state.minutes > 0 ? icon('horloge') : null, label),
          );
          button.addEventListener('click', () => detail(action));
          return h('li', null, button);
        }),
      );
    }

    const back = h('button', { type: 'button', class: 'button' }, 'Revenir à la carte');
    back.addEventListener('click', () => dialog.close());

    const text = h(
      'div',
      { class: 'stack' },
      h('p', null, PLACE_TEXTS[current.id]?.description ?? ''),
      actions.length > 0 ? h('h3', null, 'À faire ici') : null,
      actions.length > 0 ? timeNote(chapter) : null,
      todo,
      deps.hasKit(current) ? kitBox() : null,
    );
    // Sur grand écran, l'illustration et la liste des gestes se font face.
    const layout = figure ? h('div', { class: 'place-layout' }, figure, text) : text;
    dialog.body.replaceChildren(kicker, layout, h('div', { class: 'dialog__actions' }, back));
    if (focusTitle) dialog.focusTitle();
  }

  /** Illustration propre à un geste (le repère de crue, vu de près). */
  function actionFigure(action: ActionDef): HTMLElement | null {
    if (action.figure !== 'repere' || !place) return null;
    return floodMarkFigure(deps.getReferenceDepth(place));
  }

  function detail(action: ActionDef): void {
    if (!place) return;
    const current = place;
    const chapter = deps.getChapter();
    const state = status(action);
    dialog.setTitle(action.title);

    const back = h('button', { type: 'button', class: 'button button--small' }, icon('retour'), current.name);
    back.addEventListener('click', () => overview(true));

    const host = h('div', { class: 'stack' });

    const finish = (): void => {
      deps.perform(action);
      dialog.setTitle(action.title);
      const after = deps.getChapter();
      const next = h('button', { type: 'button', class: 'button button--primary' }, 'Continuer');
      next.addEventListener('click', () => {
        if (action.endsPhase && action.phase !== 'accueil') dialog.close();
        else overview(true);
        deps.afterAction(action);
      });
      host.replaceChildren(
        ...[
          h('p', { class: 'verdict verdict--ok' }, icon('coche'), "C'est fait"),
          h('p', { class: 'lead' }, action.done),
          actionFigure(action),
          isTimed(after.phase) && !action.endsPhase ? h('p', { class: 'fine-print' }, `Il vous reste ${formatDuration(after.minutesLeft)} de jeu.`) : null,
          h('div', { class: 'dialog__actions' }, next),
        ].filter((node): node is HTMLElement => node !== null),
      );
      dialog.focusTitle();
      deps.performed(action);
    };

    const questions = (action.questions ?? []).map((id) => deps.getQuestions().find((q) => q.id === id)).filter((q) => q !== undefined);
    const ask = (index: number): void => {
      const question = questions[index];
      dialog.setTitle(`${action.title} (${index + 1} sur ${questions.length})`);
      mountQuestion(host, question, {
        tone: 'quiz',
        // Le débroussaillement se fait sur le dessin du terrain, qui change à chaque choix.
        figure: action.figure === 'debroussaillement' ? buildBrushScene : undefined,
        onAnswer: () => undefined,
        onContinue: () => (index + 1 < questions.length ? ask(index + 1) : finish()),
      });
      dialog.focusTitle();
    };

    const info = [
      action.lexicon ? lexiconBox(action.lexicon) : null,
      h('p', null, h('strong', null, 'Pourquoi ? '), action.why),
      h('p', null, h('strong', null, "Qui s'en charge ? "), action.who),
      action.sources.length > 0 ? sourceList(action.sources) : null,
    ];
    host.append(...info.filter((node): node is HTMLElement => node !== null));

    const left = state.state === 'possible' ? leftBehind(action) : [];
    if (left.length > 0) {
      // Clore la phase en laissant des gestes faisables : possible, mais on demande confirmation.
      const stay = h('button', { type: 'button', class: 'button button--primary' }, 'Revenir aux gestes');
      stay.addEventListener('click', () => overview(true));
      const go = h('button', { type: 'button', class: 'button' }, `${action.title} quand même`);
      go.addEventListener('click', finish);
      host.append(
        h(
          'div',
          { class: 'warning' },
          h('p', null, h('strong', null, left.length > 1 ? `Il vous reste ${left.length} gestes que vous avez encore le temps d'accomplir :` : "Il vous reste un geste que vous avez encore le temps d'accomplir :")),
          h('ul', { class: 'bullets' }, ...left.map((other) => h('li', null, h('strong', null, `${findPlace(deps.commune, other.place)?.name ?? ''} : `), other.title))),
          h('p', { class: 'fine-print' }, 'Votre carnet de mission (touche M) vous y conduit.'),
        ),
        h('div', { class: 'dialog__actions' }, go, stay),
      );
    } else if (state.state === 'possible') {
      if (state.minutes > 0) {
        host.append(
          h(
            'p',
            { class: 'time-note' },
            icon('horloge'),
            h('span', null, h('strong', null, `Ce geste prend ${formatDuration(state.minutes)} de jeu`), ` sur les ${formatDuration(chapter.minutesLeft)} qu'il vous reste. Ce n'est pas du temps réel : il passe d'un coup.`),
          ),
        );
      }
      const go = h('button', { type: 'button', class: 'button button--primary' }, action.go ?? (questions.length > 0 ? 'Commencer' : 'Le faire'));
      go.addEventListener('click', () => (questions.length > 0 ? ask(0) : finish()));
      host.append(h('div', { class: 'dialog__actions' }, go));
    } else if (state.state === 'faite') {
      const figure = actionFigure(action);
      host.append(h('p', { class: 'verdict verdict--ok' }, icon('coche'), "C'est fait"), h('p', null, action.done));
      if (figure) host.append(figure);
    } else if (state.state === 'verrouillee') {
      host.append(h('p', { class: 'verdict verdict--ko' }, icon('fermer'), 'Impossible maintenant'), h('p', null, action.locked ?? ''));
    } else if (state.state === 'trop-longue') {
      host.append(h('p', { class: 'verdict verdict--ko' }, icon('fermer'), 'Plus assez de temps'), h('p', null, `Il faudrait ${formatDuration(state.minutes)} de jeu, et il vous en reste ${formatDuration(chapter.minutesLeft)}.`));
    }

    dialog.body.replaceChildren(back, host);
    dialog.focusTitle();
  }

  return {
    show(target, returnFocus) {
      place = target;
      overview(false);
      dialog.open(returnFocus);
    },
    close() {
      dialog.close();
    },
  };
}
