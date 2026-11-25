import type { BadgeDef } from './model';

/**
 * Les badges de toute la partie : ceux qui ne tiennent pas à un chapitre. Le kit
 * d'urgence, par exemple, sert pour tous les risques, et se prépare où l'on veut.
 * (Les badges d'un chapitre sont décernés avec son bilan : voir `CrisisScript`.)
 */

/** Ce que ces badges regardent de la partie. */
export interface Progress {
  /** Ce que le joueur garde d'un chapitre à l'autre. */
  assets: Readonly<Record<string, string>>;
  /** Lieux visités, sur le nombre de lieux de la commune. */
  visited: readonly string[];
  places: number;
  /** Chapitres menés jusqu'à leur bilan, sur ceux qui se jouent. */
  finished: readonly string[];
  chapters: readonly string[];
}

export interface GlobalBadgeDef extends Pick<BadgeDef, 'id' | 'title' | 'description'> {
  earned(progress: Progress): boolean;
}

export const GLOBAL_BADGES: GlobalBadgeDef[] = [
  {
    id: 'kit',
    title: 'Kit prêt',
    description: "Préparer son kit d'urgence 72 h : il sert pour tous les risques.",
    earned: (progress) => 'kit' in progress.assets,
  },
  {
    id: 'explorateur',
    title: 'Explorateur',
    description: 'Visiter tous les lieux de la commune.',
    earned: (progress) => progress.places > 0 && progress.visited.length >= progress.places,
  },
  {
    id: 'reserviste-confirme',
    title: 'Réserviste confirmé',
    description: "Mener chaque chapitre jusqu'à son bilan.",
    earned: (progress) => progress.chapters.length > 0 && progress.chapters.every((id) => progress.finished.includes(id)),
  },
];
