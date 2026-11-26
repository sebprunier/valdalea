import { kitAction, KIT_QUESTIONS } from './kit';
import type { ActionDef, BadgeDef, Bulletin, ChapterContent, ChapterView, Question, Situation, StakeDef, StoryCard } from './model';

/**
 * Chapitre « Le nuage des Vannes » : le risque d'accident industriel.
 *
 * Il se joue en deux temps. En janvier, une matinée pour faire connaître le
 * signal d'alerte et la conduite à tenir autour de l'usine d'engrais : les
 * brochures de la mairie, le signal, le tour de la cité des Vannes, la maison
 * d'Inès, l'école. Un jeudi de février, une fuite de gaz toxique : la sirène
 * retentit sans prévenir, et le joueur, qui se trouve dans la cité, se met à
 * l'abri chez Inès. Le temps de fermer et de calfeutrer la maison, puis six
 * décisions à prendre, portes closes, jusqu'à la fin de l'alerte.
 *
 * C'est le réflexe inverse de celui du feu : on ne part pas, on se met à l'abri
 * dans le bâtiment le plus proche, et l'on n'évacue que sur ordre des autorités.
 * Le réserviste ne joue pas les secours : il s'abrite, et aide ses hôtes.
 *
 * Les gestes et consignes reprennent « Que faire en cas d'accident industriel ? »
 * et « Accident industriel » (Géorisques), relues à la source. Rien n'y est
 * ajouté : ni le chauffage à couper, ni l'aération après l'alerte n'y figurent,
 * et le jeu n'en parle donc pas. Les personnages, le produit en cause et le
 * déroulé de l'accident sont de la fiction.
 */

/**
 * Étendue du nuage sur la carte (voir `world/plume`) : de 0 à 1 il s'étire de
 * l'usine vers la cité ; au-delà, la fuite est colmatée et il se dissipe.
 */
export const NUAGE = {
  /** De la première sirène à la fin du temps laissé pour calfeutrer : il traverse le site, puis le pré. */
  alerte: [0.1, 0.7] as const,
  /** Quand le téléphone sonne de nouveau : il atteint les premières maisons de la cité. */
  arrive: 0.92,
  /** Il s'est dissipé. */
  dissipe: 1.5,
};

