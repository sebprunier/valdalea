import { describe, expect, it } from 'vitest';
import { ACTIONS, BADGES, SITUATIONS, STAKES } from '../src/content/inondation';
import {
  actionMinutes,
  actionsAt,
  actionStatus,
  answer,
  assess,
  clockLabel,
  currentSituation,
  formatDuration,
  isTimeUp,
  newChapter,
  nextPhase,
  pendingAt,
  perform,
  spend,
  TIMED_PHASES,
  type Chapter,
} from '../src/core/chapter';

const action = (id: string) => {
  const found = ACTIONS.find((a) => a.id === id);
  if (!found) throw new Error(`action inconnue : ${id}`);
  return found;
};
const content = { stakes: STAKES, badges: BADGES, situations: SITUATIONS };

/** Joue une suite d'actions, en vérifiant que chacune est bien possible. */
function play(chapter: Chapter, ...ids: string[]): Chapter {
  for (const id of ids) {
    expect(actionStatus(action(id), chapter).state, id).toBe('possible');
    chapter = perform(chapter, action(id));
  }
  return chapter;
}

const started = (): Chapter => play(newChapter(), 'mairie-accueil');

describe('phases du chapitre', () => {
  it("commence à l'accueil, sans temps compté", () => {
    const chapter = newChapter();
    expect(chapter.phase).toBe('accueil');
    expect(clockLabel(chapter)).toBeNull();
    expect(isTimeUp(chapter)).toBe(false);
  });

  it('ne propose que la rencontre avec le maire avant le début de la préparation', () => {
    const chapter = newChapter();
    expect(ACTIONS.filter((a) => actionStatus(a, chapter).state === 'possible').map((a) => a.id)).toEqual(['mairie-accueil']);
  });

  it('lance la préparation après la rencontre avec le maire', () => {
    const chapter = started();
    expect(chapter.phase).toBe('preparation');
    expect(chapter.minutesLeft).toBe(TIMED_PHASES.preparation.minutes);
    expect(clockLabel(chapter)).toBe('Samedi, 14 h');
  });

  it('enchaîne préparation, vigilance, crise et bilan', () => {
    let chapter = started();
    chapter = nextPhase(chapter);
    expect(chapter.phase).toBe('vigilance');
    expect(chapter.minutesLeft).toBe(TIMED_PHASES.vigilance.minutes);
    chapter = nextPhase(chapter);
    expect(chapter.phase).toBe('crise');
    chapter = nextPhase(nextPhase(chapter));
    expect(chapter.phase).toBe('bilan');
    expect(nextPhase(chapter)).toBe(chapter);
  });
});

describe('temps et actions', () => {
  it("décompte la durée d'une action", () => {
    const chapter = play(started(), 'mairie-dicrim');
    expect(chapter.minutesLeft).toBe(TIMED_PHASES.preparation.minutes - 20);
    expect(clockLabel(chapter)).toBe('Samedi, 14 h 20');
    expect(actionStatus(action('mairie-dicrim'), chapter).state).toBe('faite');
  });

  it('ne refait pas une action déjà faite', () => {
    const chapter = play(started(), 'mairie-dicrim');
    expect(perform(chapter, action('mairie-dicrim'))).toBe(chapter);
  });

  it('fait passer le temps des trajets, sans descendre sous zéro', () => {
    let chapter = spend(started(), 30.5);
    expect(chapter.minutesLeft).toBe(TIMED_PHASES.preparation.minutes - 30.5);
    chapter = spend(chapter, 10_000);
    expect(chapter.minutesLeft).toBe(0);
    expect(isTimeUp(chapter)).toBe(true);
  });

  it('ne compte pas le temps hors des phases minutées', () => {
    const chapter = newChapter();
    expect(spend(chapter, 50)).toBe(chapter);
  });

  it("refuse une action plus longue que le temps restant", () => {
    const chapter = spend(started(), TIMED_PHASES.preparation.minutes - 25);
    expect(actionStatus(action('maison-protections'), chapter)).toEqual({ state: 'trop-longue', minutes: 40 });
    expect(perform(chapter, action('maison-protections'))).toBe(chapter);
    expect(actionStatus(action('mairie-dicrim'), chapter).state).toBe('possible');
  });

  it("verrouille l'installation des protections si elles n'ont pas été préparées", () => {
    const unprepared = nextPhase(started());
    expect(actionStatus(action('maison-installer'), unprepared).state).toBe('verrouillee');
    const prepared = nextPhase(play(started(), 'maison-protections'));
    expect(actionStatus(action('maison-installer'), prepared).state).toBe('possible');
  });

  it("raccourcit en vigilance ce qui a été préparé", () => {
    const unprepared = nextPhase(started());
    expect(actionMinutes(action('gymnase-ouverture'), unprepared)).toBe(30);
    const prepared = nextPhase(play(started(), 'gymnase-preparation', 'jeanne-refuge'));
    expect(actionMinutes(action('gymnase-ouverture'), prepared)).toBe(15);
    expect(actionMinutes(action('jeanne-accueil'), prepared)).toBe(10);
  });

  it('ne montre dans un lieu que les actions de la phase en cours', () => {
    const preparation = started();
    expect(actionsAt(ACTIONS, preparation, 'domicile').every((a) => a.phase === 'preparation')).toBe(true);
    // Kit, protections, zone refuge, diagnostic, et la possibilité de finir la journée.
    expect(pendingAt(ACTIONS, preparation, 'domicile')).toBe(5);
    const vigilance = nextPhase(preparation);
    expect(actionsAt(ACTIONS, vigilance, 'domicile').map((a) => a.id)).toContain('maison-abri');
    // Sans protections préparées : polluants, réseaux et mise à l'abri.
    expect(pendingAt(ACTIONS, vigilance, 'domicile')).toBe(3);
  });

  it('passe en vigilance quand le joueur termine sa journée', () => {
    const chapter = play(started(), 'maison-nuit');
    expect(chapter.phase).toBe('vigilance');
    expect(chapter.minutesLeft).toBe(TIMED_PHASES.vigilance.minutes);
  });

  it("déclenche la crise quand le joueur se met à l'abri", () => {
    const chapter = play(nextPhase(started()), 'maison-abri');
    expect(chapter.phase).toBe('crise');
  });

  it('permet à un joueur organisé de faire tout l’essentiel de la préparation', () => {
    const essential = ['mairie-dicrim', 'maison-kit', 'maison-protections', 'maison-refuge', 'jeanne-refuge', 'camping-consignes', 'gymnase-preparation'];
    const total = essential.reduce((sum, id) => sum + action(id).minutes, 0);
    // Il reste de quoi faire le tour de la commune à pied (une demi-heure de trajets).
    expect(TIMED_PHASES.preparation.minutes - total).toBeGreaterThanOrEqual(30);
    // Mais pas de quoi tout faire : il faut choisir.
    const everything = ACTIONS.filter((a) => a.phase === 'preparation').reduce((sum, a) => sum + a.minutes, 0);
    expect(everything).toBeGreaterThan(TIMED_PHASES.preparation.minutes);
  });
});

