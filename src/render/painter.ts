import { clamp, distToPolyline, inflate, rectsIntersect, type Rect, type Vec } from '../core/geometry';
import type { Bridge, Building, Commune, Decor, Fence, Ground, MapLabel, River, Road, RoadKind, Tank, Tree } from '../world/model';

/**
 * Dessin du plan de la commune, entièrement en code (aucune image).
 * Le contexte reçu est déjà en coordonnées monde ; seul ce qui croise `view` est tracé.
 * Ce dessin est figé dans des tuiles : il n'est pas rejoué à chaque image.
 */

export interface PaintOptions {
  /** Noms de rues, de secteurs et de bâtiments. */
  labels: boolean;
  /** Petits détails (haies, hachures, reflets), inutiles sur la vue d'ensemble. */
  details: boolean;
}

export const MAP_BACKGROUND = '#dfe8c9';

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const GROUND_FILL: Record<Ground['kind'], readonly string[]> = {
  champ: ['#e9e2b6', '#dedaa6', '#d6e0a8', '#e7dbac'],
  foret: ['#b4cf9b'],
  parc: ['#c6dfab'],
  jardin: ['#d2e4b8', '#cde0b1'],
  place: ['#eee4d2'],
  cour: ['#e4dccb'],
  parking: ['#d8d5ce'],
  industrie: ['#d6d4cf'],
  camping: ['#cbe3ae'],
  eboulis: ['#d1c9bd'],
  falaise: ['#aaa094'],
};

const ROAD_STYLE: Record<RoadKind, { fill: string; casing: string; rank: number }> = {
  chemin: { fill: '#dccba6', casing: '#c2ad84', rank: 0 },
  ruelle: { fill: '#f7f3eb', casing: '#bdb5a6', rank: 1 },
  rue: { fill: '#ffffff', casing: '#bdb5a6', rank: 2 },
  avenue: { fill: '#fff5d6', casing: '#c9b684', rank: 3 },
  departementale: { fill: '#fde8a6', casing: '#cfb262', rank: 4 },
};

/** Toitures : [versant clair, versant sombre, arête]. */
const ROOFS = {
  tuile: [
    ['#dc8a63', '#c26f4c', '#8f4c33'],
    ['#d27d58', '#b96443', '#87462f'],
    ['#e09a72', '#c98058', '#96583b'],
    ['#c9745a', '#af5c45', '#7d3f2f'],
  ],
  ardoise: [
    ['#8693a1', '#6c7987', '#4c5763'],
    ['#7a8896', '#616e7c', '#444f5b'],
    ['#93a0ad', '#788593', '#56616d'],
    ['#6f7d8b', '#586572', '#3e4853'],
  ],
  bac: [
    ['#c9d1d8', '#b3bcc4', '#7f8b95'],
    ['#bcc6ce', '#a6b0b9', '#76828c'],
    ['#d3d9de', '#bdc5cc', '#8a959e'],
    ['#b3beb9', '#9ea9a4', '#6f7b76'],
  ],
  plat: [
    ['#d9d5cc', '#c7c2b8', '#8e897f'],
    ['#cfd3d2', '#bcc1c0', '#868c8b'],
    ['#e3ded3', '#d0cabd', '#989284'],
    ['#c8ccc4', '#b5bab1', '#80867c'],
  ],
} as const;

const TREE_TONES = ['#7dab66', '#6f9f5c', '#8bb874', '#64955a'];
const DECOR_TONES = ['#e9a23b', '#4f8fc0', '#d9604a', '#7a9e4d'];

export function paintMap(
  ctx: CanvasRenderingContext2D,
  commune: Commune,
  view: Rect,
  options: PaintOptions = { labels: true, details: true },
): void {
  const seen = (bounds: Rect, margin = 0): boolean => rectsIntersect(margin ? inflate(bounds, margin) : bounds, view);

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.fillStyle = MAP_BACKGROUND;
  ctx.fillRect(view.x, view.y, view.w, view.h);

  for (const ground of commune.grounds) {
    if (ground.kind !== 'jardin' && seen(ground.bounds, 4)) paintGround(ctx, ground, options);
  }

  if (seen(commune.river.bounds)) paintRiver(ctx, commune.river, options);

  for (const ground of commune.grounds) {
    if (ground.kind === 'jardin' && seen(ground.bounds, 4)) paintGround(ctx, ground, options);
  }

  paintRoads(ctx, commune.roads.filter((road) => seen(road.bounds)));
  for (const bridge of commune.bridges) if (seen(bridge.rect, 12)) paintBridge(ctx, bridge);

  for (const fence of commune.fences) if (seen(fence.rect, 6)) paintFence(ctx, fence);

  const buildings = commune.buildings.filter((b) => seen(b.rect, 14));
  ctx.fillStyle = 'rgba(52, 48, 36, 0.22)';
  for (const b of buildings) ctx.fillRect(b.rect.x + 4, b.rect.y + 6, b.rect.w, b.rect.h);
  for (const b of buildings) paintBuilding(ctx, b, options.details);

  for (const tank of commune.tanks) {
    if (seen({ x: tank.x - tank.r, y: tank.y - tank.r, w: tank.r * 2, h: tank.r * 2 }, 10)) paintTank(ctx, tank);
  }
  for (const decor of commune.decors) {
    // Le terrain de jeux est plus grand que les autres éléments de décor.
    const reach = decor.kind === 'terrain' ? 64 : 40;
    if (seen({ x: decor.x - reach, y: decor.y - reach, w: reach * 2, h: reach * 2 })) paintDecor(ctx, decor);
  }
  for (const tree of commune.trees) {
    if (seen({ x: tree.x - tree.r, y: tree.y - tree.r, w: tree.r * 2, h: tree.r * 2 }, 8)) paintTree(ctx, tree, options);
  }

  if (options.labels) {
    paintRoadLabels(ctx, commune, view);
    paintRiverLabels(ctx, commune, view);
    for (const label of commune.labels) {
      if (seen({ x: label.x - 320, y: label.y - 30, w: 640, h: 60 })) paintLabel(ctx, label);
    }
  }
  ctx.restore();
}

