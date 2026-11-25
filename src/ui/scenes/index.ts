import { faces, renderIso, shade, type IsoCanvas } from './iso';

/**
 * Vues rapprochées des lieux, dessinées en fausse 3D. Chaque scène reflète ce
 * que le joueur a fait (batardeaux posés, sac prêt…) et la hauteur de l'eau.
 * Les points d'intérêt portent l'identifiant de l'action qui s'y déroule.
 */

export interface SceneState {
  /** L'action a-t-elle été accomplie ? */
  did(actionId: string): boolean;
  /** Hauteur d'eau dans le lieu, en mètres (0 hors crue). */
  water: number;
  /** Hauteur de la crue, en mètres au-dessus du niveau normal de la rivière. */
  flood: number;
  /**
   * Hauteur qu'a atteinte ici la crue de 1958, si le joueur a lu le repère de
   * crue (et si le lieu a été inondé) ; `null` sinon.
   */
  mark1958: number | null;
}

export interface Scene {
  svg: SVGSVGElement;
  /** Position des points d'intérêt, en pourcentage de l'image. */
  spots: Map<string, { left: number; top: number }>;
}

const GRASS = '#cfe2b4';
const PAVING = '#ece3d2';
const ROAD = '#f6f2e9';
const LINE = '#6f6558';
const WALL = faces('#f4ebd9', LINE);
const TILE = { slope: '#d98561', shade: '#b9684a', gable: '#e6dcc8', line: '#8f4c33' };
const SLATE = { slope: '#8491a0', shade: '#667381', gable: '#e6dcc8', line: '#4c5763' };
const STEEL = { slope: '#cfd6dc', shade: '#aeb8c0', gable: '#dfe3e6', line: '#7f8b95' };
const GLASS = '#b7d2e6';
const LIT = '#ffe7a3';
const DOOR = '#7a5a3c';

function windowsLeft(c: IsoCanvas, y: number, z: number, xs: number[], fill = GLASS, w = 1.2, h = 1.2): void {
  for (const x of xs) c.panelLeft(x, y, z, w, h, fill, LINE);
}

// ------------------------------------------------------------------- Maisons

