import type { Vec } from '../core/geometry';
import type { Elevation } from '../world/elevation';
import { zonesOf } from '../world/hazards';
import type { Commune, HazardZone, RiskId } from '../world/model';
import { hazardLayer, type WaterLayer } from './flood';

/**
 * Cartes de risques, à la manière des cartes officielles : des zones colorées
 * et hachurées posées sur le plan de la commune, avec légende, échelle et nord.
 * La même fonction dessine la carte du DICRIM et la couche affichée en jeu.
 */

export const RISK_NAMES: Record<RiskId, string> = {
  inondation: 'Inondation',
  'mouvement-terrain': 'Chutes de blocs',
  cavites: 'Cavités souterraines',
  argiles: 'Retrait-gonflement des argiles',
  'feu-foret': 'Feu de forêt',
  industriel: 'Risque industriel',
};

interface ZoneStyle {
  fill: string;
  line: string;
  /** Angle des hachures, en radians ; `null` : aplat seul. */
  hatch: number | null;
  /** Écart entre deux hachures : plus il est faible, plus la zone est exposée. */
  spacing: number;
  dashed?: boolean;
}

const D = Math.PI / 4;

const STYLES: Record<RiskId, Record<'fort' | 'moyen', ZoneStyle>> = {
  inondation: {
    fort: { fill: 'rgba(92, 70, 196, 0.58)', line: '#4a37a8', hatch: null, spacing: 0 },
    moyen: { fill: 'rgba(92, 70, 196, 0.3)', line: '#4a37a8', hatch: null, spacing: 0 },
  },
  'mouvement-terrain': {
    fort: { fill: 'rgba(160, 72, 20, 0.5)', line: '#7a3408', hatch: D, spacing: 1 },
    moyen: { fill: 'rgba(214, 140, 60, 0.36)', line: '#7a3408', hatch: -D, spacing: 2 },
  },
  cavites: {
    fort: { fill: 'rgba(110, 60, 150, 0.36)', line: '#56287c', hatch: D, spacing: 1.4 },
    moyen: { fill: 'rgba(110, 60, 150, 0.2)', line: '#56287c', hatch: null, spacing: 0 },
  },
  argiles: {
    fort: { fill: 'rgba(206, 52, 36, 0.42)', line: '#8f2014', hatch: D, spacing: 1 },
    moyen: { fill: 'rgba(240, 150, 30, 0.34)', line: '#9a5a00', hatch: -D, spacing: 2 },
  },
  'feu-foret': {
    fort: { fill: 'rgba(24, 96, 44, 0.5)', line: '#0f4a20', hatch: null, spacing: 0 },
    moyen: { fill: 'rgba(240, 120, 20, 0.34)', line: '#a04a00', hatch: D, spacing: 1.4 },
  },
  industriel: {
    fort: { fill: 'rgba(196, 24, 100, 0.62)', line: '#7c0c3e', hatch: null, spacing: 0 },
    moyen: { fill: 'rgba(214, 60, 140, 0.2)', line: '#a0165c', hatch: -D, spacing: 2, dashed: true },
  },
};

export interface LegendEntry {
  label: string;
  /** Style CSS de la pastille de légende, hachures comprises. */
  swatch: string;
}

const LABELS: Record<RiskId, { fort: string; moyen: string; mark?: string }> = {
  inondation: { fort: "Plus d'un mètre d'eau lors de la crue de référence", moyen: "Moins d'un mètre d'eau" },
  'mouvement-terrain': { fort: 'Aléa fort : pied de la falaise', moyen: 'Aléa moyen' },
  cavites: { fort: 'Emprise connue des anciennes carrières', moyen: '', mark: 'Puits, entrée ou galerie repérés' },
  argiles: { fort: 'Exposition forte', moyen: 'Exposition moyenne' },
  'feu-foret': { fort: 'Massif forestier', moyen: 'À moins de 200 m du massif : débroussaillement obligatoire' },
  industriel: { fort: 'Site Seveso seuil haut', moyen: "Périmètre du plan particulier d'intervention (PPI)", mark: 'Installation à risque' },
};

function swatchCss(style: ZoneStyle): string {
  const hatch =
    style.hatch === null
      ? ''
      : `repeating-linear-gradient(${style.hatch > 0 ? 45 : -45}deg, ${style.line} 0 1.5px, transparent 1.5px ${4 + style.spacing * 3}px), `;
  return `background: ${hatch}${style.fill}; border: 2px ${style.dashed ? 'dashed' : 'solid'} ${style.line};`;
}

export function legendOf(risk: RiskId): LegendEntry[] {
  const labels = LABELS[risk];
  const entries: LegendEntry[] = [];
  for (const level of ['fort', 'moyen'] as const) {
    if (labels[level]) entries.push({ label: labels[level], swatch: swatchCss(STYLES[risk][level]) });
  }
  if (labels.mark) entries.push({ label: labels.mark, swatch: `background: ${STYLES[risk].fort.line}; border-radius: 50%; border: 2px solid #fff; outline: 1px solid ${STYLES[risk].fort.line};` });
  return entries;
}

function trace(ctx: CanvasRenderingContext2D, poly: readonly Vec[]): void {
  ctx.beginPath();
  ctx.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
  ctx.closePath();
}