// --------------------------------------------------------------------- Sols

function tracePolygon(ctx: CanvasRenderingContext2D, points: readonly Vec[]): void {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
}

function tracePath(ctx: CanvasRenderingContext2D, points: readonly Vec[]): void {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
}

/** Hachures parallèles couvrant un rectangle englobant ; à appeler après un clip. */
function hatch(ctx: CanvasRenderingContext2D, bounds: Rect, spacing: number, angle: number): void {
  const reach = Math.hypot(bounds.w, bounds.h) / 2 + spacing;
  ctx.save();
  ctx.translate(bounds.x + bounds.w / 2, bounds.y + bounds.h / 2);
  ctx.rotate(angle);
  ctx.beginPath();
  for (let d = -reach; d <= reach; d += spacing) {
    ctx.moveTo(-reach, d);
    ctx.lineTo(reach, d);
  }
  ctx.stroke();
  ctx.restore();
}

function paintGround(ctx: CanvasRenderingContext2D, ground: Ground, options: PaintOptions): void {
  const fills = GROUND_FILL[ground.kind];
  tracePolygon(ctx, ground.poly);
  ctx.fillStyle = fills[ground.variant % fills.length];
  ctx.fill();
  if (!options.details) return;

  switch (ground.kind) {
    case 'champ': {
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = 'rgba(120, 110, 60, 0.16)';
      ctx.lineWidth = 2;
      hatch(ctx, ground.bounds, 14, [0.25, -0.6, 1.1, 0.05][ground.variant % 4]);
      ctx.restore();
      break;
    }
    case 'falaise': {
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = 'rgba(70, 62, 54, 0.3)';
      ctx.lineWidth = 2;
      hatch(ctx, ground.bounds, 16, -0.9);
      ctx.restore();
      tracePolygon(ctx, ground.poly);
      ctx.strokeStyle = '#6f665b';
      ctx.lineWidth = 5;
      ctx.stroke();
      break;
    }
    case 'eboulis': {
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = 'rgba(110, 100, 88, 0.45)';
      ctx.lineWidth = 3;
      ctx.setLineDash([1, 9]);
      hatch(ctx, ground.bounds, 9, 0.4);
      ctx.restore();
      break;
    }
    case 'jardin':
      ctx.strokeStyle = '#9fbf85';
      ctx.lineWidth = 3;
      ctx.stroke();
      break;
    case 'place':
    case 'cour':
      ctx.strokeStyle = '#d3c6ae';
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
    case 'parking': {
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 2;
      hatch(ctx, ground.bounds, 22, Math.PI / 2);
      ctx.restore();
      break;
    }
    case 'camping':
      ctx.strokeStyle = '#8fb573';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 8]);
      ctx.stroke();
      ctx.setLineDash([]);
      break;
    case 'industrie':
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1.5;
      hatch(ctx, ground.bounds, 40, 0);
      hatch(ctx, ground.bounds, 40, Math.PI / 2);
      ctx.restore();
      break;
    default:
      break;
  }
}

// ------------------------------------------------------------------ Rivière

function paintRiver(ctx: CanvasRenderingContext2D, river: River, options: PaintOptions): void {
  const { path, width } = river;
  tracePath(ctx, path);
  ctx.strokeStyle = '#cfe0bb';
  ctx.lineWidth = width + 30;
  ctx.stroke();
  ctx.strokeStyle = '#79aecf';
  ctx.lineWidth = width + 6;
  ctx.stroke();
  ctx.strokeStyle = '#a3cfe8';
  ctx.lineWidth = width;
  ctx.stroke();
  if (!options.details) return;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 3;
  ctx.setLineDash([46, 90]);
  ctx.lineDashOffset = 20;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;
}

// ------------------------------------------------------------------- Voirie

