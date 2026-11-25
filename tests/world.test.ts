import { describe, expect, it } from 'vitest';
import { distToPolyline, distToRect, inflate, pointInPolygon, rectContains, rectsIntersect, type Vec } from '../src/core/geometry';
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

  it('donne à la Grande-Rue quelques commerces, chacun avec son enseigne, entre des maisons', () => {
    const shops = commune.buildings.filter((building) => building.kind === 'commerce');
    expect(shops.length).toBeGreaterThanOrEqual(5);
    expect(shops.length).toBeLessThanOrEqual(8);
    // Chaque commerce a une enseigne, toutes différentes, et il n'y a d'enseigne que sur un commerce.
    const signs = shops.map((shop) => shop.sign);
    for (const sign of signs) expect(sign, 'enseigne').toBeTruthy();
    expect(new Set(signs).size).toBe(signs.length);
    expect(signs.slice(0, 4)).toEqual(['Boulangerie', 'Épicerie', 'Tabac-presse', 'Poste']);
    expect(commune.buildings.filter((building) => building.sign && building.kind !== 'commerce')).toEqual([]);
    // Une boutique donne sur la rue, et n'a pas de boutique pour voisine immédiate.
    for (const shop of shops) {
      expect(['N', 'S'], shop.sign).toContain(shop.door);
      const next = shops.filter((other) => other !== shop && other.rect.y === shop.rect.y && Math.abs(other.rect.x - (shop.rect.x + shop.rect.w)) < 1);
      expect(next, shop.sign).toEqual([]);
    }
  });

  it('pose chaque passage piéton en travers d’une voie, sur toute sa largeur', () => {
    const crossings = commune.decors.filter((decor) => decor.kind === 'passage');
    expect(crossings.length).toBeGreaterThanOrEqual(6);
    for (const crossing of crossings) {
      const where = `passage en ${crossing.x}, ${crossing.y}`;
      // Il est sur l'axe d'une voie, dont il a la largeur…
      const road = commune.roads.find((r) => distToPolyline(crossing, r.path) < 1 && r.width === crossing.span);
      expect(road, where).toBeDefined();
      // … il la coupe à angle droit…
      const vertical = Math.abs(Math.sin(crossing.angle)) > 0.5;
      const along = { x: crossing.x + (vertical ? 0 : 30), y: crossing.y + (vertical ? 30 : 0) };
      expect(distToPolyline(along, road!.path), where).toBeLessThan(1);
      // … et il débouche des deux côtés sur un trottoir, pas dans un mur. (Dans le bourg, les façades sont au ras de la chaussée.)
      const kerb = crossing.span! / 2 + 3;
      for (const side of [-1, 1]) {
        const end = { x: crossing.x + (vertical ? side * kerb : 0), y: crossing.y + (vertical ? 0 : side * kerb) };
        expect(commune.buildings.some((building) => rectContains(building.rect, end)), `${where}, côté ${side}`).toBe(false);
      }
    }
    // Devant l'école, le passage mène du portail à la passerelle.
    const school = findPlace(commune, 'ecole')!.pos;
    const footbridge = commune.bridges.find((bridge) => bridge.kind === 'passerelle')!.rect;
    const atSchool = crossings.find((crossing) => Math.abs(crossing.y - school.y) < 30 && Math.abs(crossing.x - school.x) < 60)!;
    expect(atSchool).toBeDefined();
    expect(atSchool.x).toBeGreaterThanOrEqual(footbridge.x);
    expect(atSchool.x).toBeLessThanOrEqual(footbridge.x + footbridge.w);
  });

  it('range un petit parking au coin du square : deux rangées de places, une allée, pas d’arbre', () => {
    const park = commune.grounds.find((ground) => ground.kind === 'parc' && ground.bounds.w >= 400)!.bounds;
    const lot = commune.grounds.find((ground) => ground.kind === 'parking' && ground.bounds.w > 100 && rectsIntersect(ground.bounds, park))!.bounds;
    expect(lot.x >= park.x && lot.y >= park.y && lot.x + lot.w <= park.x + park.w && lot.y + lot.h <= park.y + park.h).toBe(true);
    const rows = commune.parkings.filter((row) => rectsIntersect(row.rect, lot));
    expect(rows.map((row) => row.open).sort()).toEqual(['N', 'S']);
    const [north, south] = [...rows].sort((a, b) => a.rect.y - b.rect.y);
    // Les deux rangées se font face, de part et d'autre d'une allée assez large pour manœuvrer.
    expect(north.open).toBe('S');
    expect(south.open).toBe('N');
    expect(south.rect.y - (north.rect.y + north.rect.h)).toBeGreaterThanOrEqual(22);
    for (const row of rows) expect(row.rect.x >= lot.x && row.rect.x + row.rect.w <= lot.x + lot.w && row.rect.y >= lot.y && row.rect.y + row.rect.h <= lot.y + lot.h).toBe(true);
    // L'allée débouche sur l'avenue.
    const avenue = commune.roads.find((road) => road.name === 'avenue de la République')!;
    const drive = commune.grounds.find((ground) => ground.kind === 'parking' && ground.bounds.x + ground.bounds.w >= lot.x && ground.bounds.x < lot.x)!.bounds;
    expect(drive.x).toBeLessThanOrEqual(avenue.path[0].x + avenue.width / 2);
    expect(drive.y).toBeGreaterThanOrEqual(north.rect.y + north.rect.h);
    expect(drive.y + drive.h).toBeLessThanOrEqual(south.rect.y);
    for (const tree of commune.trees) expect(rectsIntersect(lot, { x: tree.x - tree.r, y: tree.y - tree.r, w: tree.r * 2, h: tree.r * 2 }), `arbre en ${tree.x}, ${tree.y}`).toBe(false);
    for (const building of commune.buildings) expect(rectsIntersect(lot, building.rect)).toBe(false);
    expect(commune.trees.filter((tree) => tree.x > park.x && tree.x < park.x + park.w && tree.y > park.y && tree.y < park.y + park.h).length).toBeGreaterThan(8);
  });

  it('trace des rangées de places où les voitures tiennent, sans rien de bâti ni d’arbre dessus', () => {
    expect(commune.parkings.length).toBeGreaterThanOrEqual(5);
    for (const row of commune.parkings) {
      const where = `rangée en ${row.rect.x}, ${row.rect.y}`;
      // Une place fait 22 de large ; penchée, elle prend plus de longueur de rangée.
      const bays = Math.floor((row.rect.w - Math.abs(Math.tan(row.slant) * row.rect.h)) / (22 / Math.cos(row.slant)));
      expect(bays, where).toBeGreaterThanOrEqual(3);
      // Une voiture fait 36 de long : la place la contient, dans son axe.
      expect(row.rect.h / Math.cos(row.slant), where).toBeGreaterThanOrEqual(36);
      expect(row.cars.length, where).toBeGreaterThan(0);
      expect(row.cars.length, where).toBeLessThan(bays);
      expect(new Set(row.cars.map((car) => car.bay)).size, where).toBe(row.cars.length);
      for (const car of row.cars) expect(car.bay, where).toBeLessThan(bays);
      for (const building of commune.buildings) expect(rectsIntersect(row.rect, building.rect), where).toBe(false);
      for (const tree of commune.trees) expect(rectsIntersect(row.rect, { x: tree.x - tree.r, y: tree.y - tree.r, w: tree.r * 2, h: tree.r * 2 }), where).toBe(false);
      // Ni dans la rivière.
      for (const corner of [row.rect, { x: row.rect.x + row.rect.w, y: row.rect.y + row.rect.h }]) expect(distToPolyline(corner, commune.river.path), where).toBeGreaterThan(commune.river.width / 2 + 10);
    }
  });

  it('gare en épi en face de l’école, de l’autre côté du quai, près du passage piéton', () => {
    const school = findPlace(commune, 'ecole')!.pos;
    const quay = commune.roads.find((road) => road.name === 'quai de la Follette')!;
    const row = commune.parkings.find((r) => r.slant !== 0)!;
    expect(row).toBeDefined();
    // Du côté de la rivière, au bord de la chaussée, et l'on y entre par le quai.
    expect(row.open).toBe('N');
    expect(row.rect.y).toBeGreaterThanOrEqual(quay.path[0].y + quay.width / 2);
    expect(row.rect.y - (quay.path[0].y + quay.width / 2)).toBeLessThan(6);
    // En face de l'école, à côté du passage piéton sans le recouvrir.
    expect(row.rect.x).toBeLessThan(school.x + 40);
    expect(row.rect.x + row.rect.w).toBeGreaterThan(school.x);
    const crossing = commune.decors.find((decor) => decor.kind === 'passage' && Math.abs(decor.y - quay.path[0].y) < 1)!;
    expect(row.rect.x - crossing.x).toBeGreaterThan(9);
    expect(row.rect.x - crossing.x).toBeLessThan(40);
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
    // La cour est devant le bâtiment, côté quai : la clôture passe au large de la façade.
    expect(fence.rect.y + fence.rect.h - (school.y + school.h)).toBeGreaterThan(100);
    const yard = { x: school.x + school.w / 2, y: school.y + school.h + 60 };
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
