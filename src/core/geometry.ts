/** Outils de géométrie plane. Les coordonnées sont en unités « monde » (une unité vaut un mètre). */

export interface Vec {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const vec = (x: number, y: number): Vec => ({ x, y });
export const rect = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const distance = (a: Vec, b: Vec): number => Math.hypot(a.x - b.x, a.y - b.y);

export function rectsIntersect(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Agrandit (marge positive) ou rétrécit (marge négative) un rectangle sur ses quatre côtés. */
export function inflate(r: Rect, margin: number): Rect {
  return { x: r.x - margin, y: r.y - margin, w: r.w + 2 * margin, h: r.h + 2 * margin };
}

export function rectContains(r: Rect, p: Vec): boolean {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

export function rectToPolygon(r: Rect): Vec[] {
  return [vec(r.x, r.y), vec(r.x + r.w, r.y), vec(r.x + r.w, r.y + r.h), vec(r.x, r.y + r.h)];
}

export function boundsOf(points: readonly Vec[], margin = 0): Rect {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { x: minX - margin, y: minY - margin, w: maxX - minX + 2 * margin, h: maxY - minY + 2 * margin };
}

/** Test « point dans polygone » par lancer de rayon (polygone simple, sens indifférent). */
export function pointInPolygon(p: Vec, polygon: readonly Vec[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

export function distToSegment(p: Vec, a: Vec, b: Vec): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq, 0, 1);
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export function distToPolyline(p: Vec, points: readonly Vec[]): number {
  let best = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    const d = distToSegment(p, points[i], points[i + 1]);
    if (d < best) best = d;
  }
  return best;
}

/** Distance d'un point à un rectangle (0 si le point est à l'intérieur). */
/** Distance d'un point à une surface : nulle à l'intérieur du polygone. */
export function distToPolygon(p: Vec, polygon: readonly Vec[]): number {
  if (pointInPolygon(p, polygon)) return 0;
  return distToPolyline(p, [...polygon, polygon[0]]);
}

export function distToRect(p: Vec, r: Rect): number {
  const dx = Math.max(r.x - p.x, 0, p.x - (r.x + r.w));
  const dy = Math.max(r.y - p.y, 0, p.y - (r.y + r.h));
  return Math.hypot(dx, dy);
}

/**
 * Lisse une ligne brisée avec une spline de Catmull-Rom : la courbe passe par
 * tous les points de contrôle. Sert au tracé de la rivière.
 */
export function smoothPath(points: readonly Vec[], subdivisions = 10): Vec[] {
  if (points.length < 3) return points.map((p) => ({ ...p }));
  const at = (i: number): Vec => points[clamp(i, 0, points.length - 1)];
  const out: Vec[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    for (let s = 0; s < subdivisions; s++) {
      const t = s / subdivisions;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push({
        x: 0.5 * (2 * p1.x + (p2.x - p0.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (3 * p1.x - p0.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (p2.y - p0.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (3 * p1.y - p0.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  out.push({ ...points[points.length - 1] });
  return out;
}
