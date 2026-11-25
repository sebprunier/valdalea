import {
  boundsOf,
  distToPolyline,
  distToRect,
  inflate,
  pointInPolygon,
  rect,
  rectContains,
  rectToPolygon,
  smoothPath,
  type Rect,
  type Vec,
} from '../core/geometry';
import { mulberry32, type Rng } from '../core/rng';
import type {
  Building,
  BuildingKind,
  Commune,
  Decor,
  Fence,
  GroundKind,
  MapLabel,
  PlaceKind,
  RoadKind,
  RoofKind,
  Side,
} from './model';

export const ROAD_WIDTH: Record<RoadKind, number> = {
  departementale: 64,
  avenue: 52,
  rue: 40,
  ruelle: 28,
  chemin: 18,
};

interface BuildingOptions {
  id?: string;
  roof?: RoofKind;
  tone?: number;
  door?: Side;
}

interface HouseRowOptions {
  /** Largeur visée d'une parcelle, le long de la rue. */
  lot?: number;
  /** Maisons toutes identiques (cité ouvrière). */
  uniform?: boolean;
}

/**
 * Petit outillage pour décrire la commune de façon déclarative.
 * Les rangées de maisons sont générées avec un aléa déterministe (graine fixe).
 */
export class WorldBuilder {
  readonly commune: Commune;
  private readonly rng: Rng;

  constructor(name: string, width: number, height: number, seed: number) {
    this.rng = mulberry32(seed);
    this.commune = {
      name,
      width,
      height,
      river: { name: '', width: 0, path: [], bounds: rect(0, 0, 0, 0) },
      grounds: [],
      roads: [],
      bridges: [],
      buildings: [],
      tanks: [],
      fences: [],
      trees: [],
      decors: [],
      labels: [],
      sectors: [],
      places: [],
      spawn: { x: width / 2, y: height / 2 },
    };
  }

  // --- Aléa déterministe -------------------------------------------------

