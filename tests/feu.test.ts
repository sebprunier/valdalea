import { describe, expect, it } from 'vitest';
import { ACTIONS as FIRE_ACTIONS, BADGES, ETE, FIRE, SITUATIONS, STAKES } from '../src/content/feu';
import { PROLOGUE } from '../src/content/prologue';
import { actionMinutes, actionStatus, answer, assess, clockLabel, gestures, MINUTES_PER_UNIT, newChapter, pendingAt, perform, startChapter, type Chapter } from '../src/core/chapter';
import { distToPolygon, distToRect, pointInPolygon, type Vec } from '../src/core/geometry';
import { PLAYER_RADIUS } from '../src/game/constants';
import { buildElevation } from '../src/world/elevation';
import { arrivalAt, buildFireField, burntShare, FIRE_OUT, isBurnt } from '../src/world/fire';
import { isExposed } from '../src/world/hazards';
import { buildRoadMask, buildWalkGrid } from '../src/world/grid';
import { findPlace } from '../src/world/model';
import { Pathfinder } from '../src/world/pathfinding';
import { buildValDAlea } from '../src/world/valdalea';

const commune = buildValDAlea();
const at = (id: string): Vec => findPlace(commune, id)!.pos;

/** Ce qui se joue dans le chapitre du feu : le prologue, puis ses gestes, avec ses horaires. */
const ACTIONS = [...PROLOGUE, ...FIRE_ACTIONS];
const TIMING = ETE.timing;
const action = (id: string) => {
  const found = ACTIONS.find((a) => a.id === id);
  if (!found) throw new Error(`action inconnue : ${id}`);
  return found;
};

/** Joue une suite d'actions, en vérifiant que chacune est bien possible. */
function play(chapter: Chapter, ...ids: string[]): Chapter {
  for (const id of ids) {
    expect(actionStatus(action(id), chapter).state, id).toBe('possible');
    chapter = perform(chapter, action(id), TIMING);
  }
  return chapter;
}

const started = (): Chapter => startChapter(play(newChapter(), 'mairie-accueil', 'mairie-dicrim'), ACTIONS, TIMING);
const SPRING = FIRE_ACTIONS.filter((a) => a.phase === 'preparation' && !a.endsPhase).map((a) => a.id);
const SUMMER = FIRE_ACTIONS.filter((a) => a.phase === 'vigilance' && !a.endsPhase).map((a) => a.id);
const content = { stakes: STAKES, badges: BADGES, situations: SITUATIONS };

/** Répond à toutes les situations du feu, bien ou mal. */
function decide(chapter: Chapter, well: boolean): Chapter {
  for (const situation of SITUATIONS) chapter = answer(chapter, situation.id, situation.choices.find((choice) => choice.correct === well)!.id);
  return chapter;
}

