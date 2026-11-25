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
  /** Le joueur peut-il se tenir à cette position ? */
  isFree: (pos: Vec) => boolean;
  /** Position de repli si la position sauvegardée n'est plus valable. */
  spawn: Vec;
}

/**
 * Relit une partie sauvegardée. Le contenu du stockage n'est jamais considéré
 * comme fiable : toute donnée absente, corrompue ou d'une autre version donne `null`.
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
  if (!isRecord(data) || data.version !== SAVE_VERSION) return null;

  const player = data.player;
  if (!isRecord(player) || !isFiniteNumber(player.x) || !isFiniteNumber(player.y)) return null;
  const pos = { x: player.x, y: player.y };

  const visited = Array.isArray(data.visited)
    ? [...new Set(data.visited.filter((id): id is string => typeof id === 'string' && context.placeIds.has(id)))]
    : [];

  const settings = isRecord(data.settings) ? data.settings : {};
  const reducedMotion = typeof settings.reducedMotion === 'boolean' ? settings.reducedMotion : null;

  return {
    version: SAVE_VERSION,
    player: context.isFree(pos) ? pos : { ...context.spawn },
    visited,
    settings: { reducedMotion },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