export const ACTIONS: ActionDef[] = [
  {
    id: 'mairie-brochures',
    lexicon: ['seveso'],
    place: 'mairie',
    phase: 'preparation',
    minutes: 15,
    title: "Demander les brochures d'information",
    why: "Les personnes qui vivent dans une zone à risques industriels majeurs demandent à leur mairie les brochures d'information éditées par l'industriel, en lien avec la préfecture : elles informent sur les signaux d'alerte et indiquent la conduite à tenir.",
    who: "L'industriel et la préfecture les éditent ; la mairie les tient à disposition. La réserve communale aide à les faire connaître.",
    done: "La secrétaire de mairie vous tend un carton : deux cents brochures, que personne n'était venu chercher depuis des mois. Sur la couverture, l'usine, et un titre : « Si la sirène retentit ».",
    sources: ['georisques-industriel'],
  },
  {
    id: 'usine-signal',
    lexicon: ['signal-alerte'],
    place: 'usine',
    phase: 'preparation',
    minutes: 20,
    questions: ['signal-alerte', 'signal-reflexe'],
    title: "Apprendre à reconnaître le signal d'alerte",
    why: "Le signal national d'alerte s'identifie à l'avance, pour le reconnaître en cas d'événement : une sirène qui retentit trois fois pendant 1 minute et 41 secondes. La fin de l'alerte est donnée par un autre signal sonore, de 30 secondes.",
    who: "Chacun. Au portail de l'usine, la responsable de la sécurité vous explique ce que la brochure décrit.",
    done: "« Trois fois une minute quarante et une : on ne peut pas la confondre », résume la responsable de la sécurité. « Et tant que vous n'avez pas entendu l'autre signal, celui de trente secondes, l'alerte n'est pas finie. »",
    sources: ['georisques-industriel'],
  },
  {
    id: 'cite-tournee',
    place: 'cite',
    phase: 'preparation',
    minutes: 40,
    requires: 'mairie-brochures',
    locked: "Vous n'avez rien à laisser aux habitants : passez d'abord à la mairie prendre les brochures d'information.",
    questions: ['nuage-abri'],
    title: 'Faire le tour de la cité des Vannes',
    why: "Dès le signal d'alerte, on se met à l'abri dans un bâtiment en dur, on ferme portes et fenêtres, on calfeutre les ouvertures et les aérations, on arrête la ventilation et la climatisation. Encore faut-il l'avoir lu avant : le jour venu, personne n'aura le temps de chercher la brochure.",
    who: 'Chaque habitant. La réserve communale passe de porte en porte, la brochure à la main.',
    done: 'Six maisons, six conversations sur le pas de la porte. Presque tout le monde pensait qu’il faudrait partir. Les brochures sont maintenant aimantées sur les réfrigérateurs.',
    sources: ['georisques-industriel'],
  },
  {
    id: 'ines-ruban',
    place: 'ines',
    phase: 'preparation',
    minutes: 20,
    title: "Préparer la maison d'Inès",
    why: "Dans une zone à risques industriels, on prépare son kit d'urgence 72 heures et l'on se munit de gros ruban adhésif : il sert à calfeutrer les ouvertures et les aérations. Autant savoir à l'avance où elles sont, et comment s'arrête la ventilation.",
    who: "Inès, dont la maison est la plus proche de l'usine. Elle y vit avec sa mère, Colette, et son fils Malo ; Karim, son mari, travaille chez Engrais du Val.",
    done: "Vous faites le tour des pièces avec Inès : deux grilles d'aération, la hotte, la fente de la boîte aux lettres dans la porte. L'interrupteur de la ventilation est dans le placard de l'entrée. Elle pose deux rouleaux de gros ruban adhésif sur l'étagère, bien en vue.",
    sources: ['georisques-industriel'],
  },
  {
    id: 'ecole-abri',
    lexicon: ['ppms'],
    place: 'ecole',
    phase: 'preparation',
    minutes: 15,
    title: "Demander comment l'école met les enfants à l'abri",
    why: "En cas d'accident industriel, on ne va pas chercher ses enfants : ils sont pris en charge par les équipes pédagogiques ou les secours. Les établissements scolaires s'y préparent avec leur plan particulier de mise en sûreté (PPMS).",
    who: 'La directrice et son équipe. Les parents, eux, restent à l’abri là où ils se trouvent.',
    done: "La directrice vous montre la salle où les classes se regroupent, fenêtres fermées, jusqu'à la fin de l'alerte. « Malo, le fils d'Inès ? Il est chez nous. Dites à sa mère qu'il sera pris en charge ici : qu'elle ne traverse pas la commune pour venir le chercher. »",
    sources: ['georisques-industriel', 'georisques-acteurs'],
  },
  // Le kit se prépare ici si c'est le premier chapitre joué ; sinon, il se vérifie.
  kitAction({
    id: 'maison-kit-hiver',
    sources: ['georisques-kit', 'ecologie-kit', 'georisques-industriel'],
    risk: 'Dans une zone à risques industriels, on y ajoute du gros ruban adhésif, pour calfeutrer les ouvertures et les aérations.',
  }),
  {
    id: 'maison-midi',
    place: 'domicile',
    phase: 'preparation',
    minutes: 0,
    endsPhase: true,
    narrative: true,
    title: 'Terminer la matinée',
    why: "La matinée s'arrête quand vous le décidez, ou à 14 heures. Ce qui n'a pas été expliqué avant manquera le jour où la sirène retentira.",
    who: 'Vous.',
    done: 'Vous rentrez déjeuner, les doigts gourds de froid.',
    sources: [],
  },

  // ------------------------------------------------------ L'alerte : se mettre à l'abri
  {
    id: 'cite-rentrer',
    place: 'cite',
    phase: 'vigilance',
    minutes: 5,
    title: 'Faire rentrer ceux qui sont dehors',
    why: "Dès le signal d'alerte, on se met à l'abri dans un bâtiment en dur. Si l'on est dans un véhicule, on en sort et l'on gagne un bâtiment le plus rapidement possible.",
    who: 'Chacun. Dans la rue, vous êtes celui qui le dit à voix haute.',
    done: "Un voisin lavait sa voiture, une livreuse cherchait une adresse, un automobiliste s'était arrêté au milieu de la rue, vitre baissée. « Rentrez ! Dans la première maison ! » Les portes s'ouvrent, puis se referment : la rue est vide.",
    sources: ['georisques-industriel'],
  },
  {
    id: 'ines-fermer',
    place: 'ines',
    phase: 'vigilance',
    minutes: 5,
    title: 'Fermer portes et fenêtres',
    why: "Se mettre à l'abri dans un bâtiment en dur, c'est d'abord en fermer les portes et les fenêtres.",
    who: 'Inès et sa mère, avec votre aide.',
    done: "La porte d'entrée, celle du jardin, les fenêtres de l'étage que Colette aérait : tout est fermé.",
    sources: ['georisques-industriel'],
  },
  {
    id: 'ines-ventilation',
    place: 'ines',
    phase: 'vigilance',
    minutes: 5,
    // Si la maison a été préparée en janvier, on sait où se trouve l'interrupteur.
    eased: { by: 'ines-ruban', minutes: 2 },
    title: 'Arrêter la ventilation',
    why: 'On arrête la ventilation et la climatisation.',
    who: 'Inès, avec votre aide.',
    done: "L'interrupteur du placard de l'entrée est baissé. Le ronronnement de la ventilation s'arrête ; on n'entend plus que la sirène.",
    sources: ['georisques-industriel'],
  },
  {
    id: 'ines-calfeutrer',
    place: 'ines',
    phase: 'vigilance',
    minutes: 15,
    // Avec le ruban adhésif à portée de main et les ouvertures déjà repérées, c'est l'affaire de quelques minutes.
    eased: { by: 'ines-ruban', minutes: 5 },
    title: 'Calfeutrer les ouvertures et les aérations',
    why: 'On calfeutre les ouvertures et les aérations avec du gros ruban adhésif.',
    who: 'Inès et sa mère, avec votre aide.',
    done: "Les deux grilles d'aération, la hotte, la fente de la boîte aux lettres, le tour de la porte : le ruban adhésif couvre tout.",
    sources: ['georisques-industriel'],
  },
  {
    id: 'ines-abri',
    place: 'ines',
    phase: 'vigilance',
    minutes: 0,
    endsPhase: true,
    narrative: true,
    title: "Rester à l'abri chez Inès",
    why: "Le nuage approche de la cité. Une fois que vous serez installés, ce qui n'a pas été fermé ou calfeutré ne le sera plus.",
    who: 'Vous.',
    done: 'Vous vous asseyez tous les trois dans le séjour. Colette allume la radio.',
    sources: [],
  },
];

