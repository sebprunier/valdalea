import { newChapter, PHASES, type Chapter, type Phase } from './chapter';
import type { Vec } from './geometry';
import { SAVE_VERSION, type GameState } from './state';

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
  /** Choix valides de chaque situation de crise. */
  situationChoices: ReadonlyMap<string, ReadonlySet<string>>;
  badgeIds: ReadonlySet<string>;
  /** Le joueur peut-il se tenir à cette position ? */
  isFree: (pos: Vec) => boolean;
  /** Position de repli si la position sauvegardée n'est plus valable. */
  spawn: Vec;
}

/**
 * Relit une partie sauvegardée. Le contenu du stockage n'est jamais considéré
 * comme fiable : toute donnée absente ou corrompue donne `null`, et tout
 * identifiant inconnu est écarté. Une partie de la version 1 (avant les
 * chapitres) est reprise avec un chapitre neuf.
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
  if (!isRecord(data) || (data.version !== SAVE_VERSION && data.version !== 1)) return null;

  const player = data.player;
  if (!isRecord(player) || !isFiniteNumber(player.x) || !isFiniteNumber(player.y)) return null;
  const pos = { x: player.x, y: player.y };

  const settings = isRecord(data.settings) ? data.settings : {};

  return {
    version: SAVE_VERSION,
    player: context.isFree(pos) ? pos : { ...context.spawn },
    visited: knownIds(data.visited, context.placeIds),
    chapter: readChapter(data.chapter, context),
    badges: knownIds(data.badges, context.badgeIds),
    settings: {
      reducedMotion: typeof settings.reducedMotion === 'boolean' ? settings.reducedMotion : null,
      hazardLayer: settings.hazardLayer === true,
    },
  };
}

function readChapter(data: unknown, context: LoadContext): Chapter {
  if (!isRecord(data) || !PHASES.includes(data.phase as Phase)) return newChapter();
  const answers: Record<string, string> = {};
  if (isRecord(data.answers)) {
    for (const [situation, choice] of Object.entries(data.answers)) {
      if (typeof choice === 'string' && context.situationChoices.get(situation)?.has(choice)) answers[situation] = choice;
    }
  }
  return {
    phase: data.phase as Phase,
    minutesLeft: isFiniteNumber(data.minutesLeft) ? Math.max(0, data.minutesLeft) : 0,
    done: knownIds(data.done, context.actionIds),
    answers,
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
