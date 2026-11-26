import { paintPlaceMarker, paintPlayer } from '../render/actors';
import { paintFireSample } from '../render/fire';
import { paintPlumeSample } from '../render/plume';
import { paintFloodSample } from '../render/flood';
import { paintLegendSample, type LegendSample } from '../render/painter';
import { legendOf, RISK_NAMES } from '../render/riskmap';
import type { PlaceKind, RiskId } from '../world/model';
import { createDialog } from './dialog';
import { h } from './dom';

/**
 * Légende de la carte : ce que représentent les couleurs et les motifs du plan,
 * et les repères posés dessus. Les échantillons sont dessinés par le code même
 * qui dessine la carte.
 */

export interface MapLegendDeps {
  /** Carte de risque affichée sur le plan, ou `null`. */
  getLayer(): RiskId | null;
  hideLayer(): void;
}

export interface MapLegend {
  open(returnFocus: HTMLElement | null): void;
}

const GROUPS: Array<{ title: string; entries: Array<[LegendSample, string]> }> = [
  {
    title: 'Le terrain',
    entries: [
      ['riviere', 'Rivière : la Follette'],
      ['pre', 'Prés et terrains ouverts'],
      ['champ', 'Champs cultivés'],
      ['foret', 'Forêt'],
      ['parc', 'Parc ou square'],
      ['falaise', 'Falaise'],
      ['eboulis', 'Éboulis, au pied de la falaise'],
    ],
  },
  {
    title: 'La commune',
    entries: [
      ['maison', 'Maison et son jardin'],
      ['commerce', 'Commerce : son store sur le trottoir, et son enseigne'],
      ['activite', "Zone d'activité : hangars et ateliers"],
      ['camping', 'Camping'],
      ['place', 'Place ou cour'],
      ['parking', 'Parking : ses places, droites ou en épi'],
      ['route', 'Route principale'],
      ['rue', 'Rue'],
      ['passage', 'Passage piéton'],
      ['chemin', 'Chemin'],
    ],
  },
];

/** Petite image d'un morceau de carte : `world` unités monde par pixel d'écran. */
function sample(width: number, height: number, world: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): HTMLCanvasElement {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const canvas = h('canvas', { class: 'legend-sample', 'aria-hidden': 'true' });
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(ratio / world, ratio / world);
  draw(ctx, width * world, height * world);
  return canvas;
}

const terrain = (kind: LegendSample): HTMLCanvasElement => sample(64, 40, 2, (ctx, w, hh) => paintLegendSample(ctx, kind, w, hh));

function marker(kind: PlaceKind, state: { todo: number; visited: boolean }): HTMLCanvasElement {
  return sample(48, 60, 1.25, (ctx, w, hh) => {
    paintLegendSample(ctx, 'pre', w, hh);
    paintPlaceMarker(ctx, { id: '', name: '', kind, sectorId: '', pos: { x: w / 2, y: hh - 20 } }, { active: false, named: false, size: 1, clock: 0, still: true, ...state });
  });
}

/** Un morceau de carte, et par-dessus ce qu'une crise y ajoute : l'eau, le feu. */
const overlay = (kind: LegendSample, draw: (ctx: CanvasRenderingContext2D, w: number, hh: number) => void): HTMLCanvasElement =>
  sample(64, 40, 2, (ctx, w, hh) => {
    paintLegendSample(ctx, kind, w, hh);
    draw(ctx, w, hh);
  });

const row = (image: HTMLCanvasElement, label: string): HTMLElement => h('li', null, image, h('span', null, label));

export function createMapLegend(deps: MapLegendDeps): MapLegend {
  const dialog = createDialog({ id: 'legende', title: 'Légende de la carte' });
  const layerBox = h('div', { class: 'stack' });
  let built = false;

  function build(): void {
    const groups = GROUPS.flatMap((group) => [h('h3', null, group.title), h('ul', { class: 'map-legend' }, ...group.entries.map(([kind, label]) => row(terrain(kind), label)))]);
    const you = sample(48, 48, 0.75, (ctx, w, hh) => {
      paintLegendSample(ctx, 'pre', w, hh);
      paintPlayer(ctx, { x: w / 2, y: hh / 2, facing: -Math.PI / 2, phase: 0, moving: false });
    });
    dialog.body.append(
      layerBox,
      ...groups,
      h('h3', null, 'Pendant une crise'),
      h(
        'ul',
        { class: 'map-legend' },
        row(overlay('maison', paintFloodSample), "Crue : l'eau qui a débordé"),
        row(overlay('foret', (ctx, w, hh) => paintFireSample(ctx, 'front', w, hh)), 'Feu de forêt : le front des flammes'),
        row(overlay('foret', (ctx, w, hh) => paintFireSample(ctx, 'brule', w, hh)), 'Feu de forêt : ce qui a brûlé'),
        row(overlay('maison', paintPlumeSample), 'Accident industriel : le nuage toxique'),
      ),
      h('h3', null, 'Les repères'),
      h(
        'ul',
        { class: 'map-legend map-legend--tall' },
        row(you, 'Vous'),
        row(marker('quartier', { todo: 0, visited: false }), "Un lieu : approchez-vous, puis ouvrez-le."),
        row(marker('domicile', { todo: 2, visited: false }), 'Des gestes vous y attendent : le chiffre dit combien.'),
        row(marker('mairie', { todo: 0, visited: true }), 'La coche : vous y êtes déjà passé.'),
      ),
      h('p', { class: 'fine-print' }, "Au bord de l'écran, une flèche orange pointe vers un lieu où il reste quelque chose à faire, quand il est hors champ."),
    );
  }

  /** La carte de risque affichée, s'il y en a une : sa légende vient en tête. */
  function renderLayer(): void {
    const risk = deps.getLayer();
    if (!risk) {
      layerBox.replaceChildren();
      layerBox.hidden = true;
      return;
    }
    const hide = h('button', { type: 'button', class: 'button button--small' }, 'Masquer cette carte');
    hide.addEventListener('click', () => {
      deps.hideLayer();
      renderLayer();
      dialog.focusTitle();
    });
    layerBox.hidden = false;
    layerBox.replaceChildren(
      h('h3', null, `Carte de risque affichée : ${RISK_NAMES[risk].toLowerCase()}`),
      h('ul', { class: 'legend-list' }, ...legendOf(risk).map((entry) => h('li', null, h('span', { class: 'legend-list__swatch', style: entry.swatch, 'aria-hidden': 'true' }), entry.label))),
      h('p', { class: 'fine-print' }, "C'est une carte du DICRIM, posée sur le plan : elle montre où le risque existe, pas ce qui se passe en ce moment. Vous pouvez en changer dans le téléphone, application Carte."),
      hide,
    );
  }

  return {
    open(returnFocus) {
      if (!built) {
        build();
        built = true;
      }
      renderLayer();
      dialog.open(returnFocus);
    },
  };
}
