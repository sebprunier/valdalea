import { pointInPolygon, rectContains, type Rect, type Vec } from '../core/geometry';
import type { Wildfire } from './model';

/**
 * La propagation du feu de forêt, calculée une fois pour toutes : pour chaque
 * case du massif, l'« avancée » du feu à laquelle elle s'embrase.
 *
 * L'avancée est un nombre de 0 à 1 que le récit fait progresser : à 0, le feu
 * vient de naître ; à 1, il est arrivé au plus loin. Le feu file dans le sens du
 * vent, s'élargit plus lentement sur ses flancs et recule à peine contre le vent.
 * Une saute de feu, née de braises portées en avant du front, s'y ajoute en
 * cours de route. Rien n'est aléatoire : le même récit donne toujours la même carte.
 *
 * C'est une mise en scène, pas une simulation : elle montre d'où vient le feu,
 * où il va, et ce qui ne brûle pas faute de végétation.
 */
export interface FireField {
  /** Coin nord-ouest de la grille, en unités monde. */
  readonly x: number;
  readonly y: number;
  /** Côté d'une case, en unités monde. */
  readonly cell: number;
  readonly cols: number;
  readonly rows: number;
  /** Avancée du feu à laquelle chaque case s'embrase ; `Infinity` là où rien ne brûle. */
  readonly times: Float32Array;
}

/** Au-delà de cette avancée, le feu est fixé : il ne progresse plus, et ses flammes s'éteignent. */
export const FIRE_SPENT = 1;
/** Niveau où il ne reste que la surface brûlée, sans flammes. */
export const FIRE_OUT = 1.5;

/** Bruit lisse, déterministe, entre -1 et 1 : il donne au front un tracé irrégulier. */
function ripple(x: number, y: number): number {
  const lattice = (i: number, j: number): number => {
    const n = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
    return (n - Math.floor(n)) * 2 - 1;
  };
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const top = lattice(x0, y0) * (1 - sx) + lattice(x0 + 1, y0) * sx;
  const bottom = lattice(x0, y0 + 1) * (1 - sx) + lattice(x0 + 1, y0 + 1) * sx;
  return top * (1 - sy) + bottom * sy;
}

/** Avancée nécessaire pour qu'un feu parti de `from` atteigne `p`, sans obstacle. */
function spread(from: Vec, wind: Vec, reach: Wildfire['reach'], p: Vec): number {
  const dx = p.x - from.x;
  const dy = p.y - from.y;
  const along = dx * wind.x + dy * wind.y;
  const across = dy * wind.x - dx * wind.y;
  return Math.hypot(along / (along >= 0 ? reach.head : reach.back), across / reach.flank);
}

/** Longueur d'onde des irrégularités du front, en unités monde, et leur ampleur. */
const RIPPLE_SPAN = 150;
const RIPPLE = 0.13;

/**
 * @param fuel ce qui peut brûler : le massif, et les terrains non débroussaillés qui le touchent
 * @param spared ce qui ne brûle pas au milieu : les constructions
 */
export function buildFireField(wildfire: Wildfire, fuel: ReadonlyArray<readonly Vec[]>, spared: readonly Rect[] = [], cell = 10): FireField {
  const points = fuel.flat();
  const x = Math.floor(Math.min(...points.map((p) => p.x)) / cell) * cell;
  const y = Math.floor(Math.min(...points.map((p) => p.y)) / cell) * cell;
  const cols = Math.ceil((Math.max(...points.map((p) => p.x)) - x) / cell);
  const rows = Math.ceil((Math.max(...points.map((p) => p.y)) - y) / cell);
  const times = new Float32Array(cols * rows).fill(Infinity);
  const { ignition, wind, reach, spot } = wildfire;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const p = { x: x + (col + 0.5) * cell, y: y + (row + 0.5) * cell };
      if (!fuel.some((polygon) => pointInPolygon(p, polygon)) || spared.some((r) => rectContains(r, p))) continue;
      const uneven = 1 + RIPPLE * ripple(p.x / RIPPLE_SPAN, p.y / RIPPLE_SPAN);
      const front = spread(ignition, wind, reach, p) * uneven;
      const jump = spot.from + spread(spot.at, wind, spot.reach, p) * uneven;
      times[row * cols + col] = Math.min(front, jump);
    }
  }
  return { x, y, cell, cols, rows, times };
}

/** Avancée à laquelle le feu atteint ce point ; `Infinity` s'il ne l'atteint jamais. */
export function arrivalAt(field: FireField, p: Vec): number {
  const col = Math.floor((p.x - field.x) / field.cell);
  const row = Math.floor((p.y - field.y) / field.cell);
  if (col < 0 || row < 0 || col >= field.cols || row >= field.rows) return Infinity;
  return field.times[row * field.cols + col];
}

/** Le feu est-il passé par ce point, à ce niveau du récit ? */
export function isBurnt(field: FireField, p: Vec, level: number): boolean {
  return arrivalAt(field, p) <= Math.min(level, FIRE_SPENT);
}

/** Part du massif brûlée à ce niveau, de 0 à 1. */
export function burntShare(field: FireField, level: number): number {
  const reached = Math.min(level, FIRE_SPENT);
  let fuel = 0;
  let burnt = 0;
  for (const time of field.times) {
    if (time === Infinity) continue;
    fuel++;
    if (time <= reached) burnt++;
  }
  return fuel === 0 ? 0 : burnt / fuel;
}
