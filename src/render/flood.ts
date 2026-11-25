import type { Elevation } from '../world/elevation';

/**
 * Nappe d'eau dessinée sur la carte : la crue en cours, plus sombre là où l'eau
 * est profonde. Le masque est calculé à la résolution du relief, puis étiré avec
 * lissage : ses bords sont doux. (La zone inondable du DICRIM, elle, est une
 * zone de carte, hachurée : voir `riskmap`.)
 */
export class WaterLayer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly image: ImageData;
  private level = Number.NaN;
  private wet = false;

  /**
   * @param color couleur de la nappe, en composantes rouge, vert, bleu
   * @param opacity opacité selon la hauteur d'eau, en mètres
   */
  constructor(
    private readonly elevation: Elevation,
    private readonly color: readonly [number, number, number],
    private readonly opacity: (depth: number) => number,
  ) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = elevation.cols;
    this.canvas.height = elevation.rows;
    this.ctx = this.canvas.getContext('2d')!;
    this.image = this.ctx.createImageData(elevation.cols, elevation.rows);
  }

  /** Recalcule le masque si le niveau a changé de façon visible. */
  setLevel(level: number): void {
    if (Math.abs(level - this.level) < 0.01) return;
    this.level = level;
    const { heights } = this.elevation;
    const pixels = this.image.data;
    const [r, g, b] = this.color;
    this.wet = false;
    for (let i = 0; i < heights.length; i++) {
      const depth = level - heights[i];
      const o = i * 4;
      if (depth > 0) {
        pixels[o] = r;
        pixels[o + 1] = g;
        pixels[o + 2] = b;
        pixels[o + 3] = Math.round(255 * Math.min(1, Math.max(0, this.opacity(depth))));
        this.wet = true;
      } else {
        pixels[o + 3] = 0;
      }
    }
    this.ctx.putImageData(this.image, 0, 0);
  }

  /** Dessine la nappe ; le contexte est en coordonnées monde. */
  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.wet) return;
    const { cols, rows, cell } = this.elevation;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.canvas, 0, 0, cols * cell, rows * cell);
    ctx.restore();
  }
}

/** Crue en cours : une eau chargée, plus opaque avec la profondeur. */
export function floodLayer(elevation: Elevation): WaterLayer {
  return new WaterLayer(elevation, [92, 128, 150], (depth) => edge(depth) * (0.5 + depth * 0.22));
}

/** Fondu sur les premiers centimètres d'eau : c'est lui qui adoucit le bord de la nappe. */
function edge(depth: number): number {
  return Math.min(1, depth / 0.16);
}
