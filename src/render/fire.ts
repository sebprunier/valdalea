import { FIRE_OUT, FIRE_SPENT, type FireField } from '../world/fire';

/**
 * Le feu de forêt dessiné sur la carte : le front, clair et vif, et derrière lui
 * la surface brûlée, sombre. Comme la crue, c'est un masque calculé à la
 * résolution de la grille puis étiré avec lissage : ses bords sont doux.
 *
 * Rien d'essentiel ne passe par la seule couleur : le récit et la barre d'état
 * disent où en est le feu.
 */

type Rgb = readonly [number, number, number];

/** Du bord du front vers l'arrière : la flamme, la braise, puis le sol brûlé. */
const FLAME: Rgb = [255, 208, 84];
const BLAZE: Rgb = [238, 110, 28];
const EMBER: Rgb = [150, 38, 22];
const CHAR: Rgb = [42, 36, 33];
const CHAR_OPACITY = 0.74;

/** Épaisseur du front et de la zone de braises, en avancée du feu. */
const FRONT = 0.035;
const EMBERS = 0.11;

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const css = (color: Rgb, opacity: number): string => `rgb(${color[0]} ${color[1]} ${color[2]} / ${opacity})`;

/**
 * Échantillon pour la légende de la carte, aux couleurs mêmes du calque : le
 * front du feu, qui avance vers la gauche, ou le sol brûlé. Se dessine par-dessus
 * un morceau de forêt.
 */
export function paintFireSample(ctx: CanvasRenderingContext2D, kind: 'front' | 'brule', w: number, h: number): void {
  if (kind === 'brule') {
    ctx.fillStyle = css(CHAR, CHAR_OPACITY);
    ctx.fillRect(0, 0, w, h);
    return;
  }
  const band = ctx.createLinearGradient(w * 0.3, 0, w, 0);
  band.addColorStop(0, css(FLAME, 0));
  band.addColorStop(0.08, css(FLAME, 0.95));
  band.addColorStop(0.3, css(BLAZE, 0.95));
  band.addColorStop(0.6, css(EMBER, 0.88));
  band.addColorStop(1, css(CHAR, CHAR_OPACITY));
  ctx.fillStyle = band;
  ctx.fillRect(0, 0, w, h);
}

export class FireLayer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private image: ImageData;
  private level = Number.NaN;
  private lit = false;

  constructor(private field: FireField) {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.image = this.resize();
  }

  private resize(): ImageData {
    this.canvas.width = this.field.cols;
    this.canvas.height = this.field.rows;
    return this.ctx.createImageData(this.field.cols, this.field.rows);
  }

  /** Change ce qui peut brûler : un terrain débroussaillé ne brûle plus. */
  setField(field: FireField): void {
    if (field === this.field) return;
    const sameSize = field.cols === this.field.cols && field.rows === this.field.rows;
    this.field = field;
    if (!sameSize) this.image = this.resize();
    this.level = Number.NaN;
  }

  /**
   * Recalcule le masque si le niveau a changé de façon visible.
   * @param level avancée du feu, de 0 à 1 ; au-delà, le feu est fixé et ses flammes s'éteignent
   */
  setLevel(level: number): void {
    if (Math.abs(level - this.level) < 0.004) return;
    this.level = level;
    const reached = Math.min(level, FIRE_SPENT);
    // Une fois le feu fixé, les flammes s'éteignent peu à peu : il ne reste que le sol brûlé.
    const glow = Math.min(1, Math.max(0, (FIRE_OUT - level) / (FIRE_OUT - FIRE_SPENT)));
    const { times } = this.field;
    const pixels = this.image.data;
    this.lit = false;
    for (let i = 0; i < times.length; i++) {
      const o = i * 4;
      const age = reached - times[i];
      if (!(age >= 0)) {
        pixels[o + 3] = 0;
        continue;
      }
      let color = CHAR;
      let opacity = CHAR_OPACITY;
      if (glow > 0 && age < EMBERS) {
        const hot = age < FRONT ? mix(FLAME, BLAZE, age / FRONT) : mix(BLAZE, EMBER, Math.min(1, (age - FRONT) / (EMBERS - FRONT) / 0.5));
        const cooling = age < FRONT ? 0 : (age - FRONT) / (EMBERS - FRONT);
        color = mix(mix(hot, CHAR, cooling * cooling), CHAR, 1 - glow);
        opacity = CHAR_OPACITY + (0.95 - CHAR_OPACITY) * (1 - cooling) * glow;
      }
      pixels[o] = color[0];
      pixels[o + 1] = color[1];
      pixels[o + 2] = color[2];
      pixels[o + 3] = Math.round(255 * opacity);
      this.lit = true;
    }
    this.ctx.putImageData(this.image, 0, 0);
  }

  /** Dessine le feu ; le contexte est en coordonnées monde. */
  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.lit) return;
    const { x, y, cols, rows, cell } = this.field;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.canvas, x, y, cols * cell, rows * cell);
    ctx.restore();
  }
}