export const QUESTIONS: Question[] = [
  ...KIT_QUESTIONS,
  {
    id: 'signal-alerte',
    prompt: 'À quoi reconnaît-on le signal d’alerte ?',
    choices: [
      { id: 'trois', label: 'Une sirène qui retentit trois fois pendant 1 minute et 41 secondes', correct: true },
      { id: 'trente', label: 'Une sirène qui retentit une seule fois, pendant 30 secondes', correct: false, outcome: 'Trente secondes, c’est l’autre signal : celui qui annonce la fin de l’alerte.' },
      { id: 'klaxon', label: 'Les klaxons des camions de l’usine', correct: false, outcome: 'Le signal d’alerte est une sirène : c’est un signal national, le même partout.' },
    ],
    lesson: 'Le signal national d’alerte : une sirène retentit trois fois pendant 1 minute et 41 secondes. La fin de l’alerte est donnée par un autre signal sonore, de 30 secondes.',
    sources: ['georisques-industriel'],
  },
  {
    id: 'signal-reflexe',
    prompt: 'La sirène retentit. Quel est le premier réflexe ?',
    choices: [
      { id: 'abri', label: 'Se mettre à l’abri dans un bâtiment en dur', correct: true },
      { id: 'voir', label: 'Sortir voir ce qui se passe', correct: false, outcome: 'C’est dehors que l’on est exposé : on gagne un bâtiment en dur, et l’on ferme portes et fenêtres.' },
      { id: 'voiture', label: 'Prendre sa voiture pour s’éloigner', correct: false, outcome: 'Si l’on est dans un véhicule, on en sort et l’on gagne un bâtiment le plus rapidement possible.' },
    ],
    lesson: 'Dès le signal d’alerte, on se met à l’abri dans un bâtiment en dur, et l’on ferme portes et fenêtres. Si l’on est dans un véhicule, on en sort et l’on gagne un bâtiment le plus rapidement possible.',
    sources: ['georisques-industriel'],
  },
  {
    id: 'nuage-abri',
    context: 'Sur le pas de sa porte, un habitant vous arrête : « Moi, si ça sonne, je mets tout le monde dans la voiture et je file. »',
    prompt: 'Que rappelez-vous aux habitants ? Cochez tout ce qui convient.',
    multiple: true,
    choices: [
      { id: 'abri', label: 'Se mettre à l’abri dans un bâtiment en dur, portes et fenêtres fermées', correct: true },
      { id: 'calfeutrer', label: 'Calfeutrer les ouvertures et les aérations, arrêter la ventilation et la climatisation', correct: true },
      { id: 'enfants', label: 'Ne pas aller chercher ses enfants à l’école', correct: true },
      { id: 'ecoute', label: 'Rester à l’écoute des consignes des autorités', correct: true },
      {
        id: 'partir',
        label: 'Partir en voiture, le plus loin possible',
        correct: false,
        outcome: 'On reste à l’abri, et l’on n’évacue son domicile que sur ordre des autorités. Dans un véhicule, on en sort pour gagner un bâtiment.',
      },
      { id: 'aerer', label: 'Ouvrir les fenêtres, pour chasser les odeurs', correct: false, outcome: 'On ferme portes et fenêtres, et l’on calfeutre les ouvertures et les aérations.' },
    ],
    lesson:
      'Dès le signal d’alerte : se mettre à l’abri dans un bâtiment en dur, fermer portes et fenêtres, calfeutrer les ouvertures et les aérations, arrêter la ventilation et la climatisation, ne pas aller chercher ses enfants. Jusqu’à la fin de l’alerte : rester à l’écoute des consignes des autorités, et n’évacuer son domicile que sur leur ordre.',
    sources: ['georisques-industriel'],
  },
];

// --------------------------------------------------------------- À l'abri

/**
 * Six décisions, portes closes, chez Inès, pendant que le nuage passe sur la
 * cité. Chaque bonne réponse est une consigne de la page citée ; les conséquences
 * racontées sont de la fiction.
 */
