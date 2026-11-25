import type { Vec } from '../core/geometry';

export type Action = 'interact' | 'phone' | 'places' | 'help' | 'mission';

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
};

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
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    this.shift = event.shiftKey;
    if (MOVE_KEYS[event.code]) {
      this.down.add(event.code);
      event.preventDefault();
      return;
    }
    const action = ACTION_KEYS[event.code];
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
    if (event.pointerId === this.pointerId) this.trackPointer(event);
  };

  private readonly onPointerEnd = (event: PointerEvent): void => {
    if (event.pointerId === this.pointerId) this.pointerId = null;
  };

  private trackPointer(event: PointerEvent): void {
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.pointerPos = { x: event.clientX - box.left, y: event.clientY - box.top };
    this.pointerFresh = true;
  }
}