function paintZone(ctx: CanvasRenderingContext2D, zone: HazardZone, style: ZoneStyle, grain: number): void {
  trace(ctx, zone.poly);
  ctx.fillStyle = style.fill;
  ctx.fill();
  if (style.hatch !== null) {
    const { x, y, w, h } = zone.bounds;
    const reach = Math.hypot(w, h) / 2 + grain;
    ctx.save();
    ctx.clip();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(style.hatch);
    ctx.beginPath();
    for (let d = -reach; d <= reach; d += grain * style.spacing) {
      ctx.moveTo(-reach, d);
      ctx.lineTo(reach, d);
    }
    ctx.strokeStyle = style.line;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = grain * 0.12;
    ctx.stroke();
    ctx.restore();
    trace(ctx, zone.poly);
  }
  ctx.strokeStyle = style.line;
  ctx.lineWidth = grain * 0.18;
  ctx.setLineDash(style.dashed ? [grain * 0.9, grain * 0.6] : []);
  ctx.stroke();
  ctx.setLineDash([]);
}

/**
 * Dessine les zones d'un risque ; le contexte est en coordonnées monde.
 * @param grain taille de référence des hachures et des traits, en unités monde
 * @param flood nappe de la zone inondable, pour le risque d'inondation
 */
export function paintRisk(ctx: CanvasRenderingContext2D, commune: Commune, risk: RiskId, grain: number, flood: WaterLayer): void {
  if (risk === 'inondation') {
    flood.setLevel(commune.relief.referenceFlood);
    flood.draw(ctx);
  } else {
    for (const zone of zonesOf(commune, risk)) paintZone(ctx, zone, STYLES[risk][zone.level], grain);
  }
  for (const mark of commune.hazardMarks) {
    if (mark.risk !== risk) continue;
    ctx.beginPath();
    ctx.arc(mark.pos.x, mark.pos.y, grain * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = STYLES[risk].fort.line;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = grain * 0.16;
    ctx.stroke();
  }
}

export interface RiskMapOptions {
  commune: Commune;
  elevation: Elevation;
  /** Plan de la commune à petite échelle, qui sert de fond. */
  overview: HTMLCanvasElement;
  /** Risques à représenter : un seul pour une carte de risque, tous pour la carte de synthèse. */
  risks: readonly RiskId[];
  /** Largeur d'affichage, en pixels CSS. */
  width: number;
}

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

/** Construit l'image d'une carte de risque, avec ses repères, son échelle et son nord. */
export function createRiskMap(options: RiskMapOptions): HTMLCanvasElement {
  const { commune, overview, risks, width } = options;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round((width * ratio * commune.height) / commune.width);
  const ctx = canvas.getContext('2d')!;
  const k = canvas.width / commune.width;
  const px = ratio; // un pixel CSS, en pixels de l'image

  // Fond : le plan, éclairci pour laisser parler les zones.
  ctx.drawImage(overview, 0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const flood = hazardLayer(options.elevation);
  ctx.save();
  ctx.scale(k, k);
  for (const risk of risks) paintRisk(ctx, commune, risk, 34, flood);
  ctx.restore();

  // Toponymie : de quoi se repérer.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  const text = (label: string, x: number, y: number, size: number, weight = 600): void => {
    ctx.font = `${weight} ${size * px}px ${FONT}`;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 3 * px;
    ctx.strokeText(label, x * k, y * k);
    ctx.fillStyle = '#1b2733';
    ctx.fillText(label, x * k, y * k);
  };
  for (const label of commune.labels) {
    if (label.kind !== 'batiment') text(label.text, label.x, label.y, width > 520 ? 10 : 8.5);
  }
  ctx.font = `italic 600 ${9 * px}px ${FONT}`;
  const river = commune.river.path[Math.floor(commune.river.path.length * 0.14)];
  ctx.fillStyle = '#2c6a92';
  ctx.fillText(commune.river.name, river.x * k, river.y * k);

  // Mairie et centre d'hébergement, toujours signalés.
  for (const [id, letter] of [['mairie', 'M'], ['gymnase', 'H']] as const) {
    const place = commune.places.find((p) => p.id === id);
    if (!place) continue;
    ctx.beginPath();
    ctx.arc(place.pos.x * k, place.pos.y * k, 7 * px, 0, Math.PI * 2);
    ctx.fillStyle = '#1b2733';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5 * px;
    ctx.stroke();
    ctx.font = `700 ${9 * px}px ${FONT}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(letter, place.pos.x * k, place.pos.y * k + 0.5 * px);
  }

  // Échelle : 500 mètres.
  const barLength = 500 * k;
  const bx = 14 * px;
  const by = canvas.height - 14 * px;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fillRect(bx - 6 * px, by - 18 * px, barLength + 12 * px, 26 * px);
  ctx.strokeStyle = '#1b2733';
  ctx.lineWidth = 2 * px;
  ctx.beginPath();
  ctx.moveTo(bx, by - 5 * px);
  ctx.lineTo(bx, by);
  ctx.lineTo(bx + barLength, by);
  ctx.lineTo(bx + barLength, by - 5 * px);
  ctx.stroke();
  ctx.font = `600 ${9 * px}px ${FONT}`;
  ctx.fillStyle = '#1b2733';
  ctx.fillText('500 m', bx + barLength / 2, by - 9 * px);

  // Nord
  const nx = canvas.width - 20 * px;
  const ny = 24 * px;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.beginPath();
  ctx.arc(nx, ny, 15 * px, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1b2733';
  ctx.beginPath();
  ctx.moveTo(nx, ny - 11 * px);
  ctx.lineTo(nx + 5 * px, ny + 2 * px);
  ctx.lineTo(nx - 5 * px, ny + 2 * px);
  ctx.closePath();
  ctx.fill();
  ctx.font = `700 ${8 * px}px ${FONT}`;
  ctx.fillText('N', nx, ny + 8 * px);

  return canvas;
}