function paintRoads(ctx: CanvasRenderingContext2D, roads: Road[]): void {
  const ordered = [...roads].sort((a, b) => ROAD_STYLE[a.kind].rank - ROAD_STYLE[b.kind].rank);
  // Tous les bords d'abord, puis toutes les chaussées : les carrefours se raccordent d'eux-mêmes.
  for (const road of ordered) {
    tracePath(ctx, road.path);
    ctx.strokeStyle = ROAD_STYLE[road.kind].casing;
    ctx.lineWidth = road.width;
    ctx.stroke();
  }
  for (const road of ordered) {
    tracePath(ctx, road.path);
    ctx.strokeStyle = ROAD_STYLE[road.kind].fill;
    ctx.lineWidth = road.width - (road.kind === 'chemin' ? 3 : 5);
    ctx.stroke();
  }
}

function paintBridge(ctx: CanvasRenderingContext2D, bridge: Bridge): void {
  const { x, y, w, h } = bridge.rect;
  if (bridge.kind === 'passerelle') {
    ctx.fillStyle = '#c8a878';
    ctx.fillRect(x + 8, y, w - 16, h);
    ctx.strokeStyle = 'rgba(95, 70, 40, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let py = y + 8; py < y + h; py += 10) {
      ctx.moveTo(x + 8, py);
      ctx.lineTo(x + w - 8, py);
    }
    ctx.stroke();
  }
  // Parapets
  ctx.strokeStyle = bridge.kind === 'pont' ? '#8c8478' : '#7a5f3d';
  ctx.lineWidth = bridge.kind === 'pont' ? 6 : 3;
  ctx.lineCap = 'butt';
  const inset = bridge.kind === 'pont' ? 1 : 8;
  ctx.beginPath();
  ctx.moveTo(x + inset, y);
  ctx.lineTo(x + inset, y + h);
  ctx.moveTo(x + w - inset, y);
  ctx.lineTo(x + w - inset, y + h);
  ctx.stroke();
  ctx.lineCap = 'round';
}

function paintFence(ctx: CanvasRenderingContext2D, fence: Fence): void {
  const { x, y, w, h } = fence.rect;
  const inset = 5;
  ctx.strokeStyle = '#5f666d';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + inset, y + inset, w - 2 * inset, h - 2 * inset);
  ctx.lineWidth = 5;
  ctx.setLineDash([1, 14]);
  ctx.strokeRect(x + inset, y + inset, w - 2 * inset, h - 2 * inset);
  ctx.setLineDash([]);
  if (fence.gate && (fence.gate.side === 'N' || fence.gate.side === 'S')) {
    const gy = fence.gate.side === 'N' ? y + inset : y + h - inset;
    ctx.strokeStyle = '#c2410c';
    ctx.lineWidth = 5;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(fence.gate.from, gy);
    ctx.lineTo(fence.gate.to, gy);
    ctx.stroke();
    ctx.lineCap = 'round';
  }
}

// ---------------------------------------------------------------- Bâtiments

/** @param signs écrire les enseignes des commerces ; inutile sur un plan à petite échelle, où elles seraient illisibles */
function paintBuilding(ctx: CanvasRenderingContext2D, b: Building, signs = true): void {
  const [light, dark, edge] = ROOFS[b.roof][b.tone % 4];
  const { x, y, w, h } = b.rect;

  if (b.kind === 'eglise') {
    paintChurch(ctx, b);
    return;
  }

  if (b.roof === 'tuile' || b.roof === 'ardoise') {
    // Toit à deux pans : faîtage dans le sens de la longueur, versant nord-ouest éclairé.
    ctx.fillStyle = dark;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = light;
    if (w >= h) ctx.fillRect(x, y, w, h / 2);
    else ctx.fillRect(x, y, w / 2, h);
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    if (w >= h) {
      ctx.moveTo(x, y + h / 2);
      ctx.lineTo(x + w, y + h / 2);
    } else {
      ctx.moveTo(x + w / 2, y);
      ctx.lineTo(x + w / 2, y + h);
    }
    ctx.stroke();
    // Cheminée
    ctx.fillStyle = edge;
    if (w >= h) ctx.fillRect(x + w * 0.22, y + h / 2 - 9, 7, 7);
    else ctx.fillRect(x + w / 2 - 9, y + h * 0.22, 7, 7);
  } else {
    ctx.fillStyle = light;
    ctx.fillRect(x, y, w, h);
    if (b.roof === 'bac') {
      // Bac acier : nervures régulières.
      ctx.strokeStyle = dark;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (w >= h) {
        for (let px = x + 10; px < x + w; px += 10) {
          ctx.moveTo(px, y);
          ctx.lineTo(px, y + h);
        }
      } else {
        for (let py = y + 10; py < y + h; py += 10) {
          ctx.moveTo(x, py);
          ctx.lineTo(x + w, py);
        }
      }
      ctx.stroke();
    } else {
      ctx.fillStyle = dark;
      ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
      ctx.fillStyle = light;
      ctx.fillRect(x + 7, y + 7, w - 14, h - 14);
    }
  }

  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5);

  if (b.kind === 'mairie') paintPorch(ctx, b, 64, 14, '#e9e2d3', edge);
  else if (b.kind === 'commerce') paintAwning(ctx, b, signs);
  else if (b.door && b.kind !== 'mobil-home') paintPorch(ctx, b, 14, 5, '#efe7d6', edge);
}

