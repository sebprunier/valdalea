import type { Vec } from '../core/geometry';
import type { Elevation } from './elevation';

/**
 * Contour d'une zone inondable : la partie du relief située sous un niveau d'eau.
 * Le relief est une grille ; le contour passe entre ses mailles, là où l'altitude
 * interpolée vaut exactement le niveau (méthode des « carrés mobiles »). On obtient
 * une limite nette, que l'on peut tracer et hachurer comme n'importe quelle zone
 * d'une carte de risque.
 */
export interface Outline {
  /** Surfaces dont la réunion forme la zone : un rectangle par suite de mailles pleines, un polygone par maille de bord. */
  polygons: Vec[][];
  /** Segments de la limite de la zone, sans ordre particulier. */
  segments: Array<[Vec, Vec]>;
}

/** Zone située sous le niveau `level` (en mètres au-dessus du niveau normal de la rivière). */
export function outlineBelow(elevation: Elevation, level: number): Outline {
  const { cols, rows, cell, heights } = elevation;
  // Profondeur d'eau au nœud (c, r), placé au centre de la maille ; hors de la grille, le relief se prolonge à l'identique.
  const depth = (c: number, r: number): number => level - heights[Math.min(rows - 1, Math.max(0, r)) * cols + Math.min(cols - 1, Math.max(0, c))];
  const at = (c: number, r: number): Vec => ({ x: (c + 0.5) * cell, y: (r + 0.5) * cell });

  const polygons: Vec[][] = [];
  const segments: Array<[Vec, Vec]> = [];

  for (let r = -1; r < rows; r++) {
    /** Début d'une suite de mailles entièrement dans la zone, réunies en un seul rectangle. */
    let run = -2;
    const flush = (end: number): void => {
      if (run === -2) return;
      const a = at(run, r);
      const b = at(end, r + 1);
      polygons.push([a, { x: b.x, y: a.y }, b, { x: a.x, y: b.y }]);
      run = -2;
    };

    for (let c = -1; c < cols; c++) {
      // Les quatre coins de la maille, dans le sens des aiguilles d'une montre.
      const corners: Array<[number, number]> = [
        [c, r],
        [c + 1, r],
        [c + 1, r + 1],
        [c, r + 1],
      ];
      const values = corners.map(([cc, rr]) => depth(cc, rr));
      const inside = values.filter((value) => value > 0).length;
      if (inside === 4) {
        if (run === -2) run = c;
        continue;
      }
      flush(c);
      if (inside === 0) continue;

      // Maille de bord : on en fait le tour, en gardant les coins dans la zone
      // et les points où la limite coupe ses côtés.
      const shape: Array<{ point: Vec; crossing: boolean }> = [];
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        const a = at(...corners[i]);
        const b = at(...corners[j]);
        if (values[i] > 0) shape.push({ point: a, crossing: false });
        if (values[i] > 0 !== values[j] > 0) {
          const t = values[i] / (values[i] - values[j]);
          shape.push({ point: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, crossing: true });
        }
      }
      polygons.push(shape.map((vertex) => vertex.point));
      // La limite : les côtés du polygone qui relient deux points de coupe.
      for (let i = 0; i < shape.length; i++) {
        const next = shape[(i + 1) % shape.length];
        if (shape[i].crossing && next.crossing) segments.push([shape[i].point, next.point]);
      }
    }
    flush(cols);
  }
  return { polygons, segments };
}
