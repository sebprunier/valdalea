import { BROCHURE } from '../content/brochure';
import { SOURCES } from '../content/model';
import type { RiskId } from '../world/model';
import { createBooklet, type Booklet, type BookletDeps, type Section } from './booklet';
import { sourceList } from './documents';
import { h } from './dom';

/**
 * « Si la sirène retentit » : la brochure d'information des riverains de l'usine,
 * que le joueur prend à la mairie. Un livret comme le DICRIM : mêmes pages, même
 * impression, et la même mention « document fictif » sur chacune.
 */

const FICTION_NOTE = "Brochure « Si la sirène retentit » — document fictif, créé pour le jeu « Val-d'Aléa »";

export interface BrochureViewerDeps extends BookletDeps {
  /** Affiche une carte de risque par-dessus le plan du jeu. */
  showOnMap(risk: RiskId): void;
}

const NS = 'http://www.w3.org/2000/svg';

/** Pictogramme de couverture, imaginaire : une usine, et l'onde de sa sirène. */
function emblem(): SVGSVGElement {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 140 120');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('cover__emblem');
  svg.innerHTML = `
    <path d="M10 108V66l26-16v16l26-16v16l26-16v58z" fill="#d8d5ce" stroke="#1b2733" stroke-width="5" stroke-linejoin="round"/>
    <path d="M96 108V24h18v84z" fill="#fbf8f1" stroke="#1b2733" stroke-width="5" stroke-linejoin="round"/>
    <path d="M24 108V88h16v20zm30-20h22v10H54z" fill="#fbf8f1" stroke="#1b2733" stroke-width="4" stroke-linejoin="round"/>
    <path d="M84 20a22 22 0 0 1 0-16M72 26a36 36 0 0 1 0-28M126 20a22 22 0 0 0 0-16" fill="none" stroke="#b93d0a" stroke-width="5" stroke-linecap="round" transform="translate(0 8)"/>
    <path d="M4 110h132" stroke="#1b2733" stroke-width="5" stroke-linecap="round"/>`;
  return svg;
}

/**
 * Le signal d'alerte en image : trois sonneries d'une minute quarante et une, puis, pour la fin de l'alerte, une
 * sonnerie de trente secondes. Le schéma ne dit rien de plus que le texte ; il ne montre pas les silences, que la
 * source ne chiffre pas.
 */
function signalFigure(label: string): HTMLElement {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 660 150');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', label);
  const bar = (x: number, y: number, w: number, fill: string, text: string): string =>
    `<rect x="${x}" y="${y}" width="${w}" height="30" rx="6" fill="${fill}" stroke="#1b2733" stroke-width="2"/><text x="${x + w / 2}" y="${y + 50}" text-anchor="middle" font-size="15" fill="#1b2733">${text}</text>`;
  svg.innerHTML = `
    <text x="0" y="31" font-size="16" font-weight="700" fill="#1b2733">Alerte</text>
    ${[150, 320, 490].map((x) => bar(x, 10, 150, '#e0703f', '1 min 41 s')).join('')}
    <text x="0" y="111" font-size="16" font-weight="700" fill="#1b2733">Fin de l'alerte</text>
    ${bar(150, 90, 56, '#8fbf9f', '30 s')}`;
  return h('figure', { class: 'signal-figure' }, svg);
}

export function createBrochureViewer(deps: BrochureViewerDeps): Booklet {
  return createBooklet({
    id: 'brochure-usine',
    title: `${BROCHURE.title} — brochure de l'usine`,
    fictionNote: FICTION_NOTE,
    deps,
    compose({ heading, text, block, kicker, riskMap, legend, close }) {
      const cover = h(
        'article',
        { class: 'page page--cover', id: 'brochure-couverture' },
        h(
          'div',
          { class: 'cover' },
          emblem(),
          h('p', { class: 'cover__commune' }, BROCHURE.site),
          h('p', { class: 'cover__title cover__title--long' }, BROCHURE.title),
          h('p', { class: 'cover__subtitle' }, BROCHURE.subtitle),
          h('p', { class: 'cover__editor' }, BROCHURE.editor),
          h('p', { class: 'cover__edition' }, BROCHURE.edition),
          h(
            'p',
            { class: 'cover__notice' },
            "Document fictif, créé pour le jeu « Val-d'Aléa ». Ce n'est pas un document officiel : l'usine, la commune et leurs habitants sont inventés. La conduite à tenir, elle, est celle des sources officielles citées à chaque page.",
          ),
        ),
      );

      // Sans objet sur le papier : le lien garde sa place à l'impression, mais ne s'y voit pas.
      const show = h('button', { type: 'button', class: 'link-button screen-only' }, 'Afficher cette carte sur le plan du jeu');
      show.addEventListener('click', () => {
        deps.showOnMap('industriel');
        close();
      });

      const sections: Section[] = [
        {
          id: 'brochure-site',
          blocks: [
            heading('h3', BROCHURE.why.title),
            ...BROCHURE.why.paragraphs.map(text),
            block(sourceList(BROCHURE.why.sources)),
            heading('h3', BROCHURE.where.title),
            ...BROCHURE.where.paragraphs.map(text),
            riskMap(['industriel'], BROCHURE.where.mapSummary, [BROCHURE.where.mapSummary, ' ', show], legend('industriel')),
          ],
        },
        {
          id: 'brochure-conduite',
          // Une page à elle seule : c'est celle que l'on garde sous les yeux.
          blocks: [
            kicker('À garder près de votre porte'),
            heading('h3', BROCHURE.conduct.title),
            ...BROCHURE.conduct.groups.map((group) => block(h('div', { class: 'reflexes' }, h('p', { class: 'reflexes__title' }, group.heading), h('ul', { class: 'bullets' }, ...group.items.map((item) => h('li', null, item)))))),
            block(sourceList(BROCHURE.conduct.sources)),
          ],
        },
        {
          id: 'brochure-alerte',
          blocks: [
            heading('h3', BROCHURE.signal.title),
            ...BROCHURE.signal.paragraphs.slice(0, 2).map(text),
            block(signalFigure(BROCHURE.signal.figure)),
            ...BROCHURE.signal.paragraphs.slice(2).map(text),
            block(sourceList(BROCHURE.signal.sources)),
            heading('h3', BROCHURE.more.title),
            text(BROCHURE.more.text),
            block(
              h(
                'ul',
                { class: 'bullets' },
                ...BROCHURE.more.links.map((id) => {
                  const source = SOURCES[id];
                  return h('li', null, h('a', { href: source.url, target: '_blank', rel: 'noopener noreferrer' }, `${source.editeur} : ${source.titre}`, h('span', { class: 'sr-only' }, ' (nouvelle fenêtre)')));
                }),
              ),
            ),
          ],
        },
      ];
      return { cover, sections };
    },
  });
}