/** Perron ou avant-corps, posé devant la façade d'entrée. */
function paintPorch(ctx: CanvasRenderingContext2D, b: Building, length: number, depth: number, fill: string, stroke: string): void {
  const { x, y, w, h } = b.rect;
  let px = x + w / 2 - length / 2;
  let py = y + h;
  let pw = length;
  let ph = depth;
  switch (b.door) {
    case 'N':
      py = y - depth;
      break;
    case 'E':
      px = x + w;
      py = y + h / 2 - length / 2;
      pw = depth;
      ph = length;
      break;
    case 'W':
      px = x - depth;
      py = y + h / 2 - length / 2;
      pw = depth;
      ph = length;
      break;
    default:
      break;
  }
  ctx.fillStyle = fill;
  ctx.fillRect(px, py, pw, ph);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);
}

/** Couleurs des stores : la toile, et son liseré. */
const AWNINGS = [
  ['#b5432b', '#7d2a19'],
  ['#2f6f8f', '#1d4a61'],
  ['#4f7a3a', '#34542a'],
  ['#8a5a8c', '#5d3b5f'],
] as const;
const SIGN_FONT = `700 8px ${FONT}`;

/**
 * Le store d'un commerce, déroulé sur le trottoir le long de la façade : une toile
 * de couleur, à larges rayures, bordée d'un liseré. Au-dessus, sur la façade,
 * l'enseigne dit ce qu'on y vend.
 */
function paintAwning(ctx: CanvasRenderingContext2D, b: Building, signs: boolean): void {
  const { x, y, w, h } = b.rect;
  const depth = 11;
  const [canvas, edge] = AWNINGS[b.tone % 4];
  const horizontal = b.door === 'N' || b.door === 'S' || !b.door;
  const length = (horizontal ? w : h) - 10;
  const box = horizontal
    ? { x: x + 5, y: b.door === 'N' ? y - depth : y + h, w: length, h: depth }
    : { x: b.door === 'W' ? x - depth : x + w, y: y + 5, w: depth, h: length };

  // L'ombre du store sur le trottoir, puis la toile et ses rayures.
  ctx.fillStyle = 'rgba(52, 48, 36, 0.2)';
  ctx.fillRect(box.x + 2, box.y + 2, box.w, box.h);
  ctx.fillStyle = canvas;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  const stripes = Math.max(3, Math.round(length / 11) | 1);
  const step = length / stripes;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
  for (let i = 1; i < stripes; i += 2) {
    if (horizontal) ctx.fillRect(box.x + i * step, box.y, step, box.h);
    else ctx.fillRect(box.x, box.y + i * step, box.w, step);
  }
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.2;
  ctx.strokeRect(box.x + 0.6, box.y + 0.6, box.w - 1.2, box.h - 1.2);

  // L'enseigne : une plaque claire sur la façade, au-dessus du store.
  if (!signs || !b.sign || !horizontal) return;
  const text = b.sign.toUpperCase();
  ctx.save();
  ctx.font = SIGN_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const plateW = Math.min(w - 6, ctx.measureText(text).width + 10);
  const plateH = 11;
  const plateX = x + w / 2 - plateW / 2;
  const plateY = b.door === 'N' ? y + 2 : y + h - plateH - 2;
  ctx.fillStyle = '#fbf8f1';
  ctx.strokeStyle = '#3f392f';
  ctx.lineWidth = 1;
  ctx.fillRect(plateX, plateY, plateW, plateH);
  ctx.strokeRect(plateX + 0.5, plateY + 0.5, plateW - 1, plateH - 1);
  ctx.fillStyle = '#2a2620';
  // Sur une façade étroite, le texte se resserre pour tenir dans la plaque.
  ctx.fillText(text, x + w / 2, plateY + plateH / 2 + 0.5, plateW - 6);
  ctx.restore();
}

