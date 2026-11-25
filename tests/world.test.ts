import { describe, expect, it } from 'vitest';
import { distToPolyline, distToRect, inflate, pointInPolygon, rectsIntersect, type Vec } from '../src/core/geometry';
import { PLAYER_RADIUS } from '../src/game/constants';
import { buildWalkGrid, type WalkGrid } from '../src/world/grid';
import { findPlace, sectorAt, type Commune } from '../src/world/model';
import { buildValDAlea } from '../src/world/valdalea';

const commune: Commune = buildValDAlea();
const grid: WalkGrid = buildWalkGrid(commune);

/** Cases atteignables à pied depuis un point, pour un cercle du rayon du joueur. */
function reachableFrom(start: Vec): Set<number> {
  const key = (cx: number, cy: number): number => cy * grid.cols + cx;
  const free = (cx: number, cy: number): boolean =>
    grid.circleFree((cx + 0.5) * grid.cell, (cy + 0.5) * grid.cell, PLAYER_RADIUS);
  const sx = Math.floor(start.x / grid.cell);
  const sy = Math.floor(start.y / grid.cell);
  const seen = new Set<number>([key(sx, sy)]);
  const queue: Array<[number, number]> = [[sx, sy]];
  while (queue.length > 0) {
    const [cx, cy] = queue.pop()!;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= grid.cols || ny >= grid.rows) continue;
      const k = key(nx, ny);
      if (seen.has(k) || !free(nx, ny)) continue;
      seen.add(k);
      queue.push([nx, ny]);
    }
  }
  return seen;
}

describe("plan de Val-d'Aléa", () => {
  it('est déterministe', () => {
    expect(buildValDAlea()).toEqual(commune);
  });

  it('place tous les bâtiments dans les limites de la commune', () => {
    for (const b of commune.buildings) {
      expect(b.rect.x).toBeGreaterThanOrEqual(0);
      expect(b.rect.y).toBeGreaterThanOrEqual(0);
      expect(b.rect.x + b.rect.w).toBeLessThanOrEqual(commune.width);
      expect(b.rect.y + b.rect.h).toBeLessThanOrEqual(commune.height);
    }
  });

  it('ne superpose aucun bâtiment à un autre', () => {
    const overlaps: string[] = [];
    commune.buildings.forEach((a, i) => {
      for (const b of commune.buildings.slice(i + 1)) {
        if (rectsIntersect(a.rect, b.rect)) overlaps.push(`${JSON.stringify(a.rect)} / ${JSON.stringify(b.rect)}`);
      }
    });
    expect(overlaps).toEqual([]);
  });

  it('ne construit rien sur une route', () => {
    const conflicts: string[] = [];
    for (const b of commune.buildings) {
      for (const road of commune.roads) {
        // Distance du bâtiment à l'axe de la route : on échantillonne l'axe.
        for (let i = 0; i < road.path.length - 1; i++) {
          const a = road.path[i];
          const c = road.path[i + 1];
          const steps = Math.ceil(Math.hypot(c.x - a.x, c.y - a.y) / 5);
          for (let s = 0; s <= steps; s++) {
            const p = { x: a.x + ((c.x - a.x) * s) / steps, y: a.y + ((c.y - a.y) * s) / steps };
            if (distToRect(p, b.rect) < road.width / 2) {
              conflicts.push(`${b.kind} ${JSON.stringify(b.rect)} sur ${road.name ?? road.kind}`);
              s = steps + 1;
              i = road.path.length;
            }
          }
        }
      }
    }
    expect([...new Set(conflicts)]).toEqual([]);
  });

  it("ne construit rien dans la rivière ni dans la falaise", () => {
    const falaise = commune.grounds.find((g) => g.kind === 'falaise')!;
    for (const b of commune.buildings) {
      const corners = [
        { x: b.rect.x, y: b.rect.y },
        { x: b.rect.x + b.rect.w, y: b.rect.y },
        { x: b.rect.x, y: b.rect.y + b.rect.h },
        { x: b.rect.x + b.rect.w, y: b.rect.y + b.rect.h },
      ];
      for (const corner of corners) {
        expect(distToPolyline(corner, commune.river.path)).toBeGreaterThan(commune.river.width / 2 + 10);
        expect(pointInPolygon(corner, falaise.poly)).toBe(false);
      }
    }
  });

  it('ne plante aucun arbre sur un bâtiment ou une route', () => {
    for (const tree of commune.trees) {
      for (const b of commune.buildings) {
        expect(distToRect(tree, inflate(b.rect, -2))).toBeGreaterThan(0);
      }
      for (const road of commune.roads) {
        expect(distToPolyline(tree, road.path)).toBeGreaterThan(road.width / 2);
      }
    }
  });

  it('donne des identifiants uniques aux lieux et les rattache à un secteur existant', () => {
    const ids = commune.places.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    const sectorIds = new Set(commune.sectors.map((s) => s.id));
    for (const place of commune.places) {
      expect(sectorIds.has(place.sectorId), place.id).toBe(true);
      expect(sectorAt(commune, place.pos)?.id, place.id).toBe(place.sectorId);
    }
  });

  it('rend le point de départ et tous les lieux accessibles à pied', () => {
    expect(grid.circleFree(commune.spawn.x, commune.spawn.y, PLAYER_RADIUS)).toBe(true);
    const reachable = reachableFrom(commune.spawn);
    for (const place of commune.places) {
      expect(grid.circleFree(place.pos.x, place.pos.y, PLAYER_RADIUS), `${place.id} : point d'accès libre`).toBe(true);
      const cell = Math.floor(place.pos.y / grid.cell) * grid.cols + Math.floor(place.pos.x / grid.cell);
      expect(reachable.has(cell), `${place.id} : accessible depuis le départ`).toBe(true);
    }
  });

  it('interdit de marcher dans la rivière, sauf sur les ponts', () => {
    const middle = commune.river.path[Math.floor(commune.river.path.length / 3)];
    expect(grid.isBlockedAt(middle.x, middle.y)).toBe(true);
    for (const bridge of commune.bridges) {
      const cx = bridge.rect.x + bridge.rect.w / 2;
      for (let y = bridge.rect.y + 5; y < bridge.rect.y + bridge.rect.h; y += 10) {
        expect(grid.circleFree(cx, y, PLAYER_RADIUS), `${bridge.kind} y=${y}`).toBe(true);
      }
      // Le tablier doit dépasser la rivière des deux côtés.
      expect(distToPolyline({ x: cx, y: bridge.rect.y }, commune.river.path)).toBeGreaterThan(commune.river.width / 2);
      expect(distToPolyline({ x: cx, y: bridge.rect.y + bridge.rect.h }, commune.river.path)).toBeGreaterThan(commune.river.width / 2);
    }
  });

  it("ferme l'école derrière sa clôture : on s'arrête au portail", () => {
    const school = commune.buildings.find((building) => building.kind === 'ecole')!.rect;
    const fence = commune.fences.find((f) => f.rect.x <= school.x && f.rect.x + f.rect.w >= school.x + school.w && f.rect.y <= school.y && f.rect.y + f.rect.h >= school.y + school.h)!;
    expect(fence).toBeDefined();
    // Le lieu est dehors, devant le portail, et l'on peut s'y tenir.
    const door = findPlace(commune, 'ecole')!.pos;
    expect(door.y).toBeGreaterThan(fence.rect.y + fence.rect.h);
    expect(fence.gate?.side).toBe('S');
    expect(door.x).toBeGreaterThan(fence.gate!.from);
    expect(door.x).toBeLessThan(fence.gate!.to);
    expect(grid.circleFree(door.x, door.y, PLAYER_RADIUS)).toBe(true);
    // La cour, elle, n'est plus accessible.
    const reachable = reachableFrom(commune.spawn);
    const yard = { x: school.x + school.w / 2, y: school.y - 60 };
    expect(grid.circleFree(yard.x, yard.y, PLAYER_RADIUS)).toBe(true);
    expect(reachable.has(Math.floor(yard.y / grid.cell) * grid.cols + Math.floor(yard.x / grid.cell))).toBe(false);
    expect(reachable.has(Math.floor(door.y / grid.cell) * grid.cols + Math.floor(door.x / grid.cell))).toBe(true);
  });

  it("ferme le site industriel au public", () => {
    const reachable = reachableFrom(commune.spawn);
    const inside = { x: 3700, y: 2005 };
    const cell = Math.floor(inside.y / grid.cell) * grid.cols + Math.floor(inside.x / grid.cell);
    expect(reachable.has(cell)).toBe(false);
  });
});

