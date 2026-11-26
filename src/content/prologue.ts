import type { ActionDef } from './model';

/**
 * Le prologue, commun à toute la partie : rencontrer le maire, puis lire le
 * DICRIM. C'est la seule étape obligatoire ; ensuite, le joueur choisit ses
 * chapitres dans le téléphone.
 */
export const PROLOGUE: ActionDef[] = [
  {
    id: 'mairie-accueil',
    place: 'mairie',
    phase: 'accueil',
    minutes: 0,
    title: 'Vous présenter au maire',
    why: "Le maire est responsable de la sécurité sur sa commune : il veille à l'information sur les risques et à l'organisation des secours en cas de crise.",
    who: 'Vous. Le maire vous attend pour votre première mission de réserviste.',
    done: "« Bienvenue dans la réserve ! Avant toute chose, lisez notre DICRIM : il vous dira où sont les risques de la commune, et ce que chacun peut faire pour s'y préparer. Ensuite, vous choisirez votre première mission. »",
    sources: ['georisques-acteurs'],
  },
  {
    id: 'mairie-dicrim',
    lexicon: ['dicrim'],
    place: 'mairie',
    phase: 'accueil',
    minutes: 0,
    requires: 'mairie-accueil',
    locked: "Présentez-vous d'abord au maire : c'est lui qui vous remettra le document.",
    endsPhase: true,
    title: 'Consulter le DICRIM',
    go: 'Ouvrir le DICRIM',
    why: "Le document d'information communal sur les risques majeurs présente les risques de la commune, les mesures prises pour s'en protéger et les consignes de sécurité. Se renseigner en mairie est la première des mesures de prévention.",
    who: 'Le maire rédige le DICRIM et doit le faire connaître. À chacun de le lire.',
    done: "Vous avez parcouru le DICRIM : vous savez maintenant où sont les risques de la commune. Ses cartes peuvent s'afficher sur le plan du jeu : depuis le document, ou dans le téléphone, application Carte. Le document lui-même reste dans votre téléphone, application Documents. Il vous reste à choisir votre première mission.",
    sources: ['georisques-inondation', 'georisques-dicrim'],
  },
];

/** La mission, tant qu'aucun chapitre n'est en cours. */
export const PROLOGUE_OBJECTIVES = {
  accueil: 'Présentez-vous à la mairie, puis lisez le DICRIM.',
  libre: 'Choisissez un chapitre dans le téléphone, application Chapitres.',
} as const;

/** Ce que la barre d'état montre hors chapitre : rien à signaler. */
export const CALM = { level: 'verte', indicator: 'Aucune alerte', sky: 'sec', river: 'à son niveau habituel' } as const;
