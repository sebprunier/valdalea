import { ACTIONS, OBJECTIVES } from '../content/inondation';
import type { ActionDef } from '../content/model';
import { actionMinutes, actionStatus, clockLabel, formatDuration, gestures, isTimed, remaining, TIMED_PHASES, type Chapter } from '../core/chapter';
import { distance, type Vec } from '../core/geometry';
import type { Commune, Place } from '../world/model';
import { createDialog } from './dialog';
import { h, icon } from './dom';
import { formatDistance } from './screens';

/**
 * Carnet de mission : ce qu'il reste à faire, où, et par quoi commencer.
 * C'est la réponse à « que dois-je faire maintenant ? ». Son conseil du moment
 * est affiché en permanence dans la barre d'état, qui ouvre le carnet.
 */

export interface MissionDeps {
  commune: Commune;
  getChapter(): Chapter;
  getPlayer(): Vec;
  /** Emmène le joueur dans un lieu et l'ouvre. */
  goTo(place: Place): void;
  /** Ouvre le bilan de la crue, dans le téléphone. */
  openBilan(): void;
  /** Ouvre le calendrier, où se choisissent les chapitres. */
  openCalendar(): void;
  /** Recommence le chapitre, en gardant les badges. */
  replay(): void;
}

export interface Mission {
  open(returnFocus: HTMLElement | null): void;
  /** Conseil du moment, affiché aussi dans la barre d'état. */
  hint(): { text: string; place: Place | null };
  /** Avancement des gestes de la phase, quand elle en compte. */
  progress(): { done: number; total: number } | null;
}

