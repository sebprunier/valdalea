import { describe, expect, it } from 'vitest';
import { ACTIONS as WINTER_ACTIONS, ALERTE_NUAGE, ALERTE_SUITE, BADGES, HIVER, MESSAGE_MAIRIE, NUAGE, QUESTIONS, SITUATIONS, STAKES, STORY } from '../src/content/industriel';
import { PROLOGUE } from '../src/content/prologue';
import { actionMinutes, actionStatus, answer, assess, clockLabel, MINUTES_PER_UNIT, newChapter, pendingAt, perform, startChapter, type Chapter } from '../src/core/chapter';
import { pointInPolygon, type Vec } from '../src/core/geometry';
import { PLAYER_RADIUS } from '../src/game/constants';
import { buildElevation } from '../src/world/elevation';
import { buildRoadMask, buildWalkGrid } from '../src/world/grid';
import { isExposed } from '../src/world/hazards';
import { findPlace } from '../src/world/model';
import { Pathfinder } from '../src/world/pathfinding';
import { inPlume, PLUME_FULL, PLUME_GONE, PLUME_PRESENT, plumeBounds, plumeDensity, plumeStrength } from '../src/world/plume';
import { buildValDAlea } from '../src/world/valdalea';

const commune = buildValDAlea();
const plume = commune.plume!;
const at = (id: string): Vec => findPlace(commune, id)!.pos;

/** Ce qui se joue dans le chapitre de l'accident industriel : le prologue, puis ses gestes, avec ses horaires. */
const ACTIONS = [...PROLOGUE, ...WINTER_ACTIONS];
const TIMING = HIVER.timing;
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
// La tournée de la cité demande les brochures : la mairie vient donc en premier.
const JANUARY = ['mairie-brochures', ...WINTER_ACTIONS.filter((a) => a.phase === 'preparation' && !a.endsPhase && a.id !== 'mairie-brochures').map((a) => a.id)];
const ALERT = WINTER_ACTIONS.filter((a) => a.phase === 'vigilance' && !a.endsPhase).map((a) => a.id);
const content = { stakes: STAKES, badges: BADGES, situations: SITUATIONS };

/** Répond à toutes les situations, bien ou mal. */
function decide(chapter: Chapter, well: boolean): Chapter {
  for (const situation of SITUATIONS) chapter = answer(chapter, situation.id, situation.choices.find((choice) => choice.correct === well)!.id);
  return chapter;
}