function house(state: SceneState): Scene {
  const prepared = state.did('maison-protections');
  const installed = state.did('maison-installer');
  const sheltered = state.did('maison-abri');
  return renderIso({
    ground: { w: 18, d: 16 },
    water: state.water,
    label: describe(
      'Votre maison, à un étage, vue depuis le quai.',
      installed ? 'Des batardeaux barrent la porte.' : prepared ? 'Des batardeaux sont rangés contre la façade.' : '',
      state.did('maison-kit') ? "Le sac du kit d'urgence est prêt." : '',
      state.mark1958 ? `Un trait rouge sur la façade marque le niveau de la crue de 1958 : ${heightLabel(state.mark1958)}.` : '',
      state.water > 0 ? `L'eau entoure la maison sur ${heightLabel(state.water)}.` : '',
    ),
    draw(c) {
      c.ground(0, 0, 18, 13, GRASS);
      c.ground(0, 13, 18, 3, ROAD, 0, '#d8cfbe');
      c.ground(8.3, 10, 1.3, 3, PAVING);
      c.tree(2.6, 3.6, 5);

      // Abri de jardin, au fond
      c.box(14.6, 2.2, 0, 2.4, 2.2, 2, faces('#b98f63', LINE));
      c.gable(14.4, 2, 2, 2.8, 2.6, 0.7, { slope: '#8a6a4a', shade: '#6f553b', gable: '#b98f63', line: LINE });
      c.panelLeft(15.3, 4.4, 0, 0.9, 1.7, state.did('maison-polluants') ? '#5f7a4a' : DOOR, LINE);

      // Maison
      c.box(5, 4, 0, 8, 6, 5.2, WALL);
      c.panelRight(13, 5.6, 1, 1.4, 1.2, GLASS, LINE);
      c.panelRight(13, 5.6, 3.5, 1.4, 1.2, GLASS, LINE);
      // Coffret électrique et gaz, sur le pignon
      c.panelRight(13, 8.4, 0.8, 0.8, 0.9, state.did('maison-reseaux') ? '#8f9aa3' : '#c9d1d8', LINE);
      // Soupirail de la cave
      c.panelLeft(5.5, 10, 0.12, 0.8, 0.3, '#3a3f45', LINE);
      windowsLeft(c, 10, 1, [6.1, 10.7]);
      windowsLeft(c, 10, 3.5, [6.1, 10.7]);
      // Fenêtre de la zone refuge
      c.panelLeft(8.25, 10, 3.4, 1.4, 1.4, state.did('maison-refuge') || sheltered ? LIT : GLASS, LINE);
      c.panelLeft(8.4, 10, 0, 1.1, 2.1, DOOR, LINE);
      c.gable(4.6, 3.6, 5.2, 8.8, 6.8, 2.3, TILE);
      c.box(10.6, 6.3, 6.4, 0.6, 0.6, 1.5, faces('#c9a58a', LINE));

      // Protections
      if (installed) {
        c.panelLeft(8.25, 10.06, 0, 1.4, 0.95, '#9eabb6', '#4c5763');
        c.box(8.1, 10.15, 0, 0.5, 0.3, 0.22, faces('#d8c9a3', LINE));
        c.box(9.3, 10.15, 0, 0.5, 0.3, 0.22, faces('#d8c9a3', LINE));
      } else if (prepared) {
        c.box(11.95, 10.02, 0, 0.9, 0.14, 0.95, faces('#9eabb6', '#4c5763'));
        c.box(12.1, 10.3, 0, 0.5, 0.3, 0.22, faces('#d8c9a3', LINE));
      }
      if (state.did('maison-kit') && !sheltered) c.box(6.5, 10.3, 0, 0.55, 0.4, 0.5, faces('#e2702a', '#8a3209'));

      // Votre voiture, sur le quai
      c.box(2.6, 13.7, 0, 4.2, 1.8, 0.8, faces('#3f6f9f', '#27496b'));
      c.box(3.5, 13.8, 0.8, 2.3, 1.6, 0.6, faces('#cfe1ee', '#27496b'));

      floodMarkOnWalls(c, state, 5, 4, 8, 6);

      c.spot('maison-kit', 6.8, 10.5, 0.9);
      c.spot('maison-protections', 8.95, 10.1, 1.3);
      c.spot('maison-installer', 8.95, 10.1, 1.3);
      c.spot('maison-refuge', 8.95, 10, 4.1);
      c.spot('maison-abri', 8.95, 10, 4.1);
      c.spot('maison-diagnostic', 13, 6.3, 2.75);
      c.spot('maison-reseaux', 13, 8.8, 1.25);
      c.spot('maison-polluants', 15.75, 4.4, 1);
    },
  });
}

function neighbourHouse(state: SceneState): Scene {
  const away = state.did('jeanne-accueil');
  return renderIso({
    ground: { w: 16, d: 14 },
    water: state.water,
    label: describe(
      'La maison de Jeanne, de plain-pied, sans étage.',
      away ? 'Les volets sont fermés : Jeanne est à l’abri chez vous.' : 'Jeanne se tient devant sa porte.',
      state.water > 0 ? `L'eau entoure la maison sur ${heightLabel(state.water)}.` : '',
    ),
    draw(c) {
      c.ground(0, 0, 16, 11, GRASS);
      c.ground(0, 11, 16, 3, ROAD, 0, '#d8cfbe');
      c.ground(7.1, 9, 1.3, 2, PAVING);
      c.tree(13, 3, 4.4);
      c.box(4, 3.5, 0, 8, 5.5, 2.8, WALL);
      c.panelRight(12, 5, 1, 1.4, 1.2, away ? '#9aa39a' : GLASS, LINE);
      windowsLeft(c, 9, 1, [5, 9.6], away ? '#9aa39a' : GLASS);
      c.panelLeft(7.2, 9, 0, 1.1, 2.1, '#5d7d6b', LINE);
      c.gable(3.6, 3.1, 2.8, 8.8, 6.3, 2, TILE);
      // Banc
      c.box(9.4, 9.3, 0, 1.6, 0.45, 0.45, faces('#a98660', LINE));
      floodMarkOnWalls(c, state, 4, 3.5, 8, 5.5);
      if (!away) c.person(7.75, 9.7, '#7c5c8e');
      c.spot('jeanne-refuge', 7.75, 9.6, 1.9);
      c.spot('jeanne-accueil', 7.75, 9.6, 1.9);
    },
  });
}

