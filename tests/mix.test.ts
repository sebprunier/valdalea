import { describe, expect, it } from 'vitest';
import { mixOf } from '../src/audio/mix';
import { SKIES } from '../src/render/weather';

describe('ambiance sonore', () => {
  it('fait entendre la pluie quand il pleut, et seulement alors', () => {
    expect(mixOf(SKIES.sec, 5, 0).rain).toBe(0);
    expect(mixOf(SKIES.pluie, 5, 0).rain).toBeGreaterThan(0);
    expect(mixOf(SKIES['forte-pluie'], 5, 0).rain).toBeGreaterThan(mixOf(SKIES.pluie, 5, 0).rain);
  });

  it('laisse toujours un peu de vent, davantage le soir et sous la forte pluie', () => {
    for (const sky of Object.values(SKIES)) expect(mixOf(sky, 5, 0).wind).toBeGreaterThan(0);
    expect(mixOf(SKIES.soir, 5, 0).wind).toBeGreaterThan(mixOf(SKIES.sec, 5, 0).wind);
  });

  it('fait entendre la rivière près de l’eau, de moins en moins en s’éloignant', () => {
    const atBank = mixOf(SKIES.sec, 0, 0).water;
    const nearby = mixOf(SKIES.sec, 0.8, 0).water;
    const uphill = mixOf(SKIES.sec, 6, 0).water;
    expect(atBank).toBeGreaterThan(nearby);
    expect(nearby).toBeGreaterThan(0);
    expect(uphill).toBe(0);
  });

  it('fait gronder la rivière en crue, jusque chez le joueur', () => {
    // La maison du joueur est à un peu moins d'un mètre au-dessus du niveau normal.
    const calm = mixOf(SKIES.sec, 0.9, 0).water;
    const flood = mixOf(SKIES['forte-pluie'], 0.9, 1.6).water;
    expect(flood).toBeGreaterThan(calm * 2);
    expect(flood).toBeLessThanOrEqual(1);
  });
});
