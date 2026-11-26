import type { Rect, Vec } from '../core/geometry';
import { ripple } from '../core/noise';
import type { Plume } from './model';

/**
 * Le nuage toxique de l'accident industriel : sa densité en chaque point, pour
 * une « étendue » que le récit fait progresser.
 *
 * L'étendue est un nombre : à 0, rien ne s'échappe ; à 1, le nuage est arrivé au
 * plus loin ; au-delà, la fuite est colmatée et il se dissipe, jusqu'à disparaître.
 * Le nuage part de la fuite et s'étire dans le sens du vent, en s'élargissant et
 * en se diluant. Rien n'est aléatoire : le même récit donne toujours la même carte.
 *
 * C'est une mise en scène, pas un modèle de dispersion : elle montre d'où vient
 * le nuage, où le vent le pousse, et qu'il finit par se dissiper.
 */

/** À cette étendue, le nuage est arrivé au plus loin. */
export const PLUME_FULL = 1;
/** À cette étendue, il s'est entièrement dissipé. */
export const PLUME_GONE = 1.5;
/** Densité à partir de laquelle on considère qu'un point est dans le nuage. */
export const PLUME_PRESENT = 0.12;

/** Longueur d'onde des irrégularités du bord, en unités monde, et leur ampleur. */
const RIPPLE_SPAN = 120;
const RIPPLE = 0.22;

/** Part de la longueur du nuage à partir de laquelle son bord avant s'estompe. */
const HEAD = 0.85;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
const smooth = (t: number): number => {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
};

/** Ce qu'il reste du nuage une fois la fuite colmatée : 1 tant qu'il s'étend, 0 quand il s'est dissipé. */
export function plumeStrength(level: number): number {
  if (level <= 0) return 0;
  return level <= PLUME_FULL ? 1 : clamp01((PLUME_GONE - level) / (PLUME_GONE - PLUME_FULL));
}

/** Densité du nuage en un point, de 0 à 1, pour cette étendue. */
export function plumeDensity(plume: Plume, p: Vec, level: number): number {
  const strength = plumeStrength(level);
  if (strength === 0) return 0;
  const extent = plume.reach * Math.min(level, PLUME_FULL);
  const dx = p.x - plume.source.x;
  const dy = p.y - plume.source.y;
  const along = dx * plume.wind.x + dy * plume.wind.y;
  const across = dy * plume.wind.x - dx * plume.wind.y;
  // Contre le vent, le nuage ne remonte que de la largeur de la fuite.
  if (along > extent || along < -plume.width.source) return 0;
  const half = plume.width.source + plume.width.grow * Math.max(0, along);
  const uneven = 1 + RIPPLE * ripple(p.x / RIPPLE_SPAN, p.y / RIPPLE_SPAN);
  const side = Math.exp(-2 * (across / (half * uneven)) ** 2);
  const t = along / extent;
  // Dense près de la fuite, plus dilué en s'éloignant, et un bord avant qui s'estompe.
  const lengthwise = along < 0 ? 1 + along / plume.width.source : (1 - 0.4 * t) * (1 - smooth((t - HEAD) / (1 - HEAD)));
  return clamp01(lengthwise * side) * strength;
}

/** Le nuage passe-t-il par ce point, pour cette étendue ? */
export function inPlume(plume: Plume, p: Vec, level: number): boolean {
  return plumeDensity(plume, p, level) >= PLUME_PRESENT;
}

/** Rectangle qui contient le nuage, quelle que soit son étendue : de quoi le dessiner. */
export function plumeBounds(plume: Plume): Rect {
  const { source, wind, reach, width } = plume;
  // Largeur au bout du nuage, irrégularités comprises ; au-delà d'une fois et demie, la densité est négligeable.
  const tip = (width.source + width.grow * reach) * (1 + RIPPLE) * 1.5;
  const back = width.source * (1 + RIPPLE) * 1.5;
  const end = { x: source.x + wind.x * reach, y: source.y + wind.y * reach };
  const minX = Math.min(source.x - back, end.x - tip);
  const maxX = Math.max(source.x + back, end.x + tip);
  const minY = Math.min(source.y - back, end.y - tip);
  const maxY = Math.max(source.y + back, end.y + tip);
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}