// ------------------------------------------------------------------- Mairie

function townHall(): Scene {
  return renderIso({
    ground: { w: 24, d: 17 },
    label: "La mairie et son parvis. Un panneau d'affichage se dresse à gauche de l'entrée.",
    draw(c) {
      c.ground(0, 0, 24, 17, GRASS);
      c.ground(2, 9.6, 20, 7.4, PAVING, 0, '#d8cdb8');
      c.tree(2.2, 5, 5.2);
      c.tree(21.8, 5, 5.2);
      c.box(5, 3, 0, 14, 6.4, 6.4, WALL);
      for (const z of [1.3, 4]) {
        windowsLeft(c, 9.4, z, [6, 8, 14.8, 16.8], GLASS, 1.2, 1.6);
        c.panelRight(19, 4.2, z, 1.2, 1.6, GLASS, LINE);
        c.panelRight(19, 6.6, z, 1.2, 1.6, GLASS, LINE);
      }
      c.gable(4.6, 2.6, 6.4, 14.8, 7.2, 2.6, SLATE);
      // Avant-corps de l'entrée et perron
      c.box(10.2, 9.4, 0, 3.6, 0.7, 6.9, WALL);
      c.box(9.8, 10.1, 0, 4.4, 1, 0.3, faces('#ddd3c0', LINE));
      c.panelLeft(11.3, 10.1, 0.3, 1.4, 2.6, DOOR, LINE);
      c.panelLeft(11.25, 10.1, 4.1, 1.5, 1.7, GLASS, LINE);
      c.signLeft(12, 10.12, 3.25, 'MAIRIE', 0.62, '#3f392f');
      // Sirène d'alerte, sur le toit
      c.box(15.6, 5.9, 8.9, 0.5, 0.5, 0.9, faces('#9aa3ab', LINE));

      // Panneau d'affichage
      c.box(5.2, 12, 0, 0.14, 0.14, 2, faces('#6f553b'));
      c.box(7.36, 12, 0, 0.14, 0.14, 2, faces('#6f553b'));
      c.panelLeft(5.2, 12.14, 0.8, 2.3, 1.25, '#fbf7ee', '#6f553b');
      c.panelLeft(5.45, 12.15, 1.05, 0.8, 0.8, '#d9e6f2', LINE);
      c.panelLeft(6.45, 12.15, 1.05, 0.8, 0.8, '#f2dcc9', LINE);

      c.person(13.7, 11.6, '#35506b');
      c.spot('mairie-accueil', 13.7, 11.6, 1.9);
      c.spot('mairie-dicrim', 6.35, 12.2, 1.45);
    },
  });
}

// --------------------------------------------------------------------- Pont

function bridge(state: SceneState): Scene {
  // Dans cette scène, le niveau normal de la rivière est à 0,4 m du fond ; la crue s'y ajoute.
  const NORMAL = 0.4;
  const BANK = 3;
  const level = Math.min(BANK - 0.1, NORMAL + state.flood);
  const mark = NORMAL + 1.8; // la crue de 1958, un peu plus haute que celle du chapitre
  const bank = faces('#b9c59a', LINE);
  const stone = faces('#cbbfa9', LINE);
  return renderIso({
    ground: { w: 22, d: 14 },
    label: describe(
      'Le pont de la Follette. Sur sa pile, une plaque marque le niveau atteint par la crue de 1958.',
      state.flood > 0.3 ? "La rivière en crue monte le long de la pile, tout près du repère." : '',
    ),
    draw(c) {
      const water = (y0: number, y1: number): void =>
        c.polygon([[6, y0, level], [16, y0, level], [16, y1, level], [6, y1, level]], state.flood > 0.3 ? '#7d9fb0' : '#8fc1de', { opacity: 0.94 });
      c.ground(6, 0, 10, 14, '#6f9fbd');
      c.box(0, 0, 0, 6, 14, BANK, bank);
      c.ground(0, 4.8, 6, 3.6, ROAD, BANK);
      // L'eau derrière la pile, la pile, puis l'eau devant : la pile a les pieds dans la rivière.
      water(0, 8.1);
      c.box(10.2, 5.1, 0, 1.6, 3, BANK, stone);
      water(8.1, 14);
      c.polygon([[6, 14, 0], [16, 14, 0], [16, 14, level], [6, 14, level]], '#5f8ca8');
      for (const [x, y] of [[7.5, 10], [12.8, 11.5], [9.5, 12.8]] as const) c.line([x, y, level], [x + 1.6, y, level], '#ffffff', 1.5);
      // Repère de crue, sur la pile
      c.panelLeft(10.45, 8.11, mark - 0.55, 1.1, 0.7, '#fbf7ee', '#3f392f');
      c.line([10.45, 8.12, mark], [11.55, 8.12, mark], '#b93d0a', 2.5);
      c.signLeft(11, 8.13, mark - 0.42, '1958', 0.3, '#3f392f');
      // Rive droite et tablier
      c.box(16, 0, 0, 6, 14, BANK, bank);
      c.ground(16, 4.8, 6, 3.6, ROAD, BANK);
      c.box(5.4, 4.8, BANK, 11.2, 3.6, 0.35, faces('#e9e2d4', LINE));
      c.box(5.4, 4.8, BANK + 0.35, 11.2, 0.25, 0.8, stone);
      c.box(5.4, 8.15, BANK + 0.35, 11.2, 0.25, 0.8, stone);
      c.spot('pont-repere', 11, 8.2, mark - 0.2);
    },
  });
}

