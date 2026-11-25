import { newChapter, type Chapter } from './chapter';
import type { Vec } from './geometry';

export const SAVE_VERSION = 3;

export interface Settings {
  /** `null` : suivre le réglage du système (prefers-reduced-motion). */
  reducedMotion: boolean | null;
  /** Carte de risque affichée par-dessus le plan (disponible une fois le DICRIM consulté) ; `null` : aucune. */
  hazardLayer: string | null;
  /** Niveau de zoom de la carte ; `null` : le niveau par défaut. */
  zoom: number | null;
  /** Son du jeu : ambiance et signaux. */
  sound: boolean;
}

/** Applications du téléphone qui peuvent signaler une nouveauté. */
export const NEWS_IDS = ['messages', 'alertes', 'dicrim', 'bilan'] as const;
export type NewsId = (typeof NEWS_IDS)[number];

/** Tout ce qui est sauvegardé d'une partie. Aucune donnée personnelle. */
export interface GameState {
  version: typeof SAVE_VERSION;
  player: Vec;
  /** Identifiants des lieux dont la fiche a été ouverte. */
  visited: string[];
  /** Où en est la partie : le prologue, puis le chapitre en cours. */
  chapter: Chapter;
  /** Chapitre choisi : celui qui est en cours, ou le dernier joué. `null` tant qu'aucun n'a été choisi. */
  chapterId: string | null;
  /** Chapitres menés au bout : meilleur indice de préparation obtenu, de 0 à 100. */
  record: Record<string, number>;
  /** Badges obtenus, conservés d'une partie à l'autre du chapitre. */
  badges: string[];
  /** Ce que le joueur garde d'un chapitre à l'autre (son kit d'urgence), avec le chapitre où il l'a obtenu, ou `hors-chapitre`. */
  assets: Record<string, string>;
  /** Applications du téléphone où quelque chose de nouveau attend d'être regardé. */
  news: NewsId[];
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = { reducedMotion: null, hazardLayer: null, zoom: null, sound: true };

export function newGame(spawn: Vec, settings: Settings = DEFAULT_SETTINGS, badges: string[] = []): GameState {
  return { version: SAVE_VERSION, player: { ...spawn }, visited: [], chapter: newChapter(), chapterId: null, record: {}, badges, assets: {}, news: [], settings };
}

/** Origine d'un acquis obtenu hors chapitre : il vaut alors pour tous les chapitres. */
export const OFF_CHAPTER = 'hors-chapitre';

/** Le joueur vient d'acquérir quelque chose qu'il gardera dans les chapitres suivants. Le premier chapitre où il l'obtient fait foi. */
export function withAsset(state: GameState, asset: string, chapterId: string): GameState {
  return asset in state.assets ? state : { ...state, assets: { ...state.assets, [asset]: chapterId } };
}

/** Retient l'indice de préparation d'un chapitre mené au bout, s'il est meilleur que le précédent. */
export function withRecord(state: GameState, chapterId: string, score: number): GameState {
  if ((state.record[chapterId] ?? -1) >= score) return state;
  return { ...state, record: { ...state.record, [chapterId]: score } };
}

/** Signale une nouveauté dans une application du téléphone. */
export function withNews(state: GameState, id: NewsId): GameState {
  return state.news.includes(id) ? state : { ...state, news: [...state.news, id] };
}

/** La nouveauté a été regardée. */
export function withoutNews(state: GameState, id: NewsId): GameState {
  return state.news.includes(id) ? { ...state, news: state.news.filter((other) => other !== id) } : state;
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
