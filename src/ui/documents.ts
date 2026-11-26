import { findEntry, type LexiconEntry } from '../content/lexique';
import type { BadgeInfo } from '../content/chapitres';
import { SOURCES, type Bulletin, type Question } from '../content/model';
import type { Assessment } from '../core/chapter';
import { shuffled } from '../core/rng';
import { h, icon } from './dom';
import { lexiconFigure } from './figures';

/**
 * Éléments de contenu réutilisés par plusieurs écrans : liens vers les sources,
 * questions, bulletins, DICRIM, bilan. Rien ici n'ouvre de fenêtre.
 */

/** Liens vers les sources officielles d'un contenu. Ils s'ouvrent dans un nouvel onglet, et le disent. */
export function sourceList(ids: readonly string[]): HTMLElement {
  const links = ids
    .map((id) => SOURCES[id])
    .filter(Boolean)
    .map((source) =>
      h(
        'li',
        null,
        h(
          'a',
          { href: source.url, target: '_blank', rel: 'noopener noreferrer' },
          `${source.editeur}, « ${source.titre} »`,
          h('span', { class: 'sr-only' }, ' (nouvelle fenêtre)'),
        ),
      ),
    );
  return h('div', { class: 'sources' }, h('p', { class: 'sources__label' }, links.length > 1 ? 'Sources officielles' : 'Source officielle'), h('ul', null, ...links));
}

// ---------------------------------------------------------------- Questions

export interface QuestionOptions {
  /** Vocabulaire du verdict : une décision en pleine crue, ou une question de préparation. */
  tone: 'crise' | 'quiz';
  /** Le joueur vient de répondre. */
  onAnswer(chosen: string[], correct: boolean): void;
  /** Le joueur a lu le retour et passe à la suite. */
  onContinue(): void;
  continueLabel?: string;
  /**
   * Pour une question à cocher : un dessin qui montre l'effet des choix cochés,
   * avec la position de chaque choix dans l'image (en pourcentage). Le dessin est
   * un raccourci : on peut y désigner un choix, mais tout se fait aussi par les cases.
   */
  figure?(picked: ReadonlySet<string>): { svg: SVGSVGElement; spots: Map<string, { left: number; top: number }> };
}

/**
 * Affiche une question dans `host`. Une fois la réponse donnée, les choix sont
 * figés et l'explication apparaît, avec sa source. Aucune limite de temps.
 */
export function mountQuestion(host: HTMLElement, question: Question, options: QuestionOptions): void {
  host.replaceChildren();
  // Les réponses sont proposées dans un ordre tiré au sort : la bonne n'est pas toujours la première,
  // ni les mauvaises toujours les dernières. L'ordre ne change plus tant que la question est affichée.
  const choices = shuffled(question.choices);
  if (question.context) host.append(h('p', { class: 'lead' }, question.context));
  const feedback = h('div', { class: 'feedback', tabindex: '-1' });

  const reveal = (chosen: string[]): void => {
    const picked = new Set(chosen);
    const mistakes = choices.filter((choice) => picked.has(choice.id) !== choice.correct);
    const correct = mistakes.length === 0;
    options.onAnswer(chosen, correct);

    const verdict =
      options.tone === 'crise'
        ? correct
          ? 'Bon réflexe'
          : 'Mauvais réflexe'
        : correct
          ? 'Tout est bon'
          : question.multiple
            ? `${mistakes.length} ${mistakes.length > 1 ? 'erreurs' : 'erreur'}`
            : "Ce n'est pas ça";
    feedback.append(h('p', { class: `verdict verdict--${correct ? 'ok' : 'ko'}` }, icon(correct ? 'coche' : 'fermer'), verdict));

    if (question.multiple) {
      const notes = mistakes.map((choice) =>
        h('li', null, h('strong', null, picked.has(choice.id) ? 'À retirer : ' : 'Il manquait : '), choice.label, choice.outcome ? ` — ${choice.outcome}` : ''),
      );
      if (notes.length > 0) feedback.append(h('ul', { class: 'corrections' }, ...notes));
    } else {
      const choice = choices.find((c) => picked.has(c.id));
      if (choice?.outcome) feedback.append(h('p', null, choice.outcome));
      if (!correct) {
        const right = choices.find((c) => c.correct);
        if (right) feedback.append(h('p', null, h('strong', null, 'Il fallait répondre : '), right.label, '.'));
      }
    }
    feedback.append(h('p', { class: 'lesson' }, h('strong', null, 'À retenir. '), question.lesson), sourceList(question.sources));

    const next = h('button', { type: 'button', class: 'button button--primary' }, options.continueLabel ?? 'Continuer');
    next.addEventListener('click', options.onContinue);
    feedback.append(h('div', { class: 'dialog__actions' }, next));
    host.append(feedback);
    feedback.focus({ preventScroll: false });
  };

  if (question.multiple) {
    const illustrated = options.figure !== undefined;
    const boxes = choices.map((choice, index) => {
      const id = `choix-${question.id}-${choice.id}`;
      const input = h('input', { type: 'checkbox', id, value: choice.id });
      // Avec un dessin, chaque choix porte le numéro de sa pastille dans l'image.
      const label = h('label', { for: id }, illustrated ? h('span', { class: 'check__number', 'aria-hidden': 'true' }, String(index + 1)) : null, choice.label);
      return { input, row: h('div', { class: 'check' }, input, label) };
    });
    const checked = (): string[] => boxes.filter(({ input }) => input.checked).map(({ input }) => input.value);
    let locked = false;

    const scene = illustrated ? h('div', { class: 'scene scene--question' }) : null;
    const draw = (): void => {
      if (!scene || !options.figure) return;
      const picked = new Set(checked());
      const { svg, spots } = options.figure(picked);
      scene.replaceChildren(svg);
      choices.forEach((choice, index) => {
        const spot = spots.get(choice.id);
        if (!spot) return;
        // Raccourci pour la souris et le doigt : la case à cocher, juste en dessous, est le vrai contrôle.
        const pin = h('button', { type: 'button', class: picked.has(choice.id) ? 'pin pin--picked' : 'pin', tabindex: '-1', 'aria-hidden': 'true', title: choice.label }, String(index + 1));
        pin.style.left = `${spot.left}%`;
        pin.style.top = `${spot.top}%`;
        pin.disabled = locked;
        pin.addEventListener('click', () => {
          boxes[index].input.checked = !boxes[index].input.checked;
          draw();
        });
        scene.append(pin);
      });
    };
    for (const { input } of boxes) input.addEventListener('change', draw);
    draw();

    const validate = h('button', { type: 'button', class: 'button button--primary' }, 'Valider');
    validate.addEventListener('click', () => {
      for (const { input } of boxes) input.disabled = true;
      locked = true;
      draw();
      validate.remove();
      reveal(checked());
    });
    host.append(
      ...(scene ? [scene] : []),
      h('fieldset', { class: 'choices' }, h('legend', null, question.prompt), ...boxes.map(({ row }) => row)),
      h('div', { class: 'dialog__actions' }, validate),
    );
  } else {
    const buttons = choices.map((choice) => {
      const button = h('button', { type: 'button', class: 'choice' }, choice.label);
      button.addEventListener('click', () => {
        for (const other of buttons) other.disabled = true;
        button.classList.add('choice--picked');
        button.append(h('span', { class: 'choice__mark' }, ' — votre choix'));
        reveal([choice.id]);
      });
      return button;
    });
    host.append(h('p', { class: 'prompt-text' }, question.prompt), h('div', { class: 'choices' }, ...buttons));
  }
}

