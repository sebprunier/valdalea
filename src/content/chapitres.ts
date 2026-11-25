import type { Phase } from '../core/chapter';
import { ETE } from './feu';
import { AUTOMNE } from './inondation';
import type { ActionDef, AssetId, BadgeDef, ChapterContent, ChapterPhase, ChapterTiming, Question, Situation } from './model';
import { CALM, PROLOGUE, PROLOGUE_OBJECTIVES } from './prologue';

/**
 * Les chapitres du jeu : un risque majeur chacun. (Chacun a sa saison, que son
 * récit raconte ; ce n'est pas elle qui le désigne.)
 *
 * Après le prologue (la rencontre du maire, la lecture du DICRIM), le joueur
 * choisit ses chapitres dans l'ordre qu'il veut. Le calendrier en conseille un
 * pour commencer, sans l'imposer.
 */
export interface ChapterInfo {
  id: string;
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
    title: 'La crue de la Follette',
    risk: 'Inondation',
    summary: "L'automne arrive, et avec lui les grosses pluies. Une journée pour préparer votre maison, vos voisins et la commune, puis la rivière monte.",
    playable: true,
    suggested: true,
  },
  {
    id: 'ete',
    title: 'Le feu des Brandes',
    risk: 'Feu de forêt',
    summary: "Au printemps, une matinée pour aider le hameau à débroussailler, à la lisière de la forêt. L'été venu, le feu arrive par le massif, et le hameau doit partir.",
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
/** Les questions du kit d'urgence, communes à tous les chapitres, n'y figurent qu'une fois. */
export const ALL_QUESTIONS: Question[] = [...new Map(Object.values(CONTENTS).flatMap((content) => content.questions.map((question) => [question.id, question] as const))).values()];
/** Ce que chaque geste laisse au joueur pour la suite de la partie : de quoi reprendre une sauvegarde. */
export const GRANTS: ReadonlyMap<string, AssetId> = new Map(ALL_ACTIONS.flatMap((action) => (action.grants ? [[action.id, action.grants] as const] : [])));
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

/**
 * Ce que le joueur possède déjà en abordant un chapitre : ce qu'il a acquis dans
 * un autre. Dans le chapitre où il l'a obtenu, le geste reste le même à chaque
 * partie : on y prépare son kit, on ne l'y vérifie pas.
 * @param assets pour chaque acquis, le chapitre où il a été obtenu
 */
export function ownedIn(assets: Readonly<Record<string, string>>, chapterId: string | null): string[] {
  return Object.entries(assets)
    .filter(([, origin]) => origin !== chapterId)
    .map(([asset]) => asset)
    .sort();
}

/**
 * @param owned ce que le joueur possède déjà en abordant le chapitre (voir `ownedIn`) : les gestes qui le donnent prennent leur autre forme
 */
export function playbookOf(chapterId: string | null, owned: readonly string[] = []): Playbook {
  const content = (chapterId && CONTENTS[chapterId]) || null;
  const actions = (content?.actions ?? []).map((action) => (action.grants && action.owned && owned.includes(action.grants) ? { ...action, ...action.owned } : action));
  return {
    content,
    actions: [...PROLOGUE, ...actions],
    questions: content?.questions ?? [],
    // Hors chapitre, aucun temps n'est compté : ces horaires ne servent pas.
    timing: content?.timing ?? AUTOMNE.timing,
    objective: (phase) => (isChapterPhase(phase) ? (content?.objectives[phase] ?? PROLOGUE_OBJECTIVES.libre) : PROLOGUE_OBJECTIVES[phase]),
    situation: (phase) => (content && isChapterPhase(phase) ? content.situation[phase] : CALM),
  };
}
