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

/** Ce que contient le kit, d'après la liste officielle : le joueur la retrouve chez lui, une fois son sac prêt. */
export const KIT_CONTENTS: string[] = [
  'Une radio à piles, avec des piles de rechange, pour suivre les consignes des autorités',
  'Des médicaments',
  'Une trousse de premiers secours (alcool, pansements, compresses…)',
  'Des outils de base (couteau multifonctions, ouvre-boîte…)',
  'De la nourriture non périssable, qui ne demande pas de cuisson (conserves, petits pots pour bébé, nourriture pour animaux…)',
  'Des vêtements chauds et une couverture de survie',
  'Une lampe de poche, avec des piles de rechange, des bougies, un briquet ou des allumettes',
  'Un chargeur de téléphone portable',
  'Une paire de lunettes de secours',
  "De l'argent liquide : les distributeurs peuvent ne pas fonctionner",
  "De l'eau potable : 6 litres par personne, en bouteilles",
  "Les photocopies des documents essentiels (carte d'identité, ordonnances…), dans une pochette étanche",
  'Le double des clés de la maison et de la voiture',
  'Des jeux pour occuper le temps',
];

/** Comment on en prend soin, d'après la même page. */
export const KIT_CARE = "Le sac se range dans un endroit facile d'accès. Son contenu se vérifie une fois par an, en particulier la date de péremption des médicaments et des denrées ; les piles se remplacent. Après usage, on le réapprovisionne.";
export const KIT_SOURCES = ['georisques-kit'];

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

/**
 * Hors chapitre : le kit se prépare aussi quand on veut, chez soi, sans que le
 * temps soit compté. Une fois prêt, il vaut pour tous les chapitres.
 */
export const KIT_AT_HOME: ActionDef = (() => {
  const { owned: _owned, ...action } = kitAction({ id: 'maison-kit-libre', sources: ['georisques-kit', 'ecologie-kit', 'georisques-acteurs'] });
  return { ...action, phase: 'libre', minutes: 0 };
})();
