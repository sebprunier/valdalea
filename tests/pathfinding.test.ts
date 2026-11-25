import { describe, expect, it } from 'vitest';
import type { Vec } from '../src/core/geometry';
import { PLAYER_RADIUS } from '../src/game/constants';
import { buildRoadMask, buildWalkGrid, WalkGrid } from '../src/world/grid';
import { findPlace } from '../src/world/model';
import { Pathfinder } from '../src/world/pathfinding';
import { buildValDAlea } from '../src/world/valdalea';

const R = PLAYER_RADIUS + 0.5;

/** Suit un itinéraire comme le fait le jeu, pas à pas, et renvoie la position finale. */
function walk(grid: WalkGrid, from: Vec, route: Vec[]): Vec {
  let p = { ...from };
  for (const waypoint of route) {
    for (let guard = 0; guard < 5000; guard++) {
      const d = Math.hypot(waypoint.x - p.x, waypoint.y - p.y);
      if (d < 2) break;
      const step = Math.min(d, 3);
      p = grid.moveCircle(p.x, p.y, PLAYER_RADIUS, ((waypoint.x - p.x) / d) * step, ((waypoint.y - p.y) / d) * step);
    }
  }
  return p;
}

describe("recherche d'itinéraire", () => {
  it('contourne un mur', () => {
    const grid = new WalkGrid(400, 400);
    grid.setRect({ x: 190, y: 0, w: 20, h: 300 }, true);
    const finder = new Pathfinder(grid, R);
    const from = { x: 100, y: 100 };
    const to = { x: 300, y: 100 };
    const route = finder.findPath(from, to);
    expect(route.length).toBeGreaterThan(1);
    expect(route[route.length - 1]).toEqual(to);
    const end = walk(grid, from, route);
    expect(Math.hypot(end.x - to.x, end.y - to.y)).toBeLessThan(3);
  });

  it('va en ligne droite quand rien ne gêne', () => {
    const finder = new Pathfinder(new WalkGrid(400, 400), R);
    expect(finder.findPath({ x: 50, y: 50 }, { x: 320, y: 210 })).toEqual([{ x: 320, y: 210 }]);
  });

  it("s'approche au plus près d'une destination murée", () => {
    const grid = new WalkGrid(400, 400);
    // Enclos fermé autour de (300, 300)
    grid.setRect({ x: 240, y: 240, w: 120, h: 10 }, true);
    grid.setRect({ x: 240, y: 350, w: 120, h: 10 }, true);
    grid.setRect({ x: 240, y: 240, w: 10, h: 120 }, true);
    grid.setRect({ x: 350, y: 240, w: 10, h: 120 }, true);
    const finder = new Pathfinder(grid, R);
    const route = finder.findPath({ x: 50, y: 50 }, { x: 300, y: 300 });
    const end = route[route.length - 1];
    const insideEnclosure = end.x > 240 && end.x < 360 && end.y > 240 && end.y < 360;
    expect(insideEnclosure).toBe(false);
    expect(Math.hypot(end.x - 300, end.y - 300)).toBeLessThan(120);
  });

  it('vise le point praticable le plus proche quand on clique sur un obstacle', () => {
    const grid = new WalkGrid(400, 400);
    grid.setRect({ x: 200, y: 100, w: 100, h: 100 }, true);
    const finder = new Pathfinder(grid, R);
    const route = finder.findPath({ x: 50, y: 150 }, { x: 250, y: 150 });
    const end = route[route.length - 1];
    expect(grid.circleFree(end.x, end.y, PLAYER_RADIUS)).toBe(true);
    expect(Math.hypot(end.x - 250, end.y - 150)).toBeLessThan(90);
  });

  it('préfère la voie indiquée à la ligne droite', () => {
    const grid = new WalkGrid(600, 400);
    // Une « rue » en U : descend, longe le bas, remonte.
    const onRoad = (p: Vec): boolean => (p.x < 60 && p.y > 40) || (p.x > 540 && p.y > 40) || p.y > 340;
    const direct = new Pathfinder(grid, R).findPath({ x: 30, y: 60 }, { x: 570, y: 60 });
    const byRoad = new Pathfinder(grid, R, onRoad, 5).findPath({ x: 30, y: 60 }, { x: 570, y: 60 });
    expect(direct).toHaveLength(1);
    expect(Math.max(...byRoad.map((p) => p.y))).toBeGreaterThan(340);
  });
});

describe("itinéraires dans Val-d'Aléa", () => {
  const commune = buildValDAlea();
  const grid = buildWalkGrid(commune);
  const finder = new Pathfinder(grid, R, buildRoadMask(commune));

  it('relie le domicile à tous les lieux, en restant sur du terrain praticable', () => {
    for (const place of commune.places) {
      const route = finder.findPath(commune.spawn, place.pos);
      const end = walk(grid, commune.spawn, route);
      expect(Math.hypot(end.x - place.pos.x, end.y - place.pos.y), place.id).toBeLessThan(3);
    }
  });

  it('franchit la rivière par un pont pour aller au camping', () => {
    const camping = findPlace(commune, 'camping')!;
    const route = finder.findPath(commune.spawn, camping.pos);
    const crossing = [commune.spawn, ...route];
    const onBridge = commune.bridges.some((bridge) =>
      crossing.some((p) => p.x >= bridge.rect.x && p.x <= bridge.rect.x + bridge.rect.w && p.y >= bridge.rect.y - 40 && p.y <= bridge.rect.y + bridge.rect.h + 40),
    );
    expect(onBridge).toBe(true);
  });

  it('reste rapide sur un trajet qui traverse toute la commune', () => {
    const from = findPlace(commune, 'sous-la-roche')!.pos;
    const to = findPlace(commune, 'usine')!.pos;
    const started = performance.now();
    const route = finder.findPath(from, to);
    expect(performance.now() - started).toBeLessThan(250);
    expect(route.length).toBeGreaterThan(0);
  });
});
