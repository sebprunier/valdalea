import { boundsOf, type Rect, type Vec } from '../core/geometry';
import type { Commune, RiskId } from './model';

/**
 * Élargit la commune : une bande de terrain est insérée le long d'une ligne
 * nord-sud, et tout ce qui se trouve à l'est de cette ligne est décalé d'autant.
 *
 * La commune a d'abord été dessinée plus étroite ; son plan (`valdalea.ts`) garde
 * ces coordonnées d'origine, et l'élargissement s'applique à la fin. Ce qui est
 * d'un seul tenant (un bâtiment, un jardin) se trouve d'un côté ou de l'autre et
 * se déplace d'un bloc ; ce qui traverse la ligne (une route, la rivière) s'allonge.
 *
 * @param fromX la ligne de coupe : rien de bâti ne doit la chevaucher
 * @param by largeur de la bande insérée
 * @param eastern risques dont les zones appartiennent tout entières à l'est, même si leur tracé déborde la ligne
 */
export function widenEast(commune: Commune, fromX: number, by: number, eastern: readonly RiskId[] = []): void {
  const x = (value: number): number => (value >= fromX ? value + by : value);
  const point = (p: Vec): Vec => ({ x: x(p.x), y: p.y });
  /** Un rectangle se déplace d'un bloc ; s'il chevauche la ligne (un secteur), il s'élargit pour couvrir la bande. */
  const box = (r: Rect): Rect => (r.x >= fromX ? { ...r, x: r.x + by } : r.x + r.w > fromX ? { ...r, w: r.w + by } : r);
  const moveXY = <T extends { x: number }>(item: T): void => {
    item.x = x(item.x);
  };

  commune.width += by;
  commune.relief = { ...commune.relief, eastRise: { ...commune.relief.eastRise, fromX: x(commune.relief.eastRise.fromX) } };

  for (const ground of commune.grounds) {
    ground.poly = ground.poly.map(point);
    ground.bounds = boundsOf(ground.poly);
  }
  for (const road of commune.roads) {
    const margin = road.bounds.x + road.bounds.w - Math.max(...road.path.map((p) => p.x));
    road.path = road.path.map(point);
    road.bounds = boundsOf(road.path, margin);
  }
  {
    const river = commune.river;
    const margin = river.bounds.x + river.bounds.w - Math.max(...river.path.map((p) => p.x));
    river.path = river.path.map(point);
    river.bounds = boundsOf(river.path, margin);
  }
  for (const bridge of commune.bridges) bridge.rect = box(bridge.rect);
  for (const building of commune.buildings) building.rect = box(building.rect);
  for (const fence of commune.fences) {
    const moved = fence.rect.x >= fromX;
    fence.rect = box(fence.rect);
    // Le portail d'une clôture nord ou sud est repéré par ses abscisses.
    if (moved && fence.gate && (fence.gate.side === 'N' || fence.gate.side === 'S')) fence.gate = { ...fence.gate, from: fence.gate.from + by, to: fence.gate.to + by };
  }
  for (const row of commune.parkings) row.rect = box(row.rect);
  commune.tanks.forEach(moveXY);
  commune.trees.forEach(moveXY);
  commune.decors.forEach(moveXY);
  commune.labels.forEach(moveXY);
  for (const sector of commune.sectors) sector.area = box(sector.area);
  for (const place of commune.places) place.pos = point(place.pos);
  for (const mark of commune.hazardMarks) mark.pos = point(mark.pos);
  for (const zone of commune.hazards) {
    // Une zone de l'est suit son bloc tout entière ; une zone de l'ouest reste où elle est, même si elle effleure la ligne.
    if (!eastern.includes(zone.risk)) continue;
    zone.poly = zone.poly.map((p) => ({ x: p.x + by, y: p.y }));
    zone.bounds = boundsOf(zone.poly);
  }
  commune.spawn = point(commune.spawn);
  if (commune.wildfire) {
    const fire = commune.wildfire;
    commune.wildfire = { ...fire, ignition: point(fire.ignition), spot: { ...fire.spot, at: point(fire.spot.at) }, clearing: fire.clearing.map(point) };
  }
}
