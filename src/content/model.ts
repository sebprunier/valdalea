import sourcesData from './sources.json';

/**
 * Formes des contenus de prévention.
 *
 * Règle du projet : toute consigne de sécurité affichée dans le jeu reprend une
 * source officielle, citée par son identifiant dans `sources.json` et relue sur
 * la page d'origine. Les scènes et dialogues, eux, sont de la fiction.
 */

export interface Source {
  titre: string;
  editeur: string;
  url: string;
  /** Date de la dernière relecture de la page, au format AAAA-MM-JJ. */
  consulte: string;
}

export const SOURCES: Record<string, Source> = sourcesData;

export type ActionPhase = 'accueil' | 'preparation' | 'vigilance';

/** Un geste de prévention que le joueur peut accomplir dans un lieu. */
export interface ActionDef {
  id: string;
  /** Identifiant du lieu où l'action se déroule. */
  place: string;
  /** Phase du chapitre pendant laquelle l'action est proposée. */
  phase: ActionPhase;
  /** Durée, en minutes de jeu. */
  minutes: number;
  /** Action de préparation indispensable : sans elle, l'action reste impossible. */
  requires?: string;
  /** Durée réduite si l'action de préparation indiquée a été faite. */
  eased?: { by: string; minutes: number };
  /** Questions à traiter pour accomplir l'action (composition du kit, par exemple). */
  questions?: string[];
  /** Mettre fin à la phase en cours une fois l'action accomplie. */
  endsPhase?: boolean;
  /** Action de pur récit (finir la journée) : elle ne porte aucune consigne, donc aucune source. */
  narrative?: boolean;
  /** Mots du lexique expliqués avec ce geste. */
  lexicon?: string[];
  /** Illustration montrée quand le geste est accompli. */
  figure?: 'repere';
  title: string;
  /** Pourquoi ce geste compte. */
  why: string;
  /** Qui en a la charge. */
  who: string;
  /** Ce qui se passe une fois le geste accompli. */
  done: string;
  /** Message affiché quand l'action préalable manque. */
  locked?: string;
  sources: string[];
}

export interface Choice {
  id: string;
  label: string;
  correct: boolean;
  /** Conséquence ou explication propre à ce choix. */
  outcome?: string;
}

/** Une question à choix, ou une situation de crise à trancher. */
export interface Question {
  id: string;
  /** Mise en situation, lue avant la question. */
  context?: string;
  prompt: string;
  /** Plusieurs réponses à cocher. */
  multiple?: boolean;
  choices: Choice[];
  /** Ce qu'il faut retenir, d'après les sources. */
  lesson: string;
  sources: string[];
}

/** Situation de crise : une question, et le niveau de l'eau à ce moment-là. */
export interface Situation extends Question {
  /** Hauteur de la crue, en mètres au-dessus du niveau normal de la rivière. */
  floodLevel: number;
}

/** Ce que les règles du bilan peuvent lire du chapitre joué. */
export interface ChapterView {
  /** L'action a été accomplie. */
  did(actionId: string): boolean;
  /** La question ou la situation a reçu la bonne réponse. */
  right(questionId: string): boolean;
}

export type StakeLevel = 0 | 1 | 2;

/** Un enjeu du territoire, évalué dans le bilan : 0 touché, 1 en partie protégé, 2 protégé. */
export interface StakeDef {
  id: string;
  title: string;
  assess(view: ChapterView): StakeLevel;
  /** Récit du dénouement pour chacun des trois niveaux. */
  outcomes: [string, string, string];
  /** Ce qu'il fallait savoir. */
  lesson: string;
  sources: string[];
}

export interface BadgeDef {
  id: string;
  title: string;
  description: string;
  earned(view: ChapterView): boolean;
}

export interface Bulletin {
  id: string;
  /** Émetteur affiché en tête du message. */
  from: string;
  title: string;
  paragraphs: string[];
  /** Consignes à puces, reprises de la source. */
  advice?: string[];
  sources: string[];
}