export const SITUATIONS: Situation[] = [
  {
    id: 'nuage-ecole',
    hazard: 0.95,
    context: '11 h 25. Inès attrape son manteau : « Malo est à l’école. Je vais le chercher, j’en ai pour vingt minutes. »',
    prompt: 'Que lui dites-vous ?',
    choices: [
      {
        id: 'rester',
        label: '« Restez ici : à l’école, Malo est pris en charge. »',
        correct: true,
        outcome: '« Les enseignants gardent les enfants à l’abri jusqu’à la fin de l’alerte. C’est en sortant que vous vous mettriez en danger. » Inès repose son manteau, sans quitter la porte des yeux.',
      },
      {
        id: 'accompagner',
        label: '« Je vous accompagne : à deux, ce sera plus sûr. »',
        correct: false,
        outcome: 'Au bout de la rue, l’air pique la gorge et les yeux. Vous faites demi-tour en toussant ; il faut rouvrir la porte, et l’odeur entre avec vous.',
      },
      {
        id: 'voiture',
        label: '« Prenez la voiture, vitres fermées : ce sera plus rapide. »',
        correct: false,
        outcome: 'Au premier carrefour, un gendarme lui barre la route : « Sortez de ce véhicule et entrez dans cette maison, tout de suite ! » Inès passe l’alerte chez des inconnus, sans nouvelles de Malo ni de vous.',
      },
    ],
    lesson: 'On ne va pas chercher ses enfants : ils sont pris en charge par les équipes pédagogiques ou les secours.',
    sources: ['georisques-industriel'],
  },
  {
    id: 'nuage-telephone',
    hazard: 0.98,
    context: 'Karim travaille à l’usine. Inès l’a appelé deux fois, sans réponse. Elle recompose son numéro ; elle veut ensuite appeler l’usine, la mairie, les pompiers.',
    prompt: 'Que faites-vous ?',
    choices: [
      {
        id: 'ecouter',
        label: 'Nous laissons le téléphone, et nous écoutons les consignes à la radio',
        correct: true,
        outcome: 'À la radio, la préfecture fait le point : le personnel de l’usine est à l’abri sur le site. Inès pose le téléphone sur la table, écran vers le haut.',
      },
      {
        id: 'rappeler',
        label: 'Elle a raison : il faut rappeler jusqu’à ce qu’il décroche',
        correct: false,
        outcome: 'Au cinquième appel, plus de réseau : il est saturé. Dans la cité, plus personne n’arrive à joindre qui que ce soit, pas même les secours.',
      },
      {
        id: 'pompiers',
        label: 'Nous appelons le 18, pour avoir des nouvelles de l’usine',
        correct: false,
        outcome: '« Madame, cette ligne est réservée aux urgences. » Pendant ce temps, quelqu’un cherchait peut-être à signaler un malaise.',
      },
    ],
    lesson: 'Jusqu’à la fin de l’alerte, on reste à l’écoute des consignes des autorités, et l’on évite de téléphoner afin de laisser les réseaux disponibles pour les secours.',
    sources: ['georisques-industriel'],
  },
  {
    id: 'nuage-odeur',
    hazard: 1,
    context: 'Une odeur piquante flotte dans le séjour. Colette tousse, les yeux rouges : « On étouffe, ici. Ouvrez-moi cette fenêtre. »',
    prompt: 'Que faites-vous ?',
    choices: [
      {
        id: 'linge',
        label: 'Un linge humide sur le nez et la bouche, loin des fenêtres',
        correct: true,
        outcome: 'Inès mouille des torchons au robinet. Colette respire à travers le sien, assise au fond de la pièce ; sa toux se calme peu à peu.',
      },
      {
        id: 'ouvrir',
        label: 'J’ouvre un instant, pour renouveler l’air',
        correct: false,
        outcome: 'Dehors, l’air est pire. En dix secondes, l’odeur a envahi la pièce ; il faut refermer, et tout le monde tousse.',
      },
      {
        id: 'jardin',
        label: 'Nous sortons prendre l’air dans le jardin',
        correct: false,
        outcome: 'Dans le jardin, Colette suffoque. Vous la ramenez à l’intérieur en la soutenant ; les secours la garderont en observation jusqu’au soir.',
      },
    ],
    lesson: 'En cas de gêne respiratoire, on respire à travers un linge humide. On s’éloigne des fenêtres, afin de se protéger d’éventuels éclats de verre.',
    sources: ['georisques-industriel'],
  },
  {
    id: 'nuage-voiture',
    hazard: 1.05,
    context: 'De l’autre côté de la rue, le voisin charge sa voiture, sa fille sous le bras. Il vous fait de grands signes : « Venez ! On part tant qu’on peut encore ! »',
    prompt: 'Que décidez-vous ?',
    choices: [
      {
        id: 'rester',
        label: 'Nous restons à l’abri, et je lui fais signe de rentrer',
        correct: true,
        outcome: 'Vous lui montrez sa porte, à grands gestes. Il hésite, regarde la rue vide, puis rentre avec sa fille. Aucun ordre d’évacuation n’a été donné.',
      },
      {
        id: 'partir',
        label: 'Nous partons avec lui : en voiture, nous serons loin en cinq minutes',
        correct: false,
        outcome: 'Au carrefour, la route est barrée, et l’habitacle n’arrête rien : tout le monde tousse. Les gendarmes vous font entrer dans la première maison venue.',
      },
      {
        id: 'convaincre',
        label: 'Je sors le convaincre de rester',
        correct: false,
        outcome: 'Trois minutes dehors suffisent : la gorge vous brûle, vos yeux pleurent. À votre retour, il faut rouvrir la porte, puis tout recalfeutrer.',
      },
    ],
    lesson: 'On reste à l’abri, et l’on n’évacue son domicile que sur ordre des autorités. Si l’on est dans un véhicule, on en sort et l’on gagne un bâtiment le plus rapidement possible.',
    sources: ['georisques-industriel'],
  },
  {
    id: 'nuage-flamme',
    hazard: 1.15,
    context: 'L’attente s’étire. Inès sort un paquet de cigarettes ; Colette parle d’allumer la gazinière pour faire du thé.',
    prompt: 'Que dites-vous ?',
    choices: [
      {
        id: 'rien',
        label: 'Ni cigarette, ni gazinière : aucune flamme tant que dure l’alerte',
        correct: true,
        outcome: 'Inès range son paquet. Le thé attendra ; Colette sort une boîte de biscuits.',
      },
      {
        id: 'the',
        label: 'Le thé, oui ; la cigarette, non',
        correct: false,
        outcome: 'Personne ne sait ce que contient l’air qui est entré. La flamme de la gazinière n’a rien déclenché, cette fois : c’était un pari.',
      },
      {
        id: 'fenetre',
        label: 'La cigarette, mais à la fenêtre entrouverte',
        correct: false,
        outcome: 'Une flamme, et une fenêtre ouverte sur le nuage : deux consignes oubliées d’un coup. L’odeur revient aussitôt dans la pièce.',
      },
    ],
    lesson: 'Jusqu’à la fin de l’alerte, on ne fume pas, et l’on évite toute flamme ou étincelle.',
    sources: ['georisques-industriel'],
  },
  {
    id: 'nuage-fin',
    hazard: 1.3,
    context: '13 h. Plus d’odeur. Dehors, la rue est calme, et le voile s’est effiloché. « C’est fini, non ? » demande Inès, la main sur la poignée.',
    prompt: 'Que décidez-vous ?',
    choices: [
      {
        id: 'attendre',
        label: 'Nous attendons le signal de fin d’alerte',
        correct: true,
        outcome: 'Un quart d’heure plus tard, la sirène retentit de nouveau, pendant trente secondes. Les téléphones vibrent : fin de l’alerte. Inès ouvre la porte.',
      },
      {
        id: 'sortir',
        label: 'Nous sortons : il n’y a plus rien à sentir',
        correct: false,
        outcome: 'Un gendarme vous renvoie à l’intérieur : l’alerte n’est pas levée, et la fuite n’est pas encore colmatée.',
      },
      {
        id: 'aerer',
        label: 'Nous ouvrons grand les fenêtres',
        correct: false,
        outcome: 'Le vent tourne un instant, et l’odeur rentre avec lui. Il faut tout refermer, à la hâte.',
      },
    ],
    lesson: 'On reste à l’abri jusqu’à la fin de l’alerte : elle est donnée par un autre signal sonore, de 30 secondes.',
    sources: ['georisques-industriel'],
  },
];