describe('le feu des Brandes : du printemps à l’été', () => {
  it('passe du samedi de mai au jeudi d’août, puis au feu', () => {
    let chapter = play(started(), 'maison-soir');
    expect(chapter.phase).toBe('vigilance');
    expect(chapter.minutesLeft).toBe(TIMING.vigilance.minutes);
    expect(clockLabel(chapter, TIMING)).toBe('Jeudi, 13 h');
    // L'après-midi commence chez soi : le kit d'abord, puis le hameau et la maison de Lucien.
    expect(pendingAt(ACTIONS, chapter, 'domicile')).toBe(1);
    expect(pendingAt(ACTIONS, chapter, 'brandes')).toBe(1);
    expect(pendingAt(ACTIONS, chapter, 'lucien')).toBe(2);
    chapter = play(chapter, 'lucien-partir');
    expect(chapter.phase).toBe('crise');
  });

  it('raccourcit le dégagement des abords quand le terrain a été débroussaillé au printemps', () => {
    const unprepared = play(started(), 'maison-soir');
    const prepared = play(started(), 'lucien-debroussailler', 'maison-soir');
    expect(actionMinutes(action('lucien-abords'), unprepared)).toBe(20);
    expect(actionMinutes(action('lucien-abords'), prepared)).toBe(10);
  });

  it('laisse le temps de faire les gestes de l’après-midi, trajet à pied compris', () => {
    const grid = buildWalkGrid(commune);
    const finder = new Pathfinder(grid, PLAYER_RADIUS, buildRoadMask(commune));
    const length = (from: Vec, to: Vec): number => {
      const route = [from, ...finder.findPath(from, to)];
      return route.slice(1).reduce((sum, p, index) => sum + Math.hypot(p.x - route[index].x, p.y - route[index].y), 0);
    };
    // Du domicile au hameau, puis du hameau chez Lucien.
    const walking = (length(at('domicile'), at('brandes')) + length(at('brandes'), at('lucien'))) * MINUTES_PER_UNIT;
    const vigilance = play(started(), 'maison-soir');
    const needed = gestures(ACTIONS, vigilance).reduce((sum, a) => sum + actionMinutes(a, vigilance), 0);
    expect(needed).toBe(60);
    // Sans rien avoir préparé au printemps, il reste encore un quart d'heure de marge.
    expect(TIMING.vigilance.minutes - needed - walking).toBeGreaterThanOrEqual(15);
    expect(walking).toBeGreaterThan(10);
  });
});

describe('bilan du feu', () => {
  const inCrisis = (...ids: string[]): Chapter => {
    const spring = ids.filter((id) => action(id).phase === 'preparation');
    const summer = ids.filter((id) => action(id).phase === 'vigilance');
    return play(play(play(started(), ...spring), 'maison-soir'), ...summer, 'lucien-partir');
  };
  const levels = (chapter: Chapter): Record<string, number> => Object.fromEntries(assess(chapter, content).stakes.map((s) => [s.stake.id, s.level]));

  it('donne zéro à qui ne prépare rien et répond mal à tout', () => {
    const result = assess(decide(inCrisis(), false), content);
    expect(result.score).toBe(0);
    expect(result.badges).toEqual([]);
  });

  it('donne le maximum à une partie exemplaire', () => {
    const result = assess(decide(inCrisis(...SPRING, ...SUMMER), true), content);
    expect(result.score).toBe(100);
    expect(result.badges.map((badge) => badge.id).sort()).toEqual(BADGES.map((badge) => badge.id).sort());
  });

  it('fait peser le printemps sur le sort de la maison de Lucien', () => {
    // Les derniers gestes de l'été, seuls, ne suffisent pas : sans débroussaillement, la maison ne s'en sort qu'à moitié.
    expect(levels(inCrisis('lucien-abords', 'lucien-fermer'))['maison-lucien']).toBe(1);
    // Le débroussaillement seul non plus : il faut aussi fermer la maison ou dégager ses abords.
    expect(levels(inCrisis('lucien-debroussailler'))['maison-lucien']).toBe(1);
    expect(levels(inCrisis('lucien-debroussailler', 'lucien-fermer'))['maison-lucien']).toBe(2);
    expect(levels(inCrisis())['maison-lucien']).toBe(0);
  });

  it('conduit le joueur de la clairière de Lucien au gymnase, hors du massif', () => {
    const forest = commune.grounds.find((ground) => ground.kind === 'foret')!.poly;
    const route = SITUATIONS.map((situation) => situation.at);
    expect(route[0]).toBe('lucien');
    expect(route[route.length - 1]).toBe('gymnase');
    // Le centre d'accueil n'est ni dans le massif, ni dans la bande où le feu menace.
    expect(isExposed(commune, buildElevation(commune), 'feu-foret', at('gymnase'))).toBe(false);
    expect(pointInPolygon(at('gymnase'), forest)).toBe(false);
    // On ne revient pas vers la forêt en cours de route : chaque étape en est au moins aussi loin que la précédente.
    const away = route.map((id) => distToPolygon(at(id!), forest));
    for (let i = 1; i < away.length; i++) expect(away[i], `${route[i]}`).toBeGreaterThanOrEqual(away[i - 1]);
  });

  it('juge chaque enjeu séparément', () => {
    const result = levels(decide(inCrisis('camping-barbecue', 'maison-kit-verifier', 'maison-kit-emporter', 'brandes-acces'), true));
    expect(result.departs).toBe(1);
    expect(result['kit-feu']).toBe(2);
    expect(result.hameau).toBe(1);
    expect(result['maison-lucien']).toBe(0);
    expect(result['reflexes-feu']).toBe(2);
  });
});

