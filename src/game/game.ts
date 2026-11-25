import { clamp, distance, type Vec } from '../core/geometry';
import { MARKER_BADGE_OFFSET, paintPlaceMarker, paintPlayer, paintRoute, type PlayerPose } from '../render/actors';
import { floodLayer, hazardLayer, type WaterLayer } from '../render/flood';
import { MAP_BACKGROUND, paintAboveWater, paintMap } from '../render/painter';
import { TILE_SIZE, TileCache } from '../render/tiles';
import type { Elevation } from '../world/elevation';
import type { WalkGrid } from '../world/grid';
import { sectorAt, type Commune, type Place, type Sector } from '../world/model';
import type { Pathfinder } from '../world/pathfinding';
import { INTERACT_RADIUS, PLAYER_RADIUS, RUN_SPEED, WALK_SPEED } from './constants';
import { Input, type Action } from './input';

/** Échelle de la vue d'ensemble (mini-carte, et repli tant qu'une tuile n'est pas prête). */
const OVERVIEW_SCALE = 0.25;

/** Délai minimal entre deux calculs d'itinéraire quand le pointeur glisse sur la carte. */
const ROUTE_INTERVAL = 0.15;

/** Vitesse de montée ou de descente de la crue à l'écran, en mètres par seconde. */
const FLOOD_SPEED = 0.11;

export interface GameHooks {
  /** Le joueur entre à portée d'un lieu, ou s'en éloigne. */
  nearPlaceChanged(place: Place | null): void;
  sectorChanged(sector: Sector | null): void;
  /** Le joueur demande à ouvrir le lieu devant lequel il se trouve. */
  interact(place: Place): void;
  shortcut(action: 'phone' | 'places' | 'help'): void;
  /** Position du joueur, signalée au plus une fois par seconde et à chaque pause. */
  moved(pos: Vec): void;
  /** Distance que le joueur vient de parcourir, en unités monde : le temps de jeu en dépend. */
  walked(units: number): void;
  isVisited(placeId: string): boolean;
  /** Nombre d'actions possibles dans un lieu, affiché sur son repère. */
  pendingAt(placeId: string): number;
}

export interface GameOptions {
  /** Élément focalisable qui porte la carte et reçoit le clavier. */
  surface: HTMLElement;
  canvas: HTMLCanvasElement;
  commune: Commune;
  grid: WalkGrid;
  pathfinder: Pathfinder;
  elevation: Elevation;
  start: Vec;
  hooks: GameHooks;
}

/**
 * La carte jouable : déplacement du joueur, caméra et rendu.
 * Les règles du jeu et l'interface vivent ailleurs ; cette classe ne fait que
 * signaler ce qui se passe sur la carte au travers de `GameHooks`.
 */
export class Game {
  /** Plan complet de la commune à petite échelle, partagé avec la mini-carte. */
  readonly overview: HTMLCanvasElement;
  reducedMotion = false;

  private readonly surface: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly commune: Commune;
  private readonly grid: WalkGrid;
  private readonly pathfinder: Pathfinder;
  private readonly elevation: Elevation;
  private readonly hooks: GameHooks;
  private readonly hazard: WaterLayer;
  private readonly flood: WaterLayer;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly input: Input;
  private readonly tiles: TileCache;
  private readonly player: PlayerPose;
  private readonly camera: Vec;
  private scale = 1; // pixels écran par unité monde
  /** Agrandissement des repères quand la carte est dézoomée (petits écrans). */
  private markerSize = 1;
  private paused = true;

  /** Itinéraire en cours (déplacement au pointeur) : points de passage restants. */
  private route: Vec[] = [];
  /** Lieu à ouvrir à l'arrivée, quand le joueur a cliqué sur son repère. */
  private openOnArrival: Place | null = null;
  private pendingPointer: Vec | null = null;
  private sinceRoute = ROUTE_INTERVAL;
  private stuckFor = 0;

  /** Niveau de la zone inondable affichée (crue de référence), ou `null` si elle est masquée. */
  private hazardLevel: number | null = null;
  /** Niveau de la crue à l'écran, qui rejoint progressivement `floodTarget`. */
  private floodLevel = 0;
  private floodTarget = 0;
  /** Point que la caméra regarde pendant une séquence (le joueur ne se déplace pas). */
  private focus: Vec | null = null;

