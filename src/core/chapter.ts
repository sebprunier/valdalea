import type { ActionDef, BadgeDef, ChapterView, Situation, StakeDef, StakeLevel } from '../content/model';

/**
 * Règles d'un chapitre du jeu, sans interface : phases, budget de temps,
 * gestes accomplis, réponses en situation de crise et bilan.
 *
 * Le temps n'est jamais réel : il n'avance que lorsque le joueur agit ou se
 * déplace. Personne n'est pressé par un chronomètre.
 */

export type Phase = 'accueil' | 'preparation' | 'vigilance' | 'crise' | 'bilan';

export const PHASES: readonly Phase[] = ['accueil', 'preparation', 'vigilance', 'crise', 'bilan'];

export interface Chapter {
  phase: Phase;
  /** Minutes de jeu restantes dans la phase (préparation et vigilance uniquement). */
  minutesLeft: number;
  /** Identifiants des actions accomplies. */
  done: string[];
  /** Réponses aux situations de crise : identifiant de la situation → identifiant du choix. */
  answers: Record<string, string>;
}

/** Durée des phases où le temps est compté, et heure à laquelle elles commencent. */
export const TIMED_PHASES = {
  // De quoi accomplir tous les gestes et faire le tour de la commune, avec une heure de marge.
  preparation: { minutes: 360, day: 'Samedi', startsAt: 12 * 60 },
  vigilance: { minutes: 120, day: 'Lundi', startsAt: 7 * 60 + 30 },
} as const;

/** Seuils, en minutes restantes, où le joueur est prévenu que le temps presse. */
export const TIME_ALERTS = [60, 30, 10] as const;

/** Seuil d'alerte franchi entre deux instants, ou `null`. */
export function timeAlert(minutesBefore: number, minutesAfter: number): number | null {
  for (const threshold of TIME_ALERTS) {
    if (minutesBefore > threshold && minutesAfter <= threshold && minutesAfter > 0) return threshold;
  }
  return null;
}

/** Minutes de jeu que coûte une unité monde parcourue à pied. */
export const MINUTES_PER_UNIT = 0.01;

export function newChapter(): Chapter {
  return { phase: 'accueil', minutesLeft: 0, done: [], answers: {} };
}

export function isTimed(phase: Phase): phase is keyof typeof TIMED_PHASES {
  return phase === 'preparation' || phase === 'vigilance';
}

/** Passe à la phase suivante et remet le budget de temps à zéro ou à plein. */
export function nextPhase(chapter: Chapter): Chapter {
  const next = PHASES[Math.min(PHASES.indexOf(chapter.phase) + 1, PHASES.length - 1)];
  if (next === chapter.phase) return chapter;
  return { ...chapter, phase: next, minutesLeft: isTimed(next) ? TIMED_PHASES[next].minutes : 0 };
}

/** Le temps de la phase est écoulé : il faut passer à la suite. */
export function isTimeUp(chapter: Chapter): boolean {
  return isTimed(chapter.phase) && chapter.minutesLeft <= 0;
}

/** Fait passer du temps (un trajet, par exemple). Sans effet hors des phases où le temps est compté. */
export function spend(chapter: Chapter, minutes: number): Chapter {
  if (!isTimed(chapter.phase) || minutes <= 0) return chapter;
  return { ...chapter, minutesLeft: Math.max(0, chapter.minutesLeft - minutes) };
}

// ------------------------------------------------------------------ Actions

/** Durée réelle d'une action, compte tenu de ce qui a été préparé. */
export function actionMinutes(action: ActionDef, chapter: Chapter): number {
  return action.eased && chapter.done.includes(action.eased.by) ? action.eased.minutes : action.minutes;
}

export type ActionStatus =
  | { state: 'possible'; minutes: number }
  | { state: 'faite' }
  /** Il manque une action de préparation. */
  | { state: 'verrouillee' }
  /** Il ne reste pas assez de temps dans la phase. */
  | { state: 'trop-longue'; minutes: number }
  | { state: 'hors-phase' };

export function actionStatus(action: ActionDef, chapter: Chapter): ActionStatus {
  if (chapter.done.includes(action.id)) return { state: 'faite' };
  if (action.phase !== chapter.phase) return { state: 'hors-phase' };
  if (action.requires && !chapter.done.includes(action.requires)) return { state: 'verrouillee' };
  const minutes = actionMinutes(action, chapter);
  if (isTimed(chapter.phase) && minutes > chapter.minutesLeft) return { state: 'trop-longue', minutes };
  return { state: 'possible', minutes };
}

