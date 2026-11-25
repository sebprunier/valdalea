import { DICRIM, type DicrimRisk } from '../content/dicrim';
import { SOURCES } from '../content/model';
import { createRiskMap, legendOf, RISK_NAMES } from '../render/riskmap';
import type { Elevation } from '../world/elevation';
import { RISK_IDS, type Commune, type RiskId } from '../world/model';
import { createDialog } from './dialog';
import { sourceList } from './documents';
import { h, icon } from './dom';

/**
 * Le DICRIM de Val-d'Aléa, présenté comme un vrai document : couverture, mot des
 * élus, un chapitre et une carte par risque, l'alerte, une page mémo.
 * Sa lecture est libre : le joueur le feuillette, ou le referme.
 *
 * Le document est mis en pages comme une brochure : des feuilles A4, toutes de la
 * même taille, numérotées, avec un sommaire qui renvoie aux bons numéros. Les
 * mêmes pages s'impriment telles quelles, ou s'enregistrent en PDF depuis la
 * fenêtre d'impression du navigateur.
 */

/** Une feuille A4 à 96 points par pouce : à l'écran comme à l'impression, la page a ces dimensions. */
const PAGE_WIDTH = 794;

/** Marge gardée libre en bas de chaque page : l'impression peut couper les lignes un peu autrement que l'écran. */
const SAFETY = 24;

/** Sous cette largeur disponible, des pages réduites seraient illisibles : le document se lit en continu. */
const MIN_PAGED_WIDTH = 620;

/** Rappel porté par chaque page : sortie du jeu, une page imprimée ne doit pas passer pour un document officiel. */
const FICTION_NOTE = "DICRIM de Val-d'Aléa — document fictif, créé pour le jeu « Val-d'Aléa »";

/**
 * Largeurs possibles d'une carte, en pourcentage de la largeur du texte, de la
 * plus grande à la plus petite. Une carte est réduite pour tenir sur la page où
 * commence son chapitre ; le texte qui la suit ne la réduit pas en deçà de `TEXT_MIN`.
 */
const MAP_WIDTHS = [100, 90, 80, 70, 62] as const;
const TEXT_MIN = 80;

/** Un élément du document, que la mise en pages ne coupe pas. */
interface Block {
  node: HTMLElement;
  /** Titre : il ne reste jamais seul en bas de page, il suit le bloc suivant. */
  keep?: boolean;
  /** Carte : sa largeur s'ajuste à la place disponible ; `redraw` la redessine à sa taille finale. */
  figure?: { width: number; redraw(): void };
}

