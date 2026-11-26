import type { GameState } from '../core/state';
import { SOURCES } from './model';

/**
 * Les documents que le joueur range dans son téléphone, application Documents.
 *
 * Il y en a de deux sortes. Les livrets de Val-d'Aléa sont des documents du jeu,
 * fictifs et marqués comme tels sur chaque page : le DICRIM, la brochure de
 * l'usine. Ils se lisent, s'impriment, s'enregistrent en PDF. Les fiches
 * officielles, elles, ne sont pas reproduites : leurs affiches portent la charte
 * de l'État et des illustrations qui ne sont pas les nôtres. Le jeu renvoie à
 * leur page d'origine ; leurs consignes sont déjà dans le DICRIM, source à l'appui.
 *
 * Un document s'obtient en jouant : par un geste (à la mairie), quand le maire
 * confie la mission d'un chapitre, ou avec ce que l'on prépare (le kit d'urgence).
 * Une fois obtenu, il reste dans le téléphone.
 */
export interface DocumentInfo {
  id: string;
  kind: 'livret' | 'fiche';
  title: string;
  /** Qui l'a édité. */
  from: string;
  /** Ce qu'on y trouve, en une phrase ou deux. */
  summary: string;
  /** Fiche officielle : la source vers laquelle elle renvoie. */
  source?: string;
  /** Ce qui le fait entrer dans le téléphone : un geste accompli, un chapitre commencé, ou un acquis (le kit d'urgence). */
  earnedBy: { action: string } | { chapter: string } | { asset: string };
}

/** Une fiche officielle : son titre et son éditeur sont ceux de la page citée. */
function sheet(id: string, source: string, summary: string, earnedBy: DocumentInfo['earnedBy']): DocumentInfo {
  return { id, kind: 'fiche', title: SOURCES[source].titre, from: SOURCES[source].editeur, summary, source, earnedBy };
}

/** Tous les documents du jeu, dans l'ordre où le téléphone les présente. */
export const DOCUMENTS: DocumentInfo[] = [
  {
    id: 'dicrim',
    kind: 'livret',
    title: "DICRIM de Val-d'Aléa",
    from: "Commune de Val-d'Aléa",
    summary: "Le document d'information communal sur les risques majeurs : six risques, une carte pour chacun, les bons réflexes et un mémo à conserver.",
    earnedBy: { action: 'mairie-dicrim' },
  },
  {
    id: 'brochure-usine',
    kind: 'livret',
    title: 'Si la sirène retentit',
    from: 'Engrais du Val, en lien avec la préfecture',
    summary: "La brochure d'information des riverains de l'usine : qui est concerné, comment on est alerté, la conduite à tenir.",
    earnedBy: { action: 'mairie-brochures' },
  },
  sheet('fiche-kit', 'georisques-kit', "La liste officielle du kit d'urgence, à préparer une fois pour tous les risques.", { asset: 'kit' }),
  sheet('fiche-inondation', 'georisques-inondation', "Se préparer à une inondation, puis les bons réflexes dès l'alerte et pendant toute sa durée.", { chapter: 'automne' }),
  sheet('fiche-feu', 'georisques-feu', "Éviter les départs de feu, puis les bons réflexes si un feu de forêt approche.", { chapter: 'ete' }),
  sheet('fiche-industriel', 'georisques-industriel', "Se préparer quand on vit près d'un site à risques, puis la conduite à tenir dès le signal d'alerte.", { chapter: 'hiver' }),
];

export const DOCUMENT_IDS: ReadonlySet<string> = new Set(DOCUMENTS.map((document) => document.id));

export function findDocument(id: string): DocumentInfo | undefined {
  return DOCUMENTS.find((document) => document.id === id);
}

/** Ce qu'une partie a fait jusqu'ici : de quoi dire quels documents elle a valus. */
export interface Earned {
  /** Gestes accomplis, dans le chapitre en cours comme dans ceux qui ont été menés au bout. */
  actions: readonly string[];
  /** Chapitres commencés. */
  chapters: readonly string[];
  /** Acquis gardés d'un chapitre à l'autre. */
  assets: readonly string[];
}

/**
 * Les documents que vaut cette partie, dans l'ordre du catalogue. Sert au fil du
 * jeu, pour donner un document dès qu'il est mérité, et à la relecture d'une
 * sauvegarde d'avant l'application Documents.
 */
export function earnedDocuments(earned: Earned): string[] {
  return DOCUMENTS.filter(({ earnedBy }) => ('action' in earnedBy ? earned.actions.includes(earnedBy.action) : 'chapter' in earnedBy ? earned.chapters.includes(earnedBy.chapter) : earned.assets.includes(earnedBy.asset))).map(
    (document) => document.id,
  );
}

/**
 * Les documents que vaut une partie, telle qu'elle est enregistrée : ses gestes (ceux du chapitre en cours et ceux
 * des chapitres menés au bout), les chapitres qu'elle a commencés, ce qu'elle a préparé.
 */
export function earnedIn(state: Pick<GameState, 'chapter' | 'chapterId' | 'results' | 'record' | 'assets'>): string[] {
  const underway = state.chapterId !== null && state.chapter.phase !== 'accueil' && state.chapter.phase !== 'libre';
  return earnedDocuments({
    actions: [...state.chapter.done, ...Object.values(state.results).flatMap((run) => run.done)],
    chapters: [...Object.keys(state.results), ...Object.keys(state.record), ...(underway && state.chapterId ? [state.chapterId] : [])],
    assets: Object.keys(state.assets),
  });
}

/** Les documents obtenus, rangés comme le téléphone les montre. */
export function shelf(collected: readonly string[]): DocumentInfo[] {
  return DOCUMENTS.filter((document) => collected.includes(document.id));
}
