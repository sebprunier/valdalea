/**
 * Ce que l'on entend, d'après la situation du jeu : le temps qu'il fait, et les
 * lieux près desquels on se trouve. Calcul pur, sans son : c'est `sound.ts` qui
 * le fait entendre.
 */

/** Niveau de chaque nappe d'ambiance, de 0 (silence) à 1. */
export interface Mix {
  rain: number;
  wind: number;
  /** La rivière. */
  water: number;
  /** Le bruissement des feuillages, en lisière et en forêt. */
  leaves: number;
  /** Les oiseaux de la forêt : de jour, par temps sec. */
  birds: number;
  /** L'usine : ronronnement et ventilation. */
  industry: number;
  /** Le feu de forêt : son souffle et ses crépitements. */
  fire: number;
}

export const SILENCE: Mix = { rain: 0, wind: 0, water: 0, leaves: 0, birds: 0, industry: 0, fire: 0 };

/** Ce dont dépend l'ambiance. */
export interface Listening {
  /** Pluie et vent du moment, de 0 à 1 ; lumière du jour, de 0 (nuit) à 1. */
  sky: { rain: number; wind: number; daylight: number };
  /** Altitude du joueur au-dessus du niveau normal de la rivière, en mètres. */
  height: number;
  /** Niveau de la crue, en mètres au-dessus du niveau normal. */
  flood: number;
  /** Distance du joueur à la forêt et à l'usine, en mètres (0 : il y est). */
  toForest: number;
  toPlant: number;
  /** Force du feu de forêt, de 0 (pas de feu, ou feu éteint) à 1. */
  fire: number;
}

/** Hauteur au-dessus de l'eau à partir de laquelle on n'entend plus la rivière, en mètres (environ 200 m de la berge). */
const RIVER_EARSHOT = 1.6;
/** Niveau de crue où la rivière gronde au plus fort, en mètres. */
const ROAR = 1.6;
/** Distances, en mètres, au-delà desquelles on n'entend plus la forêt ni l'usine. */
const FOREST_EARSHOT = 300;
const PLANT_EARSHOT = 380;
/** Un feu de forêt s'entend de plus loin que le massif lui-même. */
const FIRE_EARSHOT = 900;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/** Proximité d'une source : 1 quand on y est, 0 au-delà de sa portée. */
export function nearness(distance: number, earshot: number): number {
  return clamp01(1 - distance / earshot);
}

export function mixOf({ sky, height, flood, toForest, toPlant, fire }: Listening): Mix {
  // Plus on est près de l'eau, mieux on l'entend ; quand elle monte, elle se rapproche et elle gronde.
  const nearWater = clamp01(1 - (height - flood) / RIVER_EARSHOT);
  const swell = clamp01(flood / ROAR);
  const forest = nearness(toForest, FOREST_EARSHOT);
  return {
    rain: clamp01(sky.rain),
    wind: clamp01(sky.wind),
    water: nearWater * (0.35 + 0.65 * swell),
    // Les feuillages bruissent toujours un peu, davantage quand le vent se lève.
    leaves: forest * (0.45 + 0.55 * clamp01(sky.wind)),
    // Les oiseaux se taisent sous la pluie, la nuit, et quand la forêt brûle.
    birds: forest * (1 - clamp01(sky.rain)) * clamp01(sky.daylight) * (1 - clamp01(fire)),
    industry: nearness(toPlant, PLANT_EARSHOT),
    // Le feu est dans le massif : on l'entend d'autant mieux qu'on en est près.
    fire: clamp01(fire) * nearness(toForest, FIRE_EARSHOT),
  };
}