// -------------------------------------------------------------------- Bilan

const count = (view: ChapterView, ids: string[]): number => ids.filter((id) => view.did(id)).length;
/** Trois gestes : tous faits, la protection est entière ; un ou deux, elle ne l'est qu'en partie. */
const threeSteps = (done: number): 0 | 1 | 2 => (done === 3 ? 2 : done >= 1 ? 1 : 0);

export const STAKES: StakeDef[] = [
  {
    id: 'foyer-ines',
    title: 'Inès et les siens',
    assess: (view) => threeSteps(count(view, ['ines-fermer', 'ines-ventilation', 'ines-calfeutrer'])),
    outcomes: [
      "Rien n'était fermé ni calfeutré quand le nuage a atteint la maison : le gaz est entré partout. Inès, Colette et vous avez les yeux et la gorge irrités ; les secours gardent Colette en observation jusqu'au lendemain.",
      "La maison n'était qu'à moitié prête : le gaz est entré par ce qui restait ouvert. Quelques heures de toux et de larmes pour tout le monde ; un médecin est passé voir Colette.",
      'Portes et fenêtres fermées, ventilation arrêtée, ouvertures calfeutrées : presque rien n’est entré. Tout le monde est sorti de la maison sans autre mal qu’une grosse frayeur.',
    ],
    lesson: "Dès le signal d'alerte : se mettre à l'abri dans un bâtiment en dur, fermer portes et fenêtres, calfeutrer les ouvertures et les aérations avec du gros ruban adhésif, arrêter la ventilation et la climatisation.",
    sources: ['georisques-industriel'],
  },
  {
    id: 'cite-vannes',
    title: 'La cité des Vannes',
    assess: (view) => threeSteps(count(view, ['mairie-brochures', 'cite-tournee', 'cite-rentrer'])),
    outcomes: [
      "Dans la cité, personne ne savait quoi faire. Certains sont sortis voir, d'autres ont pris leur voiture ; les secours ont pris en charge une dizaine de personnes incommodées, dans la rue et aux carrefours.",
      "Une partie de la cité a su quoi faire. Mais il restait du monde dehors, ou sur la route, quand le nuage est arrivé : quatre personnes incommodées ont été prises en charge par les secours.",
      "La brochure était sur tous les réfrigérateurs. À la première sirène, les portes se sont fermées, et la rue était vide avant que le nuage n'arrive : personne n'a été incommodé dans la cité.",
    ],
    lesson:
      "Les personnes qui vivent dans une zone à risques industriels demandent à leur mairie les brochures d'information : elles informent sur les signaux d'alerte et indiquent la conduite à tenir. Dès le signal, on se met à l'abri dans un bâtiment en dur ; dans un véhicule, on en sort pour gagner un bâtiment.",
    sources: ['georisques-industriel'],
  },
  {
    id: 'ecole-malo',
    title: "Malo, à l'école",
    assess: (view) => ((view.did('ecole-abri') ? 1 : 0) + (view.right('nuage-ecole') ? 1 : 0)) as 0 | 1 | 2,
    outcomes: [
      "Personne n'avait demandé à l'école ce qu'elle prévoyait, et Inès a voulu aller chercher Malo : elle s'est exposée au nuage pour rien. Lui n'a jamais quitté sa classe.",
      "Malo est resté à l'abri avec sa classe jusqu'à la fin de l'alerte. Mais il s'en est fallu de peu : soit sa mère a voulu partir le chercher, soit vous n'aviez rien pu lui dire de ce que l'école prévoyait.",
      "Vous saviez ce que l'école prévoyait, et vous l'avez dit à Inès : elle est restée à l'abri. À la fin de l'alerte, Malo est sorti avec sa classe, fier d'avoir passé la matinée « fenêtres fermées ».",
    ],
    lesson: 'On ne va pas chercher ses enfants : ils sont pris en charge par les équipes pédagogiques ou les secours.',
    sources: ['georisques-industriel', 'georisques-acteurs'],
  },
  {
    id: 'preparation-alerte',
    title: 'Votre préparation',
    assess: (view) => threeSteps(count(view, ['usine-signal', 'ines-ruban', 'maison-kit-hiver'])),
    outcomes: [
      "La sirène a surpris tout le monde, vous compris : il a fallu un moment pour comprendre ce qu'elle voulait dire, puis chercher dans toute la maison de quoi calfeutrer.",
      "Vous n'étiez qu'à moitié prêt : il vous manquait de savoir reconnaître le signal, d'avoir le ruban adhésif sous la main chez Inès, ou un kit d'urgence prêt chez vous.",
      "Vous avez reconnu la sirène dès les premières secondes, le ruban adhésif attendait sur l'étagère d'Inès, et votre kit d'urgence est prêt chez vous, pour le jour où vous en aurez besoin.",
    ],
    lesson: "On identifie à l'avance le signal national d'alerte, pour le reconnaître en cas d'événement ; on prépare son kit d'urgence 72 heures, et l'on se munit de gros ruban adhésif.",
    sources: ['georisques-industriel', 'georisques-kit'],
  },
  {
    id: 'reflexes-nuage',
    title: "Vos décisions à l'abri",
    assess: (view) => {
      const right = SITUATIONS.filter((situation) => view.right(situation.id)).length;
      return right === SITUATIONS.length ? 2 : right >= 4 ? 1 : 0;
    },
    outcomes: [
      "Une fois à l'abri, vous avez pris plusieurs risques inutiles. Cette fois, tout finit bien ; mais chacun de ces choix aurait pu très mal tourner.",
      "Vous avez eu la plupart des bons réflexes. Revoyez ceux qui vous ont échappé : le jour venu, il n'y aura pas de seconde chance.",
      'Vous avez eu les bons réflexes du début à la fin : rester à l’abri, ne pas aller à l’école, laisser le téléphone, ne rien allumer, attendre la fin de l’alerte.',
    ],
    lesson:
      "Jusqu'à la fin de l'alerte : rester à l'abri et n'évacuer que sur ordre des autorités, ne pas aller chercher ses enfants, rester à l'écoute des consignes, éviter de téléphoner, ne pas fumer et éviter toute flamme ou étincelle. En cas de gêne respiratoire, respirer à travers un linge humide.",
    sources: ['georisques-industriel'],
  },
];

