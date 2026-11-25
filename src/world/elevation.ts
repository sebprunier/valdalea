import type { Rect, Vec } from '../core/geometry';
import type { Commune } from './model';

/**
 * Relief simplifié de la commune : l'altitude de chaque point au-dessus du
 * niveau normal de la rivière, en mètres. Une crue de hauteur `h` inonde tout
 * ce qui se trouve en dessous de `h`.
 */
export class Elevation {
  readonly cols: number;
  readonly rows: number;
  readonly heights: Float32Array;

  constructor(
    readonly width: number,
    readonly height: number,
    readonly cell: number,
  ) {
    this.cols = Math.ceil(width / cell);
    this.rows = Math.ceil(height / cell);
    this.heights = new Float32Array(this.cols * this.rows);
  }

  /** Altitude au point donné, en mètres. */
  at(p: Vec): number {
    const cx = Math.min(this.cols - 1, Math.max(0, Math.floor(p.x / this.cell)));
    const cy = Math.min(this.rows - 1, Math.max(0, Math.floor(p.y / this.cell)));
    return this.heights[cy * this.cols + cx];
  }

  /** Hauteur d'eau au point donné pour une crue de niveau `level`, en mètres (0 si le point est au sec). */
  depthAt(p: Vec, level: number): number {
    return Math.max(0, level - this.at(p));
  }

  isFlooded(p: Vec, level: number): boolean {
    return this.depthAt(p, level) > 0;
  }
}

/** Au-delà de cette distance à la rivière, le terrain est toujours hors d'eau : inutile de le calculer finement. */
const FAR = 900;
const DRY = 99;

export function buildElevation(commune: Commune, cell = 20): Elevation {
  const elevation = new Elevation(commune.width, commune.height, cell);
  const { river, relief } = commune;
  const path = river.path;

  for (let cy = 0; cy < elevation.rows; cy++) {
    for (let cx = 0; cx < elevation.cols; cx++) {
      const x = (cx + 0.5) * cell;
      const y = (cy + 0.5) * cell;
      let z = DRY;
      if (y > river.bounds.y - FAR && y < river.bounds.y + river.bounds.h + FAR) {
        // Point de l'axe de la rivière le plus proche.
        let best = Infinity;
        let nearestY = 0;
        for (let i = 0; i < path.length - 1; i++) {
          const a = path[i];
          const b = path[i + 1];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const lengthSq = dx * dx + dy * dy;
          const t = lengthSq === 0 ? 0 : Math.min(1, Math.max(0, ((x - a.x) * dx + (y - a.y) * dy) / lengthSq));
          const px = a.x + t * dx;
          const py = a.y + t * dy;
          const d = Math.hypot(x - px, y - py);
          if (d < best) {
            best = d;
            nearestY = py;
          }
        }
        const fromBank = Math.max(0, best - river.width / 2);
        z = fromBank / (y < nearestY ? relief.northRun : relief.southRun);
        z += Math.max(0, x - relief.eastRise.fromX) / relief.eastRise.run;
      }
      elevation.heights[cy * elevation.cols + cx] = z;
    }
  }

  // Le tablier des ponts routiers passe au-dessus de l'eau ; la passerelle, basse, est submersible.
  for (const bridge of commune.bridges) {
    if (bridge.kind === 'pont') raise(elevation, bridge.rect, relief.bridgeDeck);
  }
  return elevation;
}

function raise(elevation: Elevation, area: Rect, height: number): void {
  const { cell, cols, rows } = elevation;
  for (let cy = Math.max(0, Math.floor(area.y / cell)); cy <= Math.min(rows - 1, Math.floor((area.y + area.h) / cell)); cy++) {
    for (let cx = Math.max(0, Math.floor(area.x / cell)); cx <= Math.min(cols - 1, Math.floor((area.x + area.w) / cell)); cx++) {
      const x = (cx + 0.5) * cell;
      const y = (cy + 0.5) * cell;
      if (x >= area.x && x <= area.x + area.w && y >= area.y && y <= area.y + area.h) {
        const index = cy * cols + cx;
        elevation.heights[index] = Math.max(elevation.heights[index], height);
      }
    }
  }
}
