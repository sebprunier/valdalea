import { describe, expect, it } from 'vitest';
import { DICRIM, dicrimSources } from '../src/content/dicrim';
import { ALL_ACTIONS as ACTIONS, ALL_BADGES, ALL_QUESTIONS as QUESTIONS, ALL_SITUATIONS, CHAPTERS, playbookOf } from '../src/content/chapitres';
import { STORY as FIRE_STORY } from '../src/content/feu';
import { STORY, VIGILANCE_SCALE } from '../src/content/inondation';
import { findEntry, LEXICON } from '../src/content/lexique';
import { SOURCES, type Bulletin, type CrisisScript, type StoryCard } from '../src/content/model';
import { PLACE_TEXTS } from '../src/content/places';
import { SKIES } from '../src/render/weather';
import { RISK_IDS } from '../src/world/model';
import { buildValDAlea } from '../src/world/valdalea';

const commune = buildValDAlea();
const placeIds = new Set(commune.places.map((p) => p.id));
const actionIds = new Set(ACTIONS.map((a) => a.id));
const questionIds = new Set(QUESTIONS.map((q) => q.id));

/** Les chapitres qui se jouent jusqu'au bilan, avec leur script de crise. */
const SCRIPTS: Array<[string, CrisisScript]> = CHAPTERS.flatMap((info) => {
  const crisis = playbookOf(info.id).content?.crisis;
  return crisis ? [[info.id, crisis] as [string, CrisisScript]] : [];
});
const beatsOf = (crisis: CrisisScript) => [...crisis.vigilance, ...crisis.onset];
const bulletinsOf = (crisis: CrisisScript): Bulletin[] => beatsOf(crisis).flatMap((beat) => ('bulletin' in beat ? [beat.bulletin] : []));
const cardsOf = (crisis: CrisisScript): StoryCard[] => [...beatsOf(crisis).flatMap((beat) => ('tell' in beat ? [beat.tell] : [])), crisis.ending];