  private near: Place | null = null;
  private sector: Sector | null = null;
  private observed = false;
  private clock = 0;
  private lastFrame = 0;
  private sinceReport = 0;
  private dirty = true;
  private firstPaint = true;

  constructor(options: GameOptions) {
    this.surface = options.surface;
    this.canvas = options.canvas;
    this.commune = options.commune;
    this.grid = options.grid;
    this.pathfinder = options.pathfinder;
    this.elevation = options.elevation;
    this.hooks = options.hooks;
    this.hazard = hazardLayer(options.elevation);
    this.flood = floodLayer(options.elevation);
    const { commune } = this;

    this.ctx = this.canvas.getContext('2d', { alpha: false })!;
    this.input = new Input(this.surface, this.canvas, (action) => this.handleAction(action));
    this.player = { x: options.start.x, y: options.start.y, facing: Math.PI / 2, phase: 0, moving: false };
    this.camera = { x: options.start.x, y: options.start.y };

    this.overview = document.createElement('canvas');
    this.overview.width = Math.round(commune.width * OVERVIEW_SCALE);
    this.overview.height = Math.round(commune.height * OVERVIEW_SCALE);
    const overviewCtx = this.overview.getContext('2d', { alpha: false })!;
    overviewCtx.scale(OVERVIEW_SCALE, OVERVIEW_SCALE);
    paintMap(overviewCtx, commune, { x: 0, y: 0, w: commune.width, h: commune.height }, { labels: false, details: false });

    this.tiles = new TileCache(
      (ctx, view) => paintMap(ctx, commune, view),
      Math.ceil(commune.width / TILE_SIZE),
      Math.ceil(commune.height / TILE_SIZE),
    );

    new ResizeObserver(() => this.resize()).observe(this.surface);
    this.resize();
  }

  start(): void {
    this.observe();
    this.lastFrame = performance.now();
    requestAnimationFrame(this.frame);
  }

  get position(): Vec {
    return { x: this.player.x, y: this.player.y };
  }

  setPaused(paused: boolean): void {
    if (paused === this.paused) return;
    this.paused = paused;
    if (paused) {
      this.input.clear();
      this.stop();
      this.hooks.moved(this.position);
    }
    this.dirty = true;
  }

  /**
   * Place le joueur devant un lieu (déplacement depuis la liste des lieux).
   * Le trajet compte comme s'il avait été fait à pied.
   */
  travelTo(place: Place): void {
    const route = this.pathfinder.findPath(this.player, place.pos);
    let length = 0;
    let from: Vec = this.player;
    for (const point of route) {
      length += distance(from, point);
      from = point;
    }
    this.hooks.walked(route.length > 0 ? length : distance(this.player, place.pos));
    this.moveTo(place.pos);
  }

  /** Affiche ou masque la zone inondable, pour une crue du niveau donné. */
  setHazardZone(level: number | null): void {
    this.hazardLevel = level;
    if (level !== null) this.hazard.setLevel(level);
    this.dirty = true;
  }

  /** Fait monter ou descendre la crue jusqu'au niveau indiqué (0 : la rivière est dans son lit). */
  setFlood(level: number, immediate = false): void {
    this.floodTarget = level;
    if (immediate || this.reducedMotion) this.floodLevel = level;
    this.dirty = true;
  }

  /** Dessine la zone inondable et la crue sur un autre support, la mini-carte par exemple (contexte en coordonnées monde). */
  paintWater(ctx: CanvasRenderingContext2D): void {
    if (this.hazardLevel !== null) this.hazard.draw(ctx);
    if (this.floodLevel > 0.02) {
      this.flood.setLevel(this.floodLevel);
      this.flood.draw(ctx);
    }
  }

  /** Braque la caméra sur un point pendant une séquence ; `null` la rend au joueur. */
  setFocus(point: Vec | null): void {
    this.focus = point ? { ...point } : null;
    this.dirty = true;
  }

