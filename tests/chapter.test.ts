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
  gestures,
  isTimeUp,
  newChapter,
  nextPhase,
  pendingAt,
  perform,
  spend,
  timeAlert,
  TIMED_PHASES,
  type Chapter,
} from '../src/core/chapter';

const action = (id: string) => {
  const found = ACTIONS.find((a) => a.id === id);
  if (!found) throw new Error(`action inconnue : ${id}`);
  return found;
};
const status = (id: string, chapter: Chapter) => actionStatus(action(id), chapter, ACTIONS);
const content = { stakes: STAKES, badges: BADGES, situations: SITUATIONS };

/** Joue une suite d'actions, en vérifiant que chacune est bien possible. */
function play(chapter: Chapter, ...ids: string[]): Chapter {
  for (const id of ids) {
    expect(status(id, chapter).state, id).toBe('possible');
    chapter = perform(chapter, action(id), ACTIONS);
  }
  return chapter;
}

const started = (): Chapter => play(newChapter(), 'mairie-accueil');
const PREPARATION = ACTIONS.filter((a) => a.phase === 'preparation' && !a.endsPhase).map((a) => a.id);

describe('phases du chapitre', () => {
  it("commence à l'accueil, sans temps compté", () => {
    const chapter = newChapter();
    expect(chapter.phase).toBe('accueil');
    expect(clockLabel(chapter)).toBeNull();
    expect(isTimeUp(chapter)).toBe(false);
  });

  it('ne propose que la rencontre avec le maire avant le début de la préparation', () => {
    const chapter = newChapter();
    expect(ACTIONS.filter((a) => actionStatus(a, chapter, ACTIONS).state === 'possible').map((a) => a.id)).toEqual(['mairie-accueil']);
  });

  it('lance la préparation après la rencontre avec le maire', () => {
    const chapter = started();
    expect(chapter.phase).toBe('preparation');
    expect(chapter.minutesLeft).toBe(TIMED_PHASES.preparation.minutes);
    expect(clockLabel(chapter)).toBe('Samedi, 12 h');
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
    expect(clockLabel(chapter)).toBe('Samedi, 12 h 20');
    expect(status('mairie-dicrim', chapter).state).toBe('faite');
  });

  it('ne refait pas une action déjà faite', () => {
    const chapter = play(started(), 'mairie-dicrim');
    expect(perform(chapter, action('mairie-dicrim'), ACTIONS)).toBe(chapter);
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

  it('refuse une action plus longue que le temps restant', () => {
    const chapter = spend(started(), TIMED_PHASES.preparation.minutes - 25);
    expect(status('maison-protections', chapter)).toEqual({ state: 'trop-longue', minutes: 40 });
    expect(perform(chapter, action('maison-protections'), ACTIONS)).toBe(chapter);
    expect(status('mairie-dicrim', chapter).state).toBe('possible');
  });

  it("verrouille l'installation des protections si elles n'ont pas été préparées", () => {
    const unprepared = nextPhase(started());
    expect(status('maison-installer', unprepared).state).toBe('verrouillee');
    const prepared = nextPhase(play(started(), 'maison-protections'));
    expect(status('maison-installer', prepared).state).toBe('possible');
  });

  it('raccourcit en vigilance ce qui a été préparé', () => {
    const unprepared = nextPhase(started());
    expect(actionMinutes(action('gymnase-ouverture'), unprepared)).toBe(30);
    const prepared = nextPhase(play(started(), 'gymnase-preparation', 'jeanne-refuge'));
    expect(actionMinutes(action('gymnase-ouverture'), prepared)).toBe(15);
    expect(actionMinutes(action('jeanne-accueil'), prepared)).toBe(10);
  });

  it('ne montre dans un lieu que les actions de la phase en cours', () => {
    const preparation = started();
    expect(actionsAt(ACTIONS, preparation, 'domicile').every((a) => a.phase === 'preparation')).toBe(true);
    // Kit, protections, zone refuge et diagnostic ; finir la journée n'est pas encore possible.
    expect(pendingAt(ACTIONS, preparation, 'domicile')).toBe(4);
    const vigilance = nextPhase(preparation);
    expect(actionsAt(ACTIONS, vigilance, 'domicile').map((a) => a.id)).toContain('maison-abri');
    // Sans protections préparées : seulement les polluants et les réseaux.
    expect(pendingAt(ACTIONS, vigilance, 'domicile')).toBe(2);
  });

  it('laisse le temps de faire tous les gestes de la préparation, trajets compris', () => {
    const total = PREPARATION.reduce((sum, id) => sum + action(id).minutes, 0);
    expect(TIMED_PHASES.preparation.minutes - total).toBeGreaterThanOrEqual(90);
    // Un joueur qui a tout préparé peut aussi tout installer en vigilance.
    const vigilance = nextPhase(play(started(), ...PREPARATION));
    const needed = gestures(ACTIONS, vigilance).reduce((sum, a) => sum + actionMinutes(a, vigilance), 0);
    expect(TIMED_PHASES.vigilance.minutes - needed).toBeGreaterThanOrEqual(45);
  });

  it('prévient quand le temps presse, une fois par seuil', () => {
    expect(timeAlert(70, 62)).toBeNull();
    expect(timeAlert(62, 58)).toBe(60);
    expect(timeAlert(58, 40)).toBeNull();
    expect(timeAlert(40, 28)).toBe(30);
    expect(timeAlert(12, 9)).toBe(10);
    expect(timeAlert(4, 0)).toBeNull();
  });
});

describe('fin de phase', () => {
  it("ne laisse pas terminer la journée tant qu'il reste un geste faisable", () => {
    const chapter = started();
    const blocked = status('maison-nuit', chapter);
    expect(blocked.state).toBe('pas-encore');
    if (blocked.state === 'pas-encore') expect(blocked.left.map((a) => a.id).sort()).toEqual([...PREPARATION].sort());
    expect(perform(chapter, action('maison-nuit'), ACTIONS)).toBe(chapter);

    const almost = play(chapter, ...PREPARATION.filter((id) => id !== 'ecole-plan'));
    const stillBlocked = status('maison-nuit', almost);
    expect(stillBlocked.state === 'pas-encore' && stillBlocked.left.map((a) => a.id)).toEqual(['ecole-plan']);
  });

  it('passe en vigilance quand tout est fait et que le joueur termine sa journée', () => {
    const chapter = play(started(), ...PREPARATION, 'maison-nuit');
    expect(chapter.phase).toBe('vigilance');
    expect(chapter.minutesLeft).toBe(TIMED_PHASES.vigilance.minutes);
  });

  it("laisse terminer la journée quand le temps ne permet plus aucun geste", () => {
    const chapter = spend(started(), TIMED_PHASES.preparation.minutes - 5);
    expect(status('maison-nuit', chapter).state).toBe('possible');
  });

  it("ne laisse se mettre à l'abri qu'une fois les gestes de la vigilance accomplis", () => {
    const vigilance = nextPhase(play(started(), ...PREPARATION));
    expect(status('maison-abri', vigilance).state).toBe('pas-encore');
    const done = play(vigilance, 'maison-installer', 'maison-polluants', 'maison-reseaux', 'jeanne-accueil', 'gymnase-ouverture', 'maison-abri');
    expect(done.phase).toBe('crise');
  });

  it("ne compte pas un geste verrouillé parmi ceux qui restent à faire", () => {
    // Sans protections préparées, leur installation est impossible : elle ne doit pas bloquer la mise à l'abri.
    const vigilance = nextPhase(started());
    const done = play(vigilance, 'maison-polluants', 'maison-reseaux', 'jeanne-accueil', 'gymnase-ouverture', 'maison-abri');
    expect(done.phase).toBe('crise');
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
    let chapter = play(started(), ...PREPARATION, 'maison-nuit');
    chapter = play(chapter, 'maison-installer', 'maison-polluants', 'maison-reseaux', 'jeanne-accueil', 'gymnase-ouverture', 'maison-abri');
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
