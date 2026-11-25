import { boundsOf, clamp, distToPolyline, distToSegment, pointInPolygon, type Rect, type Vec } from '../core/geometry';
import type { Commune } from './model';

/**
 * Grille de franchissabilité : la commune est découpée en cases carrées,
 * chacune libre ou bloquée. Le joueur est un cercle qui glisse le long des cases bloquées.
 * Tout ce qui sort de la grille est considéré comme bloqué.
 */
export class WalkGrid {
  readonly cols: number;
  readonly rows: number;
  private readonly blocked: Uint8Array;

  constructor(
    readonly width: number,
    readonly height: number,
    readonly cell = 10,
  ) {
    this.cols = Math.ceil(width / cell);
    this.rows = Math.ceil(height / cell);
    this.blocked = new Uint8Array(this.cols * this.rows);
  }

  /** Bloque (ou libère) les cases dont le centre est dans le rectangle. */
  setRect(r: Rect, blocked: boolean): void {
    this.setWhere(r, () => true, blocked);
  }

  /** Bloque (ou libère) les cases du rectangle englobant dont le centre vérifie le prédicat. */
  setWhere(bounds: Rect, predicate: (center: Vec) => boolean, blocked: boolean): void {
    const c0 = clamp(Math.floor(bounds.x / this.cell), 0, this.cols - 1);
    const c1 = clamp(Math.floor((bounds.x + bounds.w) / this.cell), 0, this.cols - 1);
    const r0 = clamp(Math.floor(bounds.y / this.cell), 0, this.rows - 1);
    const r1 = clamp(Math.floor((bounds.y + bounds.h) / this.cell), 0, this.rows - 1);
    const center = { x: 0, y: 0 };
    for (let cy = r0; cy <= r1; cy++) {
      for (let cx = c0; cx <= c1; cx++) {
        center.x = (cx + 0.5) * this.cell;
        center.y = (cy + 0.5) * this.cell;
        if (
          center.x >= bounds.x &&
          center.x <= bounds.x + bounds.w &&
          center.y >= bounds.y &&
          center.y <= bounds.y + bounds.h &&
          predicate(center)
        ) {
          this.blocked[cy * this.cols + cx] = blocked ? 1 : 0;
        }
      }
    }
  }

  isBlockedCell(cx: number, cy: number): boolean {
    if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) return true;
    return this.blocked[cy * this.cols + cx] === 1;
  }

  isBlockedAt(x: number, y: number): boolean {
    return this.isBlockedCell(Math.floor(x / this.cell), Math.floor(y / this.cell));
  }

  /** Vrai si un cercle de rayon `r` centré en (x, y) ne touche aucune case bloquée. */
  circleFree(x: number, y: number, r: number): boolean {
    return this.deepestOverlap(x, y, r - 0.01) === null;
  }

  /**
   * Déplace un cercle de (dx, dy) en glissant le long des obstacles.
   * Le déplacement est découpé en petits pas pour ne jamais traverser une case.
   */
  moveCircle(x: number, y: number, r: number, dx: number, dy: number): Vec {
    const length = Math.hypot(dx, dy);
    if (length === 0) return { x, y };
    const steps = Math.max(1, Math.ceil(length / (this.cell * 0.4)));
    const sx = dx / steps;
    const sy = dy / steps;
    let px = x;
    let py = y;
    for (let i = 0; i < steps; i++) {
      const next = this.resolve(px + sx, py + sy, r) ?? this.resolve(px + sx, py, r) ?? this.resolve(px, py + sy, r);
      if (!next) break;
      px = next.x;
      py = next.y;
    }
    return { x: px, y: py };
  }

  /** Repousse le cercle hors des cases bloquées ; `null` s'il n'existe pas de position libre toute proche. */
  private resolve(x: number, y: number, r: number): Vec | null {
    let px = x;
    let py = y;
    for (let iteration = 0; iteration < 6; iteration++) {
      // On traite toujours la case la plus enfoncée : c'est ce qui donne un glissement régulier.
      const hit = this.deepestOverlap(px, py, r);
      if (!hit) return { x: px, y: py };
      const cellX = hit.cx * this.cell;
      const cellY = hit.cy * this.cell;
      if (hit.distance > 1e-6) {
        const push = r - hit.distance;
        px += ((px - hit.nearestX) / hit.distance) * push;
        py += ((py - hit.nearestY) / hit.distance) * push;
      } else {
        // Centre dans la case : on sort par le bord le plus proche.
        const left = px - cellX;
        const right = cellX + this.cell - px;
        const top = py - cellY;
        const bottom = cellY + this.cell - py;
        const nearest = Math.min(left, right, top, bottom);
        if (nearest === left) px = cellX - r;
        else if (nearest === right) px = cellX + this.cell + r;
        else if (nearest === top) py = cellY - r;
        else py = cellY + this.cell + r;
      }
    }
    return this.circleFree(px, py, r) ? { x: px, y: py } : null;
  }

  private deepestOverlap(
    x: number,
    y: number,
    r: number,
  ): { cx: number; cy: number; nearestX: number; nearestY: number; distance: number } | null {
    const c0 = Math.floor((x - r) / this.cell);
    const c1 = Math.floor((x + r) / this.cell);
    const r0 = Math.floor((y - r) / this.cell);
    const r1 = Math.floor((y + r) / this.cell);
    let best: { cx: number; cy: number; nearestX: number; nearestY: number; distance: number } | null = null;
    for (let cy = r0; cy <= r1; cy++) {
      for (let cx = c0; cx <= c1; cx++) {
        if (!this.isBlockedCell(cx, cy)) continue;
        const nearestX = clamp(x, cx * this.cell, (cx + 1) * this.cell);
        const nearestY = clamp(y, cy * this.cell, (cy + 1) * this.cell);
        const d = Math.hypot(x - nearestX, y - nearestY);
        if (d < r && (!best || d < best.distance)) {
          best = { cx, cy, nearestX, nearestY, distance: d };
        }
      }
    }
    return best;
  }
}

