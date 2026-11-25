/**
 * Petite boîte à outils pour dessiner des maquettes en fausse 3D (axonométrie
 * à 30°), directement en SVG : aucun modèle 3D, aucun WebGL.
 *
 * Repère : x part vers la droite et le bas de l'écran, y vers la gauche et le
 * bas, z vers le haut. Les unités sont des mètres. On voit de chaque volume le
 * dessus, la face « gauche » (plan y maximal) et la face « droite » (plan x maximal).
 * Les volumes se dessinent du plus lointain au plus proche.
 */

const COS = Math.cos(Math.PI / 6);
const SIN = 0.5;
const NS = 'http://www.w3.org/2000/svg';

export type Point3 = readonly [number, number, number];

/** Couleurs des trois faces visibles d'un volume. */
export interface Faces {
  top: string;
  left: string;
  right: string;
  /** Couleur du trait de contour (aucun trait si absente). */
  line?: string;
}

interface Style {
  stroke?: string;
  width?: number;
  opacity?: number;
}

const round = (value: number): string => (Math.round(value * 10) / 10).toString();

const escapeXml = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export class IsoCanvas {
  private readonly parts: string[] = [];
  /** Points d'intérêt de la scène, en coordonnées de l'image. */
  readonly spots = new Map<string, { x: number; y: number }>();
  /**
   * Hauteur de coupe : en dessous, rien n'est dessiné. Sert à redessiner, après
   * la nappe d'eau, la seule partie des volumes qui en dépasse.
   */
  private cut = Number.NEGATIVE_INFINITY;
  /** Emprise de tout ce qui a été dessiné : l'image sera cadrée dessus. */
  private readonly extent = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };

  /** @param unit nombre de pixels par mètre */
  constructor(private readonly unit: number) {}

  project(x: number, y: number, z: number): [number, number] {
    return [(x - y) * COS * this.unit, (x + y) * SIN * this.unit - z * this.unit];
  }

  /** Projette un point et l'inclut dans le cadrage. */
  private place(x: number, y: number, z: number, margin = 0): [number, number] {
    const [px, py] = this.project(x, y, z);
    const e = this.extent;
    e.minX = Math.min(e.minX, px - margin);
    e.maxX = Math.max(e.maxX, px + margin);
    e.minY = Math.min(e.minY, py - margin);
    e.maxY = Math.max(e.maxY, py + margin);
    return [px, py];
  }

  private path(points: readonly Point3[]): string {
    return points.map(([x, y, z]) => this.place(x, y, z).map(round).join(',')).join(' ');
  }

  private get aboveWaterOnly(): boolean {
    return this.cut !== Number.NEGATIVE_INFINITY;
  }

  /** Polygone quelconque. Lors de la passe « au-dessus de l'eau », il n'est tracé que s'il est entièrement émergé. */
  polygon(points: readonly Point3[], fill: string, style: Style = {}): void {
    if (this.aboveWaterOnly && points.some((p) => p[2] < this.cut - 1e-6)) return;
    const stroke = style.stroke ? ` stroke="${style.stroke}" stroke-width="${style.width ?? 1}" stroke-linejoin="round"` : '';
    const opacity = style.opacity !== undefined ? ` opacity="${style.opacity}"` : '';
    this.parts.push(`<polygon points="${this.path(points)}" fill="${fill}"${stroke}${opacity}/>`);
  }

  line(a: Point3, b: Point3, stroke: string, width = 1.5): void {
    if (this.aboveWaterOnly && (a[2] < this.cut || b[2] < this.cut)) return;
    const [x1, y1] = this.place(...a);
    const [x2, y2] = this.place(...b);
    this.parts.push(`<line x1="${round(x1)}" y1="${round(y1)}" x2="${round(x2)}" y2="${round(y2)}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round"/>`);
  }

  /** Surface horizontale (pelouse, chaussée, dalle). */
  ground(x: number, y: number, w: number, d: number, fill: string, z = 0, line?: string): void {
    this.polygon(
      [
        [x, y, z],
        [x + w, y, z],
        [x + w, y + d, z],
        [x, y + d, z],
      ],
      fill,
      line ? { stroke: line } : {},
    );
  }

  /** Pavé droit posé en (x, y, z), de largeur w (selon x), profondeur d (selon y) et hauteur h. */
  box(x: number, y: number, z: number, w: number, d: number, h: number, faces: Faces): void {
    const z0 = Math.max(z, this.cut);
    const z1 = z + h;
    if (z1 - z0 <= 1e-6) return;
    const style: Style = faces.line ? { stroke: faces.line } : {};
    this.polygon(
      [
        [x + w, y, z0],
        [x + w, y + d, z0],
        [x + w, y + d, z1],
        [x + w, y, z1],
      ],
      faces.right,
      style,
    );
    this.polygon(
      [
        [x, y + d, z0],
        [x + w, y + d, z0],
        [x + w, y + d, z1],
        [x, y + d, z1],
      ],
      faces.left,
      style,
    );
    this.polygon(
      [
        [x, y, z1],
        [x + w, y, z1],
        [x + w, y + d, z1],
        [x, y + d, z1],
      ],
      faces.top,
      style,
    );
  }

  /**
   * Toit à deux pans posé à la hauteur z. `ridge` donne la direction du faîtage :
   * 'x' montre un pan côté gauche et un pignon côté droit ; 'y', l'inverse.
   */
  gable(x: number, y: number, z: number, w: number, d: number, rise: number, colors: { slope: string; shade: string; gable: string; line?: string }, ridge: 'x' | 'y' = 'x'): void {
    if (z < this.cut) return;
    const style: Style = colors.line ? { stroke: colors.line } : {};
    if (ridge === 'x') {
      const my = y + d / 2;
      this.polygon([[x, y, z], [x + w, y, z], [x + w, my, z + rise], [x, my, z + rise]], colors.shade, style);
      this.polygon([[x + w, y, z], [x + w, y + d, z], [x + w, my, z + rise]], colors.gable, style);
      this.polygon([[x, y + d, z], [x + w, y + d, z], [x + w, my, z + rise], [x, my, z + rise]], colors.slope, style);
    } else {
      const mx = x + w / 2;
      this.polygon([[x, y, z], [x, y + d, z], [mx, y + d, z + rise], [mx, y, z + rise]], colors.shade, style);
      this.polygon([[x, y + d, z], [x + w, y + d, z], [mx, y + d, z + rise]], colors.gable, style);
      this.polygon([[x + w, y, z], [x + w, y + d, z], [mx, y + d, z + rise], [mx, y, z + rise]], colors.slope, style);
    }
  }

  /** Rectangle plaqué sur une façade gauche (plan y = `y`) : porte, fenêtre, panneau. */
  panelLeft(x: number, y: number, z: number, w: number, h: number, fill: string, line?: string): void {
    const z0 = Math.max(z, this.cut);
    if (z + h - z0 <= 1e-6) return;
    this.polygon([[x, y, z0], [x + w, y, z0], [x + w, y, z + h], [x, y, z + h]], fill, line ? { stroke: line } : {});
  }

  /** Rectangle plaqué sur une façade droite (plan x = `x`). */
  panelRight(x: number, y: number, z: number, d: number, h: number, fill: string, line?: string): void {
    const z0 = Math.max(z, this.cut);
    if (z + h - z0 <= 1e-6) return;
    this.polygon([[x, y, z0], [x, y + d, z0], [x, y + d, z + h], [x, y, z + h]], fill, line ? { stroke: line } : {});
  }

  /** Disque vu de face (feuillage, tête d'un personnage), centré sur le point indiqué. */
  disc(x: number, y: number, z: number, radius: number, fill: string, line?: string): void {
    if (z - radius < this.cut && this.aboveWaterOnly) return;
    const [cx, cy] = this.place(x, y, z, radius * this.unit);
    const stroke = line ? ` stroke="${line}" stroke-width="1"` : '';
    this.parts.push(`<circle cx="${round(cx)}" cy="${round(cy)}" r="${round(radius * this.unit)}" fill="${fill}"${stroke}/>`);
  }

  /** Texte couché sur une façade gauche, comme une enseigne peinte. */
  signLeft(x: number, y: number, z: number, text: string, size: number, fill: string): void {
    if (z < this.cut) return;
    const [px, py] = this.place(x, y, z);
    this.parts.push(
      `<text transform="matrix(${round(COS)},${SIN},0,1,${round(px)},${round(py)})" font-size="${round(size * this.unit)}" font-weight="700" fill="${fill}" text-anchor="middle" font-family="system-ui, sans-serif" letter-spacing="1">${escapeXml(text)}</text>`,
    );
  }

  /** Arbre : un tronc et un houppier. */
  tree(x: number, y: number, height = 4.5): void {
    this.box(x - 0.15, y - 0.15, 0, 0.3, 0.3, height * 0.5, { top: '#8a6a4a', left: '#8a6a4a', right: '#6f553b' });
    this.disc(x, y, height * 0.72, height * 0.3, '#6f9f5c', '#55824a');
    this.disc(x - 0.3, y + 0.2, height * 0.8, height * 0.2, '#8bb874');
  }

  /** Personnage stylisé. */
  person(x: number, y: number, coat: string): void {
    this.box(x - 0.2, y - 0.2, 0, 0.4, 0.4, 1.15, { top: coat, left: coat, right: shade(coat) });
    this.disc(x, y, 1.42, 0.24, '#e0b48f', '#9a7450');
  }

  /** Enregistre un point d'intérêt : un geste du joueur y sera rattaché. */
  spot(id: string, x: number, y: number, z: number): void {
    const [px, py] = this.project(x, y, z);
    this.spots.set(id, { x: px, y: py });
  }

  /** Passe en mode « au-dessus de l'eau » : seuls les volumes émergés seront redessinés. */
  startAbove(level: number): void {
    this.cut = level;
  }

  /** Nappe d'eau au niveau donné, sur l'emprise indiquée. */
  water(x: number, y: number, w: number, d: number, level: number): void {
    const corners: Point3[] = [
      [x, y, level],
      [x + w, y, level],
      [x + w, y + d, level],
      [x, y + d, level],
    ];
    this.parts.push(`<polygon points="${this.path(corners)}" fill="#5c8096" opacity="0.72"/>`);
    // Tranche de la nappe, sur les deux bords proches : l'eau a une épaisseur.
    this.parts.push(`<polygon points="${this.path([[x, y + d, 0], [x + w, y + d, 0], [x + w, y + d, level], [x, y + d, level]])}" fill="#46677b" opacity="0.8"/>`);
    this.parts.push(`<polygon points="${this.path([[x + w, y, 0], [x + w, y + d, 0], [x + w, y + d, level], [x + w, y, level]])}" fill="#3d5c6f" opacity="0.8"/>`);
    // Quelques rides
    for (let i = 1; i < 6; i++) {
      const ry = y + (d * i) / 6;
      const rx = x + ((i * 37) % 60) / 100 * w;
      const [x1, y1] = this.place(rx, ry, level);
      const [x2, y2] = this.place(Math.min(x + w, rx + w * 0.22), ry, level);
      this.parts.push(`<line x1="${round(x1)}" y1="${round(y1)}" x2="${round(x2)}" y2="${round(y2)}" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" opacity="0.45"/>`);
    }
  }

  /** Cadre de l'image : l'emprise du dessin, plus une marge. */
  frame(margin: number): { x: number; y: number; width: number; height: number } {
    const e = this.extent;
    return { x: e.minX - margin, y: e.minY - margin, width: e.maxX - e.minX + 2 * margin, height: e.maxY - e.minY + 2 * margin };
  }

  toSvg(label: string, margin: number): SVGSVGElement {
    const frame = this.frame(margin);
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `${round(frame.x)} ${round(frame.y)} ${round(frame.width)} ${round(frame.height)}`);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', label);
    svg.classList.add('scene__image');
    // Le contenu est produit par le code ci-dessus, à partir de textes fixes échappés.
    svg.innerHTML = this.parts.join('');
    return svg;
  }
}

