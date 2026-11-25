import { describe, expect, it } from 'vitest';
import { distToSegment, pointInPolygon, smoothPath } from '../src/core/geometry';
import { WalkGrid } from '../src/world/grid';

describe('géométrie', () => {
  it('teste un point dans un polygone', () => {
    const square = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    expect(pointInPolygon({ x: 5, y: 5 }, square)).toBe(true);
    expect(pointInPolygon({ x: 15, y: 5 }, square)).toBe(false);
  });

  it('mesure la distance à un segment', () => {
    expect(distToSegment({ x: 5, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(3);
    expect(distToSegment({ x: 14, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(5);
  });

  it('fait passer la courbe lissée par les points de contrôle', () => {
    const controls = [
      { x: 0, y: 0 },
      { x: 10, y: 5 },
      { x: 20, y: 0 },
    ];
    const path = smoothPath(controls, 4);
    expect(path[0]).toEqual(controls[0]);
    expect(path[4]).toEqual(controls[1]);
    expect(path[path.length - 1]).toEqual(controls[2]);
  });
});

describe('grille de franchissabilité', () => {
  const R = 9;

  function gridWithWall(): WalkGrid {
    const grid = new WalkGrid(400, 400);
    grid.setRect({ x: 200, y: 0, w: 40, h: 300 }, true); // mur vertical, ouvert en bas
    return grid;
  }

  it('bloque les cases dont le centre est dans le rectangle', () => {
    const grid = gridWithWall();
    expect(grid.isBlockedAt(205, 100)).toBe(true);
    expect(grid.isBlockedAt(195, 100)).toBe(false);
    expect(grid.isBlockedAt(205, 305)).toBe(false);
  });

  it('considère comme bloqué tout ce qui sort de la commune', () => {
    const grid = new WalkGrid(400, 400);
    expect(grid.isBlockedAt(-1, 50)).toBe(true);
    expect(grid.isBlockedAt(50, 401)).toBe(true);
    const p = grid.moveCircle(20, 20, R, -100, 0);
    expect(p.x).toBeCloseTo(R, 1);
  });

  it("arrête le joueur contre un mur sans le traverser", () => {
    const grid = gridWithWall();
    const p = grid.moveCircle(100, 100, R, 500, 0);
    expect(p.x).toBeCloseTo(200 - R, 1);
    expect(p.y).toBeCloseTo(100, 1);
    expect(grid.circleFree(p.x, p.y, R)).toBe(true);
  });

  it('fait glisser le joueur le long du mur', () => {
    const grid = gridWithWall();
    let p = { x: 180, y: 100 };
    for (let i = 0; i < 60; i++) p = grid.moveCircle(p.x, p.y, R, 3, 3);
    expect(p.x).toBeLessThanOrEqual(200 - R + 0.01);
    expect(p.y).toBeGreaterThan(250);
    expect(grid.circleFree(p.x, p.y, R)).toBe(true);
  });

  it("contourne l'angle d'un obstacle", () => {
    const grid = gridWithWall();
    let p = { x: 180, y: 280 };
    for (let i = 0; i < 120; i++) p = grid.moveCircle(p.x, p.y, R, 3, 2);
    expect(p.x).toBeGreaterThan(260);
  });

  it('ne bouge pas si le déplacement est nul', () => {
    const grid = gridWithWall();
    expect(grid.moveCircle(50, 50, R, 0, 0)).toEqual({ x: 50, y: 50 });
  });
});