describe('crise et bilan', () => {
  const inCrisis = (...ids: string[]): Chapter => nextPhase(nextPhase(play(started(), ...ids)));

  it('présente les situations dans l’ordre, une seule réponse chacune', () => {
    let chapter = inCrisis();
    expect(currentSituation(chapter, SITUATIONS)?.id).toBe(SITUATIONS[0].id);
    chapter = answer(chapter, SITUATIONS[0].id, SITUATIONS[0].choices[0].id);
    expect(currentSituation(chapter, SITUATIONS)?.id).toBe(SITUATIONS[1].id);
    const again = answer(chapter, SITUATIONS[0].id, SITUATIONS[0].choices[1].id);
    expect(again).toBe(chapter);
  });

  it('ne prend pas de réponse hors de la crise', () => {
    const chapter = started();
    expect(answer(chapter, 'enfants', 'ecole')).toBe(chapter);
  });

  it('donne zéro à qui ne prépare rien et répond mal à tout', () => {
    let chapter = inCrisis();
    for (const situation of SITUATIONS) {
      chapter = answer(chapter, situation.id, situation.choices.find((c) => !c.correct)!.id);
    }
    expect(currentSituation(chapter, SITUATIONS)).toBeNull();
    const result = assess(chapter, content);
    expect(result.score).toBe(0);
    expect(result.badges).toEqual([]);
    expect(result.stakes.every((s) => s.level === 0)).toBe(true);
  });

  it('donne le maximum à une partie exemplaire', () => {
    let chapter = play(
      started(),
      'mairie-dicrim',
      'maison-kit',
      'maison-protections',
      'maison-refuge',
      'jeanne-refuge',
      'camping-consignes',
      'gymnase-preparation',
      'pont-repere',
    );
    chapter = play(nextPhase(chapter), 'maison-installer', 'maison-polluants', 'maison-reseaux', 'jeanne-accueil', 'gymnase-ouverture', 'maison-abri');
    for (const situation of SITUATIONS) {
      chapter = answer(chapter, situation.id, situation.choices.find((c) => c.correct)!.id);
    }
    const result = assess(chapter, content);
    expect(result.score).toBe(100);
    expect(result.badges.map((b) => b.id).sort()).toEqual(BADGES.map((b) => b.id).sort());
  });

  it('juge chaque enjeu séparément', () => {
    let chapter = inCrisis('maison-kit');
    chapter = answer(chapter, 'enfants', 'ecole');
    const levels = Object.fromEntries(assess(chapter, content).stakes.map((s) => [s.stake.id, s.level]));
    expect(levels.foyer).toBe(1);
    expect(levels.enfants).toBe(2);
    expect(levels.maison).toBe(0);
    expect(levels.jeanne).toBe(0);
  });
});

describe('affichage des durées', () => {
  it('formate en heures et minutes', () => {
    expect(formatDuration(0)).toBe('0 min');
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(60)).toBe('1 h');
    expect(formatDuration(125)).toBe('2 h 05');
    expect(formatDuration(89.2)).toBe('1 h 30');
  });
});