  private pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.rng() * items.length)];
  }

  private between(min: number, max: number): number {
    return min + this.rng() * (max - min);
  }

  private snap(value: number): number {
    return Math.round(value / 10) * 10;
  }

  // --- Éléments unitaires ------------------------------------------------

  ground(kind: GroundKind, poly: Vec[], variant = 0): this {
    this.commune.grounds.push({ kind, poly, variant, bounds: boundsOf(poly) });
    return this;
  }

  groundRect(kind: GroundKind, area: Rect, variant = 0): this {
    return this.ground(kind, rectToPolygon(area), variant);
  }

  road(kind: RoadKind, path: Vec[], name?: string): this {
    const width = ROAD_WIDTH[kind];
    this.commune.roads.push({ kind, name, width, path, bounds: boundsOf(path, width / 2 + 4) });
    return this;
  }

  river(name: string, width: number, controlPoints: Vec[]): this {
    const path = smoothPath(controlPoints, 12);
    this.commune.river = { name, width, path, bounds: boundsOf(path, width / 2 + 20) };
    return this;
  }

  bridge(kind: 'pont' | 'passerelle', area: Rect): this {
    this.commune.bridges.push({ kind, rect: area });
    return this;
  }

  building(kind: BuildingKind, area: Rect, options: BuildingOptions = {}): Building {
    const building: Building = {
      kind,
      rect: area,
      roof: options.roof ?? 'tuile',
      tone: options.tone ?? Math.floor(this.rng() * 4),
      door: options.door,
      id: options.id,
    };
    this.commune.buildings.push(building);
    return building;
  }

  tank(x: number, y: number, r: number): this {
    this.commune.tanks.push({ x, y, r });
    return this;
  }

  fence(area: Rect, gate?: Fence['gate']): this {
    this.commune.fences.push({ rect: area, gate });
    return this;
  }

  tree(x: number, y: number, r = 16): this {
    this.commune.trees.push({ x, y, r, tone: Math.floor(this.rng() * 4) });
    return this;
  }

  decor(kind: Decor['kind'], x: number, y: number): this {
    this.commune.decors.push({ kind, x, y, angle: this.between(-0.5, 0.5), tone: Math.floor(this.rng() * 4) });
    return this;
  }

  label(kind: MapLabel['kind'], text: string, x: number, y: number): this {
    this.commune.labels.push({ kind, text, x, y });
    return this;
  }

  sector(id: string, name: string, area: Rect): this {
    this.commune.sectors.push({ id, name, area });
    return this;
  }

  place(id: string, name: string, kind: PlaceKind, sectorId: string, pos: Vec): this {
    this.commune.places.push({ id, name, kind, sectorId, pos });
    return this;
  }

  spawn(pos: Vec): this {
    this.commune.spawn = { ...pos };
    return this;
  }

  // --- Générateurs -------------------------------------------------------

  /**
   * Rangée de pavillons avec jardin. `door` désigne le côté de la rue :
   * 'N' ou 'S' pour une rue est-ouest, 'E' ou 'W' pour une rue nord-sud.
   */
  houseRow(area: Rect, door: Side, options: HouseRowOptions = {}): Building[] {
    const lot = options.lot ?? 160;
    const alongX = door === 'N' || door === 'S';
    const length = alongX ? area.w : area.h;
    const count = Math.max(1, Math.floor(length / lot));
    const step = length / count;
    const houses: Building[] = [];

    for (let i = 0; i < count; i++) {
      const start = (alongX ? area.x : area.y) + i * step;
      const lotRect = alongX ? rect(start, area.y, step, area.h) : rect(area.x, start, area.w, step);
      this.groundRect('jardin', inflate(lotRect, -3), i % 2);

      const front = options.uniform ? 80 : this.pick([80, 90, 100]);
      const depth = options.uniform ? 60 : this.pick([60, 70, 80]);
      const setback = options.uniform ? 20 : this.pick([20, 30]);
      const along = this.snap(start + (step - front) / 2 + (options.uniform ? 0 : this.between(-10, 10)));

      let house: Rect;
      switch (door) {
        case 'S':
          house = rect(along, this.snap(area.y + area.h - setback - depth), front, depth);
          break;
        case 'N':
          house = rect(along, this.snap(area.y + setback), front, depth);
          break;
        case 'E':
          house = rect(this.snap(area.x + area.w - setback - depth), along, depth, front);
          break;
        case 'W':
          house = rect(this.snap(area.x + setback), along, depth, front);
          break;
      }
      houses.push(
        this.building('pavillon', house, {
          door,
          roof: 'tuile',
          tone: options.uniform ? 1 : undefined,
        }),
      );
      this.gardenTree(lotRect, house, door);
    }
    return houses;
  }

  /** Plante parfois un arbre au fond du jardin, à l'opposé de la rue. */
  private gardenTree(lot: Rect, house: Rect, door: Side): void {
    if (this.rng() > 0.65) return;
    const margin = 16;
    let zone: Rect;
    switch (door) {
      case 'S':
        zone = rect(lot.x + margin, lot.y + margin, lot.w - 2 * margin, house.y - lot.y - 2 * margin);
        break;
      case 'N':
        zone = rect(lot.x + margin, house.y + house.h + margin, lot.w - 2 * margin, lot.y + lot.h - house.y - house.h - 2 * margin);
        break;
      case 'E':
        zone = rect(lot.x + margin, lot.y + margin, house.x - lot.x - 2 * margin, lot.h - 2 * margin);
        break;
      case 'W':
        zone = rect(house.x + house.w + margin, lot.y + margin, lot.x + lot.w - house.x - house.w - 2 * margin, lot.h - 2 * margin);
        break;
    }
    if (zone.w < 4 || zone.h < 4) return;
    this.tree(zone.x + this.rng() * zone.w, zone.y + this.rng() * zone.h, this.between(11, 15));
  }

  /** Front bâti continu de maisons de ville (ou de commerces), façade alignée sur la rue. */
  townRow(area: Rect, door: Side, kind: BuildingKind = 'maison-ville'): Building[] {
    const alongX = door === 'N' || door === 'S';
    const end = alongX ? area.x + area.w : area.y + area.h;
    const houses: Building[] = [];
    let at = alongX ? area.x : area.y;

    while (end - at >= 50) {
      let length = this.pick([50, 60, 70, 80, 90]);
      if (end - (at + length) < 50) length = end - at; // la dernière maison prend ce qui reste
      const recess = this.pick([0, 0, 10]); // façade arrière irrégulière
      let house: Rect;
      switch (door) {
        case 'N':
          house = rect(at, area.y, length, area.h - recess);
          break;
        case 'S':
          house = rect(at, area.y + recess, length, area.h - recess);
          break;
        case 'W':
          house = rect(area.x, at, area.w - recess, length);
          break;
        case 'E':
          house = rect(area.x + recess, at, area.w - recess, length);
          break;
      }
      houses.push(this.building(kind, house, { door, roof: this.rng() < 0.7 ? 'tuile' : 'ardoise' }));
      at += length;
    }
    return houses;
  }

  /** Vrai si le point est à distance des bâtiments, des routes, des cuves et de la rivière. */
  isClear(p: Vec, margin: number): boolean {
    const c = this.commune;
    if (p.x < margin || p.y < margin || p.x > c.width - margin || p.y > c.height - margin) return false;
    for (const b of c.buildings) if (distToRect(p, b.rect) < margin) return false;
    for (const r of c.roads) if (distToPolyline(p, r.path) < r.width / 2 + margin) return false;
    for (const t of c.tanks) if (Math.hypot(p.x - t.x, p.y - t.y) < t.r + margin) return false;
    for (const bridge of c.bridges) if (rectContains(inflate(bridge.rect, margin + 20), p)) return false;
    if (c.river.path.length > 0 && distToPolyline(p, c.river.path) < c.river.width / 2 + margin) return false;
    return true;
  }

  /** Sème des arbres dans un polygone, sur une trame irrégulière. À appeler après les routes et les bâtiments. */
  scatterTrees(poly: Vec[], spacing: number, minRadius = 14, maxRadius = 22): this {
    const bounds = boundsOf(poly);
    let row = 0;
    for (let y = bounds.y + spacing / 2; y < bounds.y + bounds.h; y += spacing * 0.87, row++) {
      for (let x = bounds.x + (row % 2 ? spacing : spacing / 2); x < bounds.x + bounds.w; x += spacing) {
        const p = {
          x: x + this.between(-0.35, 0.35) * spacing,
          y: y + this.between(-0.35, 0.35) * spacing,
        };
        const r = this.between(minRadius, maxRadius);
        if (pointInPolygon(p, poly) && this.isClear(p, r * 0.6 + 6)) this.tree(p.x, p.y, r);
      }
    }
    return this;
  }

  /** Arbres de berge (ripisylve) de part et d'autre de la rivière. */
  riverTrees(spacing: number): this {
    const { path, width } = this.commune.river;
    let untilNext = spacing / 2;
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      const b = path[i + 1];
      const length = Math.hypot(b.x - a.x, b.y - a.y);
      if (length === 0) continue;
      const nx = -(b.y - a.y) / length;
      const ny = (b.x - a.x) / length;
      let travelled = untilNext;
      while (travelled < length) {
        const t = travelled / length;
        for (const side of [-1, 1]) {
          if (this.rng() > 0.7) continue;
          const offset = (width / 2 + this.between(20, 36)) * side;
          const p = { x: a.x + (b.x - a.x) * t + nx * offset, y: a.y + (b.y - a.y) * t + ny * offset };
          if (this.isClear(p, 14)) this.tree(p.x, p.y, this.between(13, 19));
        }
        travelled += spacing * this.between(0.75, 1.25);
      }
      untilNext = travelled - length;
    }
    return this;
  }
}

/** Point situé devant l'entrée d'un bâtiment, à `gap` unités de la façade. */
export function doorPoint(building: Building, gap = 24): Vec {
  const { x, y, w, h } = building.rect;
  switch (building.door) {
    case 'N':
      return { x: x + w / 2, y: y - gap };
    case 'E':
      return { x: x + w + gap, y: y + h / 2 };
    case 'W':
      return { x: x - gap, y: y + h / 2 };
    default:
      return { x: x + w / 2, y: y + h + gap };
  }
}