describe('cohérence des contenus', () => {
  it('donne un texte à chaque lieu', () => {
    for (const place of commune.places) expect(PLACE_TEXTS[place.id]?.description, place.id).toBeTruthy();
  });

  it('rattache chaque action à un lieu, des sources et des questions qui existent', () => {
    expect(actionIds.size).toBe(ACTIONS.length);
    for (const action of ACTIONS) {
      expect(placeIds.has(action.place), `${action.id} : lieu`).toBe(true);
      // Toute consigne a sa source ; seules les actions de pur récit en sont dispensées.
      if (!action.narrative) expect(action.sources.length, `${action.id} : au moins une source`).toBeGreaterThan(0);
      if (action.requires) expect(actionIds.has(action.requires), `${action.id} : préalable`).toBe(true);
      if (action.eased) expect(actionIds.has(action.eased.by), `${action.id} : préparation`).toBe(true);
      for (const id of action.questions ?? []) expect(questionIds.has(id), `${action.id} : question ${id}`).toBe(true);
      // Une action verrouillable explique pourquoi elle l'est.
      if (action.requires) expect(action.locked, `${action.id} : message de verrouillage`).toBeTruthy();
    }
  });

  it('ne cite que des sources connues, officielles et en https', () => {
    const cited = [
      ...ACTIONS.flatMap((a) => a.sources),
      ...QUESTIONS.flatMap((q) => q.sources),
      ...SCRIPTS.flatMap(([, crisis]) => [...crisis.situations, ...crisis.stakes, ...bulletinsOf(crisis)].flatMap((item) => item.sources)),
      ...dicrimSources(),
      ...LEXICON.flatMap((entry) => entry.sources),
      ...VIGILANCE_SCALE.sources,
    ];
    for (const id of cited) expect(SOURCES[id], `source ${id}`).toBeDefined();
    for (const [id, source] of Object.entries(SOURCES)) {
      // Sites de l'État, et Météo-France pour la vigilance.
      expect(source.url, id).toMatch(/^https:\/\/[a-z0-9.-]+\.(gouv|meteofrance)\.fr\//);
      expect(source.consulte, id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(source.titre.length, id).toBeGreaterThan(3);
    }
  });

  it('explique les mots techniques employés par les gestes', () => {
    expect(new Set(LEXICON.map((entry) => entry.id)).size).toBe(LEXICON.length);
    for (const action of ACTIONS) {
      for (const id of action.lexicon ?? []) expect(findEntry(id), `${action.id} : mot ${id}`).toBeDefined();
    }
    for (const entry of LEXICON) {
      expect(entry.sources.length, entry.id).toBeGreaterThan(0);
      expect(entry.definition.length, entry.id).toBeGreaterThan(40);
    }
  });

  it('consacre un chapitre du DICRIM à chaque risque cartographié, avec ses bons réflexes sourcés', () => {
    expect(DICRIM.risks.map((risk) => risk.id)).toEqual([...RISK_IDS]);
    for (const risk of DICRIM.risks) {
      expect(risk.sources.length, risk.id).toBeGreaterThan(0);
      expect(risk.reflexes.length, risk.id).toBeGreaterThan(0);
      expect(risk.mapSummary.length, `${risk.id} : description de la carte`).toBeGreaterThan(40);
      for (const group of risk.reflexes) expect(group.items.length, `${risk.id} / ${group.heading}`).toBeGreaterThan(0);
    }
  });

  it('définit les quatre niveaux de vigilance, source à l’appui, et un temps pour chaque phase', () => {
    expect(VIGILANCE_SCALE.levels.map((level) => level.id)).toEqual(['verte', 'jaune', 'orange', 'rouge']);
    expect(VIGILANCE_SCALE.sources.length).toBeGreaterThan(0);
    for (const level of VIGILANCE_SCALE.levels) expect(level.meaning.length, level.id).toBeGreaterThan(20);
    const levels = new Set(VIGILANCE_SCALE.levels.map((level) => level.id));
    for (const info of CHAPTERS.filter((chapter) => chapter.playable)) {
      for (const [phase, situation] of Object.entries(playbookOf(info.id).content!.situation)) {
        expect(levels.has(situation.level), `${info.id} / ${phase}`).toBe(true);
        expect(situation.indicator.length, `${info.id} / ${phase}`).toBeGreaterThan(5);
        expect(SKIES[situation.sky], `${info.id} / ${phase}`).toBeDefined();
        expect(situation.river.length, `${info.id} / ${phase}`).toBeGreaterThan(4);
      }
    }
  });

  it('décrit chaque chapitre jouable : gestes, horaires, récit d’ouverture, indicateur', () => {
    for (const info of CHAPTERS.filter((chapter) => chapter.playable)) {
      const { content, actions, timing } = playbookOf(info.id);
      expect(content, info.id).not.toBeNull();
      if (!content) continue;
      // Le prologue vient en tête de ce qui se joue, quel que soit le chapitre.
      expect(actions.slice(0, 2).map((a) => a.id), info.id).toEqual(['mairie-accueil', 'mairie-dicrim']);
      // Chaque phase minutée a de quoi se terminer : un geste qui la clôt.
      const phases = content.crisis ? (['preparation', 'vigilance'] as const) : (['preparation'] as const);
      for (const phase of phases) {
        const inPhase = content.actions.filter((a) => a.phase === phase);
        expect(inPhase.filter((a) => a.endsPhase).length, `${info.id} / ${phase} : geste de fin`).toBe(1);
        // Tous les gestes tiennent dans le temps de la phase, même sans rien avoir préparé, avec une demi-heure au moins pour les trajets.
        const needed = inPhase.reduce((sum, a) => sum + a.minutes, 0);
        expect(timing[phase].minutes - needed, `${info.id} / ${phase} : marge`).toBeGreaterThanOrEqual(30);
      }
      expect(content.opening.paragraphs.length, info.id).toBeGreaterThan(0);
      for (const level of ['verte', 'jaune', 'orange', 'rouge'] as const) expect(content.levels[level], `${info.id} / ${level}`).toBeTruthy();
      for (const id of content.hazardInfo?.sources ?? []) expect(SOURCES[id], `${info.id} : source ${id}`).toBeDefined();
      // Un chapitre dont la suite n'est pas écrite l'annonce au joueur, et le calendrier le dit.
      if (!content.crisis) {
        expect(content.toBeContinued, info.id).toBeDefined();
        expect(info.note, info.id).toBeTruthy();
      }
    }
  });

  it('donne à chaque chapitre complet de quoi jouer sa crise : lieux, récit, messages, bilan', () => {
    expect(SCRIPTS.map(([id]) => id)).toEqual(['automne', 'ete']);
    for (const [id, crisis] of SCRIPTS) {
      expect(placeIds.has(crisis.places.vigilance), `${id} : lieu de la vigilance`).toBe(true);
      expect(placeIds.has(crisis.places.crise), `${id} : lieu de la crise`).toBe(true);
      // Le geste qui clôt la vigilance se fait là où le joueur passera la crise.
      const shelter = playbookOf(id).content!.actions.find((a) => a.phase === 'vigilance' && a.endsPhase);
      expect(shelter?.place, `${id} : abri`).toBe(crisis.places.crise);
      if (crisis.firebreak) expect(actionIds.has(crisis.firebreak), `${id} : coupe-feu`).toBe(true);
      // Chaque récit commence par un moment raconté, et chaque message est précédé du moment qui l'annonce, avec son signal.
      for (const beats of [crisis.vigilance, crisis.onset]) {
        expect('tell' in beats[0], id).toBe(true);
        beats.forEach((beat, index) => {
          if (!('bulletin' in beat)) return;
          const before = beats[index - 1];
          expect(before && 'tell' in before && before.tell.sound, `${id} : signal avant « ${beat.bulletin.title} »`).toBeTruthy();
          expect(beat.bulletin.paragraphs.length, beat.bulletin.id).toBeGreaterThan(0);
        });
        // Une phase peut s'achever faute de temps : le moment qui suit a sa variante.
        const first = beats[0];
        expect('tell' in first && first.tell.late, `${id} : variante « trop tard »`).toBeTruthy();
      }
      // L'alerte, elle, sonne.
      const alert = crisis.onset.find((beat) => 'tell' in beat);
      expect(alert && 'tell' in alert && alert.tell.sound, id).toBe('alerte');
      expect(crisis.ready.length, id).toBeGreaterThan(10);
      expect(crisis.bilan.title.length, id).toBeGreaterThan(5);
      expect(crisis.bilan.lead.length, id).toBeGreaterThan(20);
      expect(crisis.situations.length, id).toBe(6);
    }
  });

  it('fait précéder chaque alerte d’un moment de récit complet', () => {
    const levels = new Set(VIGILANCE_SCALE.levels.map((level) => level.id));
    for (const story of [STORY, FIRE_STORY]) {
      for (const [key, card] of Object.entries<StoryCard>(story)) {
        expect(card.id, key).toBe(key);
        expect(card.when.length, key).toBeGreaterThan(3);
        expect(card.title.length, key).toBeGreaterThan(3);
        expect(card.paragraphs.length, key).toBeGreaterThan(0);
        expect(card.next.length, key).toBeGreaterThan(3);
        expect(SKIES[card.sky], key).toBeDefined();
        expect(levels.has(card.vigilance), key).toBe(true);
      }
    }
    // Tous les moments écrits sont joués : aucun ne reste dans un tiroir.
    for (const [id, crisis] of SCRIPTS) {
      const story = id === 'automne' ? STORY : FIRE_STORY;
      expect([playbookOf(id).content!.opening, ...cardsOf(crisis)].map((card) => card.id).sort(), id).toEqual(Object.keys(story).sort());
    }
    // Le signal sonore accompagne le texte qui l'annonce : le téléphone vibre avant un bulletin, sonne avant l'alerte.
    expect([STORY.soir.sound, STORY.matin.sound, STORY.abri.sound]).toEqual(['message', 'message', 'alerte']);
    // Les deux phases qui peuvent s'achever faute de temps ont leur variante.
    expect(STORY.soir.late).toBeTruthy();
    expect(STORY.abri.late).toBeTruthy();
  });

  it('donne à chaque question une bonne réponse et des identifiants uniques', () => {
    expect(new Set(ALL_SITUATIONS.map((s) => s.id)).size).toBe(ALL_SITUATIONS.length);
    for (const question of [...QUESTIONS, ...ALL_SITUATIONS]) {
      const ids = question.choices.map((c) => c.id);
      expect(new Set(ids).size, question.id).toBe(ids.length);
      const correct = question.choices.filter((c) => c.correct).length;
      if (question.multiple) expect(correct, question.id).toBeGreaterThan(1);
      else expect(correct, question.id).toBe(1);
      expect(question.lesson.length, question.id).toBeGreaterThan(10);
    }
  });

  it('raconte chaque conséquence dans les situations de crise, et fait grandir le danger', () => {
    for (const [id, crisis] of SCRIPTS) {
      // Le danger ne recule jamais : il grandit pendant la vigilance, puis de décision en décision.
      const [from, to] = crisis.levels.vigilance;
      expect(to, id).toBeGreaterThanOrEqual(from);
      let previous = to;
      for (const situation of crisis.situations) {
        for (const choice of situation.choices) expect(choice.outcome, `${situation.id}/${choice.id}`).toBeTruthy();
        expect(situation.hazard, situation.id).toBeGreaterThan(previous);
        previous = situation.hazard;
      }
    }
  });

  it('écrit un dénouement pour chaque niveau atteignable de chaque enjeu', () => {
    for (const [id, crisis] of SCRIPTS) {
      expect(new Set(crisis.stakes.map((stake) => stake.id)).size, id).toBe(crisis.stakes.length);
      for (const stake of crisis.stakes) {
        expect(stake.outcomes[0], stake.id).toBeTruthy();
        expect(stake.outcomes[2], stake.id).toBeTruthy();
        expect(stake.lesson.length, stake.id).toBeGreaterThan(20);
      }
      expect(crisis.badges.length, id).toBeGreaterThan(3);
    }
    // Badges et enjeux portent des identifiants propres à leur chapitre : la sauvegarde les distingue.
    expect(new Set(ALL_BADGES.map((b) => b.id)).size).toBe(ALL_BADGES.length);
    const stakeIds = SCRIPTS.flatMap(([, crisis]) => crisis.stakes.map((stake) => stake.id));
    expect(new Set(stakeIds).size).toBe(stakeIds.length);
  });
});
