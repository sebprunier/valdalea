import { ACTIONS, QUESTIONS } from '../content/inondation';
import type { ActionDef } from '../content/model';
import { PLACE_TEXTS } from '../content/places';
import { actionsAt, actionStatus, formatDuration, type ActionStatus, type Chapter } from '../core/chapter';
import { findSector, type Commune, type Place } from '../world/model';
import { createDialog } from './dialog';
import { mountQuestion, sourceList } from './documents';
import { h, icon } from './dom';
import { buildScene } from './scenes';

/**
 * Vue rapprochée d'un lieu : son illustration, sa description et les gestes
 * possibles. Chaque geste est un vrai bouton de la liste ; les pastilles posées
 * sur l'illustration n'en sont que des raccourcis pour la souris et le doigt.
 */

export interface PlaceUiDeps {
  commune: Commune;
  getChapter(): Chapter;
  /** Hauteur d'eau dans le lieu et hauteur de la crue, à cet instant. */
  getWater(place: Place): { depth: number; flood: number };
  /** Le lieu est-il en zone inondable ? Connu seulement une fois le DICRIM consulté. */
  isExposed(place: Place): boolean | null;
  /** Accomplit l'action. */
  perform(action: ActionDef): void;
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
      return status.minutes > 0 ? formatDuration(status.minutes) : 'Tout de suite';
    case 'faite':
      return 'Fait';
    case 'verrouillee':
      return 'Impossible';
    case 'trop-longue':
      return `${formatDuration(status.minutes)} : plus assez de temps`;
    default:
      return '';
  }
}

export function createPlaceUi(deps: PlaceUiDeps): PlaceUi {
  const dialog = createDialog({ id: 'fiche-lieu', title: '', className: 'dialog--wide' });
  let place: Place | null = null;

  function overview(focusTitle: boolean): void {
    if (!place) return;
    const current = place;
    const chapter = deps.getChapter();
    const actions = actionsAt(ACTIONS, chapter, current.id);
    dialog.setTitle(current.name);

    const exposed = deps.isExposed(current);
    const kicker = h(
      'p',
      { class: 'dialog__kicker' },
      findSector(deps.commune, current.sectorId)?.name ?? deps.commune.name,
      exposed === null ? null : h('span', { class: exposed ? 'tag tag--alert' : 'tag' }, exposed ? 'Zone inondable' : 'Hors zone inondable'),
    );

    const water = deps.getWater(current);
    const scene = buildScene(current.id, { did: (id) => chapter.done.includes(id), water: water.depth, flood: water.flood });
    let figure: HTMLElement | null = null;
    if (scene) {
      figure = h('div', { class: 'scene' });
      figure.append(scene.svg);
      actions.forEach((action, index) => {
        const spot = scene.spots.get(action.id);
        if (!spot) return;
        const done = chapter.done.includes(action.id);
        // Raccourci visuel : le bouton accessible est celui de la liste, juste en dessous.
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
          : chapter.phase === 'bilan'
            ? 'La crue est passée. Le bilan est dans votre téléphone.'
            : 'Rien à faire ici pour le moment.';
      todo = h('p', { class: 'fine-print' }, message);
    } else {
      todo = h(
        'ol',
        { class: 'actions' },
        ...actions.map((action, index) => {
          const status = actionStatus(action, chapter);
          const button = h(
            'button',
            { type: 'button', class: `action action--${status.state}` },
            h('span', { class: 'action__number', 'aria-hidden': 'true' }, String(index + 1)),
            h('span', { class: 'action__title' }, action.title),
            h('span', { class: 'action__status' }, status.state === 'faite' ? icon('coche') : null, statusLabel(status)),
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
      todo,
    );
    // Sur grand écran, l'illustration et la liste des gestes se font face.
    const layout = figure ? h('div', { class: 'place-layout' }, figure, text) : text;
    dialog.body.replaceChildren(kicker, layout, h('div', { class: 'dialog__actions' }, back));
    if (focusTitle) dialog.focusTitle();
  }

  function detail(action: ActionDef): void {
    if (!place) return;
    const current = place;
    const chapter = deps.getChapter();
    const status = actionStatus(action, chapter);
    dialog.setTitle(action.title);

    const back = h('button', { type: 'button', class: 'button button--small' }, icon('retour'), current.name);
    back.addEventListener('click', () => overview(true));

    const host = h('div', { class: 'stack' });
    const info = [
      h('p', null, h('strong', null, 'Pourquoi ? '), action.why),
      h('p', null, h('strong', null, "Qui s'en charge ? "), action.who),
      action.sources.length > 0 ? sourceList(action.sources) : null,
    ];

    const finish = (): void => {
      deps.perform(action);
      dialog.setTitle(action.title);
      const next = h('button', { type: 'button', class: 'button button--primary' }, 'Continuer');
      next.addEventListener('click', () => {
        if (action.endsPhase && action.phase !== 'accueil') dialog.close();
        else overview(true);
        deps.afterAction(action);
      });
      host.replaceChildren(h('p', { class: 'verdict verdict--ok' }, icon('coche'), "C'est fait"), h('p', { class: 'lead' }, action.done), h('div', { class: 'dialog__actions' }, next));
      dialog.focusTitle();
    };

    const questions = (action.questions ?? []).map((id) => QUESTIONS.find((q) => q.id === id)).filter((q) => q !== undefined);
    const ask = (index: number): void => {
      const question = questions[index];
      dialog.setTitle(`${action.title} (${index + 1} sur ${questions.length})`);
      mountQuestion(host, question, {
        tone: 'quiz',
        onAnswer: () => undefined,
        onContinue: () => (index + 1 < questions.length ? ask(index + 1) : finish()),
      });
      dialog.focusTitle();
    };

    host.append(...info.filter((node): node is HTMLElement => node !== null));
    if (status.state === 'possible') {
      const label = questions.length > 0 ? 'Commencer' : status.minutes > 0 ? `Le faire (${formatDuration(status.minutes)})` : 'Le faire';
      const go = h('button', { type: 'button', class: 'button button--primary' }, label);
      go.addEventListener('click', () => (questions.length > 0 ? ask(0) : finish()));
      host.append(h('div', { class: 'dialog__actions' }, go));
    } else if (status.state === 'faite') {
      host.append(h('p', { class: 'verdict verdict--ok' }, icon('coche'), "C'est fait"), h('p', null, action.done));
    } else if (status.state === 'verrouillee') {
      host.append(h('p', { class: 'verdict verdict--ko' }, icon('fermer'), 'Impossible maintenant'), h('p', null, action.locked ?? ''));
    } else if (status.state === 'trop-longue') {
      host.append(h('p', { class: 'verdict verdict--ko' }, icon('fermer'), 'Plus assez de temps'), h('p', null, `Il faudrait ${formatDuration(status.minutes)}, et il vous en reste ${formatDuration(chapter.minutesLeft)}.`));
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
