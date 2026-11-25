import { CHAPTERS, LATER, type ChapterInfo } from '../content/chapitres';
import { isUnderway, type Phase } from '../core/chapter';
import { h, icon } from './dom';

/**
 * Les chapitres du jeu, un par risque majeur. C'est une application du
 * téléphone : le joueur y choisit ce qu'il joue, dans l'ordre qu'il veut ; un
 * chapitre est conseillé pour commencer, aucun n'est imposé. Chaque chapitre
 * mené au bout y garde son bilan et ses badges.
 */

export interface ChaptersDeps {
  /** Où en est la partie, et dans quel chapitre. */
  getProgress(): { phase: Phase; chapterId: string | null; record: Readonly<Record<string, number>> };
  /** Badges du chapitre : combien le joueur en a, sur combien. */
  getBadgeCount(chapterId: string): { earned: number; total: number };
  /** Le chapitre a été mené au bout : son bilan peut être montré. */
  hasBilan(chapterId: string): boolean;
  openBilan(chapter: ChapterInfo): void;
  /** Le joueur choisit de jouer ce chapitre. Renvoie vrai s'il a bien commencé. */
  start(chapter: ChapterInfo): Promise<boolean>;
  /** Le chapitre choisi commence, ou le joueur reprend celui qui est en cours : le téléphone peut se refermer. */
  leave(): void;
}

export interface ChaptersView {
  element: HTMLElement;
  render(): void;
}

const PHASE_NAMES: Partial<Record<Phase, string>> = {
  preparation: 'préparation',
  vigilance: 'vigilance',
  crise: 'crise',
};

export function createChaptersView(deps: ChaptersDeps): ChaptersView {
  const element = h('div', { class: 'stack' });

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
      // Le risque d'abord : c'est lui qui dit de quoi parle le chapitre.
      h('p', { class: 'chapter__risk' }, chapter.risk, chapter.suggested && best === undefined && !current ? h('span', { class: 'tag tag--todo' }, 'conseillé pour commencer') : null),
      h('h3', null, chapter.title),
      h('p', null, chapter.summary),
      chapter.note ? h('p', { class: 'fine-print' }, chapter.note) : null,
      h('p', { class: 'chapter__state' }, current || best !== undefined ? icon(current ? 'horloge' : 'coche') : null, state),
    ];
    const badges = deps.getBadgeCount(chapter.id);
    if (badges.total > 0) parts.push(h('p', { class: 'chapter__badges' }, icon('medaille'), `Badges : ${badges.earned} sur ${badges.total}`));

    const buttons: HTMLElement[] = [];
    if (deps.hasBilan(chapter.id)) {
      const bilan = h('button', { type: 'button', class: 'button button--small' }, 'Voir le bilan');
      bilan.addEventListener('click', () => deps.openBilan(chapter));
      buttons.push(bilan);
    }

    if (chapter.playable && !locked) {
      if (current) {
        const resume = h('button', { type: 'button', class: 'button button--primary button--small' }, 'Reprendre');
        resume.addEventListener('click', () => deps.leave());
        const again = h('button', { type: 'button', class: 'button button--small' }, 'Recommencer');
        again.addEventListener('click', () => void play(chapter));
        buttons.unshift(resume, again);
      } else {
        const go = h('button', { type: 'button', class: 'button button--primary button--small' }, best !== undefined ? 'Rejouer' : 'Commencer');
        go.addEventListener('click', () => void play(chapter));
        buttons.unshift(go);
      }
    }
    if (buttons.length > 0) parts.push(h('div', { class: 'chapter__actions' }, ...buttons));
    return h('li', { class: chapter.playable ? 'chapter' : 'chapter chapter--later' }, ...parts.filter((node): node is Node => node !== null));
  }

  async function play(chapter: ChapterInfo): Promise<void> {
    if (await deps.start(chapter)) deps.leave();
    else render();
  }

  function render(): void {
    const { phase } = deps.getProgress();
    element.replaceChildren(
      h(
        'p',
        { class: 'lead' },
        phase === 'accueil'
          ? "Les chapitres s'ouvriront après votre rencontre avec le maire et la lecture du DICRIM."
          : 'Un chapitre par risque majeur. Jouez-les dans l’ordre que vous voulez.',
      ),
      h('ul', { class: 'chapters' }, ...CHAPTERS.map(card)),
      h('p', { class: 'fine-print' }, `D'autres chapitres suivront : ${LATER.join(', ').toLowerCase()}. Ces risques sont déjà décrits et cartographiés dans le DICRIM.`),
    );
  }

  return { element, render };
}
