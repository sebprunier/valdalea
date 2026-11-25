import { CHAPTERS, LATER, type ChapterInfo } from '../content/chapitres';
import { isUnderway, type Phase } from '../core/chapter';
import { createDialog } from './dialog';
import { h, icon } from './dom';

/**
 * Le calendrier : l'année à Val-d'Aléa, chapitre par chapitre. C'est ici que
 * le joueur choisit ce qu'il joue, dans l'ordre qu'il veut ; un chapitre est
 * conseillé pour commencer, aucun n'est imposé.
 */

export interface CalendarDeps {
  /** Où en est la partie, et dans quel chapitre. */
  getProgress(): { phase: Phase; chapterId: string | null; record: Readonly<Record<string, number>> };
  /** Le joueur choisit de jouer ce chapitre. Renvoie vrai s'il a bien commencé. */
  start(chapter: ChapterInfo): Promise<boolean>;
}

export interface Calendar {
  open(returnFocus: HTMLElement | null): void;
}

const PHASE_NAMES: Partial<Record<Phase, string>> = {
  preparation: 'préparation',
  vigilance: 'vigilance',
  crise: 'crise',
};

export function createCalendar(deps: CalendarDeps): Calendar {
  const dialog = createDialog({ id: 'calendrier', title: 'Calendrier' });

  function card(chapter: ChapterInfo): HTMLElement {
    const { phase, chapterId, record } = deps.getProgress();
    const locked = phase === 'accueil';
    const current = chapter.id === chapterId && isUnderway(phase);
    const best = record[chapter.id];

    // L'état du chapitre, en toutes lettres : la mise en forme ne fait que le souligner.
    const state = !chapter.playable
      ? 'En préparation'
      : current
        ? `En cours : ${PHASE_NAMES[phase] ?? ''}`
        : best !== undefined
          ? `Terminé — indice de préparation : ${best} sur 100`
          : 'Pas encore joué';

    const parts: Array<Node | null> = [
      h('p', { class: 'chapter__season' }, chapter.season, chapter.suggested && best === undefined && !current ? h('span', { class: 'tag tag--todo' }, 'conseillé pour commencer') : null),
      h('h3', null, chapter.title),
      h('p', { class: 'chapter__risk' }, chapter.risk),
      h('p', null, chapter.summary),
      h('p', { class: 'chapter__state' }, current || best !== undefined ? icon(current ? 'horloge' : 'coche') : null, state),
    ];

    if (chapter.playable && !locked) {
      if (current) {
        const resume = h('button', { type: 'button', class: 'button button--primary button--small' }, 'Reprendre');
        resume.addEventListener('click', () => dialog.close());
        const again = h('button', { type: 'button', class: 'button button--small' }, 'Recommencer');
        again.addEventListener('click', () => void play(chapter));
        parts.push(h('div', { class: 'chapter__actions' }, resume, again));
      } else {
        const go = h('button', { type: 'button', class: 'button button--primary button--small' }, best !== undefined ? 'Rejouer' : 'Commencer');
        go.addEventListener('click', () => void play(chapter));
        parts.push(h('div', { class: 'chapter__actions' }, go));
      }
    }
    return h('li', { class: chapter.playable ? 'chapter' : 'chapter chapter--later' }, ...parts.filter((node): node is Node => node !== null));
  }

  async function play(chapter: ChapterInfo): Promise<void> {
    if (await deps.start(chapter)) dialog.close();
    else render();
  }

  function render(): void {
    const { phase } = deps.getProgress();
    dialog.body.replaceChildren(
      h(
        'p',
        { class: 'lead' },
        phase === 'accueil'
          ? "Les chapitres s'ouvriront après votre rencontre avec le maire et la lecture du DICRIM."
          : "Une année à Val-d'Aléa, un risque par saison. Jouez les chapitres dans l'ordre que vous voulez.",
      ),
      h('ul', { class: 'chapters' }, ...CHAPTERS.map(card)),
      h('p', { class: 'fine-print' }, `D'autres chapitres suivront : ${LATER.join(', ').toLowerCase()}. Ces risques sont déjà décrits et cartographiés dans le DICRIM.`),
    );
  }

  return {
    open(returnFocus) {
      render();
      dialog.open(returnFocus);
    },
  };
}
