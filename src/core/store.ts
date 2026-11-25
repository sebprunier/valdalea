export type Listener<T> = (state: T, previous: T) => void;

/** Conteneur d'état minimal : un état immuable, des abonnés prévenus à chaque changement. */
export class Store<T> {
  private readonly listeners = new Set<Listener<T>>();

  constructor(private state: T) {}

  get(): T {
    return this.state;
  }

  update(recipe: (state: T) => T): void {
    const previous = this.state;
    const next = recipe(previous);
    if (next === previous) return;
    this.state = next;
    for (const listener of this.listeners) listener(next, previous);
  }

  subscribe(listener: Listener<T>): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