describe('le nuage des Vannes : de la matinée de janvier à l’alerte', () => {
  it('passe du mardi de janvier au jeudi de février, puis à l’alerte', () => {
    let chapter = play(started(), 'maison-midi');
    expect(chapter.phase).toBe('vigilance');
    expect(chapter.minutesLeft).toBe(TIMING.vigilance.minutes);
    expect(clockLabel(started(), TIMING)).toBe('Mardi de janvier, 9 h');
    expect(clockLabel(chapter, TIMING)).toBe('Jeudi de février, 10 h 20');
    // L'alerte se joue sur place : dans la rue de la cité, et chez Inès. Nulle part ailleurs.
    expect(pendingAt(ACTIONS, chapter, 'cite')).toBe(1);
    expect(pendingAt(ACTIONS, chapter, 'ines')).toBe(3);
    for (const id of ['domicile', 'mairie', 'ecole', 'usine']) expect(pendingAt(ACTIONS, chapter, id), id).toBe(0);
    chapter = play(chapter, 'ines-abri');
    expect(chapter.phase).toBe('crise');
  });

  it('demande les brochures de la mairie avant de faire le tour de la cité', () => {
    const chapter = started();
    expect(actionStatus(action('cite-tournee'), chapter).state).toBe('verrouillee');
    expect(action('cite-tournee').locked).toMatch(/mairie/);
    expect(actionStatus(action('cite-tournee'), play(chapter, 'mairie-brochures')).state).toBe('possible');
  });

  it('va plus vite, le jour de l’alerte, dans une maison préparée en janvier', () => {
    const ready = play(started(), 'ines-ruban', 'maison-midi');
    const unready = play(started(), 'maison-midi');
    expect(actionMinutes(action('ines-calfeutrer'), unready)).toBe(15);
    expect(actionMinutes(action('ines-calfeutrer'), ready)).toBe(5);
    expect(actionMinutes(action('ines-ventilation'), unready)).toBe(5);
    expect(actionMinutes(action('ines-ventilation'), ready)).toBe(2);
  });

  it('laisse le temps de tout fermer et calfeutrer, même sans rien avoir préparé, à condition de rester sur place', () => {
    const grid = buildWalkGrid(commune);
    const finder = new Pathfinder(grid, PLAYER_RADIUS + 0.5, buildRoadMask(commune));
    const walk = (from: Vec, to: Vec): number => {
      let length = 0;
      let p = from;
      for (const step of finder.findPath(from, to)) {
        length += Math.hypot(step.x - p.x, step.y - p.y);
        p = step;
      }
      return length * MINUTES_PER_UNIT;
    };
    const gestures = ALERT.reduce((sum, id) => sum + action(id).minutes, 0);
    // De la rue à la porte d'Inès : deux pas. La maison la plus proche, c'est celle-là.
    expect(walk(at('cite'), at('ines'))).toBeLessThan(3);
    expect(gestures + walk(at('cite'), at('ines'))).toBeLessThan(TIMING.vigilance.minutes - 20);
    // Rentrer chez soi, ou courir à l'école puis revenir : le temps n'y suffit pas.
    expect(walk(at('cite'), at('domicile'))).toBeGreaterThan(5);
    expect(walk(at('cite'), at('ecole')) * 2 + gestures).toBeGreaterThan(TIMING.vigilance.minutes);
    // Tous les gestes de janvier tiennent dans la matinée, tournée comprise.
    const route = ['domicile', 'mairie', 'usine', 'ines', 'cite', 'ecole', 'domicile'];
    const tour = route.slice(1).reduce((sum, id, i) => sum + walk(at(route[i]), at(id)), 0);
    const january = JANUARY.reduce((sum, id) => sum + action(id).minutes, 0);
    expect(january + tour).toBeLessThan(TIMING.preparation.minutes - 30);
  });
});

describe('le nuage des Vannes : bilan', () => {
  it('donne zéro à qui ne prépare rien et répond mal à tout', () => {
    const result = assess(decide(play(started(), 'maison-midi', 'ines-abri'), false), content);
    expect(result.score).toBe(0);
    expect(result.badges).toHaveLength(0);
  });

  it('donne le maximum à une partie exemplaire', () => {
    const result = assess(decide(play(started(), ...JANUARY, 'maison-midi', ...ALERT, 'ines-abri'), true), content);
    expect(result.score).toBe(100);
    expect(result.badges.map((badge) => badge.id).sort()).toEqual(BADGES.map((badge) => badge.id).sort());
  });

  it('juge chaque enjeu séparément', () => {
    const level = (chapter: Chapter, id: string): number => assess(chapter, content).stakes.find((entry) => entry.stake.id === id)!.level;
    // La maison d'Inès : fermée mais non calfeutrée, elle n'est protégée qu'à moitié.
    const closed = play(started(), 'maison-midi', 'ines-fermer', 'ines-abri');
    expect(level(closed, 'foyer-ines')).toBe(1);
    expect(level(play(started(), 'maison-midi', 'ines-fermer', 'ines-ventilation', 'ines-calfeutrer', 'ines-abri'), 'foyer-ines')).toBe(2);
    expect(level(closed, 'cite-vannes')).toBe(0);
    // Malo : il faut avoir vu l'école, et laisser Inès chez elle.
    const visited = play(started(), 'ecole-abri', 'maison-midi', 'ines-abri');
    const stay = SITUATIONS[0].choices.find((choice) => choice.correct)!.id;
    const leave = SITUATIONS[0].choices.find((choice) => !choice.correct)!.id;
    expect(SITUATIONS[0].id).toBe('nuage-ecole');
    expect(level(answer(visited, 'nuage-ecole', stay), 'ecole-malo')).toBe(2);
    expect(level(answer(visited, 'nuage-ecole', leave), 'ecole-malo')).toBe(1);
    expect(level(answer(closed, 'nuage-ecole', leave), 'ecole-malo')).toBe(0);
    // Les décisions : toutes bonnes, ou presque.
    expect(level(decide(closed, true), 'reflexes-nuage')).toBe(2);
    expect(level(decide(closed, false), 'reflexes-nuage')).toBe(0);
  });
});

