import type { Rect } from '../core/geometry';

export type TilePainter = (ctx: CanvasRenderingContext2D, view: Rect) => void;

/** Côté d'une tuile, en unités monde. */
export const TILE_SIZE = 256;

/**
 * Cache de tuiles : le plan est dessiné une fois par morceaux dans des canvas
 * hors écran, puis recopié tel quel à chaque image. Les tuiles les moins
 * récemment utilisées sont libérées pour borner la mémoire.
 */
export class TileCache {
  private readonly tiles = new Map<string, HTMLCanvasElement>();
  private tilePx = TILE_SIZE;
  private capacity = 64;

  constructor(
    private readonly paint: TilePainter,
    private readonly cols: number,
    private readonly rows: number,
  ) {}

  /** Taille d'une tuile en pixels écran. Changer d'échelle vide le cache. */
  setTilePixels(tilePx: number): void {
    if (tilePx === this.tilePx) return;
    this.tilePx = tilePx;
    this.tiles.clear();
  }

  setCapacity(capacity: number): void {
    this.capacity = Math.max(8, capacity);
    this.evict();
  }

  inRange(tx: number, ty: number): boolean {
    return tx >= 0 && ty >= 0 && tx < this.cols && ty < this.rows;
  }

  /** Tuile déjà dessinée, ou `undefined`. */
  peek(tx: number, ty: number): HTMLCanvasElement | undefined {
    const key = `${tx}:${ty}`;
    const tile = this.tiles.get(key);
    if (tile) {
      // Réinsertion : la tuile redevient la plus récente.
      this.tiles.delete(key);
      this.tiles.set(key, tile);
    }
    return tile;
  }

  bake(tx: number, ty: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = this.tilePx;
    canvas.height = this.tilePx;
    const ctx = canvas.getContext('2d', { alpha: false })!;
    const scale = this.tilePx / TILE_SIZE;
    ctx.setTransform(scale, 0, 0, scale, -tx * this.tilePx, -ty * this.tilePx);
    this.paint(ctx, { x: tx * TILE_SIZE, y: ty * TILE_SIZE, w: TILE_SIZE, h: TILE_SIZE });
    this.tiles.set(`${tx}:${ty}`, canvas);
    this.evict();
    return canvas;
  }

  private evict(): void {
    while (this.tiles.size > this.capacity) {
      const oldest = this.tiles.keys().next().value;
      if (oldest === undefined) break;
      this.tiles.delete(oldest);
    }
  }
}
