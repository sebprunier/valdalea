import type { Vec } from '../core/geometry';
import type { Place, PlaceKind } from '../world/model';

/** Éléments dessinés à chaque image par-dessus le plan : le joueur et les repères de lieux. */

export interface PlayerPose {
  x: number;
  y: number;
  /** Direction du regard, en radians (0 = est). */
  facing: number;
  /** Avancement du cycle de marche. */
  phase: number;
  moving: boolean;
}

/** Le joueur vu de dessus : un réserviste en chasuble orange. */
export function paintPlayer(ctx: CanvasRenderingContext2D, pose: PlayerPose): void {
  const swing = pose.moving ? Math.sin(pose.phase) : 0;
  ctx.save();
  ctx.translate(pose.x, pose.y);
  // Dessiné un peu plus grand que son emprise au sol, pour rester lisible sur le plan.
  ctx.scale(1.2, 1.2);

  ctx.fillStyle = 'rgba(30, 30, 20, 0.28)';
  ctx.beginPath();
  ctx.ellipse(2, 4, 11, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(pose.facing);

  // Pieds
  ctx.fillStyle = '#2b2f36';
  ctx.beginPath();
  ctx.ellipse(swing * 5, -4.5, 4.2, 2.8, 0, 0, Math.PI * 2);
  ctx.ellipse(-swing * 5, 4.5, 4.2, 2.8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Bras
  ctx.fillStyle = '#31506b';
  ctx.beginPath();
  ctx.arc(-swing * 3.5, -10, 3.2, 0, Math.PI * 2);
  ctx.arc(swing * 3.5, 10, 3.2, 0, Math.PI * 2);
  ctx.fill();

  // Buste : chasuble orange à bande réfléchissante
  ctx.fillStyle = '#ea6a22';
  ctx.strokeStyle = '#8a3209';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(0, 0, 6.5, 10.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#fbe9a0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-1.5, -9);
  ctx.lineTo(-1.5, 9);
  ctx.stroke();

  // Tête : cheveux, et visage tourné vers l'avant
  ctx.fillStyle = '#3a2d26';
  ctx.beginPath();
  ctx.arc(0.5, 0, 5.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d9a982';
  ctx.beginPath();
  ctx.arc(0.5, 0, 5.4, -1.05, 1.05);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/** Itinéraire d'un déplacement à la souris ou au doigt : un pointillé jusqu'à la destination, cerclée. */
export function paintRoute(ctx: CanvasRenderingContext2D, from: Vec, route: readonly Vec[], clock: number, still: boolean): void {
  const target = route[route.length - 1];
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  for (const point of route) ctx.lineTo(point.x, point.y);
  ctx.setLineDash([2, 9]);
  ctx.lineDashOffset = still ? 0 : -clock * 30;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.strokeStyle = '#1b2733';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.setLineDash([]);

  const pulse = still ? 0 : Math.sin(clock * 6) * 1.5;
  ctx.beginPath();
  ctx.arc(target.x, target.y, 9 + pulse, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.strokeStyle = '#1b2733';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

export interface MarkerState {
  /** Le joueur est à portée : le lieu peut être ouvert. */
  active: boolean;
  visited: boolean;
  /** Afficher le nom du lieu sous le repère. */
  named: boolean;
  /** Facteur de taille : sur petit écran, le repère est agrandi pour rester lisible. */
  size: number;
  clock: number;
  still: boolean;
}

const MARKER_FONT = '600 12px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

/** Hauteur de la pastille au-dessus du point d'accès, pour une taille de 1. */
export const MARKER_BADGE_OFFSET = 36;

/** Repère d'un lieu : un anneau au sol et une pastille à pictogramme au-dessus. */
export function paintPlaceMarker(ctx: CanvasRenderingContext2D, place: Place, state: MarkerState): void {
  const wave = state.still ? 0.5 : (Math.sin(state.clock * 3) + 1) / 2;
  ctx.save();
  ctx.translate(place.pos.x, place.pos.y);
  ctx.scale(state.size, state.size);

  // Anneau au sol
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.beginPath();
  ctx.arc(0, 0, 15 + wave * 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = state.active ? '#b93d0a' : '#1b2733';
  ctx.setLineDash([5, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Pastille
  const py = -MARKER_BADGE_OFFSET - (state.active ? wave * 3 : 0);
  const radius = state.active ? 15 : 13;
  ctx.fillStyle = 'rgba(20, 24, 30, 0.25)';
  ctx.beginPath();
  ctx.arc(1.5, py + 2.5, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = state.active ? '#b93d0a' : '#1b2733';
  ctx.beginPath();
  ctx.moveTo(-6, py + radius - 3);
  ctx.lineTo(0, py + radius + 8);
  ctx.lineTo(6, py + radius - 3);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, py, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.save();
  ctx.translate(0, py);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.6;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  traceIcon(ctx, place.kind);
  ctx.stroke();
  ctx.restore();

  // Les lieux déjà visités portent une coche : l'information ne repose pas sur la couleur.
  if (state.visited) {
    const cx = radius * 0.78;
    const cy = py - radius * 0.78;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1e6b3a';
    ctx.lineWidth = 1.8;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 3, cy);
    ctx.lineTo(cx - 0.8, cy + 2.4);
    ctx.lineTo(cx + 3.2, cy - 2.4);
    ctx.stroke();
  }

  if (state.named) {
    ctx.font = MARKER_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.lineWidth = 4;
    ctx.strokeText(place.name, 0, 30);
    ctx.fillStyle = '#1b2733';
    ctx.fillText(place.name, 0, 30);
  }
  ctx.restore();
}

/** Pictogrammes au trait, dans un carré de 14 unités centré sur l'origine. */
function traceIcon(ctx: CanvasRenderingContext2D, kind: PlaceKind): void {
  const line = (...points: number[]): void => {
    ctx.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
  };
  switch (kind) {
    case 'domicile':
      line(-7, 0, 0, -6.5, 7, 0);
      line(-4.5, -1.5, -4.5, 6, 4.5, 6, 4.5, -1.5);
      line(-1.2, 6, -1.2, 2, 1.2, 2, 1.2, 6);
      break;
    case 'mairie':
      line(-7, -2, 0, -7, 7, -2, -7, -2);
      line(-4.5, 0, -4.5, 5);
      line(0, 0, 0, 5);
      line(4.5, 0, 4.5, 5);
      line(-7, 6.5, 7, 6.5);
      break;
    case 'ecole':
      line(0, -3, -7, -5, -7, 4, 0, 6, 7, 4, 7, -5, 0, -3, 0, 6);
      break;
    case 'gymnase':
      ctx.moveTo(-7, 1);
      ctx.quadraticCurveTo(0, -9, 7, 1);
      line(-7, 1, -7, 6, 7, 6, 7, 1);
      line(-2, 6, -2, 2.5, 2, 2.5, 2, 6);
      break;
    case 'quartier':
      line(-7, 6, -7, 0, -3.5, -4, 0, 0, 0, 6, -7, 6);
      line(0, 6, 7, 6, 7, -1.5, 3.5, -5.5, 0.8, -2.5);
      break;
    case 'usine':
      line(-7, 6, -7, -1, -2.5, -4, -2.5, -1, 2, -4, 2, -1, 7, -1, 7, 6, -7, 6);
      line(4.5, -1, 4.5, -7);
      break;
    case 'camping':
      line(-7, 6, 0, -6, 7, 6, -7, 6);
      line(-2.2, 6, 0, 1, 2.2, 6);
      break;
    case 'pont':
      line(-7, -2, 7, -2);
      ctx.moveTo(-7, 5.5);
      ctx.quadraticCurveTo(-3.5, -4, 0, 5.5);
      ctx.quadraticCurveTo(3.5, -4, 7, 5.5);
      break;
  }
}
