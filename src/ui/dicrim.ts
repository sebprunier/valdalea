import { DICRIM, type DicrimRisk } from '../content/dicrim';
import { SOURCES } from '../content/model';
import { RISK_NAMES } from '../render/riskmap';
import { RISK_IDS, type RiskId } from '../world/model';
import { createBooklet, type Booklet, type BookletDeps, type Section } from './booklet';
import { sourceList } from './documents';
import { h } from './dom';

/**
 * Le DICRIM de Val-d'Aléa, présenté comme un vrai document : couverture, mot des
 * élus, sommaire, un chapitre et une carte par risque, l'alerte, une page mémo.
 * Ce module dit ce qu'il contient ; sa mise en pages et son impression sont
 * celles de tous les livrets du jeu (`booklet`).
 */

/** Rappel porté par chaque page : sortie du jeu, une page imprimée ne doit pas passer pour un document officiel. */
const FICTION_NOTE = "DICRIM de Val-d'Aléa — document fictif, créé pour le jeu « Val-d'Aléa »";

export interface DicrimViewerDeps extends BookletDeps {
  /** Affiche une carte de risque par-dessus le plan du jeu. */
  showOnMap(risk: RiskId): void;
}

export type DicrimViewer = Booklet;

const NS = 'http://www.w3.org/2000/svg';

/** Blason imaginaire de la commune : la falaise, la forêt et la rivière. */
function emblem(): SVGSVGElement {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 120 140');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('cover__emblem');
  svg.innerHTML = `
    <path d="M8 8h104v70c0 30-22 46-52 56C30 124 8 108 8 78z" fill="#fbf8f1" stroke="#1b2733" stroke-width="5"/>
    <path d="M14 78V44l22-22 14 20 8-10 14 18v28z" fill="#aaa094" stroke="#1b2733" stroke-width="3" stroke-linejoin="round"/>
    <path d="M78 76V40l12-18 12 18v36z" fill="#6f9f5c" stroke="#1b2733" stroke-width="3" stroke-linejoin="round"/>
    <path d="M12 84q12-9 24 0t24 0 24 0 24 0v8q-12 9-24 0t-24 0-24 0-24 0z" fill="#a3cfe8" stroke="#1b2733" stroke-width="3"/>
    <path d="M22 106q10-7 19 0t19 0 19 0 19 0" fill="none" stroke="#2c6a92" stroke-width="3" stroke-linecap="round"/>`;
  return svg;
}

