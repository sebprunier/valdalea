import type { Plume } from '../world/model';
import { plumeBounds, plumeDensity } from '../world/plume';

/**
 * Le nuage toxique dessiné sur la carte : un voile jaune-vert, dense près de la
 * fuite, qui s'étire dans le vent puis se dissipe. Comme la crue et le feu, c'est
 * un masque calculé sur une grille puis étiré avec lissage : ses bords sont doux.
 *
 * Rien d'essentiel ne passe par la seule couleur : le récit et la barre d'état
 * disent où en est le nuage.
 */

const HAZE = [232, 220, 92] as const;
const DENSE = [186, 172, 36] as const;
/** Opacité au plus dense : le plan reste lisible dessous. */
const OPACITY = 0.8;
/** Côté d'une case de la grille, en unités monde. */
const CELL = 10;

/** Couleur et opacité du nuage pour une densité donnée, de 0 à 1. */
function tint(density: number): [number, number, number, number] {
  const t = Math.min(1, density);
  // L'opacité monte vite avec la densité : le bord du nuage se voit, sans que son cœur ne masque le plan.
  return [HAZE[0] + (DENSE[0] - HAZE[0]) * t, HAZE[1] + (DENSE[1] - HAZE[1]) * t, HAZE[2] + (DENSE[2] - HAZE[2]) * t, OPACITY * t ** 0.4];
}

/** Échantillon pour la légende de la carte, aux couleurs mêmes du calque : le nuage, plus dense à droite. */
export function paintPlumeSample(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const band = ctx.createLinearGradient(0, 0, w, 0);
  for (const stop of [0, 0.25, 0.5, 0.75, 1]) {
    const [r, g, b, a] = tint(stop);
    band.addColorStop(stop, `rgb(${r} ${g} ${b} / ${a})`);
  }
  ctx.fillStyle = band;
  ctx.fillRect(0, 0, w, h);
}

export class PlumeLayer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly image: ImageData;
  private readonly x: number;
  private readonly y: number;
  private readonly cols: number;
  private readonly rows: number;
  private level = Number.NaN;
  private visible = false;

  constructor(private readonly plume: Plume) {
    const bounds = plumeBounds(plume);
    this.x = Math.floor(bounds.x / CELL) * CELL;
    this.y = Math.floor(bounds.y / CELL) * CELL;
    this.cols = Math.ceil((bounds.x + bounds.w - this.x) / CELL);
    this.rows = Math.ceil((bounds.y + bounds.h - this.y) / CELL);
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.cols;
    this.canvas.height = this.rows;
    this.ctx = this.canvas.getContext('2d')!;
    this.image = this.ctx.createImageData(this.cols, this.rows);
  }

  /**
   * Recalcule le masque si l'étendue a changé de façon visible.
   * @param level étendue du nuage, de 0 à 1 ; au-delà, il se dissipe
   */
  setLevel(level: number): void {
    if (Math.abs(level - this.level) < 0.004) return;
    this.level = level;
    const pixels = this.image.data;
    this.visible = false;
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const o = (row * this.cols + col) * 4;
        const density = plumeDensity(this.plume, { x: this.x + (col + 0.5) * CELL, y: this.y + (row + 0.5) * CELL }, level);
        if (density < 0.01) {
          pixels[o + 3] = 0;
          continue;
        }
        const [r, g, b, a] = tint(density);
        pixels[o] = r;
        pixels[o + 1] = g;
        pixels[o + 2] = b;
        pixels[o + 3] = Math.round(255 * a);
        this.visible = true;
      }
    }
    this.ctx.putImageData(this.image, 0, 0);
  }

  /** Dessine le nuage ; le contexte est en coordonnées monde. */
  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.canvas, this.x, this.y, this.cols * CELL, this.rows * CELL);
    ctx.restore();
  }
}
