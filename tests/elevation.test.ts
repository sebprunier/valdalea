import { describe, expect, it } from 'vitest';
import { FLOOD } from '../src/content/inondation';
import { buildElevation } from '../src/world/elevation';
import { findPlace } from '../src/world/model';
import { buildValDAlea } from '../src/world/valdalea';

const commune = buildValDAlea();
const elevation = buildElevation(commune);
const at = (id: string) => findPlace(commune, id)!.pos;

describe('relief et inondation', () => {
  it('met la rivière au niveau zéro et le haut du bourg hors d’eau', () => {
    const inRiver = commune.river.path[Math.floor(commune.river.path.length / 2)];
    expect(elevation.at(inRiver)).toBe(0);
    expect(elevation.at(at('mairie'))).toBeGreaterThan(5);
  });

  it('inonde, à la pointe de la crue, le quai, la maison du joueur, celle de Jeanne, l’école et le camping', () => {
    for (const id of ['domicile', 'jeanne', 'ecole', 'camping']) {
      expect(elevation.depthAt(at(id), FLOOD.peak), id).toBeGreaterThan(0.2);
    }
    expect(elevation.depthAt({ x: 2400, y: 2100 }, FLOOD.peak), 'quai').toBeGreaterThan(0.5);
  });

  it('laisse au sec la mairie, le gymnase, le Vieux-Bourg, la cité et l’usine, même pour la crue de référence', () => {
    for (const id of ['mairie', 'gymnase', 'vieux-bourg', 'argilieres', 'cite', 'usine', 'brandes', 'sous-la-roche']) {
      expect(elevation.isFlooded(at(id), commune.relief.referenceFlood), id).toBe(false);
    }
  });

  it('garde le tablier du pont au-dessus de l’eau, mais pas ses accès', () => {
    expect(elevation.isFlooded({ x: 2100, y: 2250 }, FLOOD.peak)).toBe(false);
    expect(elevation.isFlooded(at('pont'), FLOOD.peak)).toBe(true);
  });

  it('donne près d’un mètre d’eau devant la porte du joueur à la pointe, comme le raconte la crise', () => {
    const depth = elevation.depthAt(at('domicile'), FLOOD.peak);
    expect(depth).toBeGreaterThan(0.75);
    expect(depth).toBeLessThan(1.05);
  });

  it('n’inonde rien tant que la rivière reste dans son lit', () => {
    for (const place of commune.places) expect(elevation.isFlooded(place.pos, 0.1), place.id).toBe(false);
  });
});
