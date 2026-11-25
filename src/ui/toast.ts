import { h } from './dom';

/**
 * Messages brefs affichés en haut de la carte (« le temps presse »). Ils sont
 * aussi lus par les lecteurs d'écran, et rien d'essentiel n'y figure seul :
 * la même information reste visible dans la barre d'état.
 */
export function createToaster(container: HTMLElement): (message: string) => void {
  return (message) => {
    const toast = h('p', { class: 'toast' }, message);
    container.append(toast);
    window.setTimeout(() => toast.remove(), 9000);
  };
}