export const BADGES: BadgeDef[] = [
  { id: 'porte-a-porte', title: 'Porte-à-porte', description: 'Prendre les brochures à la mairie, puis faire le tour de la cité des Vannes.', earned: (v) => v.did('mairie-brochures') && v.did('cite-tournee') },
  { id: 'signal-reconnu', title: 'Signal reconnu', description: "Apprendre à reconnaître le signal national d'alerte.", earned: (v) => v.did('usine-signal') },
  {
    id: 'maison-calfeutree',
    title: 'Maison calfeutrée',
    description: "Fermer la maison d'Inès, arrêter la ventilation et calfeutrer les ouvertures avant l'arrivée du nuage.",
    earned: (v) => v.did('ines-fermer') && v.did('ines-ventilation') && v.did('ines-calfeutrer'),
  },
  {
    id: 'ecole-confiance',
    title: "Confiance à l'école",
    description: "Demander à l'école comment elle met les enfants à l'abri, puis y laisser Malo pendant l'alerte.",
    earned: (v) => v.did('ecole-abri') && v.right('nuage-ecole'),
  },
  { id: 'a-l-abri', title: "À l'abri jusqu'au bout", description: 'Faire le bon choix à chaque décision, de la première sirène à la fin de l’alerte.', earned: (v) => SITUATIONS.every((situation) => v.right(situation.id)) },
];

// ---------------------------------------------------------------- Messages

export const ALERTE_NUAGE: Bulletin = {
  id: 'nuage-alerte',
  kind: 'alerte',
  from: 'FR-Alert',
  title: "Alerte : accident industriel, mettez-vous à l'abri",
  paragraphs: [
    "Jeudi, 10 h 20. Votre téléphone émet un signal sonore que vous ne lui connaissiez pas, alors qu'il était en mode silencieux : vous êtes dans une zone de danger.",
    "Accident industriel à l'usine Engrais du Val : fuite de gaz toxique. Zone industrielle des Vannes, cité des Vannes, sud du hameau des Brandes : mettez-vous à l'abri immédiatement, dans le bâtiment le plus proche.",
  ],
  advice: [
    "Je me mets à l'abri dans un bâtiment en dur, je ferme portes et fenêtres.",
    "Je calfeutre les ouvertures et les aérations, j'arrête la ventilation et la climatisation.",
    "Si je suis dans un véhicule, j'en sors et je gagne un bâtiment le plus rapidement possible.",
    'Je ne vais pas chercher mes enfants : ils sont pris en charge par les équipes pédagogiques ou les secours.',
    "Je reste à l'écoute des consignes des autorités.",
  ],
  sources: ['georisques-industriel', 'fr-alert'],
};

