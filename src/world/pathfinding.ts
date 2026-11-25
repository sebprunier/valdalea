import type { Vec } from '../core/geometry';
import type { WalkGrid } from './grid';

const SQRT2 = Math.SQRT2;

/** Les huit cases voisines : [dx, dy]. */
const NEIGHBOURS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/**
 * Recherche d'itinéraire à pied (algorithme A*) sur la grille de franchissabilité.
 * Sert au déplacement à la souris ou au doigt : le joueur contourne les obstacles
 * et emprunte de préférence les rues.
 */
export class Pathfinder {
  private readonly cols: number;
  private readonly rows: number;
  private readonly cell: number;
  /** 1 si un cercle du rayon du marcheur tient au centre de la case. */
  private readonly passable: Uint8Array;
  /** Coût de traversée de chaque case : 1 sur une voie, davantage ailleurs. */
  private readonly cost: Float32Array;
  private readonly g: Float32Array;
  private readonly parent: Int32Array;
  private readonly closed: Uint8Array;
  private readonly heapNodes: number[] = [];
  private readonly heapKeys: number[] = [];

  /**
   * @param radius rayon du marcheur
   * @param preferred indique les cases à privilégier (les rues) ; les autres coûtent `offRoadCost`
   */
  constructor(
    private readonly grid: WalkGrid,
    private readonly radius: number,
    preferred?: (center: Vec) => boolean,
    offRoadCost = 1.7,
  ) {
    this.cols = grid.cols;
    this.rows = grid.rows;
    this.cell = grid.cell;
    const count = this.cols * this.rows;
    this.passable = new Uint8Array(count);
    this.cost = new Float32Array(count);
    this.g = new Float32Array(count);
    this.parent = new Int32Array(count);
    this.closed = new Uint8Array(count);
    const center = { x: 0, y: 0 };
    for (let cy = 0; cy < this.rows; cy++) {
      for (let cx = 0; cx < this.cols; cx++) {
        const index = cy * this.cols + cx;
        center.x = (cx + 0.5) * this.cell;
        center.y = (cy + 0.5) * this.cell;
        this.passable[index] = grid.circleFree(center.x, center.y, radius) ? 1 : 0;
        this.cost[index] = !preferred || preferred(center) ? 1 : offRoadCost;
      }
    }
  }

  /**
   * Itinéraire de `from` vers `to`, sous forme de points de passage successifs
   * (le point de départ n'est pas inclus). Si la destination est inaccessible,
   * l'itinéraire mène au point accessible le plus proche. Tableau vide s'il n'y a nulle part où aller.
   */
  findPath(from: Vec, to: Vec): Vec[] {
    const start = this.nearestPassable(from, 4);
    const goal = this.nearestPassable(to, 40);
    if (start < 0 || goal < 0) return [];

    const end = this.search(start, goal);
    const cells: number[] = [];
    for (let node = end; node !== -1; node = this.parent[node]) cells.push(node);
    cells.reverse();

    const points = cells.map((index) => this.centerOf(index));
    // Coût cumulé jusqu'à chaque point : le lissage ne doit pas renchérir le trajet.
    const costs = cells.map((index) => this.g[index]);
    // On termine exactement là où le joueur a cliqué, si c'est possible.
    const last = points[points.length - 1];
    if (end === goal && this.grid.circleFree(to.x, to.y, this.radius) && this.clear(last, to)) {
      points.push({ ...to });
      costs.push(costs[costs.length - 1] + this.lineCost(last, to));
    }

    return this.smooth(from, points, costs);
  }

  // ------------------------------------------------------------------ A*

