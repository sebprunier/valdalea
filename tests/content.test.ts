import { describe, expect, it } from 'vitest';
import { DICRIM, dicrimSources } from '../src/content/dicrim';
import { ACTIONS, BADGES, BULLETIN_JAUNE, BULLETIN_ORANGE, BULLETIN_ROUGE, QUESTIONS, SITUATION, SITUATIONS, STAKES, STORY, VIGILANCE_SCALE } from '../src/content/inondation';
import { findEntry, LEXICON } from '../src/content/lexique';
import { SOURCES } from '../src/content/model';
import { PLACE_TEXTS } from '../src/content/places';
import { SKIES } from '../src/render/weather';
import { RISK_IDS } from '../src/world/model';
import { buildValDAlea } from '../src/world/valdalea';

const commune = buildValDAlea();
const placeIds = new Set(commune.places.map((p) => p.id));
const actionIds = new Set(ACTIONS.map((a) => a.id));
const questionIds = new Set(QUESTIONS.map((q) => q.id));

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
      ...SITUATIONS.flatMap((s) => s.sources),
      ...STAKES.flatMap((s) => s.sources),
      ...[BULLETIN_JAUNE, BULLETIN_ORANGE, BULLETIN_ROUGE].flatMap((b) => b.sources),
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
    for (const [phase, situation] of Object.entries(SITUATION)) {
      expect(levels.has(situation.vigilance), phase).toBe(true);
      expect(SKIES[situation.sky], phase).toBeDefined();
      expect(situation.river.length, phase).toBeGreaterThan(5);
    }
  });

  it('fait précéder chaque alerte d’un moment de récit complet', () => {
    const levels = new Set(VIGILANCE_SCALE.levels.map((level) => level.id));
    for (const [key, card] of Object.entries(STORY)) {
      expect(card.id, key).toBe(key);
      expect(card.when.length, key).toBeGreaterThan(3);
      expect(card.title.length, key).toBeGreaterThan(3);
      expect(card.paragraphs.length, key).toBeGreaterThan(0);
      expect(card.next.length, key).toBeGreaterThan(3);
      expect(SKIES[card.sky], key).toBeDefined();
      expect(levels.has(card.vigilance), key).toBe(true);
    }
    // Les deux phases qui peuvent s'achever faute de temps ont leur variante.
    expect(STORY.soir.late).toBeTruthy();
    expect(STORY.abri.late).toBeTruthy();
  });

  it('donne à chaque question une bonne réponse et des identifiants uniques', () => {
    for (const question of [...QUESTIONS, ...SITUATIONS]) {
      const ids = question.choices.map((c) => c.id);
      expect(new Set(ids).size, question.id).toBe(ids.length);
      const correct = question.choices.filter((c) => c.correct).length;
      if (question.multiple) expect(correct, question.id).toBeGreaterThan(1);
      else expect(correct, question.id).toBe(1);
      expect(question.lesson.length, question.id).toBeGreaterThan(10);
    }
  });

  it('raconte chaque conséquence dans les situations de crise, et fait monter l’eau', () => {
    let previous = 0;
    for (const situation of SITUATIONS) {
      for (const choice of situation.choices) expect(choice.outcome, `${situation.id}/${choice.id}`).toBeTruthy();
      expect(situation.floodLevel, situation.id).toBeGreaterThan(previous);
      previous = situation.floodLevel;
    }
  });

  it('écrit un dénouement pour chaque niveau atteignable de chaque enjeu', () => {
    for (const stake of STAKES) {
      expect(stake.outcomes[0], stake.id).toBeTruthy();
      expect(stake.outcomes[2], stake.id).toBeTruthy();
    }
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length);
  });
});
