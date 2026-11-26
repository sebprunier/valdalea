import { newChapter, PHASES, type Chapter, type Phase } from './chapter';
import type { Vec } from './geometry';
import { OFF_CHAPTER, NEWS_IDS, SAVE_VERSION, type GameState, type NewsId } from './state';

const KEY = 'jcrm:partie';

export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Stockage en mémoire, utilisé quand localStorage est indisponible (navigation privée, blocage). */
export function memoryStorage(): KeyValueStore {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

/** Renvoie localStorage s'il est utilisable, sinon un stockage en mémoire. */
export function browserStorage(): { storage: KeyValueStore; persistent: boolean } {
  try {
    const probe = `${KEY}:test`;
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return { storage: window.localStorage, persistent: true };
  } catch {
    return { storage: memoryStorage(), persistent: false };
  }
}

export function saveGame(storage: KeyValueStore, state: GameState): boolean {
  try {
    storage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearGame(storage: KeyValueStore): void {
  try {
    storage.removeItem(KEY);
  } catch {
    // Rien à faire : la partie sera simplement écrasée à la prochaine sauvegarde.
  }
}

export interface LoadContext {
  /** Lieux existants : les identifiants inconnus sont écartés. */
  placeIds: ReadonlySet<string>;
  /** Actions existantes. */
  actionIds: ReadonlySet<string>;
  /** Chapitres existants. */
  chapterIds: ReadonlySet<string>;
  /**
   * Chapitre des parties enregistrées avant que l'on puisse en choisir un, et
   * acquis du prologue qu'elles sont réputées avoir : la lecture du DICRIM,
   * devenue obligatoire, ne l'était pas.
   */
  legacy: { chapterId: string; prologue: readonly string[] };
  /** Choix valides de chaque situation de crise. */
  situationChoices: ReadonlyMap<string, ReadonlySet<string>>;
  badgeIds: ReadonlySet<string>;
  /** Ce que certains gestes laissent au joueur pour la suite de la partie : identifiant du geste, puis de l'acquis. */
  grants: ReadonlyMap<string, string>;
  /** Documents existants, et ceux que vaut une partie d'après ce qui y a été fait (gestes, chapitres commencés, acquis). */
  documents: { ids: ReadonlySet<string>; earnedIn(state: Pick<GameState, 'chapter' | 'chapterId' | 'results' | 'record' | 'assets'>): readonly string[] };
  /** Cartes de risque existantes. */
  riskIds: ReadonlySet<string>;
  /** Le joueur peut-il se tenir à cette position ? */
  isFree: (pos: Vec) => boolean;
  /** Position de repli si la position sauvegardée n'est plus valable. */
  spawn: Vec;
}

/**
 * Relit une partie sauvegardée. Le contenu du stockage n'est jamais considéré
 * comme fiable : toute donnée absente ou corrompue donne `null`, et tout
 * identifiant inconnu est écarté. Une partie de la version 1 (avant les
 * chapitres) est reprise au prologue ; une partie de la version 2 (un seul
 * chapitre, sans prologue) est reprise où elle en était.
 */
export function loadGame(storage: KeyValueStore, context: LoadContext): GameState | null {
  let raw: string | null;
  try {
    raw = storage.getItem(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(data) || ![1, 2, SAVE_VERSION].includes(data.version as number)) return null;

  const player = data.player;
  if (!isRecord(player) || !isFiniteNumber(player.x) || !isFiniteNumber(player.y)) return null;
  const pos = { x: player.x, y: player.y };

  const settings = isRecord(data.settings) ? data.settings : {};

  let chapter = readChapter(data.chapter, context);
  let chapterId = typeof data.chapterId === 'string' && context.chapterIds.has(data.chapterId) ? data.chapterId : null;
  if (data.version === 2 && chapter.phase !== 'accueil') {
    // Version 2 : la partie était déjà dans le seul chapitre d'alors, prologue non compris.
    chapterId = context.legacy.chapterId;
    chapter = { ...chapter, done: [...new Set([...context.legacy.prologue, ...chapter.done])] };
  }
  // Un chapitre en cours sans chapitre connu ne mène nulle part : retour au choix.
  if (chapterId === null && chapter.phase !== 'accueil') chapter = { ...chapter, phase: 'libre', minutesLeft: 0, answers: {} };

  const record: Record<string, number> = {};
  if (isRecord(data.record)) {
    for (const [id, score] of Object.entries(data.record)) {
      if (context.chapterIds.has(id) && isFiniteNumber(score)) record[id] = Math.min(100, Math.max(0, Math.round(score)));
    }
  }

  // Les acquis : chacun avec le chapitre où il a été obtenu. Une partie d'avant eux, enregistrée
  // en cours de chapitre, garde ce que ses gestes déjà accomplis lui ont donné.
  const known = new Set(context.grants.values());
  const assets: Record<string, string> = {};
  if (isRecord(data.assets)) {
    for (const [asset, origin] of Object.entries(data.assets)) {
      if (known.has(asset) && typeof origin === 'string' && (origin === OFF_CHAPTER || context.chapterIds.has(origin))) assets[asset] = origin;
    }
  }
  if (chapterId !== null) {
    for (const actionId of chapter.done) {
      const asset = context.grants.get(actionId);
      if (asset !== undefined && !(asset in assets)) assets[asset] = chapterId;
    }
  }

  // Les parties menées au bout, d'où se retrouvent les bilans. Une partie d'avant elles,
  // enregistrée sur son bilan, garde le sien.
  const results: GameState['results'] = {};
  if (isRecord(data.results)) {
    for (const [id, run] of Object.entries(data.results)) {
      if (context.chapterIds.has(id) && isRecord(run)) results[id] = { done: knownIds(run.done, context.actionIds), answers: readAnswers(run.answers, context) };
    }
  }
  if (chapterId !== null && chapter.phase === 'bilan' && !(chapterId in results)) results[chapterId] = { done: [...chapter.done], answers: { ...chapter.answers } };

  // Les documents rangés dans le téléphone. Une partie d'avant eux retrouve ceux que ses gestes, ses chapitres
  // et ses acquis lui avaient valus ; et rien de ce qui a été mérité ne peut manquer.
  const documents = [...new Set([...knownIds(data.documents, context.documents.ids), ...context.documents.earnedIn({ chapter, chapterId, results, record, assets })])];

  return {
    version: SAVE_VERSION,
    player: context.isFree(pos) ? pos : { ...context.spawn },
    visited: knownIds(data.visited, context.placeIds),
    chapter,
    chapterId,
    record,
    results,
    badges: knownIds(data.badges, context.badgeIds),
    assets,
    documents,
    // L'application DICRIM est devenue l'application Documents.
    news: knownIds(Array.isArray(data.news) ? data.news.map((id) => (id === 'dicrim' ? 'documents' : id)) : [], new Set<string>(NEWS_IDS)) as NewsId[],
    settings: {
      reducedMotion: typeof settings.reducedMotion === 'boolean' ? settings.reducedMotion : null,
      // Les premières sauvegardes ne connaissaient que la zone inondable, par oui ou par non.
      hazardLayer:
        settings.hazardLayer === true
          ? 'inondation'
          : typeof settings.hazardLayer === 'string' && context.riskIds.has(settings.hazardLayer)
            ? settings.hazardLayer
            : null,
      // Le jeu ramène lui-même le niveau dans ses bornes.
      zoom: typeof settings.zoom === 'number' && Number.isInteger(settings.zoom) && settings.zoom >= 0 && settings.zoom < 16 ? settings.zoom : null,
      // Le son est actif tant que le joueur ne l'a pas coupé.
      sound: settings.sound !== false,
    },
  };
}

/** Réponses aux situations de crise : seuls les choix qui existent sont gardés. */
function readAnswers(data: unknown, context: LoadContext): Record<string, string> {
  const answers: Record<string, string> = {};
  if (isRecord(data)) {
    for (const [situation, choice] of Object.entries(data)) {
      if (typeof choice === 'string' && context.situationChoices.get(situation)?.has(choice)) answers[situation] = choice;
    }
  }
  return answers;
}

function readChapter(data: unknown, context: LoadContext): Chapter {
  if (!isRecord(data) || !PHASES.includes(data.phase as Phase)) return newChapter();
  return {
    phase: data.phase as Phase,
    minutesLeft: isFiniteNumber(data.minutesLeft) ? Math.max(0, data.minutesLeft) : 0,
    done: knownIds(data.done, context.actionIds),
    answers: readAnswers(data.answers, context),
  };
}

/** Garde les chaînes connues d'une liste, sans doublon. */
function knownIds(value: unknown, known: ReadonlySet<string>): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is string => typeof id === 'string' && known.has(id)))];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
