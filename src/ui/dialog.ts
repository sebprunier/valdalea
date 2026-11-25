import { h, icon } from './dom';

/**
 * Fenêtres modales, bâties sur l'élément natif <dialog> : le navigateur gère
 * lui-même le piégeage du focus, la touche Échap et l'inertie de l'arrière-plan.
 */

export interface DialogOptions {
  id: string;
  title: string;
  className?: string;
  /** `false` : la fenêtre ne se ferme ni par Échap ni par un clic à côté. */
  closable?: boolean;
}

export interface DialogHandle {
  readonly element: HTMLDialogElement;
  /** Conteneur du contenu, sous le titre. */
  readonly body: HTMLElement;
  readonly isOpen: boolean;
  /** Ouvre la fenêtre. `returnFocus` reçoit le focus à la fermeture. */
  open(returnFocus?: HTMLElement | null): void;
  close(): void;
  setTitle(title: string): void;
  /** Replace le focus sur le titre (changement de vue à l'intérieur de la fenêtre). */
  focusTitle(): void;
  onClose(listener: () => void): void;
}

type ModalListener = (anyOpen: boolean) => void;

const modalListeners = new Set<ModalListener>();
let openCount = 0;
let fallbackFocus: HTMLElement | null = null;

/** Prévient quand la première fenêtre s'ouvre et quand la dernière se ferme (mise en pause du jeu). */
export function onModalChange(listener: ModalListener): void {
  modalListeners.add(listener);
}

/** Élément qui reçoit le focus à la fermeture d'une fenêtre, à défaut d'autre indication. */
export function setFallbackFocus(element: HTMLElement): void {
  fallbackFocus = element;
}

function notify(): void {
  for (const listener of modalListeners) listener(openCount > 0);
}

export function createDialog(options: DialogOptions): DialogHandle {
  const closable = options.closable ?? true;
  const titleId = `${options.id}-titre`;
  const heading = h('h2', { id: titleId, class: 'dialog__title', tabindex: '-1' }, options.title);
  const body = h('div', { class: 'dialog__body' });
  const closeButton = closable
    ? h('button', { type: 'button', class: 'icon-button', 'aria-label': 'Fermer' }, icon('fermer'))
    : null;
  const element = h(
    'dialog',
    { id: options.id, class: `dialog ${options.className ?? ''}`.trim(), 'aria-labelledby': titleId },
    h('div', { class: 'dialog__panel' }, h('div', { class: 'dialog__head' }, heading, closeButton), body),
  );
  document.body.append(element);

  const closeListeners = new Set<() => void>();
  let returnFocus: HTMLElement | null = null;

  closeButton?.addEventListener('click', () => element.close());
  element.addEventListener('cancel', (event) => {
    if (!closable) event.preventDefault();
  });
  // Clic sur le fond assombri : la cible est alors le <dialog> lui-même.
  element.addEventListener('click', (event) => {
    if (closable && event.target === element) element.close();
  });
  element.addEventListener('close', () => {
    openCount = Math.max(0, openCount - 1);
    for (const listener of closeListeners) listener();
    if (openCount === 0) {
      const target = returnFocus?.isConnected ? returnFocus : fallbackFocus;
      target?.focus({ preventScroll: true });
    }
    notify();
  });

  return {
    element,
    body,
    get isOpen() {
      return element.open;
    },
    open(focusAfter = null) {
      if (element.open) return;
      returnFocus = focusAfter;
      openCount++;
      element.showModal();
      // Le titre reçoit le focus : il est lu en premier, et rien n'est activé par mégarde.
      heading.focus({ preventScroll: true });
      element.scrollTop = 0;
      notify();
    },
    close() {
      if (element.open) element.close();
    },
    setTitle(title) {
      heading.textContent = title;
    },
    focusTitle() {
      heading.focus({ preventScroll: true });
      element.scrollTop = 0;
    },
    onClose(listener) {
      closeListeners.add(listener);
    },
  };
}

/** Demande de confirmation. La promesse vaut `true` si l'action est confirmée. */
export function createConfirm(): (question: { title: string; message: string; confirmLabel: string }) => Promise<boolean> {
  const dialog = createDialog({ id: 'confirmation', title: '', className: 'dialog--narrow' });
  const message = h('p');
  const cancel = h('button', { type: 'button', class: 'button' }, 'Annuler');
  const confirm = h('button', { type: 'button', class: 'button button--primary' });
  dialog.body.append(message, h('div', { class: 'dialog__actions' }, cancel, confirm));

  let resolve: ((confirmed: boolean) => void) | null = null;
  let confirmed = false;
  cancel.addEventListener('click', () => dialog.close());
  confirm.addEventListener('click', () => {
    confirmed = true;
    dialog.close();
  });
  dialog.onClose(() => {
    resolve?.(confirmed);
    resolve = null;
  });

  return (question) => {
    dialog.setTitle(question.title);
    message.textContent = question.message;
    confirm.textContent = question.confirmLabel;
    confirmed = false;
    return new Promise<boolean>((done) => {
      resolve = done;
      dialog.open(document.activeElement instanceof HTMLElement ? document.activeElement : null);
    });
  };
}