  moveTo(pos: Vec): void {
    this.player.x = pos.x;
    this.player.y = pos.y;
    this.player.facing = Math.PI / 2;
    this.stop();
    this.camera.x = pos.x;
    this.camera.y = pos.y;
    this.clampCamera();
    this.observe();
    this.hooks.moved(this.position);
    this.dirty = true;
  }

  /** Redessine la carte à la prochaine image (un repère a changé d'état, par exemple). */
  invalidate(): void {
    this.dirty = true;
  }

  private handleAction(action: Action): void {
    if (this.paused) return;
    if (action !== 'interact') this.hooks.shortcut(action);
    else if (this.near) this.hooks.interact(this.near);
  }

  private stop(): void {
    this.route = [];
    this.openOnArrival = null;
    this.pendingPointer = null;
    this.stuckFor = 0;
    this.player.moving = false;
  }

  // ------------------------------------------------------------ Boucle de jeu

  private readonly frame = (now: number): void => {
    requestAnimationFrame(this.frame);
    const dt = Math.min(0.05, Math.max(0, (now - this.lastFrame) / 1000));
    this.lastFrame = now;
    if (!this.paused) {
      this.update(dt);
      this.dirty = true;
    }
    this.animate(dt);
    if (this.dirty) {
      this.dirty = false;
      this.render();
    }
  };

  /** Animations qui continuent pendant les séquences, quand le joueur ne bouge pas : la crue et la caméra. */
  private animate(dt: number): void {
    if (this.floodLevel !== this.floodTarget) {
      const step = FLOOD_SPEED * dt;
      const gap = this.floodTarget - this.floodLevel;
      this.floodLevel = Math.abs(gap) <= step ? this.floodTarget : this.floodLevel + Math.sign(gap) * step;
      this.dirty = true;
    }
    if (this.paused && this.focus) {
      const gap = distance(this.focus, this.camera);
      if (gap > 0.5) {
        const follow = this.reducedMotion ? 1 : 1 - Math.exp(-dt * 3);
        this.camera.x += (this.focus.x - this.camera.x) * follow;
        this.camera.y += (this.focus.y - this.camera.y) * follow;
        this.clampCamera();
        this.dirty = true;
      }
    }
  }

  private update(dt: number): void {
    this.clock += dt;

    // Déplacement au pointeur : l'itinéraire est recalculé au plus quelques fois par seconde.
    const pointer = this.input.takePointer();
    if (pointer) this.pendingPointer = pointer;
    this.sinceRoute += dt;
    let arrived = false;
    if (this.pendingPointer && this.sinceRoute >= ROUTE_INTERVAL) {
      arrived = this.planRoute(this.toWorld(this.pendingPointer));
      this.pendingPointer = null;
      this.sinceRoute = 0;
    }

    const p = this.player;
    const axis = this.input.axis();
    let direction: Vec | null = null;
    let reach = Infinity; // distance à ne pas dépasser pendant cette image
    if (axis.x !== 0 || axis.y !== 0) {
      // Le clavier reprend la main sur un itinéraire en cours.
      this.stop();
      direction = axis;
    } else {
      while (this.route.length > 0 && distance(this.route[0], p) < 2) {
        this.route.shift();
        arrived = this.route.length === 0;
      }
      if (this.route.length > 0) {
        const waypoint = this.route[0];
        reach = distance(waypoint, p);
        direction = { x: (waypoint.x - p.x) / reach, y: (waypoint.y - p.y) / reach };
      }
    }

    if (direction) {
      const step = Math.min(reach, (this.input.running ? RUN_SPEED : WALK_SPEED) * dt);
      const next = this.grid.moveCircle(p.x, p.y, PLAYER_RADIUS, direction.x * step, direction.y * step);
      const moved = Math.hypot(next.x - p.x, next.y - p.y);
      p.x = next.x;
      p.y = next.y;
      if (moved > 0) this.hooks.walked(moved);
      p.facing = turnToward(p.facing, Math.atan2(direction.y, direction.x), dt * 14);
      p.phase += moved * 0.1;
      p.moving = moved > step * 0.15;
      if (this.route.length > 0) {
        // Filet de sécurité : on abandonne l'itinéraire si le joueur n'avance plus.
        this.stuckFor = moved < step * 0.25 ? this.stuckFor + dt : 0;
        if (this.stuckFor > 0.4) this.stop();
      }
    } else {
      p.moving = false;
    }

    const follow = this.reducedMotion ? 1 : 1 - Math.exp(-dt * 9);
    this.camera.x += (p.x - this.camera.x) * follow;
    this.camera.y += (p.y - this.camera.y) * follow;
    this.clampCamera();

    this.observe();

    if (arrived && this.openOnArrival) {
      const place = this.openOnArrival;
      this.openOnArrival = null;
      if (this.near === place) this.hooks.interact(place);
    }

    this.sinceReport += dt;
    if (this.sinceReport >= 1) {
      this.sinceReport = 0;
      this.hooks.moved(this.position);
    }
  }

