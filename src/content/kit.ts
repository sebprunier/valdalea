import type { ActionDef, Question } from './model';

/**
 * Le kit d'urgence 72 heures : un sujet commun à tous les risques.
 *
 * Chaque chapitre le propose chez le joueur, pendant sa préparation. Dans le
 * premier chapitre joué, quel qu'il soit, on le prépare, en répondant aux
 * questions sur son contenu ; dans les suivants, il est déjà là : on le vérifie,
 * ce qui va plus vite. Les consignes reprennent les pages « Mon kit d'urgence
 * 72H » (Géorisques) et « Préparer son kit d'urgence 72 h » (ministère chargé de
 * la Transition écologique).
 */

/**
 * Le geste du kit, pour un chapitre.
 * @param id identifiant du geste dans ce chapitre : le bilan s'y réfère
 * @param risk ce que le kit apporte face au risque du chapitre, ajouté au « pourquoi »
 */
export function kitAction({ id, sources, risk = '' }: { id: string; sources: string[]; risk?: string }): ActionDef {
  const also = risk ? ` ${risk}` : '';
  return {
    id,
    lexicon: ['kit'],
    place: 'domicile',
    phase: 'preparation',
    grants: 'kit',
    minutes: 30,
    questions: KIT_QUESTIONS.map((question) => question.id),
    title: "Préparer votre kit d'urgence 72 h",
    why: `Coupures d'électricité, de gaz et d'eau, routes impraticables : les premières 72 heures d'une catastrophe sont souvent les plus éprouvantes. Un sac préparé à l'avance permet de rester chez soi en attendant les secours, ou de partir sans rien oublier d'essentiel.${also}`,
    who: 'Chaque foyer. Le citoyen est le premier acteur de sa sécurité.',
    done: "Le sac est prêt, à portée de main en haut de l'escalier. Il servira pour tous les risques : pensez à le vérifier une fois par an.",
    sources,
    owned: {
      minutes: 15,
      questions: [],
      title: "Vérifier votre kit d'urgence",
      why: `Le kit d'urgence 72 heures sert pour tous les risques : celui que vous avez déjà préparé est le bon. Son contenu se vérifie une fois par an.${also}`,
      who: 'Chaque foyer.',
      done: "Les piles de la radio sont changées, les bouteilles d'eau renouvelées. Le sac retrouve sa place, à portée de main.",
    },
  };
}

export const KIT_QUESTIONS: Question[] = [
  {
    id: 'kit-contenu',
    prompt: 'Que mettez-vous dans le sac ?',
    multiple: true,
    choices: [
      { id: 'radio', label: 'Une radio à piles, avec des piles de rechange', correct: true, outcome: 'Pour suivre les consignes des autorités, même sans courant.' },
      { id: 'surgeles', label: 'Des plats surgelés', correct: false, outcome: "Sans électricité, ils sont perdus. Il faut de la nourriture non périssable, qui ne demande pas de cuisson." },
      { id: 'eau', label: "De l'eau potable en bouteilles", correct: true },
      { id: 'lampe', label: 'Une lampe de poche', correct: true, outcome: 'Avec des piles de rechange, ou à dynamo.' },
      { id: 'bouilloire', label: 'La bouilloire électrique', correct: false, outcome: 'Inutile pendant une coupure de courant.' },
      { id: 'medicaments', label: 'Vos médicaments et une trousse de premiers secours', correct: true },
      { id: 'papiers', label: 'Les photocopies de vos papiers, dans une pochette étanche', correct: true },
      { id: 'box', label: 'La box internet', correct: false, outcome: 'Sans courant ni réseau, elle ne sert à rien. Prenez plutôt le chargeur du téléphone.' },
      { id: 'argent', label: "De l'argent liquide", correct: true, outcome: 'Les distributeurs peuvent ne pas fonctionner.' },
      { id: 'conserves', label: 'Des conserves et un ouvre-boîte', correct: true },
    ],
    lesson: "La liste officielle compte une quinzaine d'objets : radio à piles, lampe de poche, eau, nourriture non périssable, médicaments, trousse de premiers secours, vêtements chauds, couverture de survie, argent liquide, photocopies des papiers, double des clés, chargeur de téléphone, lunettes de secours, outils de base, jeux pour occuper le temps.",
    sources: ['georisques-kit'],
  },
  {
    id: 'kit-eau',
    prompt: "Combien d'eau potable prévoyez-vous par personne ?",
    choices: [
      { id: 'un-litre-et-demi', label: '1,5 litre', correct: false },
      { id: 'trois-litres', label: '3 litres', correct: false },
      { id: 'six-litres', label: '6 litres', correct: true },
    ],
    lesson: 'Il faut 6 litres par personne, en bouteilles.',
    sources: ['georisques-kit'],
  },
  {
    id: 'kit-rangement',
    prompt: 'Où rangez-vous le sac ?',
    choices: [
      { id: 'cave', label: 'À la cave, avec les provisions', correct: false },
      { id: 'accessible', label: "Dans un endroit facile d'accès, hors de portée de l'eau", correct: true },
      { id: 'grenier', label: 'Tout au fond du grenier, derrière les cartons', correct: false },
    ],
    lesson: "Le kit doit pouvoir être récupéré le plus vite possible, tout en étant hors de portée de l'eau : jamais dans une cave ni en sous-sol.",
    sources: ['ecologie-kit'],
  },
];