describe('le nuage des Vannes : consignes', () => {
  const instructions = [
    ...WINTER_ACTIONS.filter((a) => !a.narrative).flatMap((a) => [a.why, a.title]),
    ...QUESTIONS.filter((question) => !question.id.startsWith('kit')).map((question) => question.lesson),
    ...SITUATIONS.map((situation) => situation.lesson),
    ...STAKES.map((stake) => stake.lesson),
    ...[ALERTE_NUAGE, ALERTE_SUITE, MESSAGE_MAIRIE].flatMap((bulletin) => [...bulletin.paragraphs, ...(bulletin.advice ?? [])]),
    HIVER.alertInfo!.text,
  ];

  it('s’appuie partout sur la page « Que faire en cas d’accident industriel ? »', () => {
    for (const item of [...WINTER_ACTIONS.filter((a) => !a.narrative), ...SITUATIONS, ...STAKES, ALERTE_NUAGE, ALERTE_SUITE, MESSAGE_MAIRIE]) expect(item.sources, item.id).toContain('georisques-industriel');
    expect(HIVER.alertInfo!.sources).toContain('georisques-industriel');
  });

  it('n’ajoute rien à la page officielle : ni chauffage à couper, ni aération à la fin de l’alerte', () => {
    for (const text of instructions) {
      expect(text).not.toMatch(/chauffage/i);
      expect(text).not.toMatch(/\baér(ez|er)\b(?! ?ations)/i);
    }
  });

  it('décrit le signal d’alerte comme la page le décrit : trois fois 1 minute 41, puis 30 secondes', () => {
    for (const text of [action('usine-signal').why, QUESTIONS.find((q) => q.id === 'signal-alerte')!.lesson, HIVER.alertInfo!.text]) {
      expect(text).toMatch(/trois fois pendant 1 minute et 41 secondes/);
      expect(text).toMatch(/30 secondes/);
    }
  });

  it('fait sonner la sirène d’abord, le téléphone ensuite, puis le message de la mairie', () => {
    const crisis = HIVER.crisis!;
    expect(crisis.hazard).toBe('nuage');
    expect(STORY.sirene.sound).toBe('sirene');
    expect(crisis.vigilance.map((beat) => ('tell' in beat ? beat.tell.id : beat.bulletin.kind))).toEqual(['sirene', 'alerte', 'message']);
    expect(crisis.onset.map((beat) => ('tell' in beat ? beat.tell.id : beat.bulletin.kind))).toEqual(['nuage', 'alerte']);
    // On ne part pas : l'alerte commence dans la rue, et se passe dans la maison la plus proche.
    expect(crisis.places).toEqual({ vigilance: 'cite', crise: 'ines' });
    expect(crisis.situations.every((situation) => !situation.at)).toBe(true);
  });
});

