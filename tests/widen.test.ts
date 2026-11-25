import { describe, expect, it } from 'vitest';
import { rectsIntersect } from '../src/core/geometry';
import { findPlace } from '../src/world/model';
import { buildValDAlea } from '../src/world/valdalea';

const commune = buildValDAlea();
/** La bande insérée à l'est du bourg. */
const GAP = { x: 2950, y: 0, w: 300, h: commune.height };

describe('élargissement de la commune', () => {
  it('insère une bande de terrain sans rien de bâti dedans', () => {
    expect(commune.width).toBe(4500);
    for (const building of commune.buildings) expect(rectsIntersect(building.rect, GAP), JSON.stringify(building.rect)).toBe(false);
    for (const place of commune.places) expect(place.pos.x < GAP.x || place.pos.x > GAP.x + GAP.w, place.id).toBe(true);
  });

  it('laisse le bourg où il était, et décale l’est d’un bloc', () => {
    expect(findPlace(commune, 'mairie')!.pos.x).toBe(2400);
    expect(findPlace(commune, 'gymnase')!.pos.x).toBe(2755);
    expect(findPlace(commune, 'brandes')!.pos.x).toBe(3800);
    expect(findPlace(commune, 'usine')!.pos.x).toBe(3700);
    // Chaque lieu reste dans son secteur.
    for (const place of commune.places) {
      const area = commune.sectors.find((sector) => sector.id === place.sectorId)!.area;
      expect(place.pos.x >= area.x && place.pos.x <= area.x + area.w && place.pos.y >= area.y && place.pos.y <= area.y + area.h, place.id).toBe(true);
    }
  });

  it('allonge les routes qui traversent la bande, sans les couper', () => {
    const grandeRue = commune.roads.find((road) => road.name === 'Grande-Rue')!;
    expect(grandeRue.path[0].x).toBeLessThan(0);
    expect(grandeRue.path[grandeRue.path.length - 1].x).toBeGreaterThan(commune.width);
    // La rue de la Mairie rejoint toujours le chemin des Brandes, à l'autre bout de la bande.
    const mairie = commune.roads.find((road) => road.name === 'rue de la Mairie')!;
    const brandes = commune.roads.find((road) => road.name === 'chemin des Brandes')!;
    expect(mairie.path[mairie.path.length - 1]).toEqual(brandes.path[0]);
    expect(brandes.path[0].x).toBe(3260);
    for (const road of commune.roads) {
      for (const p of road.path) expect(p.x >= road.bounds.x && p.x <= road.bounds.x + road.bounds.w, road.name ?? road.kind).toBe(true);
    }
  });

  it('garde la rivière d’un seul tenant, d’un bord à l’autre de la carte', () => {
    const xs = commune.river.path.map((p) => p.x);
    expect(Math.min(...xs)).toBeLessThan(0);
    expect(Math.max(...xs)).toBeGreaterThan(commune.width);
    for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeGreaterThan(xs[i - 1]);
  });
});
