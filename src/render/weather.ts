import type { SkyId } from '../content/model';
import { mulberry32 } from '../core/rng';

/**
 * Le temps qu'il fait, posé par-dessus la carte : un voile pour le soir, la nuit
 * ou le ciel couvert, et la pluie. C'est un calque à part, pour ne pas redessiner
 * la carte à chaque image quand il pleut.
 *
 * Rien d'essentiel ne passe par là : le temps est aussi écrit dans la barre d'état.
 */

export interface Sky {
  /** Libellé affiché dans la barre d'état. */
  label: string;
  icon: 'soleil' | 'nuage' | 'pluie' | 'lune' | 'eclaircie';
  /** Intensité de la pluie, de 0 à 1. */
  rain: number;
  /** Force du vent, de 0 à 1 : elle ne se voit pas, elle s'entend. Nulle par temps calme. */
  wind: number;
  /** Lumière du jour, de 0 (nuit) à 1 : les oiseaux en dépendent. */
  daylight: number;
  /** Voile posé sur la carte (couleur CSS). */
  veil: string;
}

export const SKIES: Record<SkyId, Sky> = {
  sec: { label: 'Temps sec', icon: 'soleil', rain: 0, wind: 0, daylight: 1, veil: 'rgb(30 40 70 / 0%)' },
  soir: { label: 'Le soir tombe', icon: 'nuage', rain: 0, wind: 0.5, daylight: 0.35, veil: 'rgb(38 40 78 / 26%)' },
  'nuit-pluie': { label: 'Nuit, pluie', icon: 'lune', rain: 0.7, wind: 0.25, daylight: 0, veil: 'rgb(14 20 48 / 52%)' },
  pluie: { label: 'Pluie', icon: 'pluie', rain: 0.6, wind: 0.2, daylight: 0.8, veil: 'rgb(52 64 84 / 22%)' },
  'forte-pluie': { label: 'Fortes pluies', icon: 'pluie', rain: 1, wind: 0.55, daylight: 0.7, veil: 'rgb(44 54 76 / 32%)' },
  eclaircie: { label: 'Éclaircies', icon: 'eclaircie', rain: 0, wind: 0.08, daylight: 0.9, veil: 'rgb(60 70 84 / 8%)' },
  // L'été du feu : une lumière jaune et dure, puis la fumée qui obscurcit le ciel.
  canicule: { label: 'Canicule, vent', icon: 'soleil', rain: 0, wind: 0.3, daylight: 1, veil: 'rgb(255 196 84 / 11%)' },
  fumee: { label: 'Fumée', icon: 'nuage', rain: 0, wind: 0.5, daylight: 0.1, veil: 'rgb(124 74 38 / 36%)' },
};

interface Drop {
  x: number;
  y: number;
  speed: number;
  length: number;
}

/** Nombre de gouttes par million de pixels d'écran, sous la pluie la plus forte. */
const DENSITY = 230;
/** Inclinaison de la pluie : décalage horizontal par unité de chute. */
const SLANT = -0.3;

export class WeatherLayer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly drops: Drop[] = [];
  private rain = 0;
  private still = false;
  private running = false;
  private width = 0;
  private height = 0;
  private ratio = 1;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    const rng = mulberry32(1958);
    for (let i = 0; i < 700; i++) this.drops.push({ x: rng(), y: rng(), speed: 0.85 + rng() * 0.6, length: 14 + rng() * 14 });
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
  }

  /** Change de temps. Le voile se fond en CSS ; la pluie démarre ou s'arrête. */
  set(sky: SkyId): void {
    const { rain, veil } = SKIES[sky];
    this.canvas.style.backgroundColor = veil;
    if (rain === this.rain) return;
    this.rain = rain;
    this.refresh();
  }

  /** Animations réduites : la pluie reste visible, mais immobile. */
  setStill(still: boolean): void {
    if (still === this.still) return;
    this.still = still;
    this.refresh();
  }

  private refresh(): void {
    this.draw(0);
    if (this.rain > 0 && !this.still && !this.running) {
      this.running = true;
      requestAnimationFrame(this.frame);
    }
  }

  private readonly frame = (now: number): void => {
    if (this.rain === 0 || this.still) {
      this.running = false;
      return;
    }
    this.draw(now / 1000);
    requestAnimationFrame(this.frame);
  };

  private resize(): void {
    const cssWidth = this.canvas.clientWidth;
    const cssHeight = this.canvas.clientHeight;
    if (cssWidth === 0 || cssHeight === 0) return;
    this.ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.width = cssWidth;
    this.height = cssHeight;
    this.canvas.width = Math.round(cssWidth * this.ratio);
    this.canvas.height = Math.round(cssHeight * this.ratio);
    this.draw(performance.now() / 1000);
  }

  private draw(time: number): void {
    const { ctx, width, height } = this;
    ctx.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    if (this.rain === 0) return;

    const count = Math.min(this.drops.length, Math.round(((width * height) / 1e6) * DENSITY * this.rain));
    const t = this.still ? 0 : time;
    const fall = height + 60;
    const span = width - SLANT * fall;
    ctx.lineCap = 'round';
    // Deux traits par goutte, l'un sombre, l'autre clair : la pluie se lit sur les prés comme sur les toits.
    for (const [color, shift, lineWidth] of [
      ['rgb(28 44 66 / 38%)', 0, 1.6],
      ['rgb(236 244 250 / 62%)', 1, 1],
    ] as const) {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      for (let i = 0; i < count; i++) {
        const drop = this.drops[i];
        const y = ((drop.y + t * drop.speed * 0.95) % 1) * fall - 30;
        const x = drop.x * span + SLANT * y + shift;
        ctx.moveTo(x, y);
        ctx.lineTo(x + SLANT * drop.length, y + drop.length);
      }
      ctx.stroke();
    }
  }
}
