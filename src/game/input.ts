import type { Vec } from '../core/geometry';

export type Shortcut = 'phone' | 'places' | 'help' | 'mission' | 'legend';

/** `halt` : le joueur pose un second doigt pour pincer ; le déplacement en cours s'arrête. */
export type Action = 'interact' | Shortcut | 'zoom-in' | 'zoom-out' | 'halt';

/**
 * Les touches sont lues par position physique (`event.code`) : ZQSD sur un clavier
 * AZERTY et WASD sur un QWERTY désignent les mêmes touches.
 */
const MOVE_KEYS: Record<string, readonly [number, number]> = {
  ArrowUp: [0, -1],
  KeyW: [0, -1],
  ArrowDown: [0, 1],
  KeyS: [0, 1],
  ArrowLeft: [-1, 0],
  KeyA: [-1, 0],
  ArrowRight: [1, 0],
  KeyD: [1, 0],
};

const ACTION_KEYS: Record<string, Action> = {
  Enter: 'interact',
  NumpadEnter: 'interact',
  Space: 'interact',
  KeyE: 'interact',
  KeyT: 'phone',
  KeyL: 'places',
  KeyH: 'help',
  KeyM: 'mission',
  KeyG: 'legend',
};

/** Le zoom se lit par caractère, lui : « + » et « - » ne sont pas au même endroit sur tous les claviers. */
const ZOOM_KEYS: Record<string, Action> = { '+': 'zoom-in', '=': 'zoom-in', '-': 'zoom-out', _: 'zoom-out' };

/** Écartement des doigts, ou cumul de molette, qui fait changer d'un niveau de zoom. */
const PINCH_STEP = 1.22;
const WHEEL_STEP = 60;

/**
 * Entrées du joueur sur la carte. Le clavier n'est écouté que lorsque la carte a
 * le focus : les raccourcis d'une seule lettre ne parasitent ni le reste de la
 * page ni les technologies d'assistance.
 */
export class Input {
  private readonly down = new Set<string>();
  private pointerId: number | null = null;
  private pointerPos: Vec | null = null;
  private pointerFresh = false;
  private shift = false;
  /** Doigts posés sur la carte (pincement). */
  private readonly touches = new Map<number, Vec>();
  private pinchSpan = 0;
  private wheel = 0;
  private wheelAt = 0;

  /**
   * @param onAction appelé dès qu'une touche d'action est enfoncée (sans attendre l'image suivante)
   */
  constructor(
    private readonly surface: HTMLElement,
    canvas: HTMLCanvasElement,
    private readonly onAction: (action: Action) => void,
  ) {
    surface.addEventListener('keydown', this.onKeyDown);
    surface.addEventListener('keyup', this.onKeyUp);
    surface.addEventListener('blur', () => this.clear());
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerEnd);
    canvas.addEventListener('pointercancel', this.onPointerEnd);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  /** Direction demandée au clavier, normalisée (vecteur nul si aucune). */
  axis(): Vec {
    let x = 0;
    let y = 0;
    for (const code of this.down) {
      const move = MOVE_KEYS[code];
      if (move) {
        x += move[0];
        y += move[1];
      }
    }
    const length = Math.hypot(x, y);
    return length === 0 ? { x: 0, y: 0 } : { x: x / length, y: y / length };
  }

  get running(): boolean {
    return this.shift;
  }

  /**
   * Position du pointeur (en pixels CSS, relative à la carte) s'il vient d'être
   * posé ou déplacé bouton enfoncé ; `null` sinon.
   */
  takePointer(): Vec | null {
    if (!this.pointerFresh) return null;
    this.pointerFresh = false;
    return this.pointerPos;
  }

  clear(): void {
    this.down.clear();
    this.shift = false;
    this.pointerFresh = false;
    this.touches.clear();
    this.wheel = 0;
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    this.shift = event.shiftKey;
    if (MOVE_KEYS[event.code]) {
      this.down.add(event.code);
      event.preventDefault();
      return;
    }
    const action = ACTION_KEYS[event.code] ?? ZOOM_KEYS[event.key];
    if (action) {
      event.preventDefault();
      if (!event.repeat) this.onAction(action);
    }
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.shift = event.shiftKey;
    this.down.delete(event.code);
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    this.surface.focus({ preventScroll: true });
    if (event.pointerType === 'touch') {
      this.touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (this.touches.size === 2) {
        // Deux doigts : on pince pour zoomer, on ne désigne plus de destination.
        this.pinchSpan = this.span();
        this.pointerId = null;
        this.pointerFresh = false;
        this.onAction('halt');
        event.preventDefault();
        return;
      }
    }
    this.pointerId = event.pointerId;
    this.trackPointer(event);
    try {
      // Capture : le glisser continue d'être suivi même si le pointeur sort de la carte.
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    } catch {
      // Pointeur déjà relâché ou non capturable : le simple clic fonctionne quand même.
    }
    event.preventDefault();
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (this.touches.has(event.pointerId)) {
      this.touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (this.touches.size === 2 && this.pinchSpan > 0) {
        const ratio = this.span() / this.pinchSpan;
        if (ratio >= PINCH_STEP || ratio <= 1 / PINCH_STEP) {
          this.onAction(ratio > 1 ? 'zoom-in' : 'zoom-out');
          this.pinchSpan = this.span();
        }
        return;
      }
    }
    if (event.pointerId === this.pointerId) this.trackPointer(event);
  };

  private readonly onPointerEnd = (event: PointerEvent): void => {
    this.touches.delete(event.pointerId);
    if (event.pointerId === this.pointerId) this.pointerId = null;
  };

  /** Molette, ou pincement sur un pavé tactile : un niveau de zoom par cran franc. */
  private readonly onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const now = event.timeStamp;
    if (now - this.wheelAt > 400) this.wheel = 0;
    this.wheelAt = now;
    this.wheel += event.deltaMode === 0 ? event.deltaY : event.deltaY * 30;
    if (Math.abs(this.wheel) < WHEEL_STEP) return;
    this.onAction(this.wheel < 0 ? 'zoom-in' : 'zoom-out');
    this.wheel = 0;
  };

  /** Écartement des deux doigts posés. */
  private span(): number {
    const [a, b] = [...this.touches.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }

  private trackPointer(event: PointerEvent): void {
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.pointerPos = { x: event.clientX - box.left, y: event.clientY - box.top };
    this.pointerFresh = true;
  }
}