export function createMission(deps: MissionDeps): Mission {
  const { commune } = deps;
  const dialog = createDialog({ id: 'mission', title: 'Carnet de mission' });
  const place = (id: string): Place | undefined => commune.places.find((p) => p.id === id);

  /** Lieux où il reste un geste faisable, du plus proche au plus lointain. */
  function pendingPlaces(chapter: Chapter): Array<{ place: Place; actions: ActionDef[] }> {
    const player = deps.getPlayer();
    const byPlace = new Map<string, ActionDef[]>();
    for (const action of remaining(ACTIONS, chapter)) {
      byPlace.set(action.place, [...(byPlace.get(action.place) ?? []), action]);
    }
    return [...byPlace.entries()]
      .map(([id, actions]) => ({ place: place(id)!, actions }))
      .filter((entry) => entry.place)
      .sort((a, b) => distance(a.place.pos, player) - distance(b.place.pos, player));
  }

  function hint(): { text: string; place: Place | null } {
    const chapter = deps.getChapter();
    const home = place('domicile') ?? null;
    switch (chapter.phase) {
      case 'accueil':
        return {
          text: chapter.done.includes('mairie-accueil') ? 'Lisez le DICRIM, à la mairie : il vous dira où sont les risques de la commune.' : 'Le maire vous attend à la mairie.',
          place: place('mairie') ?? null,
        };
      case 'libre':
        return { text: OBJECTIVES.libre, place: null };
      case 'crise':
        return { text: OBJECTIVES.crise, place: null };
      case 'bilan':
        return { text: OBJECTIVES.bilan, place: null };
      default: {
        const pending = pendingPlaces(chapter);
        if (pending.length > 0) {
          const next = pending[0];
          const count = next.actions.length > 1 ? `${next.actions.length} gestes` : '1 geste';
          return { text: `Prochaine étape : ${next.place.name} (${formatDistance(distance(next.place.pos, deps.getPlayer()))}), ${count} à y faire.`, place: next.place };
        }
        const left = gestures(ACTIONS, chapter).some((action) => !chapter.done.includes(action.id));
        const end = chapter.phase === 'preparation' ? 'terminer la journée' : "vous mettre à l'abri";
        return { text: left ? `Il ne reste plus assez de temps pour le reste : rentrez chez vous ${end}.` : `Tout est fait : rentrez chez vous ${end}.`, place: home };
      }
    }
  }

  function progress(): { done: number; total: number } | null {
    const chapter = deps.getChapter();
    const all = gestures(ACTIONS, chapter);
    if (!isTimed(chapter.phase) || all.length === 0) return null;
    return { done: all.filter((action) => chapter.done.includes(action.id)).length, total: all.length };
  }

  function render(): void {
    const chapter = deps.getChapter();
    const player = deps.getPlayer();
    const advice = hint();
    // L'objectif de la phase, sauf quand le conseil du moment dit déjà la même chose.
    const parts: HTMLElement[] = advice.text === OBJECTIVES[chapter.phase] ? [] : [h('p', { class: 'lead' }, OBJECTIVES[chapter.phase])];

    if (isTimed(chapter.phase)) {
      const total = TIMED_PHASES[chapter.phase].minutes;
      const bar = h('span', { class: 'timebar', 'aria-hidden': 'true' }, h('span', { class: 'timebar__left', style: `width: ${Math.round((chapter.minutesLeft / total) * 100)}%` }));
      parts.push(
        h(
          'div',
          { class: 'timebox' },
          h('p', null, icon('horloge'), h('strong', null, `Il vous reste ${formatDuration(chapter.minutesLeft)}`), ` — ${clockLabel(chapter)}`),
          bar,
          h('p', { class: 'fine-print' }, "C'est du temps de jeu, pas du temps réel : il n'avance que lorsque vous accomplissez un geste ou que vous vous déplacez."),
        ),
      );
    }

    const go = advice.place;
    const hintBox = h('div', { class: 'hint' }, h('p', null, h('strong', null, 'Conseil. '), advice.text));
    if (go) {
      const button = h('button', { type: 'button', class: 'button button--primary button--small' }, `Aller à : ${go.name}`);
      button.addEventListener('click', () => {
        dialog.close();
        deps.goTo(go);
      });
      hintBox.append(button);
    }
    const calendar = (label: string, primary: boolean): HTMLElement => {
      const button = h('button', { type: 'button', class: primary ? 'button button--primary button--small' : 'button button--small' }, label);
      button.addEventListener('click', () => {
        dialog.close();
        deps.openCalendar();
      });
      return button;
    };
    if (chapter.phase === 'libre') {
      hintBox.append(h('div', { class: 'hint__actions' }, calendar('Ouvrir le calendrier', true)));
      parts.push(hintBox, h('p', { class: 'fine-print' }, "Vous choisissez vos chapitres dans l'ordre que vous voulez. En attendant, la commune se visite librement."));
    } else if (chapter.phase === 'bilan') {
      const bilan = h('button', { type: 'button', class: 'button button--primary button--small' }, 'Voir le bilan');
      bilan.addEventListener('click', () => {
        dialog.close();
        deps.openBilan();
      });
      const again = h('button', { type: 'button', class: 'button button--small' }, 'Rejouer ce chapitre');
      again.addEventListener('click', () => {
        dialog.close();
        deps.replay();
      });
      hintBox.append(h('div', { class: 'hint__actions' }, bilan, again, calendar('Autres chapitres', false)));
      parts.push(hintBox, h('p', { class: 'fine-print' }, 'Rejouer reprend le chapitre à son début. Vos badges sont conservés.'));
    } else {
      parts.push(hintBox);
    }

    const all = gestures(ACTIONS, chapter);
    if (all.length > 0 && isTimed(chapter.phase)) {
      const done = all.filter((action) => chapter.done.includes(action.id)).length;
      parts.push(h('h3', null, `Les gestes de ${chapter.phase === 'preparation' ? 'la journée' : 'la matinée'} : ${done} sur ${all.length}`));
      const places = commune.places
        .filter((p) => all.some((action) => action.place === p.id))
        .sort((a, b) => distance(a.pos, player) - distance(b.pos, player));
      for (const target of places) {
        const visit = h('button', { type: 'button', class: 'button button--small' }, "S'y rendre");
        visit.addEventListener('click', () => {
          dialog.close();
          deps.goTo(target);
        });
        const items = all
          .filter((action) => action.place === target.id)
          .map((action) => {
            const status = actionStatus(action, chapter);
            const label =
              status.state === 'faite'
                ? 'fait'
                : status.state === 'verrouillee'
                  ? 'impossible : non préparé'
                  : status.state === 'trop-longue'
                    ? 'plus assez de temps'
                    : `${formatDuration(actionMinutes(action, chapter))} de jeu`;
            return h(
              'li',
              { class: `todo todo--${status.state}` },
              h('span', { class: 'todo__mark', 'aria-hidden': 'true' }, status.state === 'faite' ? icon('coche') : null),
              h('span', { class: 'todo__title' }, action.title),
              h('span', { class: 'todo__status' }, label),
            );
          });
        parts.push(
          h(
            'section',
            { class: 'mission-place' },
            h('div', { class: 'mission-place__head' }, h('h4', null, target.name, h('span', { class: 'mission-place__where' }, ` — ${formatDistance(distance(target.pos, player))}`)), visit),
            h('ul', { class: 'todos' }, ...items),
          ),
        );
      }
    }
    dialog.body.replaceChildren(...parts);
  }

  return {
    hint,
    progress,
    open(returnFocus) {
      render();
      dialog.open(returnFocus);
    },
  };
}