function paintChurch(ctx: CanvasRenderingContext2D, b: Building): void {
  const [light, dark, edge] = ROOFS.ardoise[b.tone % 4];
  const { x, y, w, h } = b.rect;
  const tower = Math.min(h * 0.6, 54);
  const naveY = y + h * 0.18;
  const naveH = h * 0.64;
  const naveX = x + tower * 0.7;
  const naveW = w - tower * 0.7 - naveH / 2;

  // Nef et chevet arrondi
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.rect(naveX, naveY, naveW, naveH);
  ctx.arc(naveX + naveW, naveY + naveH / 2, naveH / 2, -Math.PI / 2, Math.PI / 2);
  ctx.fill();
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.rect(naveX, naveY, naveW, naveH / 2);
  ctx.arc(naveX + naveW, naveY + naveH / 2, naveH / 2, -Math.PI / 2, 0);
  ctx.lineTo(naveX + naveW, naveY + naveH / 2);
  ctx.fill();
  // Transept
  const tx = naveX + naveW * 0.55;
  ctx.fillStyle = dark;
  ctx.fillRect(tx, y, 30, h);
  ctx.fillStyle = light;
  ctx.fillRect(tx, y, 15, h);
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.2;
  ctx.strokeRect(tx + 0.5, y + 0.5, 29, h - 1);
  ctx.beginPath();
  ctx.moveTo(naveX, naveY + naveH / 2);
  ctx.lineTo(naveX + naveW + naveH / 2, naveY + naveH / 2);
  ctx.stroke();

  // Clocher : toit en pavillon, vu de dessus
  const cx = x + tower / 2;
  const cy = y + h / 2;
  const half = tower / 2;
  const faces: Array<[number, number, number, number, string]> = [
    [-half, -half, half, -half, light],
    [half, -half, half, half, dark],
    [half, half, -half, half, dark],
    [-half, half, -half, -half, light],
  ];
  for (const [ax, ay, bx, by, fill] of faces) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + ax, cy + ay);
    ctx.lineTo(cx + bx, cy + by);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(cx - half, cy - half, tower, tower);
  ctx.beginPath();
  ctx.moveTo(cx - half, cy - half);
  ctx.lineTo(cx + half, cy + half);
  ctx.moveTo(cx + half, cy - half);
  ctx.lineTo(cx - half, cy + half);
  ctx.lineWidth = 1;
  ctx.stroke();
}