/** Une partie du document : elle commence toujours en haut d'une page. */
interface Section {
  id: string;
  blocks: Block[];
}

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
  const hint = h(
    'p',
    { class: 'document-hint' },
    'Pour garder ce document : « Imprimer ou enregistrer en PDF », puis choisissez « Enregistrer au format PDF » comme imprimante.',
  );
  dialog.body.append(hint, pages);
  let built = false;

  // -------------------------------------------------------------- Impression
  const printButton = h('button', { type: 'button', class: 'button button--small document-print' }, icon('document'), h('span', null, 'Imprimer', h('span', { class: 'document-print__more' }, ' ou enregistrer en PDF')));
  dialog.element.querySelector('.dialog__head .icon-button')?.before(printButton);

  /**
   * Imprime le document, ou l'enregistre en PDF : c'est la fenêtre d'impression
   * du navigateur qui propose les deux. Le temps de l'impression, les pages
   * quittent la fenêtre du jeu pour un conteneur que la feuille de style
   * d'impression est seule à montrer.
   */
  function print(): void {
    const sheet = h('div', { class: 'print-root dialog__body' });
    document.body.append(sheet);
    pages.classList.remove('document--flow');
    pages.style.removeProperty('zoom');
    sheet.append(pages);
    document.documentElement.classList.add('printing');
    const restore = (): void => {
      window.removeEventListener('afterprint', restore);
      document.documentElement.classList.remove('printing');
      dialog.body.append(pages);
      sheet.remove();
      fit();
    };
    window.addEventListener('afterprint', restore);
    window.print();
  }
  printButton.addEventListener('click', print);

  // ------------------------------------------------------------ Mise en pages

  /** Adapte l'affichage à la place disponible : pages entières, réduites au besoin, ou lecture en continu. */
  function fit(): void {
    if (!built || !dialog.isOpen || !pages.isConnected) return;
    const available = dialog.body.clientWidth - 32;
    const paged = available >= MIN_PAGED_WIDTH;
    pages.classList.toggle('document--flow', !paged);
    if (paged && available < PAGE_WIDTH) pages.style.setProperty('zoom', String(available / PAGE_WIDTH));
    else pages.style.removeProperty('zoom');
  }
  new ResizeObserver(fit).observe(dialog.body);

  const newPage = (tight: boolean, id?: string): { page: HTMLElement; body: HTMLElement } => {
    const body = h('div', { class: 'page__body' });
    const page = h('article', { class: tight ? 'page page--tight' : 'page', id }, body);
    pages.append(page);
    return { page, body };
  };

  const resize = (block: Block, width: number): void => {
    block.figure!.width = width;
    block.node.style.setProperty('--map-width', `${width}%`);
    block.node.classList.toggle('risk-map--compact', width < 100);
  };

  /**
   * Répartit les blocs d'une partie sur des pages de taille fixe, mesurées dans
   * le document lui-même. `cap` plafonne la largeur des cartes ; `tight` resserre
   * un peu les espacements.
   */
  function flow(section: Section, cap: number, tight: boolean): HTMLElement[] {
    for (const block of section.blocks) if (block.figure) resize(block, cap);
    let current = newPage(tight, section.id);
    let placed: Block[] = [];
    const laid = [current.page];

    const fits = (): boolean => {
      const last = current.body.lastElementChild;
      if (!last) return true;
      const box = current.body.getBoundingClientRect();
      return last.getBoundingClientRect().bottom <= box.bottom - SAFETY;
    };
    /** Réduit la carte de la page, sans descendre sous `min`, si cela suffit à tout faire tenir. */
    const shrinkFigure = (min: number): boolean => {
      const block = placed.find((candidate) => candidate.figure);
      if (!block?.figure) return false;
      const before = block.figure.width;
      for (const width of MAP_WIDTHS) {
        if (width >= before || width < min) continue;
        resize(block, width);
        if (fits()) return true;
      }
      resize(block, before);
      return false;
    };
    const smallest = MAP_WIDTHS[MAP_WIDTHS.length - 1];
    const place = (blocks: readonly Block[]): void => {
      for (const block of blocks) {
        current.body.append(block.node);
        placed.push(block);
      }
    };

    for (const block of section.blocks) {
      place([block]);
      if (fits() || shrinkFigure(block.figure ? smallest : TEXT_MIN)) continue;
      // Le bloc ne tient pas : il passe à la page suivante, avec les titres qui le précèdent.
      placed.pop();
      block.node.remove();
      const carried: Block[] = [];
      while (placed.length > 0 && placed[placed.length - 1].keep) {
        const title = placed.pop()!;
        title.node.remove();
        carried.unshift(title);
      }
      // Rien d'autre sur la page : le bloc est plus grand qu'elle, il y reste.
      if (placed.length > 0) {
        current = newPage(tight);
        laid.push(current.page);
        placed = [];
      }
      place([...carried, block]);
      if (!fits()) shrinkFigure(smallest);
    }
    return laid;
  }

  /**
   * Met tout le document en pages. Pour chaque partie, on essaie les largeurs de
   * carte, puis les mêmes avec des espacements resserrés, et l'on retient le
   * premier essai qui donne le moins de pages : une carte un peu réduite ou un
   * texte un peu plus serré valent mieux qu'une page presque vide.
   * Renvoie la page où commence chaque partie.
   */
  function paginate(sections: readonly Section[]): Map<string, HTMLElement> {
    const starts = new Map<string, HTMLElement>();
    for (const section of sections) {
      const caps = section.blocks.some((block) => block.figure) ? MAP_WIDTHS : [MAP_WIDTHS[0]];
      let best = { cap: caps[0] as number, tight: false, count: Infinity };
      for (const tight of [false, true]) {
        for (const cap of caps) {
          const trial = flow(section, cap, tight);
          if (trial.length < best.count) best = { cap, tight, count: trial.length };
          for (const page of trial) page.remove();
        }
      }
      starts.set(section.id, flow(section, best.cap, best.tight)[0]);
    }
    return starts;
  }

  // ----------------------------------------------------------------- Contenu
  const heading = (level: 'h3' | 'h4', label: string): Block => ({ node: h(level, { tabindex: '-1' }, label), keep: true });
  const text = (content: string): Block => ({ node: h('p', null, content) });
  const block = (node: HTMLElement): Block => ({ node });

  /** Bouton du sommaire : amène la partie à l'écran et place le focus sur son titre. */
  const jump = (label: string, target: string): HTMLElement => {
    const button = h('button', { type: 'button', class: 'link-button' }, label);
    button.addEventListener('click', () => {
      const article = pages.querySelector<HTMLElement>(`#${target}`);
      article?.scrollIntoView({ block: 'start' });
      article?.querySelector<HTMLElement>('h3')?.focus({ preventScroll: true });
    });
    return button;
  };

  const legend = (risk: RiskId): HTMLElement =>
    h(
      'ul',
      { class: 'legend-list', 'aria-label': 'Légende' },
      ...legendOf(risk).map((entry) => h('li', null, h('span', { class: 'legend-list__swatch', style: entry.swatch, 'aria-hidden': 'true' }), entry.label)),
      h('li', null, h('span', { class: 'legend-list__letter', 'aria-hidden': 'true' }, 'M'), 'Mairie'),
      h('li', null, h('span', { class: 'legend-list__letter', 'aria-hidden': 'true' }, 'H'), "Centre d'hébergement (gymnase des Hauts)"),
    );

  /** Largeur du texte dans la page, en pixels : celle d'une carte à 100 %. */
  const TEXT_WIDTH = PAGE_WIDTH - 2 * 64;

  /** Une carte, sa description, et ce qui va avec elle (légende, lien) : le tout reste sur la même page. */
  const riskMap = (risks: readonly RiskId[], summary: string, caption: Array<Node | string>, ...extras: HTMLElement[]): Block => {
    const draw = (width: number): HTMLCanvasElement => {
      const canvas = createRiskMap({ commune: deps.commune, elevation: deps.elevation, overview: deps.overview, risks, width });
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', `Carte. ${summary}`);
      canvas.classList.add('risk-map__image');
      return canvas;
    };
    let canvas = draw(TEXT_WIDTH);
    const figure = {
      width: 100,
      // Une carte réduite est redessinée à sa taille : ses noms restent lisibles, ses traits nets.
      redraw: (): void => {
        if (figure.width === 100) return;
        const next = draw(Math.round((TEXT_WIDTH * figure.width) / 100));
        canvas.replaceWith(next);
        canvas = next;
      },
    };
    return { node: h('figure', { class: 'risk-map' }, canvas, h('figcaption', null, ...caption), ...extras), figure };
  };

  function riskSection(risk: DicrimRisk): Section {
    // Sans objet sur le papier : le lien garde sa place à l'impression, mais ne s'y voit pas.
    const show = h('button', { type: 'button', class: 'link-button screen-only' }, 'Afficher cette carte sur le plan du jeu');
    show.addEventListener('click', () => {
      deps.showOnMap(risk.id);
      dialog.close();
    });
    return {
      id: `dicrim-${risk.id}`,
      blocks: [
        { node: h('p', { class: 'page__kicker' }, 'Les risques de la commune'), keep: true },
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

  function build(): void {
    // La couverture : une page entière, sans numéro.
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
    pages.replaceChildren(cover);

    // Le sommaire : les numéros de page sont inscrits une fois la mise en pages faite.
    const contents: Array<{ id: string; label: string }> = [
      { id: 'dicrim-synthese', label: "Val-d'Aléa face aux risques" },
      ...DICRIM.risks.map((risk) => ({ id: `dicrim-${risk.id}`, label: risk.title })),
      { id: 'dicrim-alerte', label: "L'alerte et la mise à l'abri" },
      { id: 'dicrim-memo', label: 'Mémo à conserver' },
    ];
    const pageOf = new Map<string, HTMLElement>();
    const toc = h(
      'ol',
      { class: 'toc' },
      ...contents.map((entry) => {
        const number = h('span', { class: 'toc__page' });
        pageOf.set(entry.id, number);
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
          { node: h('p', { class: 'page__kicker' }, 'À détacher et à garder sous la main'), keep: true },
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

    // Mesure à taille réelle, quelle que soit la largeur de l'écran ; l'affichage est ajusté ensuite.
    pages.classList.remove('document--flow');
    pages.classList.add('document--measuring');
    pages.style.removeProperty('zoom');
    const starts = paginate(sections);
    pages.classList.remove('document--measuring');
    for (const section of sections) for (const part of section.blocks) part.figure?.redraw();

    // Numéros : la couverture compte pour la page 1, sans l'afficher.
    const all = [...pages.querySelectorAll<HTMLElement>('.page')];
    all.forEach((page, index) => {
      if (index === 0) return;
      page.append(h('p', { class: 'page__footer' }, h('span', null, FICTION_NOTE), h('span', null, `page ${index + 1} sur ${all.length}`)));
    });
    for (const [id, number] of pageOf) {
      const start = starts.get(id);
      if (start) number.replaceChildren(h('span', { class: 'sr-only' }, 'page '), String(all.indexOf(start) + 1));
    }
  }

  return {
    open(returnFocus) {
      dialog.open(returnFocus);
      // Le document, cartes comprises, n'est fabriqué qu'à la première ouverture :
      // la fenêtre doit être affichée pour que ses pages puissent être mesurées.
      if (!built) {
        build();
        built = true;
      }
      fit();
    },
  };
}