// -------------------------------------------------------------------- École

function school(state: SceneState): Scene {
  return renderIso({
    ground: { w: 24, d: 16 },
    water: state.water,
    label: describe("L'école du Quai, à un étage, et sa cour.", state.water > 0 ? `L'eau a envahi la cour sur ${heightLabel(state.water)}. Les fenêtres de l'étage sont éclairées.` : ''),
    draw(c) {
      c.ground(0, 0, 24, 13, PAVING);
      c.ground(0, 13, 24, 3, ROAD, 0, '#d8cfbe');
      c.tree(21, 3.5, 5);
      c.box(4, 2.6, 0, 15, 6, 6, WALL);
      windowsLeft(c, 8.6, 1.1, [5, 7.2, 9.4, 13.6, 15.8], GLASS, 1.5, 1.5);
      windowsLeft(c, 8.6, 3.9, [5, 7.2, 9.4, 11.5, 13.6, 15.8], state.water > 0 ? LIT : GLASS, 1.5, 1.5);
      c.panelRight(19, 4.2, 1.1, 1.5, 1.5, GLASS, LINE);
      c.panelRight(19, 4.2, 3.9, 1.5, 1.5, state.water > 0 ? LIT : GLASS, LINE);
      c.panelLeft(11.5, 8.6, 0, 1.5, 2.4, '#4f7a8c', LINE);
      c.signLeft(12.25, 8.62, 2.75, 'ÉCOLE', 0.55, '#3f392f');
      c.gable(3.6, 2.2, 6, 15.8, 6.8, 2.4, TILE);
      // Préau
      c.box(0.8, 9.6, 2.6, 4.4, 2.6, 0.2, faces('#b9684a', LINE));
      for (const [x, y] of [[0.9, 9.7], [5, 9.7], [0.9, 12], [5, 12]] as const) c.box(x, y, 0, 0.16, 0.16, 2.6, faces('#8a6a4a'));
      if (state.water <= 0) c.person(13.6, 9.8, '#a04d3c');
      c.spot('ecole-plan', 13.6, 9.7, 1.9);
    },
  });
}

// ------------------------------------------------------------------ Camping

