import type { Rect, Vec } from '../core/geometry';

/**
 * Modèle de données de la commune. Tout est décrit sous forme vectorielle,
 * en unités « monde » (8 unités ≈ 1 mètre), nord en haut.
 */

export type Side = 'N' | 'S' | 'E' | 'W';

export type GroundKind =
  | 'champ'
  | 'foret'
  | 'parc'
  | 'jardin'
  | 'place'
  | 'cour'
  | 'parking'
  | 'industrie'
  | 'camping'
  | 'eboulis'
  | 'falaise';

export interface Ground {
  kind: GroundKind;
  poly: Vec[];
  bounds: Rect;
  /** Variante de teinte ou de hachures (0 à 3). */
  variant: number;
}

export type RoadKind = 'departementale' | 'avenue' | 'rue' | 'ruelle' | 'chemin';

export interface Road {
  kind: RoadKind;
  name?: string;
  width: number;
  path: Vec[];
  bounds: Rect;
}

export interface River {
  name: string;
  width: number;
  /** Axe de la rivière, déjà lissé. */
  path: Vec[];
  bounds: Rect;
}

export interface Bridge {
  kind: 'pont' | 'passerelle';
  /** Emprise franchissable ; les ponts de la commune sont orientés nord-sud. */
  rect: Rect;
}

export type BuildingKind =
  | 'pavillon'
  | 'maison-ville'
  | 'commerce'
  | 'mairie'
  | 'ecole'
  | 'gymnase'
  | 'eglise'
  | 'hangar'
  | 'local'
  | 'mobil-home';

export type RoofKind = 'tuile' | 'ardoise' | 'bac' | 'plat';

export interface Building {
  id?: string;
  kind: BuildingKind;
  rect: Rect;
  roof: RoofKind;
  /** Nuance de la couleur de toiture (0 à 3). */
  tone: number;
  /** Côté de l'entrée. */
  door?: Side;
}

export interface Tank {
  x: number;
  y: number;
  r: number;
}

export interface Fence {
  rect: Rect;
  /** Portail, exprimé le long du côté indiqué (coordonnées monde). */
  gate?: { side: Side; from: number; to: number };
}

export interface Tree {
  x: number;
  y: number;
  r: number;
  tone: number;
}

export interface Decor {
  kind: 'tente' | 'caravane' | 'voiture';
  x: number;
  y: number;
  angle: number;
  tone: number;
}

export interface MapLabel {
  kind: 'secteur' | 'lieu-dit' | 'batiment';
  text: string;
  x: number;
  y: number;
}

export interface Sector {
  id: string;
  name: string;
  area: Rect;
}

export type PlaceKind = 'domicile' | 'mairie' | 'ecole' | 'gymnase' | 'quartier' | 'usine' | 'camping' | 'pont';

/** Lieu avec lequel le joueur peut interagir. */
export interface Place {
  id: string;
  name: string;
  kind: PlaceKind;
  sectorId: string;
  /** Point d'accès : là où se tient le joueur pour ouvrir la fiche du lieu. */
  pos: Vec;
}

/** Pente du terrain de part et d'autre de la rivière : sert à calculer où l'eau monte. */
export interface Relief {
  /** Distance à parcourir depuis la berge pour s'élever d'un mètre, rive nord. */
  northRun: number;
  /** Idem rive sud, plus plate. */
  southRun: number;
  /** À l'est de `fromX`, le terrain remonte d'un mètre toutes les `run` unités. */
  eastRise: { fromX: number; run: number };
  /** Hauteur du tablier des ponts, en mètres au-dessus du niveau normal de la rivière. */
  bridgeDeck: number;
}

export interface Commune {
  name: string;
  width: number;
  height: number;
  relief: Relief;
  river: River;
  grounds: Ground[];
  roads: Road[];
  bridges: Bridge[];
  buildings: Building[];
  tanks: Tank[];
  fences: Fence[];
  trees: Tree[];
  decors: Decor[];
  labels: MapLabel[];
  sectors: Sector[];
  places: Place[];
  /** Position de départ du joueur. */
  spawn: Vec;
}

export function findPlace(commune: Commune, id: string): Place | undefined {
  return commune.places.find((place) => place.id === id);
}

export function findSector(commune: Commune, id: string): Sector | undefined {
  return commune.sectors.find((sector) => sector.id === id);
}

/** Secteur contenant un point (le premier déclaré l'emporte en cas de recouvrement). */
export function sectorAt(commune: Commune, p: Vec): Sector | null {
  for (const sector of commune.sectors) {
    const a = sector.area;
    if (p.x >= a.x && p.x <= a.x + a.w && p.y >= a.y && p.y <= a.y + a.h) return sector;
  }
  return null;
}
