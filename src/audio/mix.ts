/**
 * Ce que l'on entend, d'après la situation du jeu : la pluie, le vent et la
 * rivière. Calcul pur, sans son : c'est `sound.ts` qui le fait entendre.
 */

/** Niveau de chaque nappe d'ambiance, de 0 (silence) à 1. */
export interface Mix {
  rain: number;
  wind: number;
  water: number;
}

export const SILENCE: Mix = { rain: 0, wind: 0, water: 0 };

/** Hauteur au-dessus de l'eau à partir de laquelle on n'entend plus la rivière, en mètres (environ 200 m de la berge). */
const EARSHOT = 1.6;

/** Niveau de crue où la rivière gronde au plus fort, en mètres. */
const ROAR = 1.6;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/**
 * @param sky pluie et vent du moment, de 0 à 1
 * @param height altitude du joueur au-dessus du niveau normal de la rivière, en mètres
 * @param flood niveau de la crue, en mètres au-dessus du niveau normal
 */
export function mixOf(sky: { rain: number; wind: number }, height: number, flood: number): Mix {
  // Plus on est près de l'eau, mieux on l'entend ; quand elle monte, elle se rapproche et elle gronde.
  const near = clamp01(1 - (height - flood) / EARSHOT);
  const swell = clamp01(flood / ROAR);
  return {
    rain: clamp01(sky.rain),
    wind: clamp01(sky.wind),
    water: near * (0.35 + 0.65 * swell),
  };
}
