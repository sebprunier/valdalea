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

/** Manette tactile : en deçà de cette course (de 0 à 1), elle est au repos ; au-delà de la seconde, le personnage court. */
const STICK_REST = 0.2;
const STICK_RUN = 0.82;

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
  /** Manette tactile : où le pouce la pousse (longueur de 0 à 1), et le doigt qui la tient. */
  private stick: Vec = { x: 0, y: 0 };
  private stickId: number | null = null;

  /**
   * @param onAction appelé dès qu'une touche d'action est enfoncée (sans attendre l'image suivante)
   * @param stickElement la manette tactile, si la page en a une
   */
  constructor(
    private readonly surface: HTMLElement,
    canvas: HTMLCanvasElement,
    private readonly onAction: (action: Action) => void,
    private readonly stickElement: HTMLElement | null = null,
  ) {
    if (stickElement) this.bindStick(stickElement);
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

  /** Direction demandée au clavier ou à la manette tactile, normalisée (vecteur nul si aucune). */
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
    if (x === 0 && y === 0 && Math.hypot(this.stick.x, this.stick.y) >= STICK_REST) ({ x, y } = this.stick);
    const length = Math.hypot(x, y);
    return length === 0 ? { x: 0, y: 0 } : { x: x / length, y: y / length };
  }

  /** Maj enfoncée, ou manette poussée à fond. */
  get running(): boolean {
    return this.shift || Math.hypot(this.stick.x, this.stick.y) >= STICK_RUN;
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
    this.releaseStick();
  }

  /**
   * La manette tactile : un disque que l'on pousse du pouce dans la direction
   * voulue. Elle a ses propres événements : la toucher ne désigne pas de
   * destination sur la carte.
   */
  private bindStick(element: HTMLElement): void {
    const follow = (event: PointerEvent): void => {
      const box = element.getBoundingClientRect();
      const radius = box.width / 2;
      let x = (event.clientX - box.left - radius) / radius;
      let y = (event.clientY - box.top - radius) / radius;
      const length = Math.hypot(x, y);
      if (length > 1) {
        x /= length;
        y /= length;
      }
      this.stick = { x, y };
      this.showStick(radius);
    };
    element.addEventListener('pointerdown', (event) => {
      this.stickId = event.pointerId;
      try {
        element.setPointerCapture(event.pointerId);
      } catch {
        // Doigt déjà relevé : rien à suivre.
      }
      follow(event);
      event.preventDefault();
    });
    element.addEventListener('pointermove', (event) => {
      if (event.pointerId === this.stickId) follow(event);
    });
    const release = (event: PointerEvent): void => {
      if (event.pointerId === this.stickId) this.releaseStick();
    };
    element.addEventListener('pointerup', release);
    element.addEventListener('pointercancel', release);
    element.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  private releaseStick(): void {
    this.stickId = null;
    this.stick = { x: 0, y: 0 };
    this.showStick(0);
  }

  /** Le bouton de la manette suit le pouce ; son état « course » se lit aussi à sa taille, pas seulement à sa couleur. */
  private showStick(radius: number): void {
    const element = this.stickElement;
    if (!element) return;
    const knob = element.querySelector<HTMLElement>('.stick__knob');
    if (knob) knob.style.transform = `translate(${this.stick.x * radius * 0.6}px, ${this.stick.y * radius * 0.6}px)`;
    element.dataset.running = String(Math.hypot(this.stick.x, this.stick.y) >= STICK_RUN);
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
