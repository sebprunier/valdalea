/** Petits outils de construction du DOM, sans bibliothèque. */

type Child = Node | string | null | undefined | false;
type Attributes = Record<string, string | boolean | undefined>;

/** Crée un élément HTML. Une valeur `true` donne un attribut booléen ; `false` ou `undefined` l'omet. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes: Attributes | null = null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (attributes) {
    for (const [name, value] of Object.entries(attributes)) {
      if (value === false || value === undefined) continue;
      if (name === 'class') element.className = String(value);
      else element.setAttribute(name, value === true ? '' : value);
    }
  }
  for (const child of children) {
    if (child !== null && child !== undefined && child !== false) element.append(child);
  }
  return element;
}

const ICONS = {
  lieux: 'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  telephone: 'M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm3 17h2',
  aide: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm-2.6-12.6a2.7 2.7 0 1 1 3.8 2.5c-.7.3-1.2.9-1.2 1.6v.5m0 3h.01',
  carte: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14',
  carnet: 'M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6V3Zm0 0v18M10 8h5m-5 4h5',
  reglages: 'M4 7h10m4 0h2M4 17h4m4 0h8M14 5v4M8 15v4',
  fermer: 'M6 6l12 12M18 6 6 18',
  retour: 'M15 5l-7 7 7 7',
  coche: 'M5 12.5l4.5 4.5L19 7.5',
  alerte: 'M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15L6 16Zm4 4a2 2 0 0 0 4 0',
  document: 'M7 3h7l4 4v14H7V3Zm7 0v4h4M10 12h5m-5 4h5',
  medaille: 'M12 14a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm-3-1.2L7.5 21l4.5-2.5 4.5 2.5-1.5-8.2',
  horloge: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-14v5l3 2',
  mission: 'M9 4h6v3H9V4Zm0 1.5H6v15h12v-15h-3M9 12l2 2 4-4.5M9 17h6',
  soleil: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0-14v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4m0-14.2-1.4 1.4M6.3 17.7l-1.4 1.4',
  nuage: 'M7 18a4 4 0 0 1-.6-7.96A5.5 5.5 0 0 1 17 9.5a4.25 4.25 0 0 1 .5 8.5H7Z',
  pluie: 'M7 15a4 4 0 0 1-.6-7.96A5.5 5.5 0 0 1 17 6.5a4.25 4.25 0 0 1 .5 8.5H7Zm1 3.5-1 2.5m5-2.5-1 2.5m5-2.5-1 2.5',
  lune: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z',
  eclaircie: 'M8 19a3.5 3.5 0 0 1-.5-6.96A4.8 4.8 0 0 1 16.6 11a3.7 3.7 0 0 1 .4 8H8ZM12 3v1.5M5.6 5.6l1.1 1.1M3 12h1.5m13.9-6.4-1.1 1.1M9 8.2a3.6 3.6 0 0 1 6 1',
} as const;

export type IconName = keyof typeof ICONS;

/** Pictogramme décoratif (masqué aux technologies d'assistance : le texte voisin porte le sens). */
export function icon(name: IconName): SVGSVGElement {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add('icon');
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', ICONS[name]);
  svg.append(path);
  return svg;
}

/** Zone d'annonce pour les lecteurs d'écran. */
export function createAnnouncer(element: HTMLElement): (message: string) => void {
  let timer = 0;
  return (message) => {
    // Vider puis remplir : un même message répété est de nouveau annoncé.
    element.textContent = '';
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      element.textContent = message;
    }, 60);
  };
}

export function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Élément #${id} introuvable dans la page.`);
  return element as T;
}
