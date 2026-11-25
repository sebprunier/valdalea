import { describe, expect, it } from 'vitest';
import { mixOf, nearness, type Listening } from '../src/audio/mix';
import { SKIES } from '../src/render/weather';

/** Sur les hauteurs, loin de tout : seul le temps qu'il fait s'entend. */
const away: Listening = { sky: SKIES.sec, height: 6, flood: 0, toForest: 2000, toPlant: 2000, fire: 0 };
const hear = (changes: Partial<Listening>) => mixOf({ ...away, ...changes });

describe('ambiance sonore', () => {
  it('ne fait rien entendre par temps calme, loin de tout', () => {
    expect(hear({})).toEqual({ rain: 0, wind: 0, water: 0, leaves: 0, birds: 0, industry: 0, fire: 0 });
  });

  it('fait entendre la pluie quand il pleut, et seulement alors', () => {
    expect(hear({ sky: SKIES.pluie }).rain).toBeGreaterThan(0);
    expect(hear({ sky: SKIES['forte-pluie'] }).rain).toBeGreaterThan(hear({ sky: SKIES.pluie }).rain);
  });

  it('réserve le vent aux moments où il se lève', () => {
    expect(hear({ sky: SKIES.sec }).wind).toBe(0);
    expect(hear({ sky: SKIES.soir }).wind).toBeGreaterThan(0.3);
    expect(hear({ sky: SKIES['forte-pluie'] }).wind).toBeGreaterThan(hear({ sky: SKIES.pluie }).wind);
  });

  it('fait entendre la rivière près de l’eau, de moins en moins en s’éloignant', () => {
    const atBank = hear({ height: 0 }).water;
    const nearby = hear({ height: 0.8 }).water;
    expect(atBank).toBeGreaterThan(nearby);
    expect(nearby).toBeGreaterThan(0);
    expect(hear({ height: 6 }).water).toBe(0);
  });

  it('fait gronder la rivière en crue, jusque chez le joueur', () => {
    // La maison du joueur est à un peu moins d'un mètre au-dessus du niveau normal.
    const calm = hear({ height: 0.9 }).water;
    const flood = hear({ sky: SKIES['forte-pluie'], height: 0.9, flood: 1.6 }).water;
    expect(flood).toBeGreaterThan(calm * 2);
    expect(flood).toBeLessThanOrEqual(1);
  });

  it('fait chanter les oiseaux en forêt, de jour et par temps sec', () => {
    expect(hear({ toForest: 0 }).birds).toBe(1);
    expect(hear({ toForest: 150 }).birds).toBeGreaterThan(0);
    expect(hear({ toForest: 150 }).birds).toBeLessThan(1);
    expect(hear({ toForest: 400 }).birds).toBe(0);
    // Ils se taisent la nuit, et presque sous la pluie.
    expect(hear({ toForest: 0, sky: SKIES['nuit-pluie'] }).birds).toBe(0);
    expect(hear({ toForest: 0, sky: SKIES['forte-pluie'] }).birds).toBe(0);
    expect(hear({ toForest: 0, sky: SKIES.pluie }).birds).toBeLessThan(0.5);
  });

  it('fait bruire les feuillages en forêt, davantage quand le vent se lève', () => {
    expect(hear({ toForest: 0 }).leaves).toBeGreaterThan(0);
    expect(hear({ toForest: 0, sky: SKIES.soir }).leaves).toBeGreaterThan(hear({ toForest: 0 }).leaves);
  });

  it('fait entendre l’usine à son approche', () => {
    expect(hear({ toPlant: 0 }).industry).toBe(1);
    expect(hear({ toPlant: 200 }).industry).toBeGreaterThan(0);
    expect(hear({ toPlant: 500 }).industry).toBe(0);
  });

  it('fait entendre le feu de forêt de loin, et fait taire les oiseaux', () => {
    expect(hear({ toForest: 0, fire: 1 }).fire).toBe(1);
    expect(hear({ toForest: 450, fire: 1 }).fire).toBeCloseTo(0.5);
    expect(hear({ toForest: 450, fire: 0.5 }).fire).toBeLessThan(hear({ toForest: 450, fire: 1 }).fire);
    expect(hear({ toForest: 1200, fire: 1 }).fire).toBe(0);
    expect(hear({ toForest: 0, fire: 0 }).fire).toBe(0);
    expect(hear({ toForest: 0, fire: 1 }).birds).toBe(0);
  });

  it('mesure la proximité d’une source', () => {
    expect(nearness(0, 300)).toBe(1);
    expect(nearness(150, 300)).toBe(0.5);
    expect(nearness(900, 300)).toBe(0);
  });
});