  /** Renvoie la case atteinte : `goal`, ou à défaut la case explorée la plus proche du but. */
  private search(start: number, goal: number): number {
    const { cols, rows, g, parent, closed, passable, cost } = this;
    g.fill(Infinity);
    parent.fill(-1);
    closed.fill(0);
    this.heapNodes.length = 0;
    this.heapKeys.length = 0;

    const goalX = goal % cols;
    const goalY = Math.floor(goal / cols);
    const heuristic = (index: number): number => {
      const dx = Math.abs((index % cols) - goalX);
      const dy = Math.abs(Math.floor(index / cols) - goalY);
      return Math.max(dx, dy) + (SQRT2 - 1) * Math.min(dx, dy);
    };

    g[start] = 0;
    this.push(start, heuristic(start));
    let best = start;
    let bestDistance = heuristic(start);

    while (this.heapNodes.length > 0) {
      const current = this.pop();
      if (closed[current]) continue;
      closed[current] = 1;
      if (current === goal) return goal;

      const h = heuristic(current);
      if (h < bestDistance) {
        bestDistance = h;
        best = current;
      }

      const cx = current % cols;
      const cy = Math.floor(current / cols);
      for (const [dx, dy] of NEIGHBOURS) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const next = ny * cols + nx;
        if (!passable[next] || closed[next]) continue;
        const diagonal = dx !== 0 && dy !== 0;
        // En diagonale, on ne coupe pas les angles des obstacles.
        if (diagonal && (!passable[cy * cols + nx] || !passable[ny * cols + cx])) continue;
        const tentative = g[current] + (diagonal ? SQRT2 : 1) * ((cost[current] + cost[next]) / 2);
        if (tentative < g[next]) {
          g[next] = tentative;
          parent[next] = current;
          this.push(next, tentative + heuristic(next));
        }
      }
    }
    return best;
  }

  private push(node: number, key: number): void {
    const nodes = this.heapNodes;
    const keys = this.heapKeys;
    let i = nodes.length;
    nodes.push(node);
    keys.push(key);
    while (i > 0) {
      const up = (i - 1) >> 1;
      if (keys[up] <= key) break;
      nodes[i] = nodes[up];
      keys[i] = keys[up];
      i = up;
    }
    nodes[i] = node;
    keys[i] = key;
  }

  private pop(): number {
    const nodes = this.heapNodes;
    const keys = this.heapKeys;
    const top = nodes[0];
    const lastNode = nodes.pop()!;
    const lastKey = keys.pop()!;
    const size = nodes.length;
    if (size > 0) {
      let i = 0;
      for (;;) {
        let child = 2 * i + 1;
        if (child >= size) break;
        if (child + 1 < size && keys[child + 1] < keys[child]) child++;
        if (keys[child] >= lastKey) break;
        nodes[i] = nodes[child];
        keys[i] = keys[child];
        i = child;
      }
      nodes[i] = lastNode;
      keys[i] = lastKey;
    }
    return top;
  }

  // ------------------------------------------------------------ Géométrie

  private centerOf(index: number): Vec {
    return { x: ((index % this.cols) + 0.5) * this.cell, y: (Math.floor(index / this.cols) + 0.5) * this.cell };
  }

  /** Case praticable la plus proche du point, dans un rayon de `maxRing` cases ; -1 s'il n'y en a pas. */
  private nearestPassable(p: Vec, maxRing: number): number {
    const cx = Math.floor(p.x / this.cell);
    const cy = Math.floor(p.y / this.cell);
    let best = -1;
    let bestDistance = Infinity;
    for (let ring = 0; ring <= maxRing; ring++) {
      for (let y = cy - ring; y <= cy + ring; y++) {
        for (let x = cx - ring; x <= cx + ring; x++) {
          if (Math.max(Math.abs(x - cx), Math.abs(y - cy)) !== ring) continue; // seulement le pourtour
          if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) continue;
          const index = y * this.cols + x;
          if (!this.passable[index]) continue;
          const d = Math.hypot((x + 0.5) * this.cell - p.x, (y + 0.5) * this.cell - p.y);
          if (d < bestDistance) {
            bestDistance = d;
            best = index;
          }
        }
      }
      // Toute case du pourtour suivant est au moins à (ring + 0,5) cases : inutile de chercher plus loin.
      if (best >= 0 && bestDistance <= (ring + 0.5) * this.cell) return best;
    }
    return best;
  }

  /** Vrai si le marcheur peut aller de `a` à `b` en ligne droite. */
  private clear(a: Vec, b: Vec): boolean {
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.ceil(length / 4));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      if (!this.grid.circleFree(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, this.radius)) return false;
    }
    return true;
  }

  /** Coût d'un trajet en ligne droite, dans la même unité que l'A* (cases × coût du terrain). */
  private lineCost(a: Vec, b: Vec): number {
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.ceil(length / 4));
    let total = 0;
    for (let i = 0; i < steps; i++) {
      const t = (i + 0.5) / steps;
      const cx = Math.floor((a.x + (b.x - a.x) * t) / this.cell);
      const cy = Math.floor((a.y + (b.y - a.y) * t) / this.cell);
      const inside = cx >= 0 && cy >= 0 && cx < this.cols && cy < this.rows;
      total += inside ? this.cost[cy * this.cols + cx] : 1;
    }
    return (total / steps) * (length / this.cell);
  }

  /**
   * Un raccourci en ligne droite n'est retenu que s'il est praticable et ne coûte pas plus
   * cher que le trajet qu'il remplace : on ne coupe pas à travers champs quand la rue est préférée.
   */
  private canShortcut(a: Vec, b: Vec, pathCost: number): boolean {
    return this.lineCost(a, b) <= pathCost + 1 && this.clear(a, b);
  }

  /** Supprime les points de passage inutiles : on vise à chaque fois le point utile le plus lointain. */
  private smooth(from: Vec, points: Vec[], costs: number[]): Vec[] {
    const LOOKAHEAD = 48;
    const out: Vec[] = [];
    const outCosts: number[] = [];
    let anchor = from;
    let anchorCost = 0;
    let i = 0;
    while (i < points.length) {
      let j = Math.min(points.length - 1, i + LOOKAHEAD);
      while (j > i && !this.canShortcut(anchor, points[j], costs[j] - anchorCost)) j--;
      out.push(points[j]);
      outCosts.push(costs[j]);
      anchor = points[j];
      anchorCost = costs[j];
      i = j + 1;
    }
    // Seconde passe, sans limite de portée : il ne reste que quelques points à examiner.
    let previous = from;
    let previousCost = 0;
    for (let k = 0; k < out.length - 1; ) {
      if (this.canShortcut(previous, out[k + 1], outCosts[k + 1] - previousCost)) {
        out.splice(k, 1);
        outCosts.splice(k, 1);
      } else {
        previous = out[k];
        previousCost = outCosts[k];
        k++;
      }
    }
    return out;
  }
}
