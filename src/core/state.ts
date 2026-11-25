import type { Vec } from './geometry';

export const SAVE_VERSION = 1;

export interface Settings {
  /** `null` : suivre le réglage du système (prefers-reduced-motion). */
  reducedMotion: boolean | null;
}

/** Tout ce qui est sauvegardé d'une partie. Aucune donnée personnelle. */
export interface GameState {
  version: typeof SAVE_VERSION;
  player: Vec;
  /** Identifiants des lieux dont la fiche a été ouverte. */
  visited: string[];
  settings: Settings;
}

export function newGame(spawn: Vec, settings: Settings = { reducedMotion: null }): GameState {
  return { version: SAVE_VERSION, player: { ...spawn }, visited: [], settings };
}

export function markVisited(state: GameState, placeId: string): GameState {
  if (state.visited.includes(placeId)) return state;
  return { ...state, visited: [...state.visited, placeId] };
}

export function movePlayer(state: GameState, pos: Vec): GameState {
  if (state.player.x === pos.x && state.player.y === pos.y) return state;
  return { ...state, player: { x: pos.x, y: pos.y } };
}
