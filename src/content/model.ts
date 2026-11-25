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
  /** Illustration du geste : le repère de crue, montré une fois lu ; le terrain à débroussailler, sur lequel on agit. */
  figure?: 'repere' | 'debroussaillement';
  /** Libellé du bouton qui accomplit le geste, quand « Le faire » ne dit pas assez bien ce qui va se passer. */
  go?: string;
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

/** Niveaux de la vigilance crues. */
export type VigilanceLevel = 'verte' | 'jaune' | 'orange' | 'rouge';

/** Le temps qu'il fait, tel que la carte le montre. */
export type SkyId = 'sec' | 'soir' | 'nuit-pluie' | 'pluie' | 'forte-pluie' | 'eclaircie';

/**
 * Un moment de récit entre deux phases : il laisse au joueur le temps de voir
 * la situation changer avant qu'une alerte n'arrive. Fiction pure, sans consigne.
 */
export interface StoryCard {
  id: string;
  /** Jour et heure du récit. */
  when: string;
  title: string;
  paragraphs: string[];
  /** Premier paragraphe quand la phase précédente s'est achevée faute de temps. */
  late?: string;
  /** Libellé du bouton qui fait avancer le récit. */
  next: string;
  /** Signal sonore de ce moment : le téléphone qui vibre, ou l'alerte. */
  sound?: 'message' | 'alerte';
  /** Ce que montrent la carte et la barre d'état pendant ce moment. */
  sky: SkyId;
  vigilance: VigilanceLevel;
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

/** Horaires des phases où le temps est compté : durée, jour et heure de début. */
export type ChapterTiming = Record<'preparation' | 'vigilance', { minutes: number; day: string; startsAt: number }>;

/** Phases d'un chapitre, une fois le prologue passé. */
export type ChapterPhase = 'preparation' | 'vigilance' | 'crise' | 'bilan';

/**
 * Ce qui fait un chapitre, vu du jeu : ses gestes, ses horaires, ce que la barre
 * d'état et le téléphone en montrent. Les règles (`core/chapter`) et l'interface
 * sont les mêmes pour tous ; seul ce contenu change.
 */
export interface ChapterContent {
  id: string;
  /** Gestes du chapitre, prologue non compris. */
  actions: ActionDef[];
  questions: Question[];
  /** La mission de chaque phase, telle que le carnet la formule. */
  objectives: Record<ChapterPhase, string>;
  /** Ce que la barre d'état et la carte montrent à chaque phase : le niveau de danger, son libellé, le temps qu'il fait. */
  situation: Record<ChapterPhase, { level: VigilanceLevel; indicator: string; sky: SkyId; river: string }>;
  /** Libellé de l'indicateur de danger pour chaque niveau, tel que la barre d'état l'affiche pendant le récit. */
  levels: Record<VigilanceLevel, string>;
  /** Prévisions de l'application Météo. Fiction : elles annoncent le récit. */
  forecast: Partial<Record<ChapterPhase, Array<{ when: string; icon: 'soleil' | 'nuage' | 'pluie' | 'eclaircie'; text: string }>>>;
  timing: ChapterTiming;
  /** Baisse de la lumière en fin de préparation, quand la journée s'achève à la nuit. */
  dusk: { minutesLeft: number; sky: SkyId } | null;
  /** Le moment de récit qui ouvre le chapitre : la mission confiée par le maire. */
  opening: StoryCard;
  /** Comment le carnet nomme chaque phase minutée : « la journée », « la matinée »… */
  period: Record<'preparation' | 'vigilance', string>;
  /** Message « le temps presse » de chaque phase minutée ; `{reste}` y est remplacé par le temps restant. */
  alerts: Record<'preparation' | 'vigilance', string>;
  /** Application du téléphone qu'ouvre l'indicateur de danger. */
  hazardApp: 'alertes' | 'meteo';
  /** Ce qu'est cet indicateur, d'après sa source officielle : affiché dans l'application Météo. */
  hazardInfo?: { title: string; text: string; sources: string[] };
  /** Le chapitre se joue jusqu'au bilan. Sinon, seule sa préparation existe : la suite est en cours d'écriture. */
  complete: boolean;
  /** Pour un chapitre incomplet : le moment de récit qui annonce la suite. */
  toBeContinued?: StoryCard;
}
