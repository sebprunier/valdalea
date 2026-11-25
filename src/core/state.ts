import { newChapter, type Chapter } from './chapter';
import type { Vec } from './geometry';

export const SAVE_VERSION = 2;

export interface Settings {
  /** `null` : suivre le réglage du système (prefers-reduced-motion). */
  reducedMotion: boolean | null;
  /** Afficher la zone inondable sur la carte (disponible une fois le DICRIM consulté). */
  hazardLayer: boolean;
}

/** Tout ce qui est sauvegardé d'une partie. Aucune donnée personnelle. */
export interface GameState {
  version: typeof SAVE_VERSION;
  player: Vec;
  /** Identifiants des lieux dont la fiche a été ouverte. */
  visited: string[];
  /** Chapitre en cours. */
  chapter: Chapter;
  /** Badges obtenus, conservés d'une partie à l'autre du chapitre. */
  badges: string[];
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = { reducedMotion: null, hazardLayer: false };

export function newGame(spawn: Vec, settings: Settings = DEFAULT_SETTINGS, badges: string[] = []): GameState {
  return { version: SAVE_VERSION, player: { ...spawn }, visited: [], chapter: newChapter(), badges, settings };
}

export function markVisited(state: GameState, placeId: string): GameState {
  if (state.visited.includes(placeId)) return state;
  return { ...state, visited: [...state.visited, placeId] };
}

export function movePlayer(state: GameState, pos: Vec): GameState {
  if (state.player.x === pos.x && state.player.y === pos.y) return state;
  return { ...state, player: { x: pos.x, y: pos.y } };
}

export function withChapter(state: GameState, chapter: Chapter): GameState {
  return chapter === state.chapter ? state : { ...state, chapter };
}

export function withBadges(state: GameState, earned: readonly string[]): GameState {
  const fresh = earned.filter((id) => !state.badges.includes(id));
  return fresh.length === 0 ? state : { ...state, badges: [...state.badges, ...fresh] };
}