function paintTank(ctx: CanvasRenderingContext2D, tank: Tank): void {
  ctx.fillStyle = 'rgba(52, 48, 36, 0.22)';
  ctx.beginPath();
  ctx.arc(tank.x + 4, tank.y + 6, tank.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e4e8eb';
  ctx.beginPath();
  ctx.arc(tank.x, tank.y, tank.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#87929b';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = '#b4bdc4';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(tank.x, tank.y, tank.r * 0.55, 0, Math.PI * 2);
  ctx.moveTo(tank.x - tank.r, tank.y);
  ctx.lineTo(tank.x + tank.r, tank.y);
  ctx.stroke();
}

function paintDecor(ctx: CanvasRenderingContext2D, decor: Decor): void {
  ctx.save();
  ctx.translate(decor.x, decor.y);
  ctx.rotate(decor.angle);
  if (decor.kind === 'voiture') {
    ctx.fillStyle = 'rgba(52, 48, 36, 0.2)';
    ctx.beginPath();
    ctx.roundRect(-15, -5, 36, 16, 5);
    ctx.fill();
    ctx.fillStyle = '#3f6f9f';
    ctx.strokeStyle = '#27496b';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(-18, -8, 36, 16, 5);
    ctx.fill();
    ctx.stroke();
    // Pare-brise et lunette arrière
    ctx.fillStyle = '#cfe1ee';
    ctx.fillRect(3, -6, 6, 12);
    ctx.fillRect(-11, -6, 4, 12);
    ctx.fillStyle = '#35618c';
    ctx.fillRect(-7, -6.5, 10, 13);
  } else if (decor.kind === 'tente') {
    ctx.fillStyle = 'rgba(52, 48, 36, 0.18)';
    ctx.fillRect(-12, -8, 28, 22);
    ctx.fillStyle = DECOR_TONES[decor.tone % 4];
    ctx.fillRect(-14, -11, 28, 22);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.fillRect(-14, -11, 28, 11);
    ctx.strokeStyle = 'rgba(40, 36, 28, 0.55)';
    ctx.lineWidth = 1;
    ctx.strokeRect(-13.5, -10.5, 27, 21);
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.lineTo(14, 0);
    ctx.stroke();
  } else if (decor.kind === 'terrain') {
    // Terrain de jeux peint au sol d'une cour d'école : un rectangle, sa ligne médiane, son rond central, deux buts.
    const w = 104;
    const h = 62;
    ctx.fillStyle = 'rgba(96, 150, 112, 0.5)';
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 1.6;
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(0, h / 2);
    ctx.moveTo(9, 0);
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    for (const side of [-1, 1]) {
      ctx.moveTo((side * w) / 2, -13);
      ctx.arc((side * w) / 2, 0, 13, side === 1 ? Math.PI / 2 : -Math.PI / 2, side === 1 ? (Math.PI * 3) / 2 : Math.PI / 2, false);
    }
    ctx.stroke();
  } else if (decor.kind === 'marelle') {
    // Marelle : des cases de couleur, de la « terre » au « ciel ».
    const size = 9;
    const cells: Array<[number, number]> = [
      [0, 0],
      [0, 1],
      [0, 2],
      [-0.5, 3],
      [0.5, 3],
      [0, 4],
      [-0.5, 5],
      [0.5, 5],
    ];
    ctx.lineWidth = 1.1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    cells.forEach(([col, row], index) => {
      const x = col * size - size / 2;
      const y = 24 - row * size - size;
      ctx.fillStyle = DECOR_TONES[index % 4];
      ctx.globalAlpha = 0.55;
      ctx.fillRect(x, y, size, size);
      ctx.globalAlpha = 1;
      ctx.strokeRect(x, y, size, size);
    });
    // Le ciel, en demi-lune, au bout.
    ctx.fillStyle = 'rgba(79, 143, 192, 0.45)';
    ctx.beginPath();
    ctx.arc(0, 24 - 6 * size, size, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (decor.kind === 'preau') {
    // Préau : un toit sur quatre poteaux, ouvert de tous côtés.
    const w = 70;
    const h = 42;
    ctx.fillStyle = 'rgba(52, 48, 36, 0.22)';
    ctx.fillRect(-w / 2 + 4, -h / 2 + 6, w, h);
    ctx.fillStyle = '#b9684a';
    ctx.strokeStyle = '#7d4330';
    ctx.lineWidth = 1.4;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    // La pente du toit, et les poteaux aux angles.
    ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.fillRect(-w / 2, -h / 2, w, h / 2);
    ctx.fillStyle = '#5b3a26';
    for (const [px, py] of [
      [-w / 2 + 3, -h / 2 + 3],
      [w / 2 - 3, -h / 2 + 3],
      [-w / 2 + 3, h / 2 - 3],
      [w / 2 - 3, h / 2 - 3],
    ]) {
      ctx.fillRect(px - 1.5, py - 1.5, 3, 3);
    }
  } else if (decor.kind === 'banc') {
    ctx.fillStyle = 'rgba(52, 48, 36, 0.2)';
    ctx.fillRect(-9, -1.5, 20, 6);
    ctx.fillStyle = '#9a6b43';
    ctx.strokeStyle = '#6f4a2c';
    ctx.lineWidth = 1;
    ctx.fillRect(-10, -3, 20, 6);
    ctx.strokeRect(-9.5, -2.5, 19, 5);
  } else {
    ctx.fillStyle = 'rgba(52, 48, 36, 0.18)';
    ctx.fillRect(-16, -7, 38, 22);
    ctx.fillStyle = '#f3f1ea';
    ctx.fillRect(-18, -10, 36, 20);
    ctx.strokeStyle = '#8b8a84';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-17.5, -9.5, 35, 19);
    ctx.fillStyle = DECOR_TONES[decor.tone % 4];
    ctx.fillRect(-18, -2, 36, 4);
  }
  ctx.restore();
}

function paintTree(ctx: CanvasRenderingContext2D, tree: Tree, options: PaintOptions): void {
  if (options.details) {
    ctx.fillStyle = 'rgba(45, 60, 35, 0.2)';
    ctx.beginPath();
    ctx.arc(tree.x + 3, tree.y + 5, tree.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = TREE_TONES[tree.tone % 4];
  ctx.beginPath();
  ctx.arc(tree.x, tree.y, tree.r, 0, Math.PI * 2);
  ctx.fill();
  if (!options.details) return;
  ctx.strokeStyle = 'rgba(50, 80, 45, 0.45)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.beginPath();
  ctx.arc(tree.x - tree.r * 0.28, tree.y - tree.r * 0.3, tree.r * 0.5, 0, Math.PI * 2);
  ctx.fill();
}

// ---------------------------------------------------------------- Toponymie

/** Ramène un angle de texte dans [-90°, 90°[ pour qu'il ne soit jamais à l'envers. */
function readableAngle(angle: number): number {
  if (angle >= Math.PI / 2 - 1e-6) return angle - Math.PI;
  if (angle < -Math.PI / 2 - 1e-6) return angle + Math.PI;
  return angle;
}

function near(view: Rect, x: number, y: number, margin: number): boolean {
  return x > view.x - margin && x < view.x + view.w + margin && y > view.y - margin && y < view.y + view.h + margin;
}

interface RoadLabel {
  text: string;
  x: number;
  y: number;
  angle: number;
  width: number;
}

const ROAD_LABEL_FONT = `600 12px ${FONT}`;
const roadLabelCache = new WeakMap<Commune, RoadLabel[]>();

/** Un nom de rue ne doit recouvrir ni un carrefour ni le repère d'un lieu. */
function isLabelSpotFree(commune: Commune, road: Road, p: Vec, halfWidth: number): boolean {
  for (const other of commune.roads) {
    if (other !== road && distToPolyline(p, other.path) < other.width / 2 + halfWidth + 6) return false;
  }
  for (const place of commune.places) {
    if (Math.hypot(p.x - place.pos.x, p.y - place.pos.y) < halfWidth + 34) return false;
  }
  return true;
}

/**
 * Choisit l'emplacement des noms de rues, une fois pour toutes : au milieu des
 * tronçons assez longs, décalé si nécessaire pour éviter carrefours et repères.
 */
function placeRoadLabels(ctx: CanvasRenderingContext2D, commune: Commune): RoadLabel[] {
  const labels: RoadLabel[] = [];
  ctx.font = ROAD_LABEL_FONT;
  for (const road of commune.roads) {
    if (!road.name || road.kind === 'chemin') continue;
    const width = ctx.measureText(road.name).width;
    const segments = road.path
      .slice(1)
      .map((b, i) => ({ i, length: Math.hypot(b.x - road.path[i].x, b.y - road.path[i].y) }))
      .sort((s, t) => t.length - s.length);
    // Une route sinueuse n'est nommée qu'une fois, sur son plus long tronçon où le nom tient sans gêner
    // un repère ni un carrefour ; ses grandes lignes droites le sont toujours.
    let named = false;
    for (const { i, length } of segments) {
      if (length < width + 50) break;
      if (named && length < 480) continue;
      const a = road.path[i];
      const b = road.path[i + 1];
      const repeats = Math.max(1, Math.floor(length / 760));
      const angle = readableAngle(Math.atan2(b.y - a.y, b.x - a.x));
      const margin = (width / 2 + 24) / length;
      for (let k = 0; k < repeats; k++) {
        const base = (k + 0.5) / repeats;
        for (const shift of [0, -0.12, 0.12, -0.24, 0.24, -0.36, 0.36]) {
          const t = clamp(base + shift / repeats, margin, 1 - margin);
          const spot = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
          if (isLabelSpotFree(commune, road, spot, width / 2)) {
            labels.push({ text: road.name!, x: spot.x, y: spot.y, angle, width });
            named = true;
            break;
          }
        }
      }
    }
  }
  return labels;
}

function paintRoadLabels(ctx: CanvasRenderingContext2D, commune: Commune, view: Rect): void {
  let labels = roadLabelCache.get(commune);
  if (!labels) {
    labels = placeRoadLabels(ctx, commune);
    roadLabelCache.set(commune, labels);
  }
  ctx.font = ROAD_LABEL_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#5a5246';
  for (const label of labels) {
    if (!near(view, label.x, label.y, label.width)) continue;
    ctx.save();
    ctx.translate(label.x, label.y);
    ctx.rotate(label.angle);
    ctx.fillText(label.text, 0, 0.5);
    ctx.restore();
  }
}

function paintRiverLabels(ctx: CanvasRenderingContext2D, commune: Commune, view: Rect): void {
  const { path, name } = commune.river;
  ctx.font = `italic 600 17px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#2c6a92';
  for (const fraction of [0.12, 0.36, 0.63, 0.88]) {
    const i = Math.min(path.length - 2, Math.floor(fraction * (path.length - 1)));
    const a = path[i];
    const b = path[i + 1];
    if (!near(view, a.x, a.y, 120)) continue;
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(readableAngle(Math.atan2(b.y - a.y, b.x - a.x)));
    ctx.fillText(name, 0, 0);
    ctx.restore();
  }
}

/** Texte en capitales espacées, centré, sans dépendre de `letterSpacing` (support inégal). */
function spacedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number, halo?: string): void {
  const chars = [...text];
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((sum, w) => sum + w, 0) + spacing * (chars.length - 1);
  ctx.textAlign = 'left';
  let cx = x - total / 2;
  chars.forEach((ch, i) => {
    if (halo) ctx.strokeText(ch, cx, y);
    ctx.fillText(ch, cx, y);
    cx += widths[i] + spacing;
  });
}

function paintLabel(ctx: CanvasRenderingContext2D, label: MapLabel): void {
  ctx.textBaseline = 'middle';
  const text = label.text.toLocaleUpperCase('fr');
  switch (label.kind) {
    case 'secteur':
      ctx.font = `700 28px ${FONT}`;
      ctx.fillStyle = 'rgba(64, 54, 40, 0.42)';
      spacedText(ctx, text, label.x, label.y, 7);
      break;
    case 'lieu-dit':
      ctx.font = `700 18px ${FONT}`;
      ctx.fillStyle = 'rgba(64, 54, 40, 0.5)';
      spacedText(ctx, text, label.x, label.y, 4);
      break;
    case 'batiment':
      ctx.font = `700 11px ${FONT}`;
      ctx.fillStyle = '#3f392f';
      ctx.strokeStyle = 'rgba(255, 252, 244, 0.85)';
      ctx.lineWidth = 3.5;
      ctx.lineJoin = 'round';
      spacedText(ctx, text, label.x, label.y, 1.5, 'halo');
      break;
  }
}

/**
 * Redessine ce qui dépasse d'une nappe d'eau (toits, cuves, cimes des arbres),
 * par-dessus la crue. `isFlooded` limite le travail aux objets réellement touchés.
 */
export function paintAboveWater(
  ctx: CanvasRenderingContext2D,
  commune: Commune,
  view: Rect,
  isFlooded: (p: Vec) => boolean,
): void {
  const seen = (bounds: Rect): boolean => rectsIntersect(bounds, view);
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const b of commune.buildings) {
    const center = { x: b.rect.x + b.rect.w / 2, y: b.rect.y + b.rect.h / 2 };
    if (seen(b.rect) && isFlooded(center)) paintBuilding(ctx, b);
  }
  const still: PaintOptions = { labels: false, details: false };
  for (const tree of commune.trees) {
    if (seen({ x: tree.x - tree.r, y: tree.y - tree.r, w: tree.r * 2, h: tree.r * 2 }) && isFlooded(tree)) paintTree(ctx, tree, still);
  }
  ctx.restore();
}

// ------------------------------------------------------------------ Légende

/** Éléments du plan que la légende explique. */
export type LegendSample =
  | 'pre'
  | 'champ'
  | 'foret'
  | 'parc'
  | 'jardin'
  | 'falaise'
  | 'eboulis'
  | 'camping'
  | 'industrie'
  | 'parking'
  | 'place'
  | 'riviere'
  | 'route'
  | 'rue'
  | 'chemin'
  | 'maison'
  | 'commerce'
  | 'public'
  | 'activite';

/**
 * Dessine un échantillon du plan dans un cadre de `w` sur `h` unités monde.
 * L'échantillon passe par les fonctions mêmes qui dessinent la carte : la
 * légende ne peut pas s'en écarter.
 */
export function paintLegendSample(ctx: CanvasRenderingContext2D, sample: LegendSample, w: number, h: number): void {
  const options: PaintOptions = { labels: false, details: true };
  const frame = (inset: number): { poly: Vec[]; bounds: Rect } => ({
    poly: [
      { x: inset, y: inset },
      { x: w - inset, y: inset },
      { x: w - inset, y: h - inset },
      { x: inset, y: h - inset },
    ],
    bounds: { x: inset, y: inset, w: w - inset * 2, h: h - inset * 2 },
  });
  const ground = (kind: Ground['kind'], inset = 0, variant = 0): void => paintGround(ctx, { kind, variant, ...frame(inset) }, options);
  const across: Vec[] = [
    { x: -30, y: h / 2 },
    { x: w + 30, y: h / 2 },
  ];
  const road = (kind: RoadKind, width: number): void => paintRoads(ctx, [{ kind, width, path: across, bounds: frame(0).bounds }]);
  const trees = (spots: ReadonlyArray<readonly [number, number, number]>): void => {
    spots.forEach(([x, y, r], tone) => paintTree(ctx, { x: x * w, y: y * h, r, tone }, options));
  };
  const building = (kind: Building['kind'], roof: Building['roof'], tone: number): void => {
    const rect = { x: w * 0.2, y: h * 0.22, w: w * 0.6, h: h * 0.56 };
    ctx.fillStyle = 'rgba(52, 48, 36, 0.22)';
    ctx.fillRect(rect.x + 4, rect.y + 6, rect.w, rect.h);
    paintBuilding(ctx, { kind, roof, tone, rect });
  };

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();
  ctx.fillStyle = MAP_BACKGROUND;
  ctx.fillRect(0, 0, w, h);

  switch (sample) {
    case 'pre':
      break;
    case 'foret':
      ground('foret');
      trees([
        [0.16, 0.3, 17],
        [0.44, 0.22, 20],
        [0.74, 0.34, 18],
        [0.28, 0.72, 19],
        [0.58, 0.68, 16],
        [0.88, 0.78, 18],
      ]);
      break;
    case 'parc':
      ground('parc', 8);
      trees([
        [0.3, 0.42, 15],
        [0.68, 0.58, 17],
      ]);
      break;
    case 'riviere':
      paintRiver(ctx, { name: '', width: h * 0.46, path: across, bounds: frame(0).bounds }, options);
      break;
    case 'route':
      road('departementale', 46);
      break;
    case 'rue':
      road('rue', 34);
      break;
    case 'chemin':
      road('chemin', 18);
      break;
    case 'maison':
      ground('jardin', 6);
      building('pavillon', 'tuile', 0);
      break;
    case 'commerce': {
      // Une boutique : la maison, son store sur le trottoir et son enseigne.
      const shop = { x: w * 0.14, y: h * 0.12, w: w * 0.72, h: h * 0.56 };
      ctx.fillStyle = 'rgba(52, 48, 36, 0.22)';
      ctx.fillRect(shop.x + 4, shop.y + 6, shop.w, shop.h);
      paintBuilding(ctx, { kind: 'commerce', roof: 'ardoise', tone: 1, rect: shop, door: 'S', sign: 'Café' });
      break;
    }
    case 'public':
      building('mairie', 'ardoise', 0);
      break;
    case 'activite':
      ground('industrie');
      building('hangar', 'bac', 0);
      break;
    case 'jardin':
    case 'camping':
    case 'place':
    case 'parking':
      ground(sample, 8);
      break;
    default:
      ground(sample);
      break;
  }
  ctx.restore();
}