describe('zonage des argiles', () => {
  const commune = buildValDAlea();
  const zone = (level: 'fort' | 'moyen') => commune.hazards.find((hazard) => hazard.risk === 'argiles' && hazard.level === level)!.poly;
  const houses = commune.buildings.filter((b) => b.rect.x >= 1240 && b.rect.x + b.rect.w <= 2060 && b.rect.y >= 140 && b.rect.y + b.rect.h <= 830);
  const centre = (b: (typeof houses)[number]) => ({ x: b.rect.x + b.rect.w / 2, y: b.rect.y + b.rect.h / 2 });

  it('a des limites souples, qui ne suivent pas les rues', () => {
    for (const level of ['fort', 'moyen'] as const) {
      const poly = zone(level);
      expect(poly.length, level).toBeGreaterThan(40);
      // Aucun long bord droit, horizontal ou vertical.
      const straight = poly.filter((p, i) => {
        const q = poly[(i + 1) % poly.length];
        return (p.x === q.x || p.y === q.y) && Math.hypot(p.x - q.x, p.y - q.y) > 40;
      });
      expect(straight, level).toEqual([]);
    }
  });

  it('ne met en exposition forte qu’une partie des maisons des Argilières, toutes restant en zone argileuse', () => {
    expect(houses.length).toBeGreaterThanOrEqual(12);
    const strong = houses.filter((b) => pointInPolygon(centre(b), zone('fort')));
    expect(strong.length).toBeGreaterThan(houses.length * 0.3);
    expect(strong.length).toBeLessThan(houses.length * 0.8);
    for (const b of houses) expect(pointInPolygon(centre(b), zone('moyen')) || pointInPolygon(centre(b), zone('fort'))).toBe(true);
  });
});