export const MESSAGE_MAIRIE: Bulletin = {
  id: 'nuage-mairie',
  kind: 'message',
  from: "Mairie de Val-d'Aléa",
  title: "Restez à l'abri là où vous êtes",
  paragraphs: [
    "Jeudi, 10 h 25. Fuite sur une cuve de l'usine Engrais du Val. Le préfet a déclenché le plan particulier d'intervention ; les secours sont sur place. Le vent, faible, pousse le nuage vers la cité des Vannes.",
    "La réserve communale n'intervient pas dans la zone. Mettez-vous à l'abri là où vous êtes, dans le bâtiment le plus proche, et aidez ceux qui vous accueillent à fermer et à calfeutrer leur maison. N'essayez pas de rentrer chez vous, ni de rejoindre la mairie.",
  ],
  sources: ['georisques-industriel'],
};

export const ALERTE_SUITE: Bulletin = {
  id: 'nuage-alerte-suite',
  kind: 'alerte',
  from: 'FR-Alert',
  title: "Alerte : le nuage est sur la cité des Vannes, restez à l'abri",
  paragraphs: [
    'Jeudi, 11 h 20. Votre téléphone sonne de nouveau.',
    "Accident industriel en cours à l'usine Engrais du Val. Le nuage toxique atteint la cité des Vannes. Restez à l'abri, portes et fenêtres fermées, jusqu'au signal de fin d'alerte.",
  ],
  advice: [
    "Je reste à l'abri, et je n'évacue mon domicile que sur ordre des autorités.",
    "Je m'éloigne des fenêtres, afin de me protéger d'éventuels éclats de verre.",
    'En cas de gêne respiratoire, je respire à travers un linge humide.',
    "J'évite de téléphoner, afin de laisser les réseaux disponibles pour les secours.",
    "Je ne fume pas, j'évite toute flamme ou étincelle.",
  ],
  sources: ['georisques-industriel', 'fr-alert'],
};

// ------------------------------------------------------------------- Récit

/** Le récit de l'hiver. La sirène et le nuage sont montrés avant que les alertes ne les nomment. */
export const STORY = {
  debut: {
    id: 'debut',
    when: 'Un mardi de janvier, 9 h',
    title: "L'usine d'à côté",
    paragraphs: [
      "« Engrais du Val, c'est un site Seveso seuil haut à cinq cents mètres de la cité des Vannes », vous a dit le maire. « Il n'y a jamais eu d'accident grave. Mais si la sirène retentit un jour, il faudra que chacun sache quoi faire sans réfléchir : se mettre à l'abri, pas courir à l'école ni sauter dans sa voiture. »",
      "Votre mission : faire connaître le signal d'alerte et la conduite à tenir. À la mairie d'abord, pour les brochures ; puis à l'usine, dans la cité des Vannes, chez Inès, et à l'école. Vous avez jusqu'à 14 heures ; le carnet de mission vous dira ce qu'il reste à faire.",
    ],
    next: 'Commencer',
    sky: 'froid',
    vigilance: 'verte',
  },
  sirene: {
    id: 'sirene',
    when: 'Un jeudi de février, 10 h 20',
    title: 'La sirène',
    paragraphs: [
      'Trois semaines ont passé. Ce matin, vous traversez la cité des Vannes ; il gèle, et l’air est presque immobile.',
      'Vous êtes au milieu de la rue quand la sirène retentit, longuement. Elle ne s’arrête pas. Au-dessus des cuves de l’usine, quelque chose s’élève, qui n’est pas de la vapeur. Votre téléphone se met à sonner.',
    ],
    late: 'La matinée de janvier s’est achevée sans que vous ayez tout fait, et trois semaines ont passé. Ce matin, vous traversez la cité des Vannes ; il gèle, et l’air est presque immobile.',
    next: "Lire l'alerte",
    sound: 'sirene',
    sky: 'froid',
    vigilance: 'rouge',
  },
  nuage: {
    id: 'nuage',
    when: 'Jeudi, 11 h 20',
    title: 'Le nuage est là',
    paragraphs: ['Par la fenêtre du séjour, vous voyez la rue se voiler. Les maisons d’en face pâlissent ; dehors, plus un bruit.', 'Votre téléphone sonne de nouveau.'],
    late: 'Vous n’avez pas tout fait, mais il n’est plus temps : vous êtes chez Inès, porte fermée. Par la fenêtre du séjour, vous voyez la rue se voiler ; dehors, plus un bruit.',
    next: "Lire l'alerte",
    sound: 'alerte',
    sky: 'froid',
    vigilance: 'rouge',
  },
  fin: {
    id: 'fin',
    when: 'Jeudi, 13 h 15',
    title: "Fin de l'alerte",
    paragraphs: [
      'La sirène retentit une dernière fois, pendant trente secondes : c’est le signal de fin d’alerte. La fuite est colmatée, et le vent, qui s’est levé, a dispersé ce qui restait du nuage.',
      'Dans la cité, les portes se rouvrent une à une. Karim rentre de l’usine, les traits tirés ; à l’école, les classes sortent dans la cour.',
    ],
    next: 'Voir le bilan',
    sky: 'froid',
    vigilance: 'verte',
  },
} satisfies Record<string, StoryCard>;