/** Gestes de la phase en cours, hors actions qui la clôturent. */
export function gestures(actions: readonly ActionDef[], chapter: Chapter): ActionDef[] {
  return actions.filter((action) => action.phase === chapter.phase && !action.endsPhase);
}

/**
 * Gestes de la phase encore faisables : ceux que le joueur laisserait derrière
 * lui en clôturant la phase maintenant. L'interface lui demande alors confirmation.
 */
export function remaining(actions: readonly ActionDef[], chapter: Chapter): ActionDef[] {
  return gestures(actions, chapter).filter((action) => actionStatus(action, chapter).state === 'possible');
}

/** Actions à afficher dans un lieu : celles de la phase en cours, faites ou non. */
export function actionsAt(actions: readonly ActionDef[], chapter: Chapter, placeId: string): ActionDef[] {
  return actions.filter((action) => action.place === placeId && action.phase === chapter.phase);
}

/**
 * Nombre d'actions qui attendent le joueur dans un lieu. L'action qui clôt la
 * phase n'est comptée qu'une fois les autres gestes accomplis : tant qu'il en
 * reste, le repère ne doit pas inviter à rentrer.
 */
export function pendingAt(actions: readonly ActionDef[], chapter: Chapter, placeId: string): number {
  const open = remaining(actions, chapter).length > 0;
  return actionsAt(actions, chapter, placeId).filter((action) => actionStatus(action, chapter).state === 'possible' && !(action.endsPhase && open)).length;
}

/** Accomplit une action. Sans effet si elle n'est pas possible. */
export function perform(chapter: Chapter, action: ActionDef): Chapter {
  const status = actionStatus(action, chapter);
  if (status.state !== 'possible') return chapter;
  const after: Chapter = {
    ...chapter,
    done: [...chapter.done, action.id],
    minutesLeft: isTimed(chapter.phase) ? chapter.minutesLeft - status.minutes : chapter.minutesLeft,
  };
  return action.endsPhase ? nextPhase(after) : after;
}

// -------------------------------------------------------------------- Crise

export function answer(chapter: Chapter, situationId: string, choiceId: string): Chapter {
  if (chapter.phase !== 'crise' || situationId in chapter.answers) return chapter;
  return { ...chapter, answers: { ...chapter.answers, [situationId]: choiceId } };
}

/** Première situation de crise sans réponse, ou `null` si toutes ont été traitées. */
export function currentSituation(chapter: Chapter, situations: readonly Situation[]): Situation | null {
  return situations.find((situation) => !(situation.id in chapter.answers)) ?? null;
}

// -------------------------------------------------------------------- Bilan

export function viewOf(chapter: Chapter, situations: readonly Situation[]): ChapterView {
  return {
    did: (actionId) => chapter.done.includes(actionId),
    right: (questionId) => {
      const situation = situations.find((s) => s.id === questionId);
      const chosen = chapter.answers[questionId];
      return situation?.choices.find((choice) => choice.id === chosen)?.correct ?? false;
    },
  };
}

export interface Assessment {
  stakes: Array<{ stake: StakeDef; level: StakeLevel }>;
  /** Indice de préparation, de 0 à 100. */
  score: number;
  badges: BadgeDef[];
}

export function assess(
  chapter: Chapter,
  content: { stakes: readonly StakeDef[]; badges: readonly BadgeDef[]; situations: readonly Situation[] },
): Assessment {
  const view = viewOf(chapter, content.situations);
  const stakes = content.stakes.map((stake) => ({ stake, level: stake.assess(view) }));
  const total = stakes.reduce((sum, { level }) => sum + level, 0);
  return {
    stakes,
    score: stakes.length === 0 ? 0 : Math.round((total / (stakes.length * 2)) * 100),
    badges: content.badges.filter((badge) => badge.earned(view)),
  };
}

// ------------------------------------------------------------------- Horloge

export function formatDuration(minutes: number): string {
  const whole = Math.max(0, Math.ceil(minutes));
  const h = Math.floor(whole / 60);
  const m = whole % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}

/** Jour et heure de la partie, par exemple « Samedi, 15 h 20 ». `null` hors des phases où le temps est compté. */
export function clockLabel(chapter: Chapter): string | null {
  if (!isTimed(chapter.phase)) return null;
  const phase = TIMED_PHASES[chapter.phase];
  const now = phase.startsAt + Math.floor(phase.minutes - chapter.minutesLeft);
  const h = Math.floor(now / 60);
  const m = now % 60;
  return `${phase.day}, ${h} h${m === 0 ? '' : ` ${String(m).padStart(2, '0')}`}`;
}