function campsite(state: SceneState): Scene {
  const checked = state.did('camping-consignes');
  return renderIso({
    ground: { w: 24, d: 16 },
    water: state.water,
    label: describe(
      'Le camping des Berges : le chalet de l’accueil, des tentes et des mobil-homes.',
      checked ? 'Les consignes sont affichées sur le panneau, près de l’accueil.' : '',
      state.water > 0 ? `L'eau recouvre les emplacements sur ${heightLabel(state.water)}.` : '',
    ),
    draw(c) {
      c.ground(0, 0, 24, 16, '#cbe3ae');
      c.ground(10.5, 0, 2.2, 16, '#dccba6');
      c.tree(2, 2, 5);
      c.tree(22, 2.5, 4.6);
      // Mobil-homes
      for (const x of [2.6, 14.2]) {
        c.box(x, 3.4, 0.3, 5.6, 2.4, 2.2, faces('#f1efe8', LINE));
        c.panelLeft(x + 0.6, 5.8, 1.1, 1.2, 0.9, GLASS, LINE);
        c.panelLeft(x + 3.6, 5.8, 0.3, 0.9, 1.9, '#7c9eb5', LINE);
      }
      // Tentes
      const tents: Array<[number, number, string]> = [[3, 9, '#e9a23b'], [7, 11.5, '#4f8fc0'], [15, 9.5, '#d9604a']];
      for (const [x, y, color] of tents) {
        c.gable(x, y, 0, 2.8, 2.4, 1.5, { slope: color, shade: shade(color, 0.75), gable: shade(color, 0.9), line: LINE });
      }
      // Chalet de l'accueil
      c.box(18, 8.6, 0, 4.2, 3.4, 2.6, faces('#c79f73', LINE));
      c.panelLeft(19, 12, 0, 1, 2, DOOR, LINE);
      c.panelLeft(20.5, 12, 1, 1.2, 1, GLASS, LINE);
      c.gable(17.7, 8.3, 2.6, 4.8, 4, 1.3, TILE);
      c.signLeft(20.1, 12.02, 2.15, 'ACCUEIL', 0.36, '#3f392f');
      // Panneau des consignes
      c.box(15.2, 13, 0, 0.14, 0.14, 2, faces('#6f553b'));
      c.box(17.06, 13, 0, 0.14, 0.14, 2, faces('#6f553b'));
      c.panelLeft(15.2, 13.14, 0.85, 2, 1.15, checked ? '#fbf7ee' : '#e3dccb', '#6f553b');
      if (checked) {
        c.panelLeft(15.4, 13.15, 1.05, 0.7, 0.75, '#f2dcc9', LINE);
        c.panelLeft(16.3, 13.15, 1.05, 0.7, 0.75, '#d9e6f2', LINE);
      }
      if (state.water <= 0) c.person(18.3, 13.2, '#4f7a3a');
      c.spot('camping-consignes', 16.2, 13.2, 1.45);
    },
  });
}

// ------------------------------------------------------------------ Gymnase

function sportsHall(state: SceneState): Scene {
  const ready = state.did('gymnase-preparation');
  const open = state.did('gymnase-ouverture');
  return renderIso({
    ground: { w: 26, d: 18 },
    label: describe(
      'Le gymnase des Hauts et son parking.',
      open ? "Les portes sont ouvertes : c'est le centre d'hébergement." : ready ? 'Des lits de camp et des cartons sont prêts près de l’entrée.' : '',
    ),
    draw(c) {
      c.ground(0, 0, 26, 18, GRASS);
      c.ground(1, 11.4, 24, 6.6, '#d9d6cf', 0, '#c4c0b7');
      for (let x = 3; x < 25; x += 2.4) c.line([x, 14.4, 0], [x, 17.8, 0], '#ffffff', 1.5);
      c.box(5, 2.6, 0, 16, 8.6, 6.2, faces('#e3e7ea', '#7f8b95'));
      for (let x = 6.2; x < 21; x += 2.4) c.panelLeft(x, 11.2, 3.6, 1.6, 1.4, GLASS, '#7f8b95');
      c.panelLeft(11.6, 11.2, 0, 2.8, 2.8, open ? '#3a3f45' : '#6f8394', '#4c5763');
      c.gable(4.7, 2.3, 6.2, 16.6, 9.2, 2.2, STEEL);
      if (open) c.signLeft(13, 11.22, 2.95, 'HÉBERGEMENT', 0.42, '#b93d0a');
      if (ready || open) {
        for (const [x, z] of [[15, 0], [15.9, 0], [15.45, 0.55]] as const) c.box(x, 11.6, z, 0.8, 0.8, 0.55, faces('#c9a877', LINE));
        c.box(17.2, 11.6, 0, 2, 0.8, 0.35, faces('#6f8f6a', LINE));
      }
      if (open) {
        c.person(10.6, 12.6, '#b5432b');
        c.person(9.6, 13.4, '#2f6f8f');
      }
      c.person(14.8, 12.9, '#e2702a');
      c.spot('gymnase-preparation', 13, 11.4, 1.9);
      c.spot('gymnase-ouverture', 13, 11.4, 1.9);
    },
  });
}

// ---------------------------------------------------------------------------