describe('le nuage toxique sur la carte', () => {
  const elevation = buildElevation(commune);
  const ppi = commune.hazards.find((zone) => zone.risk === 'industriel' && zone.level === 'moyen')!.poly;
  const site = commune.hazards.find((zone) => zone.risk === 'industriel' && zone.level === 'fort')!.poly;

  it('part d’une cuve de l’usine, et le vent le pousse vers la cité des Vannes', () => {
    expect(pointInPolygon(plume.source, site)).toBe(true);
    expect(Math.hypot(plume.wind.x, plume.wind.y)).toBeCloseTo(1);
    // La cité est à l'ouest de l'usine : le vent souffle de l'est.
    expect(plume.wind.x).toBeLessThan(-0.8);
    expect(plumeDensity(plume, plume.source, 0.2)).toBeGreaterThan(0.8);
    expect(plumeDensity(plume, plume.source, 0)).toBe(0);
  });

  it('s’étend sans jamais reculer, puis se dissipe entièrement', () => {
    const axis = [0.2, 0.4, 0.6, 0.8, 0.95].map((t) => ({ x: plume.source.x + plume.wind.x * plume.reach * t, y: plume.source.y + plume.wind.y * plume.reach * t }));
    for (const p of axis) {
      let previous = 0;
      for (let level = 0; level <= PLUME_FULL + 1e-9; level += 0.05) {
        const density = plumeDensity(plume, p, level);
        expect(density).toBeGreaterThanOrEqual(previous - 1e-9);
        previous = density;
      }
      expect(plumeDensity(plume, p, PLUME_GONE)).toBe(0);
      expect(plumeDensity(plume, p, (PLUME_FULL + PLUME_GONE) / 2)).toBeLessThan(plumeDensity(plume, p, PLUME_FULL) + 1e-9);
    }
    expect(plumeStrength(PLUME_FULL)).toBe(1);
    expect(plumeStrength(PLUME_GONE)).toBe(0);
    expect(NUAGE.dissipe).toBeGreaterThanOrEqual(PLUME_GONE);
  });

  it('n’atteint la maison d’Inès qu’une fois le temps de la calfeutrer écoulé', () => {
    const home = at('ines');
    expect(isExposed(commune, elevation, 'industriel', home)).toBe(true);
    // Pendant le temps laissé pour fermer et calfeutrer, il traverse le site et le pré.
    expect(inPlume(plume, home, NUAGE.alerte[0])).toBe(false);
    expect(inPlume(plume, home, NUAGE.alerte[1])).toBe(false);
    // Quand le téléphone sonne de nouveau, il est sur la cité, et y reste pendant les premières décisions.
    expect(inPlume(plume, home, NUAGE.arrive)).toBe(true);
    for (const situation of SITUATIONS.slice(0, 4)) expect(inPlume(plume, home, situation.hazard), situation.id).toBe(true);
    // À la dernière décision, il s'est effiloché ; à la fin de l'alerte, il n'en reste rien.
    expect(plumeDensity(plume, home, SITUATIONS[5].hazard)).toBeLessThan(plumeDensity(plume, home, SITUATIONS[2].hazard) / 2);
    expect(plumeDensity(plume, home, HIVER.crisis!.levels.ending)).toBe(0);
  });

  it('reste dans le périmètre du plan particulier d’intervention, loin du bourg et de l’école', () => {
    const bounds = plumeBounds(plume);
    let inside = 0;
    for (let x = bounds.x; x <= bounds.x + bounds.w; x += 10) {
      for (let y = bounds.y; y <= bounds.y + bounds.h; y += 10) {
        if (plumeDensity(plume, { x, y }, PLUME_FULL) < PLUME_PRESENT) continue;
        inside++;
        expect(pointInPolygon({ x, y }, ppi), `nuage hors du périmètre en ${x}, ${y}`).toBe(true);
      }
    }
    expect(inside).toBeGreaterThan(400);
    for (const level of [0.3, 0.6, 0.8, 1, 1.2]) {
      for (const id of ['domicile', 'ecole', 'mairie', 'gymnase', 'jeanne', 'lucien', 'camping']) expect(inPlume(plume, at(id), level), `${id} à ${level}`).toBe(false);
    }
    // Rien n'en dépasse du rectangle dans lequel on le dessine.
    for (const p of [{ x: bounds.x - 5, y: plume.source.y }, { x: bounds.x + bounds.w + 5, y: plume.source.y }, { x: plume.source.x, y: bounds.y - 5 }, { x: plume.source.x, y: bounds.y + bounds.h + 5 }]) {
      expect(plumeDensity(plume, p, PLUME_FULL)).toBeLessThan(0.01);
    }
  });
});