export function createDicrimViewer(deps: DicrimViewerDeps): DicrimViewer {
  return createBooklet({
    id: 'dicrim',
    title: "DICRIM de Val-d'Aléa",
    fictionNote: FICTION_NOTE,
    deps,
    compose({ heading, text, block, kicker, riskMap, legend, jump, close }) {
      function riskSection(risk: DicrimRisk): Section {
        // Sans objet sur le papier : le lien garde sa place à l'impression, mais ne s'y voit pas.
        const show = h('button', { type: 'button', class: 'link-button screen-only' }, 'Afficher cette carte sur le plan du jeu');
        show.addEventListener('click', () => {
          deps.showOnMap(risk.id);
          close();
        });
        return {
          id: `dicrim-${risk.id}`,
          blocks: [
            kicker('Les risques de la commune'),
            heading('h3', risk.title),
            heading('h4', 'Le phénomène'),
            ...risk.phenomenon.map(text),
            heading('h4', "À Val-d'Aléa"),
            ...risk.local.map(text),
            riskMap([risk.id], risk.mapSummary, [risk.mapSummary, ' ', show], legend(risk.id)),
            heading('h4', 'Ce que fait la commune'),
            block(h('ul', { class: 'bullets' }, ...risk.commune.map((item) => h('li', null, item)))),
            heading('h4', 'Les bons réflexes'),
            ...risk.reflexes.map((group) => block(h('div', { class: 'reflexes' }, h('p', { class: 'reflexes__title' }, group.heading), h('ul', { class: 'bullets' }, ...group.items.map((item) => h('li', null, item)))))),
            block(sourceList(risk.sources)),
          ],
        };
      }

      const cover = h(
        'article',
        { class: 'page page--cover', id: 'dicrim-couverture' },
        h(
          'div',
          { class: 'cover' },
          emblem(),
          h('p', { class: 'cover__commune' }, `Commune de ${deps.commune.name}`),
          h('p', { class: 'cover__title' }, 'DICRIM'),
          h('p', { class: 'cover__subtitle' }, DICRIM.title),
          h('p', { class: 'cover__edition' }, `${DICRIM.edition} — document à conserver`),
          h(
            'p',
            { class: 'cover__notice' },
            "Document fictif, créé pour le jeu « Val-d'Aléa ». Ce n'est pas un document officiel : la commune, ses habitants et son histoire sont inventés. Les bons réflexes, eux, sont ceux des sources officielles citées à chaque page.",
          ),
        ),
      );

      // Le sommaire : les numéros de page sont inscrits une fois la mise en pages faite.
      const contents: Array<{ id: string; label: string }> = [
        { id: 'dicrim-synthese', label: "Val-d'Aléa face aux risques" },
        ...DICRIM.risks.map((risk) => ({ id: `dicrim-${risk.id}`, label: risk.title })),
        { id: 'dicrim-alerte', label: "L'alerte et la mise à l'abri" },
        { id: 'dicrim-memo', label: 'Mémo à conserver' },
      ];
      const numbers = new Map<string, HTMLElement>();
      const toc = h(
        'ol',
        { class: 'toc' },
        ...contents.map((entry) => {
          const number = h('span', { class: 'toc__page' });
          numbers.set(entry.id, number);
          return h('li', null, jump(entry.label, entry.id), h('span', { class: 'toc__dots', 'aria-hidden': 'true' }), number);
        }),
      );

      const overviewSummary = `La commune est exposée à six risques majeurs. ${DICRIM.risks.map((risk) => `${risk.title} : ${risk.mapSummary}`).join(' ')}`;
      const sections: Section[] = [
        {
          id: 'dicrim-intro',
          blocks: [
            heading('h3', DICRIM.word.title),
            ...DICRIM.word.paragraphs.map(text),
            block(h('p', { class: 'signature' }, DICRIM.word.signature)),
            heading('h4', 'À quoi sert ce document ?'),
            ...DICRIM.about.paragraphs.map(text),
            block(sourceList(DICRIM.about.sources)),
            heading('h4', 'Sommaire'),
            block(toc),
          ],
        },
        {
          id: 'dicrim-synthese',
          blocks: [
            heading('h3', "Val-d'Aléa face aux risques"),
            text('Six risques majeurs concernent la commune. Aucun quartier n’est exposé à tous, et la mairie comme le gymnase des Hauts, où s’organisent les secours et l’hébergement, sont hors de toutes les zones.'),
            riskMap(RISK_IDS, overviewSummary, ['Les zones de risque de la commune, toutes cartes superposées. Chaque risque a sa carte détaillée dans les pages qui suivent.']),
            block(h('ul', { class: 'risk-index' }, ...DICRIM.risks.map((risk) => h('li', null, h('strong', null, `${RISK_NAMES[risk.id]}. `), risk.mapSummary)))),
          ],
        },
        ...DICRIM.risks.map(riskSection),
        {
          id: 'dicrim-alerte',
          blocks: [
            heading('h3', "L'alerte et la mise à l'abri"),
            heading('h4', 'Comment serez-vous alerté ?'),
            ...DICRIM.alert.paragraphs.map(text),
            heading('h4', 'Où serez-vous hébergé ?'),
            text(DICRIM.alert.shelter),
            block(sourceList(DICRIM.alert.sources)),
          ],
        },
        {
          id: 'dicrim-memo',
          blocks: [
            kicker('À détacher et à garder sous la main'),
            heading('h3', 'Mémo à conserver'),
            heading('h4', "Donner l'alerte"),
            block(h('p', { class: 'memo__numbers' }, DICRIM.memo.emergency)),
            heading('h4', "Mon kit d'urgence 72 heures"),
            block(h('ul', { class: 'bullets bullets--columns' }, ...DICRIM.memo.kit.map((item) => h('li', null, item)))),
            text(DICRIM.memo.kitNote),
            heading('h4', "S'informer"),
            block(
              h(
                'ul',
                { class: 'bullets' },
                ...DICRIM.memo.links.map((id) => {
                  const source = SOURCES[id];
                  return h('li', null, h('a', { href: source.url, target: '_blank', rel: 'noopener noreferrer' }, `${source.editeur} : ${source.titre}`, h('span', { class: 'sr-only' }, ' (nouvelle fenêtre)')));
                }),
              ),
            ),
            block(sourceList(DICRIM.memo.sources)),
          ],
        },
      ];

      return {
        cover,
        sections,
        paged(pageOf) {
          for (const [id, number] of numbers) {
            const page = pageOf(id);
            if (page !== null) number.replaceChildren(h('span', { class: 'sr-only' }, 'page '), String(page));
          }
        },
      };
    },
  });
}
