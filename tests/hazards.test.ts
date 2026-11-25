import { describe, expect, it } from 'vitest';
import { distToPolygon, distToRect, pointInPolygon } from '../src/core/geometry';
import { buildElevation } from '../src/world/elevation';
import { exposuresAt, isExposed, zonesOf } from '../src/world/hazards';
import { findPlace, RISK_IDS } from '../src/world/model';
import { buildValDAlea } from '../src/world/valdalea';

const commune = buildValDAlea();
const elevation = buildElevation(commune);
const at = (id: string) => findPlace(commune, id)!.pos;

describe('cartes de risques', () => {
  it('cartographie chaque risque', () => {
    for (const risk of RISK_IDS) {
      if (risk !== 'inondation') expect(zonesOf(commune, risk).length, risk).toBeGreaterThan(0);
    }
  });

  it('dessine les zones les plus exposées par-dessus les autres', () => {
    for (const risk of RISK_IDS) {
      const levels = zonesOf(commune, risk).map((zone) => zone.level);
      expect(levels, risk).toEqual([...levels].sort((a, b) => (a === b ? 0 : a === 'moyen' ? -1 : 1)));
    }
  });

  it('expose chaque quartier au risque pour lequel il a été dessiné', () => {
    expect(exposuresAt(commune, elevation, at('domicile'))).toEqual(['inondation']);
    expect(exposuresAt(commune, elevation, at('sous-la-roche'))).toEqual(['mouvement-terrain']);
    expect(exposuresAt(commune, elevation, at('vieux-bourg'))).toEqual(['cavites']);
    expect(exposuresAt(commune, elevation, at('argilieres'))).toEqual(['argiles']);
    expect(exposuresAt(commune, elevation, at('brandes'))).toContain('feu-foret');
    // La maison de Lucien est dans la bande où l'on doit débroussailler.
    expect(exposuresAt(commune, elevation, at('lucien'))).toEqual(['feu-foret']);
  });

  it('place la maison de Lucien dans une clairière : seule du hameau, la forêt l’entoure sur trois côtés', () => {
    const forest = commune.grounds.find((ground) => ground.kind === 'foret')!.poly;
    /** La forêt est-elle à moins de 70 mètres des murs de la maison, à l'ouest, au nord et à l'est ? */
    const surrounded = (b: { rect: { x: number; y: number; w: number; h: number } }): boolean => {
      const { x, y, w, h } = b.rect;
      return pointInPolygon({ x: x - 70, y: y + h / 2 }, forest) && pointInPolygon({ x: x + w / 2, y: y - 70 }, forest) && pointInPolygon({ x: x + w + 70, y: y + h / 2 }, forest);
    };
    const hamlet = commune.buildings.filter((b) => b.kind === 'pavillon' && b.rect.x > 3460 && b.rect.y > 880 && b.rect.y < 1640);
    expect(hamlet).toHaveLength(7);
    const inClearing = hamlet.filter(surrounded);
    expect(inClearing).toHaveLength(1);
    // C'est bien devant cette maison que se trouve le lieu « Chez Lucien », et elle n'est pas dans les arbres.
    expect(distToRect(at('lucien'), inClearing[0].rect)).toBeLessThan(40);
    expect(pointInPolygon({ x: inClearing[0].rect.x + 50, y: inClearing[0].rect.y + 35 }, forest)).toBe(false);
  });

  it('tient le gymnase à bonne distance de la forêt : c’est le centre d’accueil quand le hameau est évacué', () => {
    const forest = commune.grounds.find((ground) => ground.kind === 'foret')!.poly;
    const gym = commune.buildings.find((building) => building.kind === 'gymnase')!.rect;
    const corners = [
      { x: gym.x, y: gym.y },
      { x: gym.x + gym.w, y: gym.y },
      { x: gym.x + gym.w, y: gym.y + gym.h },
      { x: gym.x, y: gym.y + gym.h },
    ];
    for (const corner of corners) expect(distToPolygon(corner, forest)).toBeGreaterThan(400);
  });

  it('laisse la mairie et le gymnase hors de toute zone : c’est là qu’on organise les secours et l’hébergement', () => {
    expect(exposuresAt(commune, elevation, at('mairie'))).toEqual([]);
    expect(exposuresAt(commune, elevation, at('gymnase'))).toEqual([]);
  });

  it('borne la zone de débroussaillement à 200 mètres de la lisière', () => {
    // Trois maisons du hameau sont dans la bande, trois autres au-delà.
    expect(isExposed(commune, elevation, 'feu-foret', { x: 3790, y: 1125 })).toBe(true);
    expect(isExposed(commune, elevation, 'feu-foret', { x: 3605, y: 1325 })).toBe(false);
    expect(isExposed(commune, elevation, 'feu-foret', { x: 2755, y: 815 })).toBe(false);
  });
});
