import { describe, expect, it } from 'vitest';
import { ALL_QUESTIONS, ALL_SITUATIONS } from '../src/content/chapitres';
import { mulberry32, shuffled } from '../src/core/rng';

describe('mélange des réponses', () => {
  it('rend les mêmes éléments, sans toucher à la liste d’origine', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f'];
    const copy = [...items];
    const mixed = shuffled(items, mulberry32(7));
    expect(items).toEqual(copy);
    expect([...mixed].sort()).toEqual(copy);
    expect(shuffled([], mulberry32(1))).toEqual([]);
    expect(shuffled(['seul'], mulberry32(1))).toEqual(['seul']);
  });

  it('change vraiment l’ordre, et pas toujours de la même façon', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f'];
    const orders = new Set(Array.from({ length: 40 }, (_, seed) => shuffled(items, mulberry32(seed + 1)).join('')));
    expect(orders.size).toBeGreaterThan(20);
    // Chaque élément se retrouve en tête de temps en temps : la bonne réponse n'est plus toujours la première.
    const first = new Set(Array.from({ length: 200 }, (_, seed) => shuffled(items, mulberry32(seed + 1))[0]));
    expect([...first].sort()).toEqual(items);
  });

  it('ne casse aucune question : aucune réponse ne renvoie à sa place dans la liste', () => {
    // « Les deux premières », « aucune de ces réponses », « ci-dessus »… n'auraient plus de sens une fois l'ordre tiré au sort.
    for (const question of [...ALL_QUESTIONS, ...ALL_SITUATIONS]) {
      for (const choice of question.choices) {
        expect(choice.label, `${question.id}/${choice.id}`).not.toMatch(/ci-dessus|ci-dessous|les deux|toutes ces|aucune de ces|première réponse|dernière réponse|précédent/i);
      }
    }
  });
});