/** Épaisseur de la clôture, en unités monde. */
const FENCE_THICKNESS = 10;

/** Construit la grille de franchissabilité à partir du plan de la commune. */
export function buildWalkGrid(commune: Commune): WalkGrid {
  const grid = new WalkGrid(commune.width, commune.height);

  for (const building of commune.buildings) grid.setRect(building.rect, true);

  for (const tank of commune.tanks) {
    const bounds = { x: tank.x - tank.r, y: tank.y - tank.r, w: tank.r * 2, h: tank.r * 2 };
    grid.setWhere(bounds, (c) => Math.hypot(c.x - tank.x, c.y - tank.y) <= tank.r, true);
  }

  // Les sites clôturés sont fermés au public : le portail reste clos.
  for (const fence of commune.fences) {
    const { x, y, w, h } = fence.rect;
    const t = FENCE_THICKNESS;
    grid.setRect({ x, y, w, h: t }, true);
    grid.setRect({ x, y: y + h - t, w, h: t }, true);
    grid.setRect({ x, y, w: t, h }, true);
    grid.setRect({ x: x + w - t, y, w: t, h }, true);
  }

  for (const ground of commune.grounds) {
    if (ground.kind === 'falaise') grid.setWhere(ground.bounds, (c) => pointInPolygon(c, ground.poly), true);
  }

  const river = commune.river;
  grid.setWhere(river.bounds, (c) => distToPolyline(c, river.path) <= river.width / 2, true);
  for (const bridge of commune.bridges) grid.setRect(bridge.rect, false);

  return grid;
}

/**
 * Masque des voies : renvoie une fonction indiquant si un point est sur une rue,
 * un chemin ou un pont. Sert à faire passer les itinéraires par la voirie.
 */
export function buildRoadMask(commune: Commune): (p: Vec) => boolean {
  const mask = new WalkGrid(commune.width, commune.height);
  for (const road of commune.roads) {
    const half = Math.max(road.width / 2, mask.cell);
    for (let i = 0; i < road.path.length - 1; i++) {
      const a = road.path[i];
      const b = road.path[i + 1];
      mask.setWhere(boundsOf([a, b], half), (c) => distToSegment(c, a, b) <= half, true);
    }
  }
  for (const bridge of commune.bridges) mask.setRect(bridge.rect, true);
  return (p) => mask.isBlockedAt(p.x, p.y);
}