describe('propagation du feu sur la carte', () => {
  const wildfire = commune.wildfire!;
  const forest = commune.grounds.find((ground) => ground.kind === 'foret')!.poly;
  const houses = commune.buildings.map((building) => building.rect);
  /** Le terrain de Lucien débroussaillé, puis laissé en l'état. */
  const cleared = buildFireField(wildfire, [forest], houses);
  const overgrown = buildFireField(wildfire, [forest, wildfire.clearing], houses);
  const lucien = commune.buildings.find((building) => distToRect(at('lucien'), building.rect) < 40)!.rect;
  const garden = { x: lucien.x + lucien.w / 2, y: lucien.y + lucien.h + 60 };

  it('part du nord-est et gagne du terrain sans jamais reculer', () => {
    const northEast = { x: commune.width - 50, y: 60 };
    expect(arrivalAt(cleared, northEast)).toBeLessThan(FIRE.vigilance[1]);
    // Au premier message, le feu est encore hors de la carte, ou tout juste à son bord ; ensuite, il ne cesse de gagner.
    let previous = burntShare(cleared, FIRE.vigilance[0]);
    expect(previous).toBeLessThan(0.02);
    for (const level of [FIRE.vigilance[1], FIRE.onset, ...SITUATIONS.map((situation) => situation.hazard)]) {
      const share = burntShare(cleared, level);
      expect(share, String(level)).toBeGreaterThan(previous);
      previous = share;
    }
    // Les pompiers le fixent avant qu'il n'ait tout pris : une partie du massif est épargnée.
    expect(burntShare(cleared, 1)).toBeLessThan(0.8);
    expect(burntShare(cleared, FIRE_OUT)).toBe(burntShare(cleared, 1));
  });

  it('reste loin de la clairière pendant l’après-midi, puis l’atteint pendant la crise', () => {
    const north = { x: lucien.x + lucien.w / 2, y: wildfire.clearing[1].y - 30 };
    expect(isBurnt(cleared, north, FIRE.vigilance[1])).toBe(false);
    expect(isBurnt(cleared, north, SITUATIONS[0].hazard)).toBe(false);
    expect(isBurnt(cleared, north, SITUATIONS[SITUATIONS.length - 1].hazard)).toBe(true);
    // À la première décision, la saute de feu brûle déjà, en avant du front.
    expect(isBurnt(cleared, wildfire.spot.at, SITUATIONS[0].hazard)).toBe(true);
    expect(isBurnt(cleared, wildfire.spot.at, FIRE.vigilance[1])).toBe(false);
  });

  it('contourne la clairière débroussaillée, et la traverse si rien n’a été fait', () => {
    expect(arrivalAt(cleared, garden)).toBe(Infinity);
    expect(isBurnt(overgrown, garden, 1)).toBe(true);
    // La maison elle-même n'est jamais dans le combustible : son sort est raconté par le bilan.
    const inside = { x: lucien.x + lucien.w / 2, y: lucien.y + lucien.h / 2 };
    expect(arrivalAt(overgrown, inside)).toBe(Infinity);
  });

  it('s’arrête à la lisière : les jardins du hameau et le bourg ne brûlent pas', () => {
    for (const id of ['brandes', 'mairie', 'gymnase', 'domicile', 'camping']) expect(arrivalAt(overgrown, at(id)), id).toBe(Infinity);
  });
});