// ---------------------------------------------------------------- Bulletins

export function bulletinContent(bulletin: Bulletin): HTMLElement {
  return h(
    'div',
    { class: 'stack' },
    h('p', { class: 'dialog__kicker' }, bulletin.from),
    ...bulletin.paragraphs.map((text) => h('p', null, text)),
    bulletin.advice ? h('h3', null, 'Conseils de comportement') : null,
    bulletin.advice ? h('ul', { class: 'bullets' }, ...bulletin.advice.map((line) => h('li', null, line))) : null,
    sourceList(bulletin.sources),
  );
}

// ------------------------------------------------------------------ Lexique

/** Un mot du lexique : sa définition, son schéma s'il en a un, sa source. */
export function lexiconEntry(entry: LexiconEntry, level: 'h3' | 'h4' = 'h4'): HTMLElement {
  return h(
    'div',
    { class: 'word' },
    h(level, { class: 'word__term' }, entry.term),
    h('p', null, entry.definition),
    entry.figure ? lexiconFigure(entry.figure) : null,
    sourceList(entry.sources),
  );
}

/** Encadré « Le mot », placé dans la fiche d'un geste qui emploie un terme technique. */
export function lexiconBox(ids: readonly string[]): HTMLElement | null {
  const entries = ids.map(findEntry).filter((entry): entry is LexiconEntry => entry !== undefined);
  if (entries.length === 0) return null;
  return h('div', { class: 'wordbox' }, h('p', { class: 'wordbox__label' }, entries.length > 1 ? 'Les mots' : 'Le mot'), ...entries.map((entry) => lexiconEntry(entry)));
}

// -------------------------------------------------------------------- Bilan

const LEVEL_LABELS = ['Touché', 'En partie protégé', 'Protégé'] as const;

export function badgeList(badges: readonly BadgeInfo[], earned: readonly string[], fresh: readonly string[] = []): HTMLElement {
  return h(
    'ul',
    { class: 'badges' },
    ...badges.map((badge) => {
      const has = earned.includes(badge.id);
      return h(
        'li',
        { class: has ? 'badge' : 'badge badge--missing' },
        h('span', { class: 'badge__medal' }, has ? icon('coche') : null),
        h(
          'span',
          { class: 'badge__text' },
          h('strong', null, badge.title),
          has ? (fresh.includes(badge.id) ? h('span', { class: 'tag' }, 'nouveau') : null) : h('span', { class: 'badge__state' }, ' — pas encore obtenu'),
          h('span', { class: 'badge__how' }, badge.description),
        ),
      );
    }),
  );
}

export function bilanContent(assessment: Assessment, allBadges: readonly BadgeInfo[], earned: readonly string[], fresh: readonly string[]): HTMLElement {
  const meter = h('meter', { min: '0', max: '100', value: String(assessment.score), 'aria-label': 'Indice de préparation' });
  return h(
    'div',
    { class: 'stack' },
    h('p', { class: 'score' }, h('span', { class: 'score__value' }, String(assessment.score)), h('span', { class: 'score__unit' }, ' sur 100'), h('span', { class: 'score__label' }, 'Indice de préparation')),
    meter,
    h('h3', null, "Ce qui s'est passé"),
    h(
      'ul',
      { class: 'stakes' },
      ...assessment.stakes.map(({ stake, level }) =>
        h(
          'li',
          { class: `stake stake--${level}` },
          h('h4', null, stake.title, h('span', { class: `level level--${level}` }, icon(level === 2 ? 'coche' : level === 1 ? 'reglages' : 'fermer'), LEVEL_LABELS[level])),
          h('p', null, stake.outcomes[level] || stake.outcomes[0]),
          h('details', null, h('summary', null, "Ce qu'il faut retenir"), h('p', null, stake.lesson), sourceList(stake.sources)),
        ),
      ),
    ),
    h('h3', null, 'Badges'),
    badgeList(allBadges, earned, fresh),
  );
}