  /**
   * Prépare l'itinéraire vers le point désigné. Un clic sur le repère d'un lieu
   * vise son point d'accès et ouvrira sa fiche à l'arrivée.
   * Renvoie vrai si le joueur est déjà sur place.
   */
  private planRoute(world: Vec): boolean {
    let picked: Place | null = null;
    for (const place of this.commune.places) {
      const onRing = distance(world, place.pos) < 30 * this.markerSize;
      const badge = { x: place.pos.x, y: place.pos.y - MARKER_BADGE_OFFSET * this.markerSize };
      const onBadge = distance(world, badge) < 20 * this.markerSize;
      if (onRing || onBadge) picked = place;
    }
    const destination = picked
      ? picked.pos
      : { x: clamp(world.x, 0, this.commune.width), y: clamp(world.y, 0, this.commune.height) };
    this.openOnArrival = picked;
    this.stuckFor = 0;
    this.route = distance(destination, this.player) < 2 ? [] : this.pathfinder.findPath(this.player, destination);
    return this.route.length === 0;
  }

  /** Met à jour le lieu à portée et le secteur courant, et prévient en cas de changement. */
  private observe(): void {
    let near: Place | null = null;
    let best = INTERACT_RADIUS;
    for (const place of this.commune.places) {
      const d = distance(place.pos, this.player);
      if (d <= best) {
        best = d;
        near = place;
      }
    }
    if (near !== this.near || !this.observed) {
      this.near = near;
      this.hooks.nearPlaceChanged(near);
    }
    const sector = sectorAt(this.commune, this.player);
    if (sector !== this.sector || !this.observed) {
      this.sector = sector;
      this.hooks.sectorChanged(sector);
    }
    this.observed = true;
  }

  // ------------------------------------------------------------------ Caméra

  private resize(): void {
    const cssWidth = this.surface.clientWidth;
    const cssHeight = this.surface.clientHeight;
    if (cssWidth === 0 || cssHeight === 0) return;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    // Zoom : environ 1 350 unités monde visibles en largeur, sans jamais trop réduire le personnage.
    const zoom = clamp(Math.min(cssWidth / 1350, cssHeight / 640), 0.7, 1.6);
    // L'échelle est arrondie pour qu'une tuile fasse un nombre entier de pixels :
    // les tuiles sont alors recopiées sans rééchantillonnage ni raccord visible.
    const tilePx = Math.max(64, Math.round(TILE_SIZE * zoom * pixelRatio));
    this.scale = tilePx / TILE_SIZE;
    this.markerSize = Math.max(1, 1 / zoom);
    this.canvas.width = Math.round(cssWidth * pixelRatio);
    this.canvas.height = Math.round(cssHeight * pixelRatio);
    this.tiles.setTilePixels(tilePx);
    const cols = Math.ceil(this.canvas.width / tilePx) + 3;
    const rows = Math.ceil(this.canvas.height / tilePx) + 3;
    this.tiles.setCapacity(cols * rows + 8);
    this.clampCamera();
    this.firstPaint = true;
    this.dirty = true;
  }

  private clampCamera(): void {
    const halfW = this.canvas.width / this.scale / 2;
    const halfH = this.canvas.height / this.scale / 2;
    const { width, height } = this.commune;
    this.camera.x = width > halfW * 2 ? clamp(this.camera.x, halfW, width - halfW) : width / 2;
    this.camera.y = height > halfH * 2 ? clamp(this.camera.y, halfH, height - halfH) : height / 2;
  }

