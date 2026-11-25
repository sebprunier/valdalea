import { DICRIM, type DicrimRisk } from '../content/dicrim';
import { SOURCES } from '../content/model';
import { createRiskMap, legendOf, RISK_NAMES } from '../render/riskmap';
import type { Elevation } from '../world/elevation';
import { RISK_IDS, type Commune, type RiskId } from '../world/model';
import { createDialog } from './dialog';
import { sourceList } from './documents';
import { h } from './dom';

/**
 * Le DICRIM de Val-d'Aléa, présenté comme un vrai document : couverture, mot du
 * maire, un chapitre et une carte par risque, l'alerte, une page mémo.
 * Sa lecture est libre : le joueur le feuillette, ou le referme.
 */

export interface DicrimViewerDeps {
  commune: Commune;
  elevation: Elevation;
  /** Plan de la commune à petite échelle, fond des cartes. */
  overview: HTMLCanvasElement;
  /** Affiche une carte de risque par-dessus le plan du jeu. */
  showOnMap(risk: RiskId): void;
}

export interface DicrimViewer {
  open(returnFocus: HTMLElement | null): void;
}

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
  const dialog = createDialog({ id: 'dicrim', title: "DICRIM de Val-d'Aléa", className: 'dialog--document' });
  const pages = h('div', { class: 'document' });
  dialog.body.append(pages);
  let built = false;
  let pageNumber = 0;

  const page = (id: string, ...children: Array<Node | null>): HTMLElement => {
    pageNumber++;
    return h(
      'article',
      { class: 'page', id },
      ...children.filter((child): child is Node => child !== null),
      h('p', { class: 'page__footer' }, h('span', null, `Val-d'Aléa — DICRIM, ${DICRIM.edition.toLowerCase()}`), h('span', null, `page ${pageNumber}`)),
    );
  };

  const heading = (level: 'h3' | 'h4', label: string): HTMLElement => h(level, { tabindex: '-1' }, label);

  /** Bouton du sommaire : amène le chapitre à l'écran et y place le focus. */
  const jump = (label: string, target: string): HTMLElement => {
    const button = h('button', { type: 'button', class: 'link-button' }, label);
    button.addEventListener('click', () => {
      const article = pages.querySelector<HTMLElement>(`#${target}`);
      article?.scrollIntoView({ block: 'start' });
      article?.querySelector<HTMLElement>('h3')?.focus({ preventScroll: true });
    });
    return button;
  };

  const riskMap = (risks: readonly RiskId[], summary: string, caption: string): HTMLElement => {
    const canvas = createRiskMap({ commune: deps.commune, elevation: deps.elevation, overview: deps.overview, risks, width: 620 });
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `Carte. ${summary}`);
    canvas.classList.add('risk-map__image');
    return h('figure', { class: 'risk-map' }, canvas, h('figcaption', null, caption));
  };

  const legend = (risk: RiskId): HTMLElement =>
    h(
      'ul',
      { class: 'legend-list', 'aria-label': 'Légende' },
      ...legendOf(risk).map((entry) => h('li', null, h('span', { class: 'legend-list__swatch', style: entry.swatch, 'aria-hidden': 'true' }), entry.label)),
      h('li', null, h('span', { class: 'legend-list__letter', 'aria-hidden': 'true' }, 'M'), 'Mairie'),
      h('li', null, h('span', { class: 'legend-list__letter', 'aria-hidden': 'true' }, 'H'), "Centre d'hébergement (gymnase des Hauts)"),
    );

  function riskPage(risk: DicrimRisk): HTMLElement {
    const show = h('button', { type: 'button', class: 'button button--small' }, 'Afficher cette carte sur le plan du jeu');
    show.addEventListener('click', () => {
      deps.showOnMap(risk.id);
      dialog.close();
    });
    return page(
      `dicrim-${risk.id}`,
      h('p', { class: 'page__kicker' }, 'Les risques de la commune'),
      heading('h3', risk.title),
      heading('h4', 'Le phénomène'),
      ...risk.phenomenon.map((text) => h('p', null, text)),
      heading('h4', "À Val-d'Aléa"),
      ...risk.local.map((text) => h('p', null, text)),
      riskMap([risk.id], risk.mapSummary, risk.mapSummary),
      legend(risk.id),
      show,
      heading('h4', 'Ce que fait la commune'),
      h('ul', { class: 'bullets' }, ...risk.commune.map((text) => h('li', null, text))),
      heading('h4', 'Les bons réflexes'),
      ...risk.reflexes.map((group) => h('div', { class: 'reflexes' }, h('p', { class: 'reflexes__title' }, group.heading), h('ul', { class: 'bullets' }, ...group.items.map((item) => h('li', null, item))))),
      sourceList(risk.sources),
    );
  }

  function build(): void {
    const cover = page(
      'dicrim-couverture',
      h(
        'div',
        { class: 'cover' },
        emblem(),
        h('p', { class: 'cover__commune' }, `Commune de ${deps.commune.name}`),
        h('p', { class: 'cover__title' }, 'DICRIM'),
        h('p', { class: 'cover__subtitle' }, DICRIM.title),
        h('p', { class: 'cover__edition' }, `${DICRIM.edition} — document à conserver`),
        h('p', { class: 'cover__notice' }, "Document fictif, écrit pour le jeu. La commune, ses habitants et son histoire sont inventés ; les bons réflexes, eux, sont ceux des sources officielles citées à chaque page."),
      ),
    );

    const intro = page(
      'dicrim-intro',
      heading('h3', 'Le mot du maire'),
      ...DICRIM.mayor.word.map((text) => h('p', null, text)),
      h('p', { class: 'signature' }, `${DICRIM.mayor.name}, maire de ${deps.commune.name}`),
      heading('h4', 'À quoi sert ce document ?'),
      ...DICRIM.about.paragraphs.map((text) => h('p', null, text)),
      sourceList(DICRIM.about.sources),
      heading('h4', 'Sommaire'),
      h(
        'ol',
        { class: 'toc' },
        h('li', null, jump("Val-d'Aléa face aux risques", 'dicrim-synthese')),
        ...DICRIM.risks.map((risk) => h('li', null, jump(risk.title, `dicrim-${risk.id}`))),
        h('li', null, jump("L'alerte et la mise à l'abri", 'dicrim-alerte')),
        h('li', null, jump('Mémo à conserver', 'dicrim-memo')),
      ),
    );

    const overviewSummary = `La commune est exposée à six risques majeurs. ${DICRIM.risks.map((risk) => `${risk.title} : ${risk.mapSummary}`).join(' ')}`;
    const synthesis = page(
      'dicrim-synthese',
      heading('h3', "Val-d'Aléa face aux risques"),
      h('p', null, 'Six risques majeurs concernent la commune. Aucun quartier n’est exposé à tous, et la mairie comme le gymnase des Hauts, où s’organisent les secours et l’hébergement, sont hors de toutes les zones.'),
      riskMap(RISK_IDS, overviewSummary, 'Les zones de risque de la commune, toutes cartes superposées. Chaque risque a sa carte détaillée dans les pages qui suivent.'),
      h('ul', { class: 'risk-index' }, ...DICRIM.risks.map((risk) => h('li', null, h('strong', null, `${RISK_NAMES[risk.id]}. `), risk.mapSummary))),
    );

    const alert = page(
      'dicrim-alerte',
      heading('h3', "L'alerte et la mise à l'abri"),
      heading('h4', 'Comment serez-vous alerté ?'),
      ...DICRIM.alert.paragraphs.map((text) => h('p', null, text)),
      heading('h4', 'Où serez-vous hébergé ?'),
      h('p', null, DICRIM.alert.shelter),
      sourceList(DICRIM.alert.sources),
    );

    const memo = page(
      'dicrim-memo',
      h('p', { class: 'page__kicker' }, 'À détacher et à garder sous la main'),
      heading('h3', 'Mémo à conserver'),
      heading('h4', "Donner l'alerte"),
      h('p', { class: 'memo__numbers' }, DICRIM.memo.emergency),
      heading('h4', "Mon kit d'urgence 72 heures"),
      h('ul', { class: 'bullets bullets--columns' }, ...DICRIM.memo.kit.map((item) => h('li', null, item))),
      h('p', null, DICRIM.memo.kitNote),
      heading('h4', "S'informer"),
      h(
        'ul',
        { class: 'bullets' },
        ...DICRIM.memo.links.map((id) => {
          const source = SOURCES[id];
          return h('li', null, h('a', { href: source.url, target: '_blank', rel: 'noopener noreferrer' }, `${source.editeur} : ${source.titre}`, h('span', { class: 'sr-only' }, ' (nouvelle fenêtre)')));
        }),
      ),
      sourceList(DICRIM.memo.sources),
    );

    pages.replaceChildren(cover, intro, synthesis, ...DICRIM.risks.map(riskPage), alert, memo);
  }

  return {
    open(returnFocus) {
      // Le document, cartes comprises, n'est fabriqué qu'à la première ouverture.
      if (!built) {
        build();
        built = true;
      }
      dialog.open(returnFocus);
    },
  };
}