/** Trait pointillé à la hauteur de la crue de 1958, sur les deux façades visibles d'un bâtiment. */
function floodMarkOnWalls(c: IsoCanvas, state: SceneState, x: number, y: number, w: number, d: number): void {
  const z = state.mark1958;
  if (z === null || z <= 0.05) return;
  c.dashedLine([x, y + d + 0.02, z], [x + w + 0.02, y + d + 0.02, z], '#b93d0a');
  c.dashedLine([x + w + 0.02, y + d + 0.02, z], [x + w + 0.02, y, z], '#b93d0a');
  c.signLeft(x + 1, y + d + 0.03, z + 0.12, '1958', 0.42, '#b93d0a');
}

function describe(...sentences: string[]): string {
  return sentences.filter(Boolean).join(' ');
}

function heightLabel(meters: number): string {
  const cm = Math.round((meters * 100) / 10) * 10;
  return cm >= 100 ? `${(cm / 100).toFixed(1).replace('.', ',')} m` : `${cm} cm`;
}

// ------------------------------------------------- La maison en lisière

/**
 * Ce qui a été fait sur le terrain de Lucien, par identifiant de choix : pendant
 * le geste, ce que le joueur a coché ; ensuite, le travail accompli.
 */
export type BrushWork = ReadonlySet<string>;

/** Le terrain une fois débroussaillé dans les règles. */
const BRUSH_DONE: BrushWork = new Set(['herbes', 'buissons', 'espacer', 'combustibles']);

const TALL_GRASS = faces('#a9ba6a', '#7d8c47');
const BUSH = faces('#5f8f4f', '#40683a');
const WOOD = faces('#a5744a', '#6f4d30');
const STUMP = faces('#b08a5e', '#6f553b');

/**
 * La dernière maison avant la forêt. Le dessin montre le terrain tel qu'il est :
 * chaque élément de `work` y laisse sa trace, bonne ou mauvaise.
 */
