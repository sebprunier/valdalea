import { describe, expect, it } from 'vitest';
import { outlineBelow } from '../src/world/contour';
import { buildElevation, Elevation } from '../src/world/elevation';
import { findPlace } from '../src/world/model';
import { buildValDAlea } from '../src/world/valdalea';

/** Le point est-il dans le polygone (règle pair-impair) ? */
function inside(polygon: ReadonlyArray<{ x: number; y: number }>, x: number, y: number): boolean {
  let within = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) within = !within;
  }
  return within;
}

const area = (polygon: ReadonlyArray<{ x: number; y: number }>): number =>
  Math.abs(polygon.reduce((sum, p, i) => sum + p.x * polygon[(i + 1) % polygon.length].y - polygon[(i + 1) % polygon.length].x * p.y, 0)) / 2;

describe('contour de la zone inondable', () => {
  it('trace la limite là où le relief atteint le niveau de l’eau', () => {
    // Une pente régulière d'ouest en est : un mètre tous les cent mètres.
    const slope = new Elevation(400, 200, 20);
    for (let r = 0; r < slope.rows; r++) for (let c = 0; c < slope.cols; c++) slope.heights[r * slope.cols + c] = ((c + 0.5) * 20) / 100;
    const outline = outlineBelow(slope, 1.5);

    // La limite est la droite x = 150, sur toute la hauteur.
    expect(outline.segments.length).toBeGreaterThan(0);
    for (const [a, b] of outline.segments) {
      expect(a.x).toBeCloseTo(150, 3);
      expect(b.x).toBeCloseTo(150, 3);
    }
    // Tout ce qui est à l'ouest de la limite est dans la zone, rien de ce qui est à l'est.
    const covers = (x: number, y: number): boolean => outline.polygons.some((polygon) => inside(polygon, x, y));
    expect(covers(60, 100)).toBe(true);
    expect(covers(140, 30)).toBe(true);
    expect(covers(160, 100)).toBe(false);
    expect(covers(300, 170)).toBe(false);
    // Les surfaces se complètent sans se chevaucher : leur somme est celle de la zone, prolongée d'une demi-maille au bord.
    const total = outline.polygons.reduce((sum, polygon) => sum + area(polygon), 0);
    expect(total).toBeCloseTo((150 + 10) * (200 + 20), 0);
  });

  it('ne trace rien quand tout est hors d’eau, et une seule surface sans limite quand tout est noyé', () => {
    const flat = new Elevation(100, 100, 20);
    flat.heights.fill(2);
    expect(outlineBelow(flat, 1)).toEqual({ polygons: [], segments: [] });
    const drowned = outlineBelow(flat, 3);
    expect(drowned.segments).toEqual([]);
    expect(drowned.polygons.reduce((sum, polygon) => sum + area(polygon), 0)).toBeCloseTo(120 * 120, 0);
  });

  it('donne, pour la commune, une zone qui contient les lieux inondables et laisse la mairie au sec', () => {
    const commune = buildValDAlea();
    const elevation = buildElevation(commune);
    const outline = outlineBelow(elevation, commune.relief.referenceFlood);
    const covers = (id: string): boolean => {
      const { x, y } = findPlace(commune, id)!.pos;
      return outline.polygons.some((polygon) => inside(polygon, x, y));
    };
    for (const id of ['domicile', 'jeanne', 'ecole', 'camping']) expect(covers(id), id).toBe(true);
    for (const id of ['mairie', 'gymnase']) expect(covers(id), id).toBe(false);
    // Peu de surfaces : les mailles pleines sont réunies par rangées.
    expect(outline.polygons.length).toBeLessThan(1500);
  });
});