  /** Coin haut-gauche de la vue, en pixels écran entiers. */
  private origin(): Vec {
    return {
      x: Math.round(this.camera.x * this.scale - this.canvas.width / 2),
      y: Math.round(this.camera.y * this.scale - this.canvas.height / 2),
    };
  }

  private toWorld(css: Vec): Vec {
    const ratio = this.canvas.width / Math.max(1, this.surface.clientWidth);
    const origin = this.origin();
    return { x: (css.x * ratio + origin.x) / this.scale, y: (css.y * ratio + origin.y) / this.scale };
  }

  // ------------------------------------------------------------------- Rendu

  private render(): void {
    const { ctx, canvas, scale } = this;
    const width = canvas.width;
    const height = canvas.height;
    const tilePx = Math.round(TILE_SIZE * scale);
    const origin = this.origin();

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = MAP_BACKGROUND;
    ctx.fillRect(0, 0, width, height);

    const tx0 = Math.floor(origin.x / tilePx);
    const tx1 = Math.floor((origin.x + width - 1) / tilePx);
    const ty0 = Math.floor(origin.y / tilePx);
    const ty1 = Math.floor((origin.y + height - 1) / tilePx);

    // Au premier affichage, toutes les tuiles visibles sont dessinées d'un coup ;
    // ensuite au plus deux par image, pour ne jamais faire sauter l'animation.
    let budget = this.firstPaint ? Infinity : 2;
    let missing = false;
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        if (!this.tiles.inRange(tx, ty)) continue;
        let tile = this.tiles.peek(tx, ty);
        if (!tile && budget > 0) {
          tile = this.tiles.bake(tx, ty);
          budget--;
        }
        const dx = tx * tilePx - origin.x;
        const dy = ty * tilePx - origin.y;
        if (tile) {
          ctx.drawImage(tile, dx, dy);
        } else {
          missing = true;
          const size = TILE_SIZE * OVERVIEW_SCALE;
          ctx.drawImage(this.overview, tx * size, ty * size, size, size, dx, dy, tilePx, tilePx);
        }
      }
    }
    // Préparation d'une tuile de la couronne extérieure, tant qu'il reste du budget.
    if (budget > 0) {
      prefetch: for (let ty = ty0 - 1; ty <= ty1 + 1; ty++) {
        for (let tx = tx0 - 1; tx <= tx1 + 1; tx++) {
          if (this.tiles.inRange(tx, ty) && !this.tiles.peek(tx, ty)) {
            this.tiles.bake(tx, ty);
            missing = true; // il en reste peut-être d'autres : on continue à la prochaine image
            break prefetch;
          }
        }
      }
    }
    this.firstPaint = false;
    if (missing) this.dirty = true;

    ctx.setTransform(scale, 0, 0, scale, -origin.x, -origin.y);
    if (this.hazardLevel !== null) this.hazard.draw(ctx);
    if (this.floodLevel > 0.02) {
      this.flood.setLevel(this.floodLevel);
      this.flood.draw(ctx);
      const view = { x: origin.x / scale, y: origin.y / scale, w: width / scale, h: height / scale };
      paintAboveWater(ctx, this.commune, view, (p) => this.elevation.isFlooded(p, this.floodLevel));
    }
    if (this.route.length > 0) paintRoute(ctx, this.player, this.route, this.clock, this.reducedMotion);
    const reach = Math.hypot(width, height) / scale / 2 + 80;
    for (const place of this.commune.places) {
      if (distance(place.pos, this.camera) > reach) continue;
      const active = place === this.near;
      paintPlaceMarker(ctx, place, {
        active,
        visited: this.hooks.isVisited(place.id),
        named: active || distance(place.pos, this.player) < 320,
        todo: this.hooks.pendingAt(place.id),
        size: this.markerSize,
        clock: this.clock,
        still: this.reducedMotion,
      });
    }
    paintPlayer(ctx, this.player);
  }
}

/** Fait tourner un angle vers une cible par le plus court chemin. */
function turnToward(current: number, target: number, amount: number): number {
  let delta = (target - current) % (Math.PI * 2);
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return current + delta * Math.min(1, amount);
}