export function buildBrushScene(work: BrushWork): Scene {
  const did = (id: string): boolean => work.has(id);
  return renderIso({
    ground: { w: 20, d: 16 },
    water: 0,
    label: describe(
      'La maison de Lucien, la dernière avant la forêt des Brandes, qui commence au bout du jardin.',
      did('herbes') ? "L'herbe est coupée." : 'Des herbes hautes couvrent le terrain, de la forêt à la maison.',
      did('buissons') ? '' : 'Des buissons poussent contre la façade.',
      did('raser') ? 'Tous les arbres du jardin ont été abattus : il ne reste que des souches.' : did('espacer') ? 'Les arbres du jardin ne se touchent plus.' : 'Deux arbres du jardin se touchent, tout près de la forêt.',
      did('combustibles') ? 'Le tas de bois et la bouteille de gaz sont au fond du terrain, loin de la maison.' : 'Un tas de bois et une bouteille de gaz sont appuyés contre le mur.',
      did('bruler') ? 'Un tas de branches brûle sur le terrain.' : '',
    ),
    draw(c) {
      c.ground(0, 0, 20, 16, did('herbes') ? GRASS : '#c5d6a2');
      c.ground(0, 14, 20, 2, '#e6dcc4', 0, '#cdbf9f');

      // La forêt, au bout du jardin.
      for (const [x, y, height] of [
        [1, 1, 6],
        [3.3, 0.6, 6.6],
        [5.6, 1.3, 6],
        [7.9, 0.5, 6.8],
        [10.2, 1.2, 6.2],
        [12.5, 0.6, 6.6],
        [14.8, 1.3, 6],
        [17, 0.7, 6.7],
        [19.2, 1.2, 6.1],
      ] as const) {
        c.tree(x, y, height);
      }

      // Les herbes hautes, de la lisière à la maison.
      if (!did('herbes')) {
        for (let i = 0; i < 30; i++) {
          const x = 1 + ((i * 7) % 18) + (i % 3) * 0.3;
          const y = 2.6 + ((i * 5) % 4) + (i % 2) * 0.4;
          c.box(x, y, 0, 0.22, 0.22, 0.75 + (i % 3) * 0.15, TALL_GRASS);
        }
      }

      // Le tas de branches coupées, qui attend d'être emporté — ou qui brûle.
      c.box(1.2, 4.6, 0, 1.5, 1, 0.4, WOOD);
      if (did('bruler')) {
        c.box(1.5, 4.8, 0.4, 0.5, 0.5, 1.1, faces('#ea6a22', '#b93d0a'));
        c.box(2, 5, 0.4, 0.4, 0.4, 0.7, faces('#f5b020', '#b93d0a'));
        c.disc(1.9, 4.9, 2.4, 0.5, '#9aa3ab');
        c.disc(2.2, 4.6, 3.2, 0.7, '#b9c0c7');
      }

      // Les deux arbres qui se touchent, près de la lisière.
      if (did('raser')) {
        c.box(15, 4.6, 0, 0.45, 0.45, 0.3, STUMP);
        c.box(16.4, 5.2, 0, 0.45, 0.45, 0.3, STUMP);
      } else if (did('espacer')) {
        c.tree(15, 4.8, 4.6);
        c.box(16.4, 5.2, 0, 0.45, 0.45, 0.3, STUMP);
      } else {
        c.tree(15, 4.8, 4.6);
        c.tree(16.3, 5.2, 4.4);
      }

      // Les buissons, contre la façade arrière.
      if (!did('buissons')) {
        for (const x of [7.3, 9.2, 11.1]) c.box(x, 6.2, 0, 1.1, 0.8, 0.9, BUSH);
      }

      // La maison.
      c.box(7, 7, 0, 6, 5, 3.2, WALL);
      c.panelRight(13, 8, 1, 1.3, 1.2, GLASS, LINE);
      windowsLeft(c, 12, 1, [7.7, 11.2]);
      c.panelLeft(9.4, 12, 0, 1.1, 2.1, DOOR, LINE);
      c.gable(6.6, 6.6, 3.2, 6.8, 5.8, 2, TILE);

      // Le tas de bois et la bouteille de gaz : contre le mur, ou au fond du terrain.
      if (did('combustibles')) {
        c.box(17.2, 11.6, 0, 1.6, 0.6, 0.8, WOOD);
        c.box(18.4, 12.6, 0, 0.35, 0.35, 0.85, faces('#c9d1d8', '#7f8b95'));
      } else {
        c.box(13.05, 9.6, 0, 0.6, 1.6, 0.8, WOOD);
        c.box(13.1, 11.4, 0, 0.35, 0.35, 0.85, faces('#c9d1d8', '#7f8b95'));
      }

      // L'arbre isolé, devant la maison : il peut rester.
      if (did('raser')) c.box(3.4, 11.2, 0, 0.45, 0.45, 0.3, STUMP);
      else c.tree(3.6, 11.4, 5);

      // Le coin barbecue, sur la terrasse, et Lucien.
      c.ground(14.2, 12.4, 2.4, 1.4, PAVING);
      c.box(15, 12.8, 0, 0.6, 0.5, 0.8, faces('#3a3f45', '#1b2733'));
      c.person(10.9, 13.1, '#7c5c8e');

      c.spot('herbes', 11.5, 4.2, 0.6);
      c.spot('buissons', 9.7, 6.5, 1.1);
      c.spot('espacer', 15.7, 5, 3.4);
      c.spot('combustibles', did('combustibles') ? 17.9 : 13.3, did('combustibles') ? 12 : 10.4, 1.1);
      c.spot('raser', 3.6, 11.4, 3.8);
      c.spot('bruler', 1.9, 5.3, 0.9);

      c.spot('brandes-old', 10.9, 13.1, 1.9);
      c.spot('brandes-debroussailler', 11.5, 4.2, 0.6);
      c.spot('brandes-departs', 15.3, 13, 1.2);
      c.spot('brandes-acces', 4, 15, 0.2);
    },
  });
}

/** Le hameau des Brandes, vu chez Lucien : le terrain porte la trace du débroussaillement. */
function edgeHouse(state: SceneState): Scene {
  return buildBrushScene(state.did('brandes-debroussailler') ? BRUSH_DONE : new Set());
}

const SCENES: Record<string, (state: SceneState) => Scene> = {
  brandes: edgeHouse,
  domicile: house,
  jeanne: neighbourHouse,
  mairie: townHall,
  pont: bridge,
  ecole: school,
  camping: campsite,
  gymnase: sportsHall,
};

/** Scène d'un lieu, ou `null` si le lieu n'a pas de vue rapprochée. */
export function buildScene(placeId: string, state: SceneState): Scene | null {
  return SCENES[placeId]?.(state) ?? null;
}