/** Assombrit une couleur hexadécimale (face à l'ombre). */
export function shade(hex: string, amount = 0.82): string {
  const value = parseInt(hex.slice(1), 16);
  const channel = (shift: number): number => Math.round(((value >> shift) & 255) * amount);
  return `#${((channel(16) << 16) | (channel(8) << 8) | channel(0)).toString(16).padStart(6, '0')}`;
}

export function faces(color: string, line?: string): Faces {
  return { top: color, left: shade(color, 0.93), right: shade(color, 0.78), line };
}

export interface IsoOptions {
  /** Emprise au sol de la scène, en mètres : c'est aussi celle de la nappe d'eau. */
  ground: { w: number; d: number };
  /** Hauteur d'eau sur toute la scène, en mètres (0 : pas d'eau). */
  water?: number;
  /** Description de l'image pour les lecteurs d'écran. */
  label: string;
  draw(canvas: IsoCanvas): void;
}

/** Pixels par mètre dans le repère de l'image (elle est ensuite mise à l'échelle de son conteneur). */
const UNIT = 20;
const MARGIN = 12;

/**
 * Construit l'image d'une scène, cadrée au plus près de ce qui est dessiné.
 * S'il y a de l'eau, la scène est dessinée deux fois : en entier, puis,
 * par-dessus la nappe, uniquement ce qui en dépasse.
 */
export function renderIso(options: IsoOptions): { svg: SVGSVGElement; spots: Map<string, { left: number; top: number }> } {
  const { w, d } = options.ground;
  const canvas = new IsoCanvas(UNIT);

  options.draw(canvas);
  const level = options.water ?? 0;
  if (level > 0.01) {
    canvas.water(0, 0, w, d, level);
    canvas.startAbove(level);
    options.draw(canvas);
  }

  const frame = canvas.frame(MARGIN);
  const spots = new Map<string, { left: number; top: number }>();
  for (const [id, point] of canvas.spots) {
    spots.set(id, { left: ((point.x - frame.x) / frame.width) * 100, top: ((point.y - frame.y) / frame.height) * 100 });
  }
  return { svg: canvas.toSvg(options.label, MARGIN), spots };
}
