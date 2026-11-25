import type { Phase } from '../core/chapter';
import { ETE } from './feu';
import { AUTOMNE } from './inondation';
import type { ActionDef, BadgeDef, ChapterContent, ChapterPhase, ChapterTiming, Question, Situation } from './model';
import { CALM, PROLOGUE, PROLOGUE_OBJECTIVES } from './prologue';

/**
 * Les chapitres du jeu : une année à Val-d'Aléa, un risque par saison.
 *
 * Après le prologue (la rencontre du maire, la lecture du DICRIM), le joueur
 * choisit ses chapitres dans l'ordre qu'il veut. Le calendrier en conseille un
 * pour commencer, sans l'imposer.
 */
export interface ChapterInfo {
  id: string;
  /** Saison où se joue le chapitre. */
  season: string;
  title: string;
  /** Risque majeur traité. */
  risk: string;
  /** Ce qui attend le joueur, en une ou deux phrases. */
  summary: string;
  /** Le chapitre peut être joué ; sinon il est annoncé, en préparation. */
  playable: boolean;
  /** Conseillé pour commencer. */
  suggested?: boolean;
  /** Précision sur l'état du chapitre, quand il n'est pas complet. */
  note?: string;
}

export const CHAPTERS: ChapterInfo[] = [
  {
    id: 'automne',
    season: 'Automne',
    title: 'La crue de la Follette',
    risk: 'Inondation',
    summary: "Les grosses pluies arrivent. Une journée pour préparer votre maison, vos voisins et la commune, puis la rivière monte.",
    playable: true,
    suggested: true,
  },
  {
    id: 'ete',
    season: 'Printemps et été',
    title: 'Le feu des Brandes',
    risk: 'Feu de forêt',
    summary: "Au printemps, une matinée pour aider le hameau à débroussailler, à la lisière de la forêt. L'été venu, le feu arrive par le massif.",
    playable: true,
  },
];

/** Risques décrits dans le DICRIM dont le chapitre viendra plus tard. */
export const LATER = ['Accident industriel', 'Retrait-gonflement des argiles', 'Cavités souterraines', 'Chutes de blocs'];

export function findChapter(id: string | null): ChapterInfo | undefined {
  return CHAPTERS.find((chapter) => chapter.id === id);
}

// ------------------------------------------------------------------ Contenus

const CONTENTS: Record<string, ChapterContent> = { automne: AUTOMNE, ete: ETE };

/** Tous les gestes et toutes les questions du jeu, prologue compris : de quoi vérifier une sauvegarde. */
export const ALL_ACTIONS: ActionDef[] = [...PROLOGUE, ...Object.values(CONTENTS).flatMap((content) => content.actions)];
export const ALL_QUESTIONS: Question[] = Object.values(CONTENTS).flatMap((content) => content.questions);
/** Toutes les situations de crise et tous les badges du jeu. */
export const ALL_SITUATIONS: Situation[] = Object.values(CONTENTS).flatMap((content) => content.crisis?.situations ?? []);
export const ALL_BADGES: BadgeDef[] = Object.values(CONTENTS).flatMap((content) => content.crisis?.badges ?? []);

/**
 * Ce qui se joue en ce moment : le prologue, puis le chapitre choisi. C'est par
 * là que l'interface accède aux contenus, sans savoir de quel chapitre il s'agit.
 */
export interface Playbook {
  /** Le chapitre choisi ; `null` tant qu'aucun ne l'a été. */
  content: ChapterContent | null;
  /** Gestes du prologue et du chapitre. */
  actions: ActionDef[];
  questions: Question[];
  timing: ChapterTiming;
  /** La mission du moment. */
  objective(phase: Phase): string;
  /** Ce que la barre d'état montre : niveau de danger, libellé, temps qu'il fait. */
  situation(phase: Phase): ChapterContent['situation'][ChapterPhase];
}

const isChapterPhase = (phase: Phase): phase is ChapterPhase => phase !== 'accueil' && phase !== 'libre';

export function playbookOf(chapterId: string | null): Playbook {
  const content = (chapterId && CONTENTS[chapterId]) || null;
  return {
    content,
    actions: content ? [...PROLOGUE, ...content.actions] : PROLOGUE,
    questions: content?.questions ?? [],
    // Hors chapitre, aucun temps n'est compté : ces horaires ne servent pas.
    timing: content?.timing ?? AUTOMNE.timing,
    objective: (phase) => (isChapterPhase(phase) ? (content?.objectives[phase] ?? PROLOGUE_OBJECTIVES.libre) : PROLOGUE_OBJECTIVES[phase]),
    situation: (phase) => (content && isChapterPhase(phase) ? content.situation[phase] : CALM),
  };
}