const ALERT = 'Alerte : accident industriel';

/** Le chapitre, tel que le jeu le joue : la matinée de janvier, puis le jeudi de février et son nuage, que `ui/flow` met en scène. */
export const HIVER: ChapterContent = {
  id: 'hiver',
  actions: ACTIONS,
  questions: QUESTIONS,
  objectives: {
    preparation: "Faites connaître le signal d'alerte et la conduite à tenir autour de l'usine.",
    vigilance: 'La sirène a retenti : mettez-vous à l’abri chez Inès, fermez et calfeutrez la maison.',
    crise: 'Le nuage est sur la cité : restez à l’abri jusqu’à la fin de l’alerte.',
    bilan: 'L’alerte est levée. Le bilan et vos badges sont dans votre téléphone.',
  },
  situation: {
    preparation: { level: 'verte', indicator: 'Aucune alerte', sky: 'froid', river: "à son niveau d'hiver" },
    vigilance: { level: 'rouge', indicator: ALERT, sky: 'froid', river: "à son niveau d'hiver" },
    crise: { level: 'rouge', indicator: ALERT, sky: 'froid', river: "à son niveau d'hiver" },
    bilan: { level: 'verte', indicator: "Fin de l'alerte", sky: 'froid', river: "à son niveau d'hiver" },
  },
  // Il n'y a pas d'échelle de vigilance pour un accident industriel : il y a une alerte, ou il n'y en a pas.
  levels: { verte: 'Aucune alerte', jaune: 'Aucune alerte', orange: ALERT, rouge: ALERT },
  forecast: {
    preparation: [
      { when: "Aujourd'hui", icon: 'nuage', text: 'Froid et sec. Vent faible.' },
      { when: 'Les semaines qui viennent', icon: 'nuage', text: 'Temps calme et froid.' },
    ],
    vigilance: [
      { when: 'Ce matin', icon: 'nuage', text: "−2 °C. Vent d'est, très faible." },
      { when: 'Cet après-midi', icon: 'eclaircie', text: 'Le vent se lève.' },
    ],
    crise: [
      { when: 'Ce matin', icon: 'nuage', text: "−2 °C. Vent d'est, très faible." },
      { when: 'Cet après-midi', icon: 'eclaircie', text: 'Le vent se lève.' },
    ],
    bilan: [{ when: 'Ce soir', icon: 'eclaircie', text: 'Vent modéré. Gelée dans la nuit.' }],
  },
  timing: {
    // Une matinée de tournée : de quoi tout faire, trajets compris, avec une heure de marge.
    preparation: { minutes: 300, day: 'Mardi', month: 'janvier', startsAt: 9 * 60 },
    // Le temps que le nuage, poussé par un vent très faible, met à atteindre la cité : quatre gestes, à deux pas les uns des autres.
    vigilance: { minutes: 60, day: 'Jeudi', month: 'février', startsAt: 10 * 60 + 20 },
  },
  dusk: null,
  opening: STORY.debut,
  period: { preparation: 'la matinée', vigilance: "l'alerte" },
  alerts: { preparation: 'Le temps presse : il vous reste {reste} avant 14 heures.', vigilance: 'Le nuage approche : il vous reste {reste} pour fermer et calfeutrer la maison.' },
  hazardApp: 'alertes',
  alertInfo: {
    title: "Le signal national d'alerte",
    text: "Une sirène qui retentit trois fois pendant 1 minute et 41 secondes : c'est le signal d'alerte. Dès qu'on l'entend, on se met à l'abri dans un bâtiment en dur. La fin de l'alerte est donnée par un autre signal sonore, de 30 secondes.",
    sources: ['georisques-industriel'],
  },
  crisis: {
    hazard: 'nuage',
    name: "L'alerte",
    // La sirène surprend le joueur dans la rue de la cité ; il passe l'alerte chez Inès, à deux pas.
    places: { vigilance: 'cite', crise: 'ines' },
    // On vise au sud de ce que l'on veut montrer : il reste visible au-dessus de la fenêtre du récit, sur un écran
    // d'ordinateur comme sur un téléphone, où cette fenêtre prend plus de place.
    lookSouth: 300,
    // Quand la sirène retentit, c'est l'usine que l'on regarde : la fuite, et le nuage qui en sort.
    watchSource: true,
    vigilance: [{ tell: STORY.sirene, hazard: NUAGE.alerte[0] }, { bulletin: ALERTE_NUAGE }, { bulletin: MESSAGE_MAIRIE }],
    ready: 'Alerte : la sirène a retenti. Vous êtes dans la cité des Vannes : mettez-vous à l’abri chez Inès, à deux pas.',
    // La rue se voile pendant que le joueur lit : il voit le nuage avant que l'alerte ne le nomme.
    onset: [{ tell: STORY.nuage, hazard: NUAGE.arrive }, { bulletin: ALERTE_SUITE }],
    situations: SITUATIONS,
    ending: STORY.fin,
    levels: { vigilance: NUAGE.alerte, ending: NUAGE.dissipe, after: NUAGE.dissipe },
    stakes: STAKES,
    badges: BADGES,
    bilan: {
      title: "Bilan de l'alerte",
      lead: 'En début d’après-midi, l’alerte est levée. Voici ce que le nuage a laissé derrière lui, et ce que votre matinée de janvier a changé.',
    },
  },
};
